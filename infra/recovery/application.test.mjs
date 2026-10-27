// Synthetic restore check; run only inside the isolated M0 network namespace.
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { createServer } from 'node:http';
import { setTimeout as delay } from 'node:timers/promises';
import { Client } from 'pg';

assert.deepEqual(await readdir('/sys/class/net'), ['lo']);
assert.deepEqual(Object.keys(process.env).filter(name => /^PG[A-Z_]*$/.test(name)), []);
assert.equal((await readFile('/proc/net/route', 'utf8')).trim().split('\n').length, 1);
assert.ok(!(await readFile('/proc/net/ipv6_route', 'utf8')).split('\n').some(line => line.trim() && !line.trim().endsWith('lo')));
assert.equal(process.env.DATABASE_URL, 'postgresql://m0:m0-synthetic-only@127.0.0.1:45433/talkaris_restored');
for (const [url, expected] of [
  ['http://127.0.0.1:45101/health', 200],
  ['http://127.0.0.1:45101/v1/assets/documents/restore.txt', 200],
  ['http://127.0.0.1:45102/embed.js', 200],
  ['http://127.0.0.1:45103/health', 200],
  ['http://127.0.0.1:45103/login', 200],
]) {
  let response;
  for (let attempt = 0; attempt < 30; attempt++) {
    try { response = await fetch(url); break; } catch { await delay(1000); }
  }
  assert.equal(response?.status, expected, url);
  if (url.includes('restore.txt')) assert.equal(await response.text(), 'synthetic-restored-upload');
}
const login = await fetch('http://127.0.0.1:45101/v1/auth/login', {
  method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ email: 'm0-admin@example.test', password: 'M0-local-only-password!' }),
});
assert.equal(login.status, 200);
assert.ok(login.headers.get('set-cookie')?.includes('m0_session='));

const server = createServer((req, res) => { res.setHeader('content-type', 'text/html'); res.end('<html><title>Recovery fixture</title><body>Only synthetic local content.</body></html>'); });
await new Promise(resolve => server.listen(45124, '127.0.0.1', resolve));
const db = new Client({ connectionString: process.env.DATABASE_URL });
await db.connect();
try {
  const { rows: [source] } = await db.query("INSERT INTO sources(project_id,source_key,kind,entry_url) SELECT id,'recovery-fixture','html','http://127.0.0.1:45124/' FROM projects WHERE project_key='m0-bot-a' RETURNING id,project_id");
  assert.ok(source, 'restored project is missing');
  const { rows: [job] } = await db.query("INSERT INTO ingestion_jobs(project_id,source_id,status) VALUES ($1,$2,'queued') RETURNING id", [source.project_id, source.id]);
  let status;
  for (let attempt = 0; attempt < 40; attempt++) {
    status = (await db.query('SELECT status FROM ingestion_jobs WHERE id=$1', [job.id])).rows[0]?.status;
    if (status === 'done' || status === 'failed') break;
    await delay(1000);
  }
  assert.equal(status, 'done', 'restored worker did not process the local fixture');
  assert.ok((await db.query('SELECT 1 FROM documents WHERE source_id=$1', [source.id])).rowCount, 'worker did not restore a document');
} finally {
  await db.end();
  await new Promise(resolve => server.close(resolve));
}
console.log('Synthetic restored API, login, upload, widget, portal and ingestion passed');
