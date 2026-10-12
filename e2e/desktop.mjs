// e2e/desktop.mjs: the desktop app, end to end in headless Chromium
// (`npm run e2e`, after `npm run build`).
//
// Serves dist/ with the serve binary itself (not `npx serve`, whose child
// process would outlive it), on 127.0.0.1 only, and always stops it. Each
// path runs on the same page, in order, building on the one before; every
// screen is saved to e2e/screenshots/ for review.
import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from 'playwright';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const shots = join(root, 'e2e/screenshots');
mkdirSync(shots, { recursive: true });
const PORT = 8141;
const URL = `http://127.0.0.1:${PORT}/`;

const server = spawn(join(root, 'node_modules/.bin/serve'), ['-s', 'dist', '-l', `tcp://127.0.0.1:${PORT}`, '--no-port-switching'], { cwd: root, stdio: 'ignore' });
for (let i = 0; i < 50; i++) {
  try {
    await fetch(URL);
    break;
  } catch {
    await new Promise((r) => setTimeout(r, 200));
  }
}

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'en-GB', timezoneId: 'Europe/London' });
await context.grantPermissions(['clipboard-read', 'clipboard-write']);
const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
let failed = 0;

/** One check: runs the steps, then fails on any page error. */
async function path(name, fn) {
  try {
    await fn();
    if (errors.length) throw new Error(`page error: ${errors.splice(0).join(' | ')}`);
    console.log(`✓ ${name}`);
  } catch (e) {
    failed++;
    console.error(`✕ ${name}: ${e.message.split('\n')[0]}`);
    await page.screenshot({ path: join(shots, `FAILED-${name.replace(/[^a-z0-9]+/gi, '-')}.png`) }).catch(() => {});
  }
}
const shot = (name) => page.screenshot({ path: join(shots, `${name}.png`) });
const see = (text, opts = {}) => page.getByText(text, opts).first().waitFor({ state: 'visible', timeout: 4000 });
const gone = async (text) => {
  if (await page.getByText(text, { exact: true }).count()) throw new Error(`"${text}" is still shown`);
};
const row = (title) => page.locator('.row', { hasText: title }).first();
const nav = (label) => page.locator('.sidebar .nav-item', { hasText: label }).first();
const addQuest = async (text) => {
  const field = page.getByLabel('New quest');
  await field.fill(text);
  await field.press('Enter');
};

try {
  await page.goto(URL);
  await page.waitForTimeout(500);

  await path('opens on TODAY, empty, with the three columns', async () => {
    await see('> TODAY');
    await see('NOTHING DUE TODAY');
    await see('SELECT A TASK TO SEE ITS DETAILS');
    await shot('01-first-open');
  });

  await path('quick-add with shorthand: priority and date become fields', async () => {
    await nav('ALL QUESTS').click();
    await page.getByLabel('New quest').fill('Ship the report !! @tomorrow 10am');
    await see('TOMORROW 10:00'); // the chip, above the text
    await shot('02-chips-above');
    await page.getByLabel('New quest').press('Enter');
    await addQuest('Hire a designer');
    await addQuest('Pay invoices @today 5pm');
    await see('SHIP THE REPORT');
    const meta = await row('SHIP THE REPORT').innerText();
    if (!meta.includes('!!') || !meta.includes('TOMORROW 10:00')) throw new Error(`shorthand not applied: ${meta}`);
    await shot('03-quests');
  });

  await path('the detail pane edits priority, due date, notes and objectives', async () => {
    await row('HIRE A DESIGNER').click();
    await see('PRIORITY');
    await page.getByRole('radio', { name: '!!!' }).click();
    await page.getByLabel('Due date').fill('2026-10-20');
    await page.getByLabel('Notes').fill('Portfolio first, then a call.');
    for (const o of ['write the brief', 'Shortlist three']) {
      await page.getByLabel('Add objective').fill(o);
      await page.getByLabel('Add objective').press('Enter');
    }
    await see('Write the brief'); // objectives start with a capital
    const meta = await row('HIRE A DESIGNER').innerText();
    if (!meta.includes('!!!') || !meta.includes('0/2')) throw new Error(`row didn't update: ${meta}`);
    await shot('04-detail');
  });

  await path('TODAY and UPCOMING gather dated tasks from everywhere (Esc leaves a field, then T / U)', async () => {
    await page.keyboard.press('Escape'); // leave the objective field
    await page.keyboard.press('t');
    await see('> TODAY');
    await see('Pay invoices');
    if ((await page.getByLabel('Add objective').inputValue()) !== '') throw new Error('the shortcut was typed into the field');
    await shot('05-today');
    await page.keyboard.press('u');
    await see('> UPCOMING');
    await see('Ship the report');
    await see('Hire a designer');
    await shot('06-upcoming');
  });

  await path('areas: add, put a quest in it, rename, delete (its quests move)', async () => {
    await nav('+ AREA').click();
    await page.getByLabel('New area name').fill('Client ACME');
    await page.getByLabel('New area name').press('Enter');
    await see('> CLIENT ACME');
    await addQuest('Pitch deck @fri');
    await nav('CLIENT ACME').click({ button: 'right' });
    await page.getByRole('menuitem', { name: 'Rename…' }).click();
    await page.getByRole('dialog').getByRole('textbox').fill('ACME Corp');
    await page.getByRole('dialog').getByRole('button', { name: 'RENAME' }).click();
    await see('> ACME CORP');
    await shot('07-area');
    await nav('ACME CORP').click({ button: 'right' });
    await page.getByRole('menuitem', { name: 'Delete…' }).click();
    await page.getByRole('radio', { name: 'MAIN' }).check();
    await page.getByRole('dialog').getByRole('button', { name: 'DELETE' }).click();
    await see('QUESTS MOVED TO MAIN');
    await nav('MAIN').click();
    await see('PITCH DECK');
  });

  await path('right-click menu and keyboard shortcuts, with undo', async () => {
    await nav('ALL QUESTS').click();
    await row('HIRE A DESIGNER').click({ button: 'right' });
    await page.getByRole('menuitem', { name: 'Due today' }).click();
    await page.keyboard.press('t');
    await see('Hire a designer');
    await page.keyboard.press('a');
    await page.keyboard.press('n'); // focus quick-add
    if ((await page.evaluate(() => document.activeElement?.getAttribute('aria-label'))) !== 'New quest') throw new Error('N did not focus quick-add');
    await page.keyboard.press('Escape');
    await row('PAY INVOICES').click();
    await page.keyboard.press('Delete');
    await gone('PAY INVOICES');
    await page.keyboard.press('Control+z');
    await see('PAY INVOICES');
  });

  await path('completing a quest: burst, it leaves, it is on COMPLETED with its XP', async () => {
    await row('PAY INVOICES').locator('.check').click();
    await page.waitForTimeout(150);
    await shot('08-burst');
    await page.waitForTimeout(1200);
    await gone('PAY INVOICES');
    await nav('COMPLETED').click();
    await see('PAY INVOICES');
    await see(/\+\d+ XP/);
    await shot('09-completed');
  });

  await path('drag a quest under another to make it an objective', async () => {
    await nav('ALL QUESTS').click();
    const src = row('PITCH DECK').locator('.handle');
    await row('PITCH DECK').hover();
    const a = await src.boundingBox();
    const target = await row('SHIP THE REPORT').boundingBox();
    await page.mouse.move(a.x + 4, a.y + 4);
    await page.mouse.down();
    await page.mouse.move(a.x + 40, target.y + target.height + 4, { steps: 8 });
    await page.mouse.move(a.x + 60, target.y + target.height + 4, { steps: 4 });
    await shot('10-dragging');
    await page.mouse.up();
    await page.waitForTimeout(200);
    const depth = await page.locator('.row', { hasText: 'Pitch deck' }).first().getAttribute('data-depth');
    if (depth !== '1') throw new Error(`not nested (depth ${depth})`);
  });

  await path('multi-select: Ctrl+click two, set them due tomorrow at once', async () => {
    await row('Pitch deck').click();
    await row('HIRE A DESIGNER').click({ modifiers: ['Control'] });
    await see('2 SELECTED');
    await shot('11-multi');
    await page.getByRole('button', { name: /TOMORROW/ }).first().click();
    await page.keyboard.press('Escape');
    await gone('2 SELECTED');
  });

  await path('everything is still there after a reload (IndexedDB)', async () => {
    await page.waitForTimeout(500); // let the save land
    await page.reload();
    await page.waitForTimeout(500);
    await nav('ALL QUESTS').click();
    await see('HIRE A DESIGNER');
    await see('SHIP THE REPORT');
  });

  await path('works offline (service worker), with the data', async () => {
    await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
    await page.reload(); // now controlled by the service worker
    await context.setOffline(true);
    await page.reload();
    await page.waitForTimeout(500);
    await nav('ALL QUESTS').click();
    await see('HIRE A DESIGNER');
    await context.setOffline(false);
  });

  await path('a phone backup imports (merge), into the phone areas', async () => {
    const fixture = JSON.parse(readFileSync(join(root, 'src/__tests__/fixtures/tasks-v1.json'), 'utf8'));
    const file = join(shots, 'phone-backup.json');
    writeFileSync(file, JSON.stringify({ format: 'quest_log-backup', version: 1, exportedAt: Date.now(), app: { version: '1.6.0', build: 33 }, tasks: fixture }));
    await nav('SETTINGS').click();
    await page.locator('input[type=file]').setInputFiles(file);
    await see(/active · /);
    await page.getByRole('button', { name: /MERGE/ }).click();
    await see(/ADDED \d+ TASK/);
    await shot('12-settings');
  });

  await path('the details pane minimizes to a strip (», D), stays so after a reload, and comes back', async () => {
    await nav('ALL QUESTS').click();
    await page.locator('.row').first().click();
    const centre = () => page.locator('main.center').evaluate((el) => el.getBoundingClientRect().width);
    const wide = await centre();
    await page.getByLabel('Minimize details (D)').click();
    await page.getByLabel('Show details (D)').waitFor();
    await page.waitForTimeout(400); // the columns glide
    if ((await centre()) < wide + 300) throw new Error('the list did not take the room');
    await shot('15-details-minimized');
    await page.reload();
    await page.getByLabel('Show details (D)').waitFor();
    await page.keyboard.press('d');
    await page.getByLabel('Minimize details (D)').waitFor();
    await see('> SELECT A TASK TO SEE ITS DETAILS.');
  });

  await path('a narrow window: the sidebar becomes a drawer', async () => {
    await page.setViewportSize({ width: 820, height: 800 });
    await page.keyboard.press('Escape');
    await page.getByLabel('Views and areas', { exact: true }).locator('xpath=self::button').click();
    await see('UPCOMING');
    await shot('13-narrow-drawer');
    await nav('ALL QUESTS').click();
    await page.setViewportSize({ width: 1440, height: 900 });
  });

  await path('help lists the shortcuts', async () => {
    await page.keyboard.press('?');
    await see('KEYBOARD');
    await see('Undo · Redo');
    await shot('14-help');
  });
} finally {
  await browser.close();
  server.kill();
}
console.log(failed ? `\n${failed} path(s) failed` : '\nall desktop paths passed');
process.exit(failed ? 1 : 0);
