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
await control('F01-original-control-foreign-messages-rejected',async()=>assert.equal((await request(tenantPath('a',`conversations/${f.conversations.b.id}/messages`),'viewer')).status,404));
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
await control('F02-private-original-public', async () => {
  const response = await fetch(f.privateDocument.url);
  assert.ok([401,403,404].includes(response.status)); assert.match(response.headers.get('cache-control') || '', /no-store/);
});
await control('F02-own-member-can-read-original',async()=>{
  const response=await fetch(f.privateDocument.url,{headers:{Cookie:cookies.admin}});assert.equal(response.status,200);assert.equal(await response.text(),f.privateDocument.contentSentinel);
});
await control('F02-foreign-member-original',async()=>{
  const response=await fetch(f.privateDocument.url,{headers:{Cookie:cookies.outsider}}); assert.ok([403,404].includes(response.status)); assert.match(response.headers.get('cache-control') || '', /no-store/);
});
await control('F02-public-logo-remains-anonymous',async()=>{
  const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64');
  const uploaded=await fetch(api+tenantPath('a','assets/logo'),{method:'POST',headers:{Cookie:cookies.admin,'Content-Type':'image/png','x-upload-filename':'m0-public-logo.png'},body:png});
  assert.equal(uploaded.status,201);const asset=await uploaded.json();
  const response=await fetch(api+new URL(asset.url).pathname.replace(/^\/api/,''));assert.equal(response.status,200);assert.ok(Buffer.from(await response.arrayBuffer()).equals(png));
});
await defect('F04-source-secret-viewer', () => request(tenantPath('a','sources'),'viewer'), r => r.status === 403 || r.status === 200 && !r.text.includes(f.sources.a.secretSentinel),
  r => r.status === 200 && r.text.includes(f.sources.a.secretSentinel), 'Connector credentials must be redacted', 'M1');
await defect('F04-original-notion-token-viewer',async()=>{
  const db=new Client({connectionString:databaseUrl});await db.connect();
  try {await verifyDatabase(db);await db.query(`INSERT INTO sources(project_id,source_key,kind,entry_url,source_config) VALUES($1,'m0-notion-secret','notion','http://127.0.0.1:45124/internal',$2)`,[f.projects.a.id,JSON.stringify({token:'m0-fake-notion-token'})]);}
  finally {await db.end();}
  return request(tenantPath('a','sources'),'viewer');
},r=>r.status===403||r.status===200&&!r.text.includes('m0-fake-notion-token'),r=>r.status===200&&r.text.includes('m0-fake-notion-token'),'Notion token must be redacted from viewer source listing','M1');
await defect('F06-superadmin-api-key-write', () => request(tenantPath('a','api-keys'),'superadmin','POST',{name:'M0 superadmin key',scopes:['conversations:read']}),
  r => r.status === 201, r => r.status === 403 && r.data.code === 'FORBIDDEN', 'Superadmin may legitimately manage tenant credentials', 'M1');
for(const [name,path,method,body,success] of [
  ['invite','invitations','POST',{email:'super-invite@example.test',role:'viewer'},200],
  ['webhook','webhooks','POST',{url:'http://127.0.0.1:45124/webhook',events:['handover.requested']},201],
  ['notifications','notification-prefs','PUT',{emailRecipients:['sink@example.test']},200],
]) await defect(`F06-original-superadmin-${name}`,()=>request(tenantPath('a',path),'superadmin',method,body),r=>r.status===success,r=>r.status===403&&r.data.code==='FORBIDDEN','Legitimate superadmin tenant administration must succeed','M1');
await defect('F07-invitation-index', () => request(tenantPath('a','invitations'),'admin','POST',{email:'new-invite@example.test',role:'editor'}),
  r => r.status === 200, r => r.status === 500 && /constraint "idx_invitations_tenant_email".*does not exist/.test(r.data.message), 'Invitation persists and is delivered to local mail receiver', 'M5');
await defect('F08-rating-index', () => request(`/v1/widget/conversations/${f.conversations.a.id}/rating`,null,'POST',{score:5,comment:'M0 updated rating'}),
  r => r.status === 200, r => r.status === 500 && /constraint "idx_conversation_ratings_unique".*does not exist/.test(r.data.message), 'Rating upsert persists requested score', 'M4');
await defect('F09-canonical-satisfaction', () => request(tenantPath('a','analytics/satisfaction'),'admin'),
  r => r.status === 200 && r.data.total === 1 && Number(r.data.avg) === 4,
  r => r.status === 500 && /distribution.data.*GROUP BY/.test(r.text), 'CSAT matches the one seeded rating; exercise canonical override', 'M4');
await defect('F10-handover-queue', () => request(tenantPath('a','handovers'),'admin'), r => r.status === 200 && r.text.includes(f.handover.a.id),
  r => r.status === 500 && /column c.session_id does not exist/.test(r.text), 'Populated handover queue returns seeded item', 'M4');
for(const status of ['assigned','closed']) await defect(`F10-original-${status}-queue`,()=>request(tenantPath('a',`handovers?status=${status}`),'admin'),r=>r.status===200&&Array.isArray(r.data),r=>r.status===500&&r.data.message==='column c.session_id does not exist','Each handover status queries the current schema','M4');
for (const [kind, column] of [['conversations','c.session_id'],['leads','le.name'],['analytics','ae.session_id']]) {
  await defect(`F11-export-${kind}`, () => request(tenantPath('a',`export/${kind}`),'admin'), r => r.status === 200 && r.text.includes('\n'),
    r => r.status === 500 && r.text.includes(`column ${column} does not exist`), 'CSV export succeeds against current populated schema', 'M4');
}
await defect('F12-api-key-consumption', () => request(tenantPath('a','conversations'),null,'GET',null,{Authorization:'Bearer m0-key-a'}),
  r => r.status === 200 && r.text.includes(f.conversations.a.id), r => r.status === 401 && r.data.code === 'UNAUTHENTICATED', 'A valid stored scoped key authenticates the advertised API', 'M5');
await defect('F12-original-created-analytics-key',async()=>{
  const created=await request(tenantPath('a','api-keys'),'admin','POST',{name:'M0 original analytics key',scopes:['analytics:read']});
  assert.equal(created.status,201);assert.ok(created.data.key.startsWith('tlk_'));
  return request(tenantPath('a','analytics/summary'),null,'GET',null,{Authorization:`Bearer ${created.data.key}`});
},r=>r.status===200,r=>r.status===401&&r.data.code==='UNAUTHENTICATED','Created analytics:read key authenticates tenant analytics endpoint','M5');
await defect('F16-test-chat-contract', () => request(tenantPath('a',`projects/${f.projects.a.projectKey}/test-chat`),'admin','POST',{message:'M0 synthetic knowledge'}),
  r => r.status === 200 && typeof r.data.message === 'string', r => r.status === 500 && r.data.message === "Cannot read properties of undefined (reading 'salesKeywords')", 'Test chat returns deterministic fallback or cited response without provider access', 'M4');

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
await control('F02-new-private-upload-public', async () => {
  const sentinel='M0 private original uploaded through actual endpoint';
  const uploaded=await fetch(api+tenantPath('a',`projects/${f.projects.a.projectKey}/assets/document`),{
    method:'POST',headers:{Cookie:cookies.admin,'Content-Type':'text/plain','x-upload-filename':'m0-upload.txt'},body:sentinel});
  assert.equal(uploaded.status,201); const asset=await uploaded.json();
  const db=new Client({connectionString:databaseUrl});await db.connect();
  try {await verifyDatabase(db);assert.equal((await db.query('SELECT visibility FROM sources WHERE project_id=$1 AND source_key=$2',[f.projects.a.id,asset.sourceKey])).rows[0].visibility,'private');}
  finally {await db.end();}
  const path=new URL(asset.url).pathname.replace(/^\/api/,'');
  const downloaded=await fetch(api+path);
  assert.ok([401,403,404].includes(downloaded.status)); assert.match(downloaded.headers.get('cache-control') || '', /no-store/);
  const authorized=await fetch(api+path,{headers:{Cookie:cookies.admin}}); assert.equal(authorized.status,200); assert.equal(await authorized.text(),sentinel);
});
await defect('F03-loopback-website-fetch', async () => {
  const before=await (await fetch('http://127.0.0.1:45124/state')).json();
  const r=await request(tenantPath('a',`projects/${f.projects.a.projectKey}/website-integration`),'admin','POST',{baseUrl:'http://127.0.0.1:45124/ssrf-probe'});
  const after=await (await fetch('http://127.0.0.1:45124/state')).json();
  return {...r,receiverRequests:after.slice(before.length).map(item=>item.url)};
},
  r => r.status === 400 && r.data.code === 'INVALID_INPUT', r => r.status === 200 && r.data.entryUrl === 'http://127.0.0.1:45124/ssrf-probe' && r.receiverRequests.includes('/robots.txt'),
  'Loopback input rejected before controlled local fetch; no private infrastructure contacted', 'M1');
await defect('F03-unsupported-scheme',async()=>{
  const r=await request(tenantPath('a','projects/m0-nonexistent-project/crawl'),'viewer','POST',{url:'ftp://127.0.0.1:45124/internal'});
  return {status:r.status,text:r.text};
},r=>r.status===400,r=>r.status===500&&r.text.includes('TypeError: fetch failed'),'Unsupported scheme produces a controlled validation error','M1');
for(const [scenario,url] of [['original-viewer-loopback','http://127.0.0.1:45124/internal'],['dns-localhost','http://localhost:45124/internal'],['redirect-to-loopback','http://127.0.0.1:45124/redirect'],['slow-private-input','http://127.0.0.1:45124/slow'],['large-private-input','http://127.0.0.1:45124/large']]) {
  await defect(`F03-${scenario}`,async()=>{
    const before=await (await fetch('http://127.0.0.1:45124/state')).json();
    const start=performance.now();
    const r=await request(tenantPath('a','projects/m0-nonexistent-project/crawl'),'viewer','POST',{url});
    const after=await (await fetch('http://127.0.0.1:45124/state')).json();
    const observed=after.slice(before.length);
    return {...r,elapsedMilliseconds:Math.round(performance.now()-start),receiverRequests:observed.map(item=>item.url),receiverBytes:Math.max(0,...observed.map(item=>item.responseBytes??0))};
  },r=>[400,403,404].includes(r.status),r=>r.status===200&&r.data.metadata?.title==='M0 controlled internal fixture'&&r.receiverRequests.includes(scenario==='redirect-to-loopback'?'/internal':new URL(url).pathname)&&(scenario!=='large-private-input'||r.receiverBytes>=2*1024*1024),
    'Viewer cannot crawl controlled private destinations, including redirects and missing projects','M1');
}
for (const id of ['F05','F17']) rows.push({id,status:'browser-suite',detail:'See browser.json: populated route direct navigation and reload at 390/768/1440'});
rows.push({id:'original-audit',status:'source-reviewed',detail:'INFORME.md found in Windows Talkaris evidence workspace; SHA256 21e9a8c843ca37d171205e632ea37de8efc6152c0d22ce536cdec653e1161689. Original F01–F12/F16–F18 flows mapped; no production tests rerun.'});
rows.push({id:'F03-additional-boundaries',status:'blocked',detail:'Private DNS/redirect/slow/2MiB inputs and unsupported scheme are executable. Public-origin timeout/size limits and DNS-rebinding policy are not defined/verified; remain M1 test-extension requirements, not claimed secure. No real private infrastructure probed.'});
await saveResults('regressions',rows);
console.log(JSON.stringify(rows.map(({id,status})=>({id,status})),null,2));
