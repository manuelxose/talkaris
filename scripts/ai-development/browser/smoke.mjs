import http from 'node:http';
import assert from 'node:assert/strict';
import { runJourney } from './journey.mjs';

const html = '<!doctype html><html lang="en"><head><title>Synthetic harness smoke</title><meta name="viewport" content="width=device-width"></head><body><main><h1>Browser harness smoke</h1><label for="name">Synthetic name</label><input id="name"><button type="button" id="check">Check</button><p role="status" id="status"></p><script>document.getElementById("check").onclick=()=>document.getElementById("status").textContent="Fixture checked";</script></main></body></html>';
const server = http.createServer((req, res) => { res.setHeader('content-type', 'text/html'); res.end(html); });
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
try {
  const results = await runJourney({
    url: 'http://127.0.0.1:' + server.address().port,
    exercise: async page => {
      await page.getByLabel('Synthetic name').fill('Fixture');
      await page.getByRole('button', { name: 'Check', exact: true }).click();
      assert.equal(await page.getByRole('status').textContent(), 'Fixture checked');
    },
  });
  console.log(JSON.stringify({ status: 'synthetic-browser-smoke-only', results }, null, 2));
} finally { server.close(); }
