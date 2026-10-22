import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import { Client } from 'pg';
import { databaseUrl, verifyDatabase } from './seed.mjs';
import { classify, saveResults } from './results.mjs';

const api = 'http://127.0.0.1:45101';
assert.equal(process.env.M0_API_URL, api);
const f = JSON.parse(await readFile('evidence/m0/fixtures.json', 'utf8'));
const rows = [];
const cookies = {};
async function request(path, role, method = 'GET', body, extraHeaders = {}) {
  const response = await fetch(api + path, { method, headers: { ...(body ? {'Content-Type':'application/json'} : {}), ...(cookies[role] ? {Cookie:cookies[role]} : {}), ...extraHeaders },
    ...(body ? {body:JSON.stringify(body)} : {}), signal: AbortSignal.timeout(10000), redirect:'error' });
  const text = await response.text(); let data;
  try { data = JSON.parse(text); } catch { data = text; }
  return { status: response.status, data, text, cookie: response.headers.get('set-cookie') };
}
const tenantPath = (key, suffix) => `/v1/portal/tenants/${f.tenants[key].id}/${suffix}`;
async function control(id, action) {
  try { await action(); rows.push({id,status:'pass'}); }
  catch (error) { rows.push({id,status:'unexpected-failure',detail:String(error)}); }
}
async function defect(id, action, healthy, fingerprint, expected, milestone) {
  try {
    const observed = await action();
    rows.push({ id, status: classify(healthy(observed), fingerprint(observed)), expected, milestone, observed,
      detail: JSON.stringify(observed) });
  } catch (error) { rows.push({id,status:'unexpected-failure',expected,milestone,detail:String(error)}); }
}
for (const role of ['superadmin','admin','editor','viewer','outsider']) {
  await control(`login-${role}`, async () => {
    const r = await request('/v1/auth/login', null, 'POST', f.users[role]);
    assert.equal(r.status, 200); assert.ok(r.cookie?.includes('m0_session=')); cookies[role] = r.cookie.split(';')[0];
  });
}
await control('disabled-user-rejected', async () => assert.equal((await request('/v1/auth/login',null,'POST',f.users.disabled)).status, 401));
await control('anonymous-tenant-rejected', async () => assert.equal((await request(tenantPath('a','projects'))).status,401));
await control('outsider-tenant-rejected', async () => assert.equal((await request(tenantPath('a','projects'),'outsider')).status,403));
for (const role of ['admin','editor','viewer','superadmin']) {
  await control(`populated-projects-${role}`, async () => {
    const r = await request(tenantPath('a','projects'),role); assert.equal(r.status,200); assert.ok(r.text.includes('m0-bot-a')); assert.ok(!r.text.includes('m0-bot-b'));
  });
}
await control('foreign-project-id-rejected', async () => assert.equal((await request(tenantPath('a',`projects/${f.projects.b.projectKey}/snippet`),'admin')).status,404));
for(const [role,status] of [['admin',201],['editor',201],['viewer',403],['superadmin',201]]) {
  await control(`source-write-role-${role}`,async()=>assert.equal((await request(tenantPath('a','sources'),role,'POST',{
    projectKey:f.projectKey,sourceKey:`m0-role-${role}`,kind:'html',entryUrl:'http://127.0.0.1:45124/fail',visibility:'private'
  })).status,status));
}
await control('documents-pagination-boundary',async()=>{
  const r=await request(tenantPath('a','documents?limit=50'),'admin'); assert.equal(r.status,200); assert.equal(r.data.length,50);
  assert.ok(r.data.every(item=>item.projectKey===f.projectKey));
});
for (const kind of ['rating','handover']) {
  const suffix = `conversations/${f.conversations.b.id}/${kind}`;
  await defect(`F01-foreign-${kind}-read`, () => request(tenantPath('a',suffix),'viewer'), r => [403,404].includes(r.status),
    r => r.status === 200 && r.text.includes(kind === 'rating' ? f.ratings.b.comment : 'M0 private handover b'), 'Foreign resource must be denied without private data', 'M1');
}
await defect('F01-viewer-foreign-handover-write', () => request(tenantPath('a',`conversations/${f.conversations.b.id}/handover`),'viewer','PUT',{status:'assigned'}),
  r => [403,404].includes(r.status), r => r.status === 200 && r.data.id === f.handover.b.id && r.data.status === 'assigned', 'Viewer cannot modify any handover, including foreign UUIDs', 'M1');
await defect('F02-private-original-public', async () => {
  const response = await fetch(f.privateDocument.url); return {status:response.status,text:await response.text()};
}, r => [401,403,404].includes(r.status), r => r.status === 200 && r.text === f.privateDocument.contentSentinel, 'Private original requires authorized membership', 'M1');
await defect('F04-source-secret-viewer', () => request(tenantPath('a','sources'),'viewer'), r => r.status === 403 || r.status === 200 && !r.text.includes(f.sources.a.secretSentinel),
  r => r.status === 200 && r.text.includes(f.sources.a.secretSentinel), 'Connector credentials must be redacted', 'M1');
await defect('F06-superadmin-api-key-write', () => request(tenantPath('a','api-keys'),'superadmin','POST',{name:'M0 superadmin key',scopes:['conversations:read']}),
  r => r.status === 201, r => r.status === 403 && r.data.code === 'FORBIDDEN', 'Superadmin may legitimately manage tenant credentials', 'M1');
await defect('F07-invitation-index', () => request(tenantPath('a','invitations'),'admin','POST',{email:'new-invite@example.test',role:'editor'}),
  r => r.status === 200, r => r.status === 500 && /constraint "idx_invitations_tenant_email".*does not exist/.test(r.data.message), 'Invitation persists and is delivered to local mail receiver', 'M5');
await defect('F08-rating-index', () => request(`/v1/widget/conversations/${f.conversations.a.id}/rating`,null,'POST',{score:5,comment:'M0 updated rating'}),
  r => r.status === 200, r => r.status === 500 && /constraint "idx_conversation_ratings_unique".*does not exist/.test(r.data.message), 'Rating upsert persists requested score', 'M4');
await defect('F09-canonical-satisfaction', () => request(tenantPath('a','analytics/satisfaction'),'admin'),
  r => r.status === 200 && r.data.total === 1 && Number(r.data.avg) === 4,
  r => r.status === 500 && /distribution.data.*GROUP BY/.test(r.text), 'CSAT matches the one seeded rating; exercise canonical override', 'M4');
await defect('F10-handover-queue', () => request(tenantPath('a','handovers'),'admin'), r => r.status === 200 && r.text.includes(f.handover.a.id),
  r => r.status === 500 && /column c.session_id does not exist/.test(r.text), 'Populated handover queue returns seeded item', 'M4');
for (const [kind, column] of [['conversations','c.session_id'],['leads','le.name'],['analytics','ae.session_id']]) {
  await defect(`F11-export-${kind}`, () => request(tenantPath('a',`export/${kind}`),'admin'), r => r.status === 200 && r.text.includes('\n'),
    r => r.status === 500 && r.text.includes(`column ${column} does not exist`), 'CSV export succeeds against current populated schema', 'M4');
}
await defect('F12-api-key-consumption', () => request(tenantPath('a','conversations'),null,'GET',null,{Authorization:'Bearer m0-key-a'}),
  r => r.status === 200 && r.text.includes(f.conversations.a.id), r => r.status === 401 && r.data.code === 'UNAUTHENTICATED', 'A valid stored scoped key authenticates the advertised API', 'M5');
await defect('F16-test-chat-contract', () => request(tenantPath('a',`projects/${f.projects.a.projectKey}/test-chat`),'admin','POST',{message:'M0 synthetic knowledge'}),
  r => r.status === 200 && typeof r.data.message === 'string', r => r.status === 500 && /Cannot read properties of undefined/.test(r.text), 'Test chat returns deterministic fallback or cited response without provider access', 'M4');

const db = new Client({connectionString:databaseUrl}); await db.connect();
try {
  await verifyDatabase(db);
  await control('disabled-session-revoked',async()=>{
    await db.query("UPDATE users SET status='disabled' WHERE id=$1",[f.users.editor.id]);
    try { assert.equal((await request(tenantPath('a','projects'),'editor')).status,401); }
    finally { await db.query("UPDATE users SET status='active' WHERE id=$1",[f.users.editor.id]); }
  });
  await control('foreign-write-persistence-proof', async () => assert.equal((await db.query('SELECT status FROM handover_events WHERE id=$1',[f.handover.b.id])).rows[0].status,'assigned'));
  // Only one queued job, pointing at a controlled local 503 receiver.
  const job = (await db.query(`INSERT INTO ingestion_jobs(project_id,source_id,status,requested_by) VALUES($1,$2,'queued','m0-regression') RETURNING id`,[f.projects.a.id,f.sources.a.id])).rows[0];
  await defect('F18-all-fetches-fail-worker-status', async () => {
    const worker = spawn(process.execPath,['--import','tsx','apps/ingest-worker/src/main.ts'],{env:process.env,stdio:['ignore','pipe','pipe']});
    let log = ''; worker.stdout.on('data',c=>log+=c); worker.stderr.on('data',c=>log+=c);
    const timeout = setTimeout(()=>worker.kill('SIGKILL'),30000);
    const [code] = await once(worker,'exit'); clearTimeout(timeout); assert.equal(code,0,log);
    return (await db.query('SELECT status,summary,error_text FROM ingestion_jobs WHERE id=$1',[job.id])).rows[0];
  }, r => r.status === 'failed', r => r.status === 'done' && r.summary.failedUrls?.includes('http://127.0.0.1:45124/fail') && r.summary.fetched === 0 && r.summary.processed === 0,
    'All URLs failed must not report successful completion', 'M3');
} finally { await db.end(); }
await control('mail-delivered-only-to-local-receiver',async()=>{
  assert.equal((await request('/v1/auth/password/request-reset',null,'POST',{email:f.users.admin.email})).status,202);
  const response=await fetch('http://127.0.0.1:45126/api/v1/messages'); assert.equal(response.status,200);
  assert.ok((await response.text()).includes(f.users.admin.email),'Synthetic reset email not in local Mailpit');
});
await control('webhook-delivered-to-local-receiver',async()=>{
  assert.equal((await request(`/v1/widget/conversations/${f.conversations.a.id}/handover`,null,'POST',{reason:'M0 controlled local delivery'})).status,200);
  const deadline=performance.now()+5000; let received=false;
  while(performance.now()<deadline) {
    const items=await (await fetch('http://127.0.0.1:45124/state')).json();
    if(items.some(item=>item.url==='/webhook'&&item.body.includes(f.conversations.a.id))) {received=true;break;}
    await delay(50);
  }
  assert.ok(received,'Local webhook receiver did not receive synthetic event');
});
await defect('F02-new-private-upload-public', async () => {
  const sentinel='M0 private original uploaded through actual endpoint';
  const uploaded=await fetch(api+tenantPath('a',`projects/${f.projects.a.projectKey}/assets/document`),{
    method:'POST',headers:{Cookie:cookies.admin,'Content-Type':'text/plain','x-upload-filename':'m0-upload.txt'},body:sentinel});
  assert.equal(uploaded.status,201); const asset=await uploaded.json();
  const path=new URL(asset.url).pathname.replace(/^\/api/,'');
  const downloaded=await fetch(api+path);
  return {status:downloaded.status,text:await downloaded.text(),sentinel};
},r=>[401,403,404].includes(r.status),r=>r.status===200&&r.text===r.sentinel,'New private upload must require authorization on original download','M1');
await defect('F03-loopback-website-fetch', async () => {
  const before=await (await fetch('http://127.0.0.1:45124/state')).json();
  const r=await request(tenantPath('a',`projects/${f.projects.a.projectKey}/website-integration`),'admin','POST',{baseUrl:'http://127.0.0.1:45124/ssrf-probe'});
  const after=await (await fetch('http://127.0.0.1:45124/state')).json();
  return {...r,receiverRequests:after.slice(before.length).map(item=>item.url)};
},
  r => r.status === 400 && r.data.code === 'INVALID_INPUT', r => r.status === 200 && r.data.entryUrl === 'http://127.0.0.1:45124/ssrf-probe' && r.receiverRequests.includes('/robots.txt'),
  'Loopback input rejected before controlled local fetch; no private infrastructure contacted', 'M1');
for (const id of ['F05','F17']) rows.push({id,status:'browser-suite',detail:'See browser.json: populated route direct navigation and reload at 390/768/1440'});
rows.push({id:'original-audit',status:'blocked',detail:'auditoria-2026-10-22/INFORME.md unavailable; tests map roadmap descriptions, exact original reproductions remain unverified'});
await saveResults('regressions',rows);
console.log(JSON.stringify(rows.map(({id,status})=>({id,status})),null,2));
