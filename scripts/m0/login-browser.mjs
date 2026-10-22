// Portal integration only: Google SDK and credentials are synthetic, never sent to Google.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
const require = createRequire(new URL('./tools/package.json', import.meta.url));
const { chromium } = require('@playwright/test');
const { default: AxeBuilder } = require('@axe-core/playwright');
const base = 'http://localhost:45103';
assert.equal(process.env.M0_PORTAL_URL, base);
const results = [];
const browser = await chromium.launch({ headless: true, args: ['--disable-background-networking', '--no-sandbox'] });
await mkdir('evidence/m0/login', { recursive: true });
try {
  for (const width of [390, 768, 1440]) for (const mode of ['disabled', 'configured', 'unavailable']) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, serviceWorkers: 'block' });
    const page = await context.newPage();
    const errors = [];
    let submissions = 0;
    page.on('pageerror', error => errors.push(error.message));
    await context.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (url.href === 'https://accounts.google.com/gsi/client') {
        if (mode === 'unavailable') return route.abort();
        return route.fulfill({ contentType: 'application/javascript', body: `
          let callback;
          window.google = { accounts: { id: {
            initialize(options) { callback = options.callback; },
            renderButton(element, options) {
              if (options.width !== undefined && options.width < 200) throw Error('Invalid button width');
              const button = document.createElement('button');
              button.textContent = 'Continue with Google';
              button.onclick = () => callback({credential:'synthetic-invalid-credential'});
              element.appendChild(button);
            }
          } } };` });
      }
      if (url.origin !== base) return route.abort();
      if (url.pathname.endsWith('/auth/google/config')) return route.fulfill({ json: { clientId: mode === 'disabled' ? null : 'synthetic-client' } });
      if (url.pathname.endsWith('/auth/google')) {
        submissions++;
        assert.deepEqual(route.request().postDataJSON(), { credential: 'synthetic-invalid-credential' });
        return route.fulfill({ status: 401, json: { code: 'INVALID_CREDENTIALS' } });
      }
      return route.continue();
    });
    try {
      await page.goto(`${base}/login`, { waitUntil: 'networkidle' });
      assert.equal(await page.locator('input[type="password"]').isVisible(), true);
      if (mode === 'configured') {
        const button = page.getByRole('button', { name: 'Continue with Google', exact: true });
        await button.waitFor();
        const box = await button.boundingBox();
        assert.ok(box && box.width > 0 && box.x >= 0 && box.x + box.width <= width);
        const axe = await new AxeBuilder({ page }).include('.login-google').analyze();
        assert.deepEqual(axe.violations.filter(v => ['serious', 'critical'].includes(v.impact)).map(v => v.id), []);
        await button.focus();
        await page.keyboard.press('Enter');
        await page.getByRole('alert').filter({ hasText: 'No se pudo acceder con Google' }).waitFor();
        assert.equal(submissions, 1);
      } else if (mode === 'unavailable') {
        await page.getByRole('alert').filter({ hasText: 'Google no está disponible' }).waitFor();
      } else assert.equal(await page.locator('.login-google button').count(), 0);
      assert.deepEqual(errors, []);
      await page.screenshot({ path: `evidence/m0/login/${width}-${mode}.png`, fullPage: true });
      results.push({ width, mode, status: 'passed', submissions });
    } finally { await context.close(); }
  }
} finally {
  await browser.close();
  await writeFile('evidence/m0/login/results.json', JSON.stringify(results, null, 2));
}
console.log(`Login browser: ${results.length}/9 synthetic integration cases passed`);
