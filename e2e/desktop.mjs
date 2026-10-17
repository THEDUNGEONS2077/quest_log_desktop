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
    await see('WELCOME TO QUEST_LOG.'); // a new user's empty TODAY: the welcome
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

  await path('areas: add, put a quest in it, rename and delete it from the right-hand pane, ARCHIVE, restore', async () => {
    await page.locator('.sidebar .add-area').click();
    await page.getByLabel('New area name').fill('Client ACME');
    await page.getByLabel('New area name').press('Enter');
    await see('> CLIENT ACME');
    await addQuest('Pitch deck @fri');
    // The right-hand pane shows the area (no task selected): rename it there.
    await page.keyboard.press('Escape');
    await nav('CLIENT ACME').click();
    const areaName = page.getByLabel('Area name');
    await areaName.fill('ACME Corp');
    await areaName.press('Enter');
    await see('> ACME CORP');
    await shot('07-area');
    // DELETE moves it to ARCHIVE, quests and all; ALL QUESTS leaves them out.
    await page.locator('.detail').getByRole('button', { name: 'DELETE' }).click();
    await see('MOVED TO ARCHIVE');
    await see('> IN ARCHIVE.');
    await page.locator('.sidebar .archived-area', { hasText: 'ACME CORP' }).waitFor();
    await shot('07b-archives');
    await nav('ALL QUESTS').click();
    await gone('PITCH DECK');
    // Back from ARCHIVE (its section opened when the area went in).
    await page.locator('.sidebar .archived-area', { hasText: 'ACME CORP' }).click();
    await page.locator('.detail').getByRole('button', { name: 'RESTORE' }).click();
    await see('RESTORED');
    await nav('ALL QUESTS').click();
    await see('PITCH DECK');
    // Another area, deleted for good from ARCHIVE (right-click): its quest goes to Trash.
    await page.locator('.sidebar .add-area').click();
    await page.getByLabel('New area name').fill('Temp');
    await page.getByLabel('New area name').press('Enter');
    await addQuest('Scratch notes');
    await nav('TEMP').click({ button: 'right' });
    await page.getByRole('menuitem', { name: 'Delete (to ARCHIVE)' }).click();
    // Still showing TEMP, so the folder is open with it inside.
    await page.locator('.sidebar .archived-area', { hasText: 'TEMP' }).click({ button: 'right' });
    await page.getByRole('menuitem', { name: 'Delete forever…' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'DELETE' }).click();
    await see('ITS QUESTS ARE IN TRASH');
    if (await page.locator('.sidebar .archived-area', { hasText: 'TEMP' }).count()) throw new Error('TEMP is still in ARCHIVE');
    await nav('TRASH').click();
    await see('Scratch notes');
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

  await path('everything is still there after a reload (IndexedDB), new areas too, even mid-edit in one', async () => {
    // 0.1.0: a new area wasn't saved, so a reopen on it looped (black screen).
    await nav('ACME CORP').click();
    await addQuest('Follow up with ACME');
    await row('FOLLOW UP WITH ACME').dblclick();
    await page.keyboard.type(' v2');
    await page.reload();
    await see('> ACME CORP');
    await nav('ACME CORP').waitFor();
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

  await path('sidebar sections minimize to their heading (with a dot when they hold the view), and stay so after a reload', async () => {
    await nav('ALL QUESTS').click();
    await shot('16-sidebar');
    const head = (title) => page.locator('.sidebar .nav-section-head', { hasText: title });
    await head('VIEWS').click();
    await head('AREAS').click();
    await page.waitForTimeout(300); // they fold
    if (await nav('TODAY').isVisible()) throw new Error('VIEWS did not minimize');
    if (await nav('MAIN').isVisible()) throw new Error('AREAS did not minimize');
    if (!(await head('VIEWS').locator('.nav-section-dot').count())) throw new Error('no dot on VIEWS (ALL QUESTS is shown)');
    await shot('17-sidebar-minimized');
    await page.reload();
    await head('VIEWS').waitFor();
    if (await nav('TODAY').isVisible()) throw new Error('VIEWS opened again after a reload');
    await head('VIEWS').click();
    await head('AREAS').click();
    await nav('TODAY').waitFor();
    await nav('MAIN').waitFor();
  });

  await path('a completed quest closes its gap smoothly to the end: nothing jumps when it is removed', async () => {
    // Fix 2026-10-15: the gap stalled at the row's padding and divider (16-21 px)
    // and the rest snapped shut when the row was removed.
    await nav('ALL QUESTS').click();
    for (const t of ['Glide C', 'Glide B', 'Glide A']) await addQuest(t);
    await page.keyboard.press('Escape');
    const steps = await page.evaluate(async () => {
      const find = (t) => [...document.querySelectorAll('.row')].find((r) => r.textContent.toLowerCase().includes(t));
      const out = [];
      const t0 = performance.now();
      await new Promise((done) => {
        const tick = (now) => {
          const below = find('glide b');
          out.push({ y: below.getBoundingClientRect().top, gone: !find('glide a') });
          if (now - t0 < 1500) requestAnimationFrame(tick);
          else done();
        };
        requestAnimationFrame(tick);
        // Complete "Glide A" (the row above "Glide B") once sampling has started.
        find('glide a').querySelector('.check').click();
      });
      return out.slice(1).map((x, i) => ({ step: x.y - out[i].y, removed: x.gone && !out[i].gone }));
    });
    const removal = steps.find((s) => s.removed);
    if (!removal) throw new Error('the completed quest was not removed');
    if (Math.abs(removal.step) > 0.5) throw new Error(`the rows below jumped ${removal.step.toFixed(1)} px when it was removed`);
    const biggest = Math.max(...steps.map((s) => Math.abs(s.step)));
    if (biggest > 12) throw new Error(`a ${biggest.toFixed(1)} px step in the glide`);
  });

  await path("a quest's objectives fold shut and open smoothly: every frame a step the same way, nothing jumps at the end", async () => {
    // 2026-10-17: "a smooth animation for when a quest is expanded and collapsed".
    await nav('ALL QUESTS').click();
    await addQuest('Fold under');
    await addQuest('Fold quest');
    await page.keyboard.press('Escape');
    const quest = row('FOLD QUEST');
    await quest.hover();
    await quest.locator('.add-sub').click();
    for (let i = 1; i <= 4; i++) {
      await page.keyboard.type(`Fold objective ${i}`);
      await page.keyboard.press(i < 4 ? 'Alt+Enter' : 'Enter');
    }
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    /** Clicks the quest's caret and records, every frame, where the quest below is and whether its objectives are still there. */
    const fold = () =>
      page.evaluate(async () => {
        const find = (t) => [...document.querySelectorAll('.row')].find((r) => r.textContent.toLowerCase().includes(t));
        const out = [];
        const t0 = performance.now();
        await new Promise((done) => {
          const tick = (now) => {
            out.push({ y: find('fold under').getBoundingClientRect().top, listed: !!find('fold objective 1') });
            if (now - t0 < 800) requestAnimationFrame(tick);
            else done();
          };
          requestAnimationFrame(tick);
          find('fold quest').querySelector('.caret').click();
        });
        return out;
      });
    /** Throws unless the quest below moved `way` (-1 up, 1 down) in several steps, never back, by `by` px in all. */
    const check = (frames, way, name) => {
      const steps = frames.slice(1).map((f, i) => f.y - frames[i].y);
      const moved = frames[frames.length - 1].y - frames[0].y;
      if (Math.sign(moved) !== way || Math.abs(moved) < 100) throw new Error(`${name}: the quest below moved ${moved.toFixed(1)} px`);
      const back = steps.find((d) => d * way < -0.5);
      if (back !== undefined) throw new Error(`${name}: a ${back.toFixed(1)} px step back`);
      const moving = steps.filter((d) => Math.abs(d) > 0.5).length;
      if (moving < 8) throw new Error(`${name}: it moved in only ${moving} frames (not animated?)`);
      const biggest = Math.max(...steps.map((d) => Math.abs(d)));
      if (biggest > Math.abs(moved) * 0.35) throw new Error(`${name}: a ${biggest.toFixed(1)} px jump`);
      return steps;
    };
    const shut = await fold();
    const steps = check(shut, -1, 'folding shut');
    // The objectives stay listed while they close, then go without moving anything.
    const gone = shut.findIndex((f) => !f.listed);
    if (gone < 0) throw new Error('the folded objectives were not removed');
    if (Math.abs(steps[gone - 1]) > 0.5) throw new Error(`the quest below jumped ${steps[gone - 1].toFixed(1)} px when they were removed`);
    await page.waitForTimeout(200);
    const open = await fold();
    check(open, 1, 'opening');
    if (!open[0].listed && !open[1].listed) throw new Error('the objectives did not appear at once to unfold');
    await page.waitForTimeout(500);
    await shot('19-fold-open');
  });

  await path('Alt+Enter while editing: a quest gets an objective, an objective the next one; the + sits after the title, on hover', async () => {
    await nav('ALL QUESTS').click();
    await addQuest('Alt enter quest');
    await page.keyboard.press('Escape');
    const quest = row('ALT ENTER QUEST');
    // The +: hidden until the pointer is over the quest, then right after the title's last word.
    const plus = quest.locator('.add-sub');
    if ((await plus.evaluate((e) => getComputedStyle(e).opacity)) !== '0') throw new Error('the + shows without hovering');
    await quest.hover();
    await page.waitForTimeout(250);
    if ((await plus.evaluate((e) => getComputedStyle(e).opacity)) !== '1') throw new Error('the + did not show on hover');
    const t = await quest.locator('.title').boundingBox();
    const b = await plus.boundingBox();
    if (b.x < t.x + t.width || b.x - (t.x + t.width) > 12) throw new Error(`the + is not right after the title (gap ${(b.x - t.x - t.width).toFixed(0)} px)`);
    // Alt+Enter in the quest's title: a new objective, being edited.
    await quest.dblclick();
    await page.keyboard.press('Alt+Enter');
    await page.keyboard.type('first step');
    await page.keyboard.press('Alt+Enter');
    await page.keyboard.type('second step');
    await page.keyboard.press('Alt+Enter');
    // An empty objective adds nothing more: Enter leaves it (and the empty one goes).
    await page.keyboard.press('Alt+Enter');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
    const titles = await page.locator('.row').evaluateAll((rows) => rows.map((r) => r.querySelector('.title')?.textContent?.trim()));
    const at = titles.findIndex((x) => /alt enter quest/i.test(x ?? ''));
    const next = titles.slice(at + 1, at + 4);
    if (next[0] !== 'First Step' || next[1] !== 'Second Step') throw new Error(`objectives: ${JSON.stringify(next)}`);
    // Exactly those two: the empty third one was dropped.
    await see('OBJECTIVES 0/2');
    await shot('18-alt-enter');
  });

  await path('a second window opens nothing until USE HERE; the first saves and steps aside', async () => {
    // V1 pass 2026-10-17: two windows writing the same storage lost each other's changes.
    await nav('ALL QUESTS').click();
    await addQuest('Made in the first window');
    const second = await context.newPage();
    try {
      await second.goto(URL);
      await second.getByText('QUEST_LOG IS OPEN IN ANOTHER WINDOW.').waitFor({ timeout: 4000 });
      if (await second.locator('.row').count()) throw new Error('the second window shows tasks before USE HERE');
      await second.getByRole('button', { name: /USE HERE/ }).click();
      await see('QUEST_LOG MOVED TO ANOTHER WINDOW.');
      await second.locator('.sidebar .nav-item', { hasText: 'ALL QUESTS' }).first().click();
      await second.locator('.row', { hasText: 'Made in the first window' }).first().waitFor({ timeout: 4000 });
      await second.screenshot({ path: join(shots, '20-second-window.png') });
      // And back: the first window takes them again (a reload, then USE HERE).
      await page.getByRole('button', { name: /USE HERE/ }).click();
      await see('QUEST_LOG IS OPEN IN ANOTHER WINDOW.');
      await page.getByRole('button', { name: /USE HERE/ }).click();
      await second.getByText('QUEST_LOG MOVED TO ANOTHER WINDOW.').waitFor({ timeout: 4000 });
      await row('Made in the first window').waitFor({ timeout: 4000 }).catch(async () => {
        await nav('ALL QUESTS').click();
        await row('Made in the first window').waitFor({ timeout: 4000 });
      });
    } finally {
      await second.close();
    }
  });

  await path('keyboard: Enter on a focused sidebar item opens it (not the selected task); Shift+F10 opens the task menu', async () => {
    await nav('ALL QUESTS').click();
    await row('Made in the first window').click();
    await nav('UPCOMING').focus();
    await page.keyboard.press('Enter');
    await see('> UPCOMING');
    if (await page.locator('.row.editing').count()) throw new Error('Enter edited the selected task');
    await nav('ALL QUESTS').click();
    await row('Made in the first window').click();
    await page.keyboard.press('Shift+F10');
    await page.getByRole('menu').waitFor({ timeout: 2000 });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    if (await page.getByRole('menu').count()) throw new Error('Escape left the menu open');
  });

  await path('pages take the full width; Text size scales the type and is kept; long titles wrap on a wide screen', async () => {
    await nav('SETTINGS').click();
    await see('> SETTINGS');
    if (await page.locator('.detail').isVisible()) throw new Error('the details pane shows beside Settings');
    const quest = () => page.evaluate(() => parseFloat(getComputedStyle(document.querySelector('.quest-title')).fontSize));
    await nav('ALL QUESTS').click();
    const before = await quest();
    await nav('SETTINGS').click();
    await page.getByLabel('Text size').selectOption('130');
    await shot('21-settings-text-130');
    await page.reload();
    await page.waitForTimeout(500);
    await nav('ALL QUESTS').click();
    const after = await quest();
    if (Math.abs(after / before - 1.3) > 0.02) throw new Error(`quest titles went from ${before} to ${after} px, not 130%`);
    await nav('SETTINGS').click();
    await page.getByLabel('Text size').selectOption('100');
    // Wide screen: a long title wraps at a readable length.
    await page.setViewportSize({ width: 2560, height: 1440 });
    await nav('ALL QUESTS').click();
    await addQuest('A very long quest title that keeps going well past any comfortable reading length so that it would run all the way across a wide screen');
    // The text wraps at its measure (the column itself runs on: what follows it stays at the edge).
    const width = await row('A VERY LONG QUEST').locator('.title-line').evaluate((el) => el.getBoundingClientRect().width);
    if (width > 1100) throw new Error(`a title line ${Math.round(width)} px wide`);
    await page.setViewportSize({ width: 1440, height: 900 });
  });

  await path('a fresh browser: the welcome loads example quests (one undo takes them away)', async () => {
    const fresh = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'en-GB', timezoneId: 'Europe/London' });
    const p2 = await fresh.newPage();
    try {
      await p2.goto(URL);
      await p2.getByText('WELCOME TO QUEST_LOG.').waitFor({ timeout: 4000 });
      await p2.screenshot({ path: join(shots, '22-welcome.png') });
      await p2.getByRole('button', { name: /LOAD EXAMPLE QUESTS/ }).click();
      await p2.locator('.row', { hasText: 'Welcome to quest_log' }).first().waitFor({ timeout: 4000 });
      // Its shorthand became fields: high priority, due today.
      await p2.locator('.row', { hasText: 'Welcome to quest_log' }).first().getByText('!!').waitFor({ timeout: 2000 });
      await p2.screenshot({ path: join(shots, '23-examples.png') });
      await p2.keyboard.press('t');
      await p2.locator('.row', { hasText: 'Welcome to quest_log' }).first().waitFor({ timeout: 4000 });
      await p2.keyboard.press('Control+z');
      await p2.getByText('WELCOME TO QUEST_LOG.').waitFor({ timeout: 4000 });
    } finally {
      await fresh.close();
    }
  });

  await path("the window title counts what's due; Settings shows the last backup; What's new lists this version", async () => {
    await nav('ALL QUESTS').click();
    await addQuest('Due in the title @today 11:59pm');
    await page.waitForFunction(() => /^quest_log · \d+ due$/.test(document.title), null, { timeout: 4000 });
    await nav('SETTINGS').click();
    await see('Last backup: never');
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: /EXPORT BACKUP/ }).click();
    await download;
    await see('Last backup: just now');
    await page.getByRole('button', { name: /WHAT’S NEW/ }).click();
    await see('> WHAT’S NEW');
    const version = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).version;
    await see(`${version} · build`);
    await see('this version');
    await shot('24-whats-new');
  });

  await path('a toast keeps its 5 s however busy the app is, and holds while pointed at', async () => {
    // V1.1 pass 2026-10-17: its clock restarted on every store change, so it stayed up while you worked.
    await nav('ALL QUESTS').click();
    await addQuest('Toast clock quest');
    await see('Toast clock quest'.toUpperCase());
    await page.mouse.move(700, 300);
    for (let i = 0; i < 6; i++) {
      await nav(i % 2 ? 'TODAY' : 'ALL QUESTS').click(); // busy: views change, the app re-renders
      await page.waitForTimeout(1000);
    }
    if (await page.locator('.toast').count()) throw new Error('the toast outlived its 5 s while the app was busy');
    await nav('ALL QUESTS').click();
    await row('TOAST CLOCK QUEST').locator('.check').click();
    await page.locator('.toast').waitFor({ timeout: 2000 });
    await page.locator('.toast').hover();
    await page.waitForTimeout(6000);
    if (!(await page.locator('.toast').count())) throw new Error('the toast left while the pointer held it');
    await page.mouse.move(700, 300);
    await page.waitForTimeout(5800);
    if (await page.locator('.toast').count()) throw new Error('the toast stayed after the pointer let go');
  });

  await path('Tab moves the focus, never the task; Alt+→ / Alt+← indent and outdent; Delete selects the next task', async () => {
    // V1.1 pass: Tab indented the selected task, so tabbing to a button after a click restructured the list.
    await nav('ALL QUESTS').click();
    await addQuest('Tab under');
    await addQuest('Tab test');
    const depth = (t) => row(t).evaluate((el) => Number(el.dataset.depth));
    await row('TAB TEST').click();
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    if ((await depth('TAB TEST')) !== 0) throw new Error('Tab indented the selected task');
    if (!(await page.evaluate(() => document.activeElement && document.activeElement !== document.body))) throw new Error('Tab did not move the focus');
    await row('TAB TEST').click();
    await page.keyboard.press('Alt+ArrowRight');
    await page.waitForFunction(() => document.querySelector('.row[data-id] .title')?.textContent !== null);
    if ((await depth('Tab test')) !== 1) throw new Error('Alt+→ did not indent');
    await page.keyboard.press('Alt+ArrowLeft');
    if ((await depth('TAB TEST')) !== 0) throw new Error('Alt+← did not outdent');
    // Delete: the selection moves on to the next task.
    const order = await page.locator('.quest-list .row').evaluateAll((rows) => rows.map((r) => r.dataset.id));
    const at = order.indexOf(await row('TAB TEST').getAttribute('data-id'));
    await row('TAB TEST').click();
    await page.keyboard.press('Delete');
    await gone('TAB TEST');
    const selected = await page.locator('.row.selected').getAttribute('data-id');
    if (selected !== order[at + 1]) throw new Error('after Delete, the next task was not selected');
    await page.keyboard.press('Control+z');
    await see('TAB TEST');
  });

  await path('a dialog takes the keyboard: CANCEL first when OK cannot be undone, and Tab stays inside', async () => {
    await nav('ALL QUESTS').click();
    await addQuest('Trash dialog quest');
    await row('TRASH DIALOG QUEST').click();
    await page.keyboard.press('Delete');
    await nav('TRASH').click();
    await page.locator('.trash-row', { hasText: 'Trash dialog quest' }).getByRole('button', { name: 'DELETE' }).click();
    await page.getByRole('alertdialog').waitFor({ timeout: 2000 });
    const focused = () => page.evaluate(() => document.activeElement?.textContent?.trim());
    if ((await focused()) !== 'CANCEL') throw new Error(`the dialog opened with "${await focused()}" focused, not CANCEL`);
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    if (!(await page.evaluate(() => !!document.activeElement?.closest('.dialog')))) throw new Error('Tab left the dialog');
    await shot('25-danger-dialog');
    await page.keyboard.press('Escape');
    await see('Trash dialog quest');
    // The trash rows end at the page's right edge.
    const right = await page.locator('.trash-row').first().evaluate((r) => Math.round(r.getBoundingClientRect().right - r.querySelector('.text-btn:last-of-type').getBoundingClientRect().right));
    if (right > 1) throw new Error(`the trash row's buttons end ${right} px short of its edge`);
  });

  await path('accents: overdue tag, the lit date preset, plan counts with priority, TOMORROW, a multi-selection panel', async () => {
    await nav('ALL QUESTS').click();
    await addQuest('Late accent quest !!!');
    await row('LATE ACCENT QUEST').click();
    await page.getByLabel('Due date').fill('2026-01-05');
    await page.getByLabel('Due date').press('Tab');
    await row('LATE ACCENT QUEST').locator('.meta .due.overdue').waitFor({ timeout: 2000 });
    // A date preset matching the due day is lit.
    await page.locator('.presets').getByRole('button', { name: 'TOMORROW' }).click();
    if ((await page.locator('.presets').getByRole('button', { name: 'TOMORROW' }).getAttribute('aria-pressed')) !== 'true') throw new Error('TOMORROW is not lit for a task due tomorrow');
    await nav('UPCOMING').click();
    await see(/TOMORROW · /);
    await page.locator('.plan-section', { hasText: 'TOMORROW' }).locator('.section-count').waitFor();
    await page.locator('.plan-row', { hasText: 'Late accent quest' }).locator('.prio-3').waitFor({ timeout: 2000 });
    await shot('26-upcoming-accents');
    await nav('ALL QUESTS').click();
    await row('LATE ACCENT QUEST').click();
    await row('HIRE A DESIGNER').click({ modifiers: ['Control'] });
    await see('2 TASKS SELECTED');
    await shot('27-multi-panel');
    await page.keyboard.press('Escape');
  });

  await path('no accessibility violations (axe: WCAG 2.2 A/AA and best practice) across the views, a menu and a dialog', async () => {
    await page.addScriptTag({ path: join(root, 'node_modules/axe-core/axe.min.js') });
    const audit = async (state) => {
      await page.waitForTimeout(400);
      const found = await page.evaluate(async () => {
        // The context menu is a pop-up over the page, outside its landmarks by nature (region).
        const r = await window.axe.run({ exclude: [['.menu-layer']] }, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] } });
        return r.violations.map((v) => `${v.id} (${v.nodes.length}): ${v.nodes[0]?.target.join(' ')}`);
      });
      if (found.length) throw new Error(`${state}: ${found.join(' | ')}`);
    };
    await nav('ALL QUESTS').click();
    await row('HIRE A DESIGNER').click();
    await audit('ALL with a task selected');
    for (const view of ['TODAY', 'UPCOMING', 'SETTINGS', 'HELP', 'TRASH']) {
      await nav(view).click();
      await audit(view);
    }
    await nav('ALL QUESTS').click();
    await row('HIRE A DESIGNER').click({ button: 'right' });
    await page.getByRole('menu').waitFor();
    await audit('the task menu (its contents)');
    await page.keyboard.press('Escape');
    await nav('TRASH').click();
    await page.locator('.trash-row').first().getByRole('button', { name: 'DELETE' }).click();
    await audit('a dialog');
    await page.keyboard.press('Escape');
  });

  await path('undo and redo say what they did; Home / End jump the selection; a search that finds nothing says so', async () => {
    await nav('ALL QUESTS').click();
    await addQuest('Undo notice quest');
    await page.keyboard.press('Escape');
    await page.mouse.click(700, 880); // nowhere in particular: the keys go to the app
    await page.keyboard.press('Control+z');
    await page.locator('.toast', { hasText: 'UNDONE' }).waitFor({ timeout: 2000 });
    await gone('UNDO NOTICE QUEST');
    await page.locator('.toast').getByRole('button', { name: 'REDO' }).click();
    await page.locator('.toast', { hasText: 'REDONE' }).waitFor({ timeout: 2000 });
    await see('UNDO NOTICE QUEST');
    // Home / End.
    await row('UNDO NOTICE QUEST').click();
    const ids = await page.locator('.quest-list .row').evaluateAll((rows) => rows.map((r) => r.dataset.id));
    await page.keyboard.press('End');
    if ((await page.locator('.row.selected').getAttribute('data-id')) !== ids[ids.length - 1]) throw new Error('End did not select the last task');
    await page.keyboard.press('Home');
    if ((await page.locator('.row.selected').getAttribute('data-id')) !== ids[0]) throw new Error('Home did not select the first task');
    await page.keyboard.press('Escape');
    // A search that finds nothing.
    await page.keyboard.press('/');
    await page.keyboard.type('qqqzzz');
    await see('NO MATCHES FOR “QQQZZZ”. ESC CLEARS THE SEARCH.');
    await page.keyboard.press('Escape');
    await page.keyboard.press('Escape');
  });

  await path('many areas: a quest moves through a short choice, not a menu filling the window; the sidebar keeps its top and SYSTEM', async () => {
    for (const name of ['Extra one', 'Extra two']) {
      await page.locator('.sidebar .add-area').click();
      await page.keyboard.type(name);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(200);
    }
    await nav('ALL QUESTS').click();
    await row('UNDO NOTICE QUEST').click({ button: 'right' });
    await page.getByRole('menuitem', { name: /Move to area…/ }).click();
    const dialog = page.getByRole('dialog');
    await dialog.waitFor({ timeout: 2000 });
    if (!(await dialog.locator('input[type=radio]:checked').evaluate((r) => r.closest('label').textContent.includes('MAIN')))) throw new Error('the current area is not the one chosen');
    await dialog.getByText('EXTRA TWO').click();
    await dialog.getByRole('button', { name: 'MOVE' }).click();
    await page.locator('.sidebar .nav-item', { hasText: 'EXTRA TWO' }).first().click();
    await see('UNDO NOTICE QUEST');
    // A short window: the middle of the sidebar scrolls; the title block and HELP stay in view.
    await page.setViewportSize({ width: 1440, height: 560 });
    await page.locator('.sidebar-scroll').evaluate((el) => (el.scrollTop = el.scrollHeight));
    await page.waitForTimeout(200);
    const inView = async (sel) => page.locator(sel).first().evaluate((el) => { const r = el.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight; });
    if (!(await inView('.masthead'))) throw new Error('the title block scrolled away');
    if (!(await inView('.sidebar .nav-section.bottom'))) throw new Error('SYSTEM is out of view');
    await shot('28-short-window-sidebar');
    await page.setViewportSize({ width: 1440, height: 900 });
  });

  await path('at 130% text, a checkbox keeps clear of its title; projects without open objectives show no 0', async () => {
    await nav('SETTINGS').click();
    await page.getByLabel('Text size').selectOption('130');
    await nav('ALL QUESTS').click();
    const gap = await page.locator('.quest-list .row').first().evaluate((r) => r.querySelector('.title').getBoundingClientRect().left - r.querySelector('.check').getBoundingClientRect().right);
    if (gap < 4) throw new Error(`the checkbox ends ${gap.toFixed(1)} px from its title`);
    await nav('SETTINGS').click();
    await page.getByLabel('Text size').selectOption('100');
    const zeros = await page.locator('.sidebar .nav-item.project .count').evaluateAll((cs) => cs.filter((c) => c.textContent.trim() === '0').length);
    if (zeros) throw new Error(`${zeros} project(s) show a 0`);
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
