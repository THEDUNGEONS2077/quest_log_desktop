// e2e/pages.mjs: a quick check of the GitHub Pages build, served from the
// same sub-path GitHub serves it from (/quest_log_desktop/), before it's
// published (scripts/deploy.sh runs it after building with that base).
//
// The full walk (e2e/desktop.mjs) tests the app at the site root; this one
// catches what only the sub-path can break: asset and icon URLs, the
// manifest's scope, and the service worker's scope and offline copy.
//
// Serves a staging folder with the serve binary itself, on 127.0.0.1 only,
// and always stops it (same pattern as desktop.mjs).
import { spawn } from 'node:child_process';
import { cpSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from 'playwright';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const BASE = '/quest_log_desktop/';
const PORT = 8142;
const URL = `http://127.0.0.1:${PORT}${BASE}`;

// dist/ goes inside a staging folder at the sub-path, as on github.io.
const stage = mkdtempSync(join(tmpdir(), 'quest_log_desktop-pages-'));
cpSync(join(root, 'dist'), join(stage, BASE), { recursive: true });

// No -s (single-page fallback): GitHub Pages has none either, and the app needs none.
const server = spawn(join(root, 'node_modules/.bin/serve'), [stage, '-l', `tcp://127.0.0.1:${PORT}`, '--no-port-switching'], { stdio: 'ignore' });
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
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
// Any file of the app that fails to load (a wrong base path shows up as 404s here).
const missing = [];
page.on('response', (r) => {
  if (r.status() >= 400) missing.push(`${r.status()} ${r.url()}`);
});
let failed = 0;

/** One check: runs the steps, then fails on any page error or missing file. */
async function check(name, fn) {
  try {
    await fn();
    if (errors.length) throw new Error(`page error: ${errors.splice(0).join(' | ')}`);
    if (missing.length) throw new Error(`not found: ${missing.splice(0).join(' | ')}`);
    console.log(`✓ ${name}`);
  } catch (e) {
    failed++;
    console.error(`✕ ${name}: ${e.message.split('\n')[0]}`);
  }
}
const see = (text) => page.getByText(text).first().waitFor({ state: 'visible', timeout: 4000 });

try {
  await check(`opens at ${BASE}`, async () => {
    await page.goto(URL);
    await see('> TODAY');
  });

  await check('the manifest and its icons load, scoped to the sub-path', async () => {
    const href = await page.locator('link[rel="manifest"]').getAttribute('href');
    const manifestUrl = new globalThis.URL(href ?? '', URL).href;
    const manifest = await (await fetch(manifestUrl)).json();
    // start_url / scope are relative ("./"), so they resolve against the manifest's own URL.
    const scope = new globalThis.URL(manifest.scope, manifestUrl).pathname;
    if (scope !== BASE) throw new Error(`manifest scope is ${scope}`);
    for (const icon of manifest.icons) {
      const res = await fetch(new globalThis.URL(icon.src, manifestUrl));
      if (!res.ok) throw new Error(`icon ${icon.src}: ${res.status}`);
    }
  });

  await check('the service worker controls the sub-path and keeps the app offline', async () => {
    const scope = await page.evaluate(() => navigator.serviceWorker.ready.then((r) => new URL(r.scope).pathname));
    if (scope !== BASE) throw new Error(`service worker scope is ${scope}`);
    await page.locator('.sidebar .nav-item', { hasText: 'ALL QUESTS' }).first().click();
    await page.getByLabel('New quest').fill('Pages smoke test');
    await page.getByLabel('New quest').press('Enter');
    await see('Pages smoke test');
    // Reload once online so the worker controls the page, then offline.
    await page.reload();
    await page.evaluate(() => navigator.serviceWorker.ready);
    await context.setOffline(true);
    await page.reload();
    await see('Pages smoke test');
    await context.setOffline(false);
  });
} finally {
  await browser.close();
  server.kill();
  rmSync(stage, { recursive: true, force: true });
}

if (failed) {
  console.error(`${failed} Pages check(s) failed`);
  process.exit(1);
}
console.log('the GitHub Pages build passed');
