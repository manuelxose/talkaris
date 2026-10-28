import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { readFile, writeFile, mkdir, mkdtemp, symlink } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { setTimeout as delay } from 'node:timers/promises';
import { createServer } from 'node:http';
import { Client } from 'pg';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const base = process.env.LOCALAPPDATA ? join(process.env.LOCALAPPDATA, 'TalkarisTools') : await mkdtemp(join(tmpdir(), 'talkaris-security-'));
const dbPassword = process.env.M0_SECURITY_DATABASE_URL ? null : (await readFile(join(base, 'talkaris-password'), 'utf8')).trim();
const password = process.env.M0_SECURITY_PASSWORD || (await readFile(join(base, 'native-user-password'), 'utf8')).trim();
const databaseUrl = process.env.M0_SECURITY_DATABASE_URL || `postgresql://talkaris:${encodeURIComponent(dbPassword)}@127.0.0.1:45434/talkaris_security`;
const database = new URL(databaseUrl);
assert.equal(database.hostname, '127.0.0.1'); assert.equal(database.pathname, '/talkaris_security');
const serviceSecret = randomBytes(32).toString('hex');
const sessionSecret = randomBytes(32).toString('hex');
const origin = 'http://127.0.0.1:46201';
const common = Object.fromEntries(['PATH', 'Path', 'SystemRoot', 'TEMP', 'TMP', 'TMPDIR', 'HOME', 'LANG', 'USERPROFILE', 'LOCALAPPDATA'].filter(k => process.env[k]).map(k => [k, process.env[k]]));
const env = { ...common, NODE_ENV: 'test', DATABASE_URL: databaseUrl, PORT: '46201', PORTAL_PUBLIC_URL: origin, ADMIN_BEARER_TOKEN: 'synthetic-admin-token', LEAD_WEBHOOK_SHARED_SECRET: 'synthetic-webhook-token', JWT_SECRET: sessionSecret, INGEST_SERVICE_SECRET: serviceSecret, INGEST_API_ORIGIN: origin, CHAT_API_UPLOAD_DIR: join(base, 'security-uploads') };
const db = new Client({ connectionString: env.DATABASE_URL });
const children = [];
const servers = [];
function start(name, args, overrides = {}) {
  const child = spawn(process.execPath, args, { env: { ...env, ...overrides }, stdio: ['ignore', 'pipe', 'pipe'] });
  child.stdout.on('data', data => process.stdout.write(`[${name}] ${data}`));
  child.stderr.on('data', data => process.stderr.write(`[${name}] ${data}`));
  children.push(child);
  return child;
}
async function ready(child, baseUrl = origin) {
  for (let i = 0; i < 100; i++) {
    if (child.exitCode !== null) throw new Error(`API exited: ${child.exitCode}`);
    try { if ((await fetch(`${baseUrl}/health`)).ok) return; } catch {}
    await delay(200);
  }
  throw new Error('API readiness timeout');
}
async function login(email) {
  const response = await fetch(`${origin}/v1/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password }) });
  assert.equal(response.status, 200, `login ${email}`);
  return response.headers.get('set-cookie').split(';')[0];
}
function token(job, changes = {}, options = {}) {
  return jwt.sign({ sourceId: job.source_id, projectId: job.project_id, ...changes }, serviceSecret, { algorithm: 'HS256', subject: job.id, audience: 'talkaris-ingestion', issuer: 'talkaris-worker', expiresIn: 60, ...options });
}
async function waitJob(id, worker) {
  for (let i = 0; i < 90; i++) {
    if (worker.exitCode !== null) throw new Error(`Worker exited: ${worker.exitCode}`);
    const job = (await db.query('SELECT status,summary,error_text FROM ingestion_jobs WHERE id=$1', [id])).rows[0];
    if (job.status === 'failed') throw new Error(`Ingestion failed: ${job.error_text}`);
    if (job.status === 'done') { assert.deepEqual(job.summary.failedUrls, []); return; }
    await delay(1000);
  }
  throw new Error('Ingestion timed out');
}
function syntheticPdf() {
  const objects = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>', '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'];
  const stream = 'BT /F1 12 Tf 72 720 Td (Synthetic security PDF document with private knowledge.) Tj ET';
  objects.push(`<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`);
  let pdf = '%PDF-1.4\n'; const offsets = [0];
  for (let i = 0; i < objects.length; i++) { offsets.push(Buffer.byteLength(pdf)); pdf += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`; }
  const xref = Buffer.byteLength(pdf); pdf += `xref\n0 ${offsets.length}\n0000000000 65535 f \n`;
  for (const offset of offsets.slice(1)) pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  return Buffer.from(`${pdf}trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
}
try {
  await db.connect();
  assert.deepEqual((await db.query('SELECT current_database() db, current_user usr, inet_server_port() port')).rows[0], { db: 'talkaris_security', usr: decodeURIComponent(database.username), port: Number(database.port || 5432) });
  const passwordHash = await bcrypt.hash(password, 10);
  for (const [slug, name] of [['platform-default', 'Synthetic A'], ['m0-local-second', 'Synthetic B']]) await db.query('INSERT INTO tenants(slug,name) VALUES($1,$2) ON CONFLICT(slug) DO NOTHING', [slug, name]);
  const a = (await db.query("SELECT id FROM tenants WHERE slug='platform-default'")).rows[0];
  const b = (await db.query("SELECT id FROM tenants WHERE slug='m0-local-second'")).rows[0];
  await db.query(`INSERT INTO projects(tenant_id,project_key,name,site_key,bot_name,welcome_message,allowed_domains) VALUES($1,'m0-native-bot','Synthetic bot','m0-native-site','Synthetic bot','Welcome',ARRAY['localhost']) ON CONFLICT(project_key) DO NOTHING`, [a.id]);
  const project = (await db.query("SELECT id,tenant_id FROM projects WHERE project_key='m0-native-bot'")).rows[0]; assert.equal(project.tenant_id, a.id);
  await db.query("INSERT INTO sources(project_id,source_key,kind,entry_url) VALUES($1,'m0-native-source','markdown','http://127.0.0.1:46206/fixture') ON CONFLICT(project_id,source_key) DO NOTHING", [project.id]);
  for (const role of ['admin', 'viewer']) {
    const user = (await db.query(`INSERT INTO users(email,password_hash,display_name,platform_role,status) VALUES($1,$2,$3,'member','active') ON CONFLICT(email) DO UPDATE SET password_hash=EXCLUDED.password_hash,status='active' RETURNING id`, [`m0-${role}@example.test`, passwordHash, `M0 ${role}`])).rows[0];
    await db.query('INSERT INTO tenant_memberships(tenant_id,user_id,role) VALUES($1,$2,$3) ON CONFLICT(tenant_id,user_id) DO UPDATE SET role=EXCLUDED.role', [a.id, user.id, role]);
  }
  await db.query("INSERT INTO users(email,password_hash,display_name,platform_role,status) VALUES('manuelxgon@gmail.com',$1,'Synthetic superadmin','superadmin','active') ON CONFLICT(email) DO UPDATE SET password_hash=EXCLUDED.password_hash,platform_role='superadmin',status='active'", [passwordHash]);
  const hash = passwordHash;
  for (const [role, status] of [['admin', 'active'], ['viewer', 'active'], ['disabled', 'disabled']]) {
    const user = (await db.query(`INSERT INTO users(email,password_hash,display_name,platform_role,status) VALUES($1,$2,$3,'member',$4)
      ON CONFLICT(email) DO UPDATE SET status=EXCLUDED.status,password_hash=EXCLUDED.password_hash RETURNING id`, [`m0-foreign-${role}@example.test`, hash, `M0 foreign ${role}`, status])).rows[0];
    await db.query('INSERT INTO tenant_memberships(tenant_id,user_id,role) VALUES($1,$2,$3) ON CONFLICT(tenant_id,user_id) DO UPDATE SET role=EXCLUDED.role', [b.id, user.id, role === 'disabled' ? 'viewer' : role]);
  }
  const disabled = (await db.query("SELECT id,email FROM users WHERE email='m0-foreign-disabled@example.test'")).rows[0];
  const api = start('api', ['--import', 'tsx', 'apps/chat-api/src/main.ts']);
  await ready(api);
  const cookies = { admin: await login('m0-admin@example.test'), viewer: await login('m0-viewer@example.test'), foreign: await login('m0-foreign-admin@example.test'), foreignViewer: await login('m0-foreign-viewer@example.test'), superadmin: await login('manuelxgon@gmail.com'), disabled: `chat_console_session=${jwt.sign({ sub: disabled.id, email: disabled.email, platformRole: 'member' }, sessionSecret, { expiresIn: 60 })}` };
  const legacyName = `legacy-${randomBytes(6).toString('hex')}.txt`;
  const legacyRoot = join(base, 'security-uploads', 'assets', 'documents'); await mkdir(legacyRoot, { recursive: true });
  await writeFile(join(legacyRoot, legacyName), 'synthetic legacy private content', { flag: 'wx' });
  const legacyProject = (await db.query("SELECT id FROM projects WHERE project_key='m0-native-bot'")).rows[0];
  const legacySource = (await db.query("SELECT id FROM sources WHERE project_id=$1 AND source_key='m0-native-source'", [legacyProject.id])).rows[0];
  await db.query("INSERT INTO documents(project_id,source_id,canonical_url,title,doc_type,visibility) VALUES($1,$2,$3,'synthetic legacy','markdown','private')", [legacyProject.id, legacySource.id, `${origin}/v1/assets/documents/${legacyName}`]);
  assert.equal((await fetch(`${origin}/v1/assets/documents/${legacyName}`)).status, 401, 'legacy anonymous denied');
  assert.equal((await fetch(`${origin}/v1/assets/documents/${legacyName}`, { headers: { cookie: cookies.foreign } })).status, 404, 'legacy foreign denied');
  assert.equal((await fetch(`${origin}/v1/assets/documents/${legacyName}`, { headers: { cookie: cookies.viewer } })).status, 200, 'legacy owner allowed');
  const logo = await fetch(`${origin}/v1/portal/tenants/${a.id}/assets/logo`, { method: 'POST', headers: { cookie: cookies.admin, 'content-type': 'image/png', 'x-upload-filename': 'public.png' }, body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64') });
  assert.equal(logo.status, 201); const logoUrl = new URL((await logo.json()).url).pathname.replace(/^\/api/, '');
  const publicLogo = await fetch(origin + logoUrl); assert.equal(publicLogo.status, 200, 'public logo'); assert.match(publicLogo.headers.get('cache-control') || '', /public.*immutable/);
  const formats = [['private.md', 'text/markdown', Buffer.from('# Synthetic Markdown\nPrivate synthetic content for document ingestion tests.')], ['private.html', 'text/html', Buffer.from('<html><title>Synthetic HTML</title><body>Private synthetic content for ingestion tests.</body></html>')], ['private.pdf', 'application/pdf', syntheticPdf()]];
  let worker;
  for (const [name, type, body] of formats) {
    const upload = await fetch(`${origin}/v1/portal/tenants/${a.id}/projects/m0-native-bot/assets/document`, { method: 'POST', headers: { cookie: cookies.admin, 'content-type': type, 'x-upload-filename': name }, body });
    assert.equal(upload.status, 201, `upload ${name}`); const asset = await upload.json();
    const path = new URL(asset.url).pathname.replace(/^\/api/, '');
    for (const [role, expected] of [['anonymous', 401], ['admin', 200], ['viewer', 200], ['foreign', 404], ['foreignViewer', 404], ['disabled', 401], ['superadmin', 200]]) {
      for (const method of ['GET', 'HEAD']) {
        const response = await fetch(origin + path, { method, headers: { ...(cookies[role] ? { cookie: cookies[role] } : {}), range: 'bytes=0-2', 'if-none-match': '"synthetic"' } });
        assert.ok(expected === 200 ? [200, 206].includes(response.status) : response.status === expected, `${name} ${role} ${method}: ${response.status}`);
        assert.match(response.headers.get('cache-control') || '', /no-store/);
        assert.doesNotMatch(response.headers.get('cache-control') || '', /public|immutable/i);
      }
    }
    const full = await fetch(origin + path, { headers: { cookie: cookies.viewer } }); assert.deepEqual(Buffer.from(await full.arrayBuffer()), body);
    assert.equal((await fetch(origin + path.replace(/[^/]+$/, 'missing.txt'), { headers: { cookie: cookies.admin } })).status, 404);
    const job = (await db.query('SELECT id,source_id,project_id FROM ingestion_jobs WHERE id=$1', [asset.jobId])).rows[0];
    await db.query("UPDATE ingestion_jobs SET status='running' WHERE id=$1", [job.id]);
    const internal = `${origin}/v1/internal/ingestion/${job.id}/asset`;
    assert.equal((await fetch(internal)).status, 401);
    assert.equal((await fetch(internal, { headers: { authorization: 'Bearer invalid' } })).status, 401);
    assert.equal((await fetch(internal, { headers: { authorization: `Bearer ${token(job, {}, { expiresIn: -1 })}` } })).status, 401);
    assert.equal((await fetch(internal, { headers: { authorization: `Bearer ${token(job, {}, { issuer: 'wrong-service' })}` } })).status, 401);
    assert.equal((await fetch(internal, { headers: { authorization: `Bearer ${token(job, { sourceId: '00000000-0000-0000-0000-000000000000' })}` } })).status, 404);
    assert.equal((await fetch(internal, { headers: { authorization: `Bearer ${token(job, { projectId: '00000000-0000-0000-0000-000000000000' })}` } })).status, 404);
    const internalResponse = await fetch(internal, { headers: { authorization: `Bearer ${token(job)}` } });
    assert.equal(internalResponse.status, 200); assert.match(internalResponse.headers.get('cache-control'), /no-store/); assert.deepEqual(Buffer.from(await internalResponse.arrayBuffer()), body);
    await db.query("UPDATE ingestion_jobs SET status='queued' WHERE id=$1", [job.id]);
    worker = start('worker', ['--import', 'tsx', 'apps/ingest-worker/src/main.ts', '--watch']);
    await waitJob(job.id, worker);
    assert.equal((await fetch(internal, { headers: { authorization: `Bearer ${token(job)}` } })).status, 404, 'completed job cannot reuse token');
    const counts = (await db.query('SELECT count(DISTINCT d.id) documents,count(DISTINCT v.id) versions,count(DISTINCT c.id) chunks FROM documents d JOIN document_versions v ON v.document_id=d.id JOIN chunks c ON c.document_id=d.id WHERE d.source_id=$1', [job.source_id])).rows[0];
    assert.ok(Number(counts.documents) && Number(counts.versions) && Number(counts.chunks), `ingestion ${name}`);
    worker.kill(); await new Promise(resolveClose => worker.once('close', resolveClose));
    const repeat = (await db.query("INSERT INTO ingestion_jobs(project_id,source_id,status) VALUES($1,$2,'queued') RETURNING id", [job.project_id, job.source_id])).rows[0];
    worker = start('worker', ['--import', 'tsx', 'apps/ingest-worker/src/main.ts', '--watch']);
    await waitJob(repeat.id, worker); worker.kill(); await new Promise(resolveClose => worker.once('close', resolveClose));
    console.log(`Private asset matrix and real ingestion/restart passed: ${name}`);
  }
  let redirectedRequests = 0;
  const attacker = createServer((_req, res) => { redirectedRequests++; res.end('unexpected'); });
  const redirector = createServer((_req, res) => { res.writeHead(302, { location: 'http://127.0.0.1:46205/stolen' }); res.end(); });
  for (const [server, listenPort] of [[attacker, 46205], [redirector, 46204]]) {
    servers.push(server);
    await new Promise((resolveListen, reject) => server.once('error', reject).listen(listenPort, '127.0.0.1', resolveListen));
  }
  const redirectSource = (await db.query("SELECT id,project_id,entry_url FROM sources WHERE source_key='private-markdown'")).rows[0];
  assert.ok(redirectSource);
  const redirectJob = (await db.query("INSERT INTO ingestion_jobs(project_id,source_id,status) VALUES($1,$2,'queued') RETURNING id", [redirectSource.project_id, redirectSource.id])).rows[0];
  const redirectedWorker = start('worker-redirect', ['--import', 'tsx', 'apps/ingest-worker/src/main.ts', '--watch'], { INGEST_API_ORIGIN: 'http://127.0.0.1:46204' });
  let redirectStatus;
  for (let i = 0; i < 60; i++) {
    if (redirectedWorker.exitCode !== null) throw new Error('Redirect worker exited');
    redirectStatus = (await db.query('SELECT status,summary FROM ingestion_jobs WHERE id=$1', [redirectJob.id])).rows[0];
    if (redirectStatus.status === 'done' || redirectStatus.status === 'failed') break;
    await delay(1000);
  }
  assert.ok(['done', 'failed'].includes(redirectStatus.status));
  assert.ok(redirectStatus.summary.failedUrls.includes(redirectSource.entry_url), 'redirect must fail');
  assert.equal(redirectedRequests, 0, 'service credentials must not follow redirects');
  redirectedWorker.kill(); await new Promise(resolveClose => redirectedWorker.once('close', resolveClose));
  const misconfigured = start('api-same-secret', ['--import', 'tsx', 'apps/chat-api/src/main.ts'], { PORT: '46208', INGEST_SERVICE_SECRET: sessionSecret });
  await ready(misconfigured, 'http://127.0.0.1:46208');
  const sameSecretToken = jwt.sign({ sourceId: redirectSource.id, projectId: redirectSource.project_id }, sessionSecret, { algorithm: 'HS256', subject: redirectJob.id, audience: 'talkaris-ingestion', issuer: 'talkaris-worker', expiresIn: 60 });
  assert.equal((await fetch(`http://127.0.0.1:46208/v1/internal/ingestion/${redirectJob.id}/asset`, { headers: { authorization: `Bearer ${sameSecretToken}` } })).status, 401, 'service secret must differ from user sessions');
  assert.ok([400, 401, 403, 404].includes((await fetch(`${origin}/v1/assets/documents/%2e%2e%2fprivate.txt`)).status), 'traversal denied');
  assert.ok([400, 403, 404].includes((await fetch(`${origin}/v1/assets/documents/%2e%2e%2fprivate.txt`, { headers: { cookie: cookies.admin } })).status), 'authenticated traversal denied');
  const directory = join(base, 'security-uploads', 'assets', 'documents', a.id, 'm0-native-bot'); await mkdir(directory, { recursive: true });
  const linkName = `escape-${randomBytes(6).toString('hex')}.txt`;
  const outside = join(await mkdtemp(join(tmpdir(), 'talkaris-outside-')), 'sentinel.txt'); await writeFile(outside, 'synthetic outside sentinel');
  try {
    await symlink(outside, join(directory, linkName), 'file');
    const project = (await db.query("SELECT id FROM projects WHERE project_key='m0-native-bot'")).rows[0];
    await db.query("INSERT INTO sources(project_id,source_key,kind,entry_url) VALUES($1,'symlink-check','markdown',$2) ON CONFLICT(project_id,source_key) DO UPDATE SET entry_url=EXCLUDED.entry_url", [project.id, `${origin}/api/v1/assets/documents/${a.id}/m0-native-bot/${linkName}`]);
    assert.equal((await fetch(`${origin}/v1/assets/documents/${a.id}/m0-native-bot/${linkName}`, { headers: { cookie: cookies.admin } })).status, 404);
    const logoLink = join(base, 'security-uploads', 'assets', 'logos', linkName);
    await symlink(outside, logoLink, 'file');
    assert.equal((await fetch(`${origin}/v1/assets/logos/${linkName}`)).status, 404);
    console.log('Symlink escape denied.');
  } catch (error) { if (error.code === 'EPERM' || error.code === 'EACCES') console.log('Symlink test unavailable: Windows denied link creation.'); else throw error; }
  console.log('Private asset authorization and ingestion checks passed.');
} finally {
  for (const child of children) if (child.exitCode === null) child.kill();
  for (const server of servers) server.close();
  await db.end();
}
