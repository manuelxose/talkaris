import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const require = createRequire(process.env.TALKARIS_TOOLS_DIR ? resolve(process.env.TALKARIS_TOOLS_DIR, 'package.json') : new URL('../../../.agentic/tools/package.json', import.meta.url));
const { chromium } = require('@playwright/test');
const { default: AxeBuilder } = require('@axe-core/playwright');
const { loopbackUrl } = createRequire(import.meta.url)('../evals/provider.cjs');
export const widths = [390, 768, 1440];

// Caller supplies an authorized synthetic journey, optional session state, and widget URLs.
export async function runJourney({ url, storageState, exercise = async () => {}, screenshotDir }) {
  loopbackUrl(url);
  const browser = await chromium.launch({ headless: true });
  const results = [];
  try {
    for (const width of widths) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, storageState, serviceWorkers: 'block' });
      const errors = [];
      await context.routeWebSocket('**/*', socket => { errors.push('Blocked WebSocket'); socket.close(); });
      await context.route('**/*', async route => {
        try { loopbackUrl(route.request().url()); }
        catch { errors.push('Blocked non-loopback request'); await route.abort(); return; }
        await route.continue();
      });
      context.on('page', page => {
        page.on('pageerror', () => errors.push('Uncaught page error'));
        page.on('console', message => { if (message.type() === 'error') errors.push('Console error'); });
        page.on('requestfailed', () => errors.push('Network request failed'));
        page.on('response', response => { if (response.status() >= 400) errors.push('HTTP ' + response.status()); });
        page.on('websocket', () => errors.push('Unexpected WebSocket: use a controlled fixture without sockets'));
      });
      const page = await context.newPage();
      await page.goto(url, { waitUntil: 'networkidle' });
      await exercise(page, { width });
      const accessibility = await new AxeBuilder({ page }).analyze();
      const serious = accessibility.violations.filter(v => ['critical', 'serious'].includes(v.impact));
      if (screenshotDir) await page.screenshot({ path: resolve(screenshotDir, 'journey-' + width + '.png'), fullPage: true });
      results.push({ width, browserErrors: errors.length, criticalOrSeriousAxe: serious.map(v => v.id) });
      assert.deepEqual(errors, [], 'Console/network failures at width ' + width);
      assert.deepEqual(serious.map(v => v.id), [], 'Serious accessibility violations at width ' + width);
      await context.close();
    }
    return results;
  } finally { await browser.close(); }
}

// Optional live test module must explicitly invoke runJourney with an isolated loopback URL.
// Sessions, tenant switches, fixture rows, form errors and widget frames belong in that module.
