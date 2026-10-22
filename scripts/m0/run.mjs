import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { createWriteStream } from 'node:fs';
import { mkdir, readFile, writeFile, open, unlink, rename } from 'node:fs/promises';
import { once } from 'node:events';
import { resolve } from 'node:path';
import { cpus, totalmem, platform, release } from 'node:os';
import { setTimeout as delay } from 'node:timers/promises';
import { Client } from 'pg';
import { databaseUrl, seed, verifyDatabase, sanitizeSettings } from './seed.mjs';

process.chdir(new URL('../..', import.meta.url).pathname);
const compose = ['compose', '-f', 'infra/m0-compose.yml'];
const output = resolve('evidence/m0');
await mkdir(output, { recursive: true });
const baseEnv = Object.fromEntries(['PATH','HOME','TMPDIR','LANG','PLAYWRIGHT_BROWSERS_PATH'].filter(k => process.env[k]).map(k => [k, process.env[k]]));
const env = { ...baseEnv, NODE_ENV: 'test', DATABASE_URL: databaseUrl, PORT: '45101',
  ADMIN_BEARER_TOKEN: 'm0-fake-admin-token', LEAD_WEBHOOK_SHARED_SECRET: 'm0-fake-lead-secret',
  JWT_SECRET: 'm0-synthetic-jwt-secret-at-least-16', COOKIE_NAME: 'm0_session',
  DEFAULT_LEAD_WEBHOOK_URL: 'http://127.0.0.1:45124/webhook', SMTP_HOST: '127.0.0.1', SMTP_PORT: '45125', SMTP_FROM: 'M0 <m0@example.test>',
  PORTAL_PUBLIC_URL: 'http://localhost:45103', API_INTERNAL_URL: 'http://127.0.0.1:45101', WIDGET_INTERNAL_URL: 'http://127.0.0.1:45102', CANONICAL_HOST: 'localhost',
  CHAT_API_UPLOAD_DIR: resolve(output, 'uploads'), FETCH_TIMEOUT_MS: '1000', NG_BUILD_MAX_WORKERS: '1', NG_BUILD_PARALLEL_TS: '0',
  NODE_OPTIONS: `--max-old-space-size=512 --require=${resolve('scripts/m0/guard.cjs')}`, M0_API_URL: 'http://127.0.0.1:45101', M0_PORTAL_URL: 'http://localhost:45103' };
const children = [];
const timings = [];
function launch(command, args, name, extra = {}, guarded = true) {
  const log = createWriteStream(resolve(output, `${name}.log`));
  const child = spawn(command, args, { env: { ...(guarded ? env : baseEnv), ...extra }, stdio: ['ignore', 'pipe', 'pipe'], detached: true });
  child.stdout.pipe(log, {end:false}); child.stderr.pipe(log, {end:false});
  child.logFinished = once(log, 'finish');
  child.once('close', () => log.end());
  child.on('error', error => log.write(String(error)));
  children.push(child);
  return child;
}
async function execute(command, args, name, extra = {}, guarded = true) {
  console.log(`M0 stage: ${name}`);
  const start = performance.now();
  const child = launch(command, args, name, extra, guarded);
  const [code, signal] = await once(child, 'close');
  await child.logFinished;
  timings.push({ name, milliseconds: Math.round(performance.now() - start), code, signal });
  console.log(`M0 result: ${name} exit ${code}`);
  assert.equal(code, 0, `${name} failed (${code}/${signal}); see evidence/m0/${name}.log`);
}
async function ready(url, child) {
  const deadline = performance.now() + 120000;
  while (performance.now() < deadline) {
    assert.equal(child.exitCode, null, `Service exited before ${url} was ready`);
    try { if ((await fetch(url, { signal: AbortSignal.timeout(1000) })).ok) return; } catch {}
    await delay(100);
  }
  throw new Error(`Readiness timeout: ${url}`);
}
if (process.argv.includes('--down')) {
  await execute('docker', [...compose, 'down'], 'compose-down', {}, false);
  process.exit(0);
}
const lockPath = '/tmp/talkaris-m0-baseline.lock';
const lock = await open(lockPath, 'wx');
let receivers;
let started = false;
const received = [];
let failure;
let cleanup = 'not-started';
try {
  await mkdir('evidence/m0-history', { recursive:true });
  await rename(output, resolve('evidence/m0-history', String(Date.now())));
  await mkdir(output, { recursive:true });
  await writeFile(resolve(output, 'environment.json'), JSON.stringify({ node: process.version, platform: platform(), release: release(), cpu: cpus()[0]?.model, logicalCPUs: cpus().length, memoryBytes: totalmem(), timestamp: new Date().toISOString() }, null, 2));
  // The fixed M0 project is dedicated. Refuse to reuse a possibly populated database.
  await execute('docker', [...compose, 'ps', '-q'], 'compose-existing', {}, false);
  assert.equal((await readFile(resolve(output, 'compose-existing.log'), 'utf8')).trim(), '', 'M0 services already exist: run npm run m0:down first');
  started = true;
  await execute('docker', [...compose, 'up', '-d', '--wait'], 'compose-up', {}, false);
  process.env.DATABASE_URL = databaseUrl;
  const identity = new Client({ connectionString: databaseUrl });
  await identity.connect();
  try { await verifyDatabase(identity); } finally { await identity.end(); }
  // Every application child receives only synthetic config and a TCP allowlist.
  await execute('npm', ['run','build','-w','@tecnoria-chat/domain'], 'build-domain');
  await execute('npm', ['run','build','-w','@tecnoria-chat/core'], 'build-core');
  await execute('npm', ['run','build','-w','@tecnoria-chat/application'], 'build-application');
  await execute('npm', ['run','build','-w','@tecnoria-chat/infrastructure'], 'build-infrastructure');
  await execute('npm', ['run','migrate','-w','@tecnoria-chat/chat-api'], 'migrations-first');
  await execute('npm', ['run','migrate','-w','@tecnoria-chat/chat-api'], 'migrations-repeat');
  process.env.DATABASE_URL = databaseUrl;
  const fixtures = await seed();
  await execute('npm', ['run','migrate','-w','@tecnoria-chat/chat-api'], 'migrations-populated');
  const settings = new Client({connectionString:databaseUrl}); await settings.connect();
  try { await verifyDatabase(settings); await sanitizeSettings(settings); } finally { await settings.end(); }
  receivers = createServer(async (req, res) => {
    if (req.url === '/state') { res.writeHead(200, {'Content-Type':'application/json'}); res.end(JSON.stringify(received)); return; }
    const chunks = []; for await (const chunk of req) chunks.push(chunk);
    const entry={method:req.method,url:req.url,body:Buffer.concat(chunks).toString()};received.push(entry);
    if(req.url==='/redirect') {res.writeHead(302,{Location:'http://localhost:45124/internal'});res.end();return;}
    if(['/internal','/slow','/large'].includes(req.url)) {
      if(req.url==='/slow') await delay(2000);
      const body='<html lang="en"><title>M0 controlled internal fixture</title><body>'+ (req.url==='/large'?'X'.repeat(2*1024*1024):'Only synthetic localhost data') +'</body></html>';
      entry.responseBytes=Buffer.byteLength(body);
      res.writeHead(200,{'Content-Type':'text/html','Content-Length':Buffer.byteLength(body)});res.end(body);return;
    }
    res.writeHead(req.url === '/webhook' ? 200 : 503, { 'Content-Type': 'text/plain' });
    res.end(req.url === '/webhook' ? 'M0 local receiver' : 'M0 controlled failure');
  });
  await new Promise(resolve => receivers.listen(45124, '127.0.0.1', resolve));
  const apiStart = performance.now();
  const api = launch('node', ['--import','tsx','scripts/m0/api.mjs'], 'api');
  await ready('http://127.0.0.1:45101/health', api);
  timings.push({ name: 'api-startup', milliseconds: Math.round(performance.now() - apiStart), samples: 1 });
  for (let i = 0; i < 10; i++) {
    const start = performance.now(); const response = await fetch('http://127.0.0.1:45101/health');
    assert.equal(response.status, 200); timings.push({ name: 'health', milliseconds: performance.now() - start, sample: i + 1 });
  }
  await execute('node', ['--require','./scripts/m0/guard.cjs','--test','scripts/m0/harness.test.mjs'], 'harness-tests');
  await execute('node', ['scripts/m0/regressions.mjs'], 'regressions');
  await execute('npm', ['test'], 'unit-tests');
  await execute('npm', ['run','build'], 'build', { NG_BUILD_MAX_WORKERS: '1', GOMAXPROCS: '2', GOMEMLIMIT: '128MiB' });
  const widget = launch('npm', ['run','dev:widget'], 'widget', { PORT: '45102', HOST: '127.0.0.1' });
  await ready('http://127.0.0.1:45102/frame.html', widget);
  const portal = launch('node', ['apps/portal/dist/portal/server/server.mjs'], 'portal', { PORT: '45103' });
  await ready('http://localhost:45103/health', portal);
  await execute('node', ['scripts/m0/browser.mjs', ...(process.argv.includes('--capture-browser') ? ['--record'] : [])], 'browser');
} catch (error) {
  failure = String(error);
  console.error(error); process.exitCode = 1;
} finally {
  for (const child of children) {
    if (child.exitCode === null) { try { process.kill(-child.pid, 'SIGTERM'); } catch {} }
  }
  receivers?.closeAllConnections(); receivers?.close();
  if (started) {
    try { await execute('docker', [...compose,'down'], 'compose-down', {}, false); cleanup = 'passed'; }
    catch (error) { cleanup = 'failed'; failure = String(error); console.error(error); process.exitCode = 1; }
  }
  await writeFile(resolve(output, 'receivers.json'), JSON.stringify(received, null, 2));
  await writeFile(resolve(output, 'run.json'), JSON.stringify({status:failure?'failed':'completed',error:failure,cleanup,timings},null,2));
  await lock.close(); await unlink(lockPath);
}
