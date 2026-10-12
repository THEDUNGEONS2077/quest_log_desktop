// e2e/motion.mjs: how smooth each animation runs (`npm run e2e:motion`,
// after `npm run build`).
//
// Headless Chromium with the CPU slowed 4× (a modest laptop on battery),
// 1440×900, a list of 40 quests. Each scenario starts an animation and,
// while it runs, records:
//   - frames: every requestAnimationFrame gap; "dropped" = gaps over 25 ms
//     (a 60 Hz frame is 16.7 ms), and the longest gap;
//   - layout / style work Chromium did (CDP Performance metrics), which is
//     what makes animations of width, height or grid sizes costly.
// It prints a table; nothing is asserted (timing on a shared machine is
// noisy), it's for comparing before and after a change.
//
// Serves dist/ with the serve binary itself on 127.0.0.1 only, and always
// stops it.
import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from 'playwright';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8147;
const URL = `http://127.0.0.1:${PORT}/`;
const CPU_SLOWDOWN = 4;

// MOTION_DIST: another build to measure (a copy of an older dist/, to compare).
const dist = process.env.MOTION_DIST ?? 'dist';
const server = spawn(join(root, 'node_modules/.bin/serve'), ['-s', dist, '-l', `tcp://127.0.0.1:${PORT}`, '--no-port-switching'], { cwd: root, stdio: 'ignore' });
for (let i = 0; i < 50; i++) {
  try {
    await fetch(URL);
    break;
  } catch {
    await new Promise((r) => setTimeout(r, 200));
  }
}

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
const cdp = await context.newCDPSession(page);
await cdp.send('Performance.enable');
const results = [];

/** Layout and style totals so far (seconds of work, and counts). */
async function work() {
  const { metrics } = await cdp.send('Performance.getMetrics');
  const get = (name) => metrics.find((m) => m.name === name)?.value ?? 0;
  return { layoutMs: get('LayoutDuration') * 1000, styleMs: get('RecalcStyleDuration') * 1000, layouts: get('LayoutCount') };
}

/** Runs `start`, then records frames for `ms` while the animation plays. */
async function measure(name, start, ms) {
  await page.waitForTimeout(300); // settle
  await page.evaluate(() => {
    window.__frames = [];
    window.__recording = true;
    const tick = (t) => {
      window.__frames.push(t);
      if (window.__recording) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  const before = await work();
  await start();
  await page.waitForTimeout(ms);
  const frames = await page.evaluate(() => {
    window.__recording = false;
    return window.__frames;
  });
  const after = await work();
  const gaps = frames.slice(1).map((t, i) => t - frames[i]);
  results.push({
    scenario: name,
    frames: gaps.length,
    dropped: gaps.filter((g) => g > 25).length,
    'worst ms': Math.round(Math.max(0, ...gaps)),
    'layout ms': Math.round(after.layoutMs - before.layoutMs),
    'style ms': Math.round(after.styleMs - before.styleMs),
    layouts: after.layouts - before.layouts,
  });
}

try {
  await page.goto(URL);
  await page.locator('.sidebar .nav-item', { hasText: 'ALL QUESTS' }).first().click();
  // 40 quests, a few with objectives, so layout has real work to do.
  const field = page.getByLabel('New quest');
  for (let i = 1; i <= 40; i++) {
    await field.fill(`Quest number ${i} with a reasonably long title to wrap ${i % 3 ? '' : '!!'}`);
    await field.press('Enter');
  }
  await page.keyboard.press('Escape');
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU_SLOWDOWN });

  const row = () => page.locator('.row').nth(2);
  await row().click();
  await measure('details pane: minimize', () => page.keyboard.press('d'), 700);
  await measure('details pane: bring back', () => page.keyboard.press('d'), 700);
  await measure('complete a quest (burst, exit, rows glide up, XP)', () => page.locator('.row .check').nth(3).click(), 1600);
  // The toast from that completion leaves on its own 5 s after it appeared.
  await measure('toast leaving (on its own)', () => page.waitForTimeout(3000), 1200);
  await measure('sidebar: fold AREAS', () => page.locator('.sidebar .nav-section-head', { hasText: 'AREAS' }).click(), 600);
  await measure('sidebar: open AREAS', () => page.locator('.sidebar .nav-section-head', { hasText: 'AREAS' }).click(), 600);
  await measure('right-click menu opens', () => row().click({ button: 'right' }), 400);
  await page.keyboard.press('Escape');
  await measure('idle (title panel loops only)', async () => {}, 2000);
  const box = await page.locator('.row').nth(5).boundingBox();
  await measure(
    'drag a quest down the list',
    async () => {
      await page.locator('.row').nth(5).hover();
      await page.mouse.move(box.x + 6, box.y + 12);
      await page.mouse.down();
      for (let i = 0; i < 30; i++) await page.mouse.move(box.x + 40, box.y + 12 + i * 12);
      await page.mouse.up();
    },
    300,
  );
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  if (process.env.MOTION_JSON) console.log(JSON.stringify(results));
  else console.table(results);
} finally {
  await browser.close();
  server.kill();
}
