import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { Client } from 'pg';
import bcrypt from 'bcryptjs';

export const databaseUrl = 'postgresql://m0:m0-synthetic-only@127.0.0.1:45432/talkaris_m0';
export async function sanitizeSettings(db) {
  await db.query(`UPDATE platform_settings SET portal_base_url='http://localhost:45103',api_base_url='http://localhost:45103/api',widget_base_url='http://localhost:45103/widget/',website_url='http://localhost:45103',seo_image_url='',demo_project_key='m0-bot-a',demo_site_key='m0-synthetic-site-a' WHERE id='default'`);
}
export async function verifyDatabase(client) {
  assert.equal(process.env.DATABASE_URL, databaseUrl, 'Only the dedicated M0 database is allowed');
  const { rows: [identity] } = await client.query('SELECT current_database() AS db, current_user AS usr, inet_server_port() AS port');
  assert.deepEqual(identity, { db: 'talkaris_m0', usr: 'm0', port: 5432 });
}

export async function seed() {
  const db = new Client({ connectionString: databaseUrl });
  await db.connect();
  try {
    await verifyDatabase(db);
    // A fresh Compose database is mandatory; never delete an existing dataset.
    assert.equal(Number((await db.query('SELECT COUNT(*) FROM users')).rows[0].count), 0, 'Database is not fresh');
    await db.query('BEGIN');
    const f = { tenants: {}, users: {}, projects: {}, conversations: {}, sources: {}, ratings: {}, handover: {} };
    const password = 'M0-local-only-password!';
    const passwordHash = await bcrypt.hash(password, 4);
    for (const role of ['superadmin', 'admin', 'editor', 'viewer', 'disabled', 'outsider']) {
      const user = { id: randomUUID(), email: `m0-${role}@example.test`, password };
      await db.query('INSERT INTO users(id,email,password_hash,display_name,platform_role,status) VALUES($1,$2,$3,$4,$5,$6)',
        [user.id, user.email, passwordHash, `M0 ${role}`, role === 'superadmin' ? 'superadmin' : 'member', role === 'disabled' ? 'disabled' : 'active']);
      f.users[role] = user;
    }
    for (const key of ['a', 'b']) {
      const tenant = { id: randomUUID() };
      const project = { id: randomUUID(), projectKey: `m0-bot-${key}`, siteKey: `m0-synthetic-site-${key}` };
      const source = { id: randomUUID(), secretSentinel: `m0-fake-source-secret-${key}` };
      const conversation = { id: randomUUID() };
      f.tenants[key] = tenant; f.projects[key] = project; f.sources[key] = source; f.conversations[key] = conversation;
      await db.query('INSERT INTO tenants(id,slug,name) VALUES($1,$2,$3)', [tenant.id, `m0-${key}`, `M0 Tenant ${key.toUpperCase()}`]);
      for (const role of ['admin', 'editor', 'viewer', 'disabled']) {
        if (key === 'a') await db.query('INSERT INTO tenant_memberships(tenant_id,user_id,role) VALUES($1,$2,$3)', [tenant.id, f.users[role].id, role === 'disabled' ? 'viewer' : role]);
      }
      if (key === 'b') await db.query('INSERT INTO tenant_memberships(tenant_id,user_id,role) VALUES($1,$2,$3)', [tenant.id, f.users.outsider.id, 'admin']);
      await db.query(`INSERT INTO projects(id,tenant_id,project_key,name,site_key,bot_name,welcome_message,allowed_domains,prompt_policy,cta_config,lead_sink)
        VALUES($1,$2,$3,$4,$5,$4,'M0 synthetic welcome',ARRAY['localhost'],'{"guardrails":[],"outOfScopeMessage":"M0 fallback"}','{"primaryLabel":"M0","primaryUrl":"http://localhost:45103"}','{"url":"http://127.0.0.1:45124/webhook"}')`,
        [project.id, tenant.id, project.projectKey, `M0 Bot ${key}`, project.siteKey]);
      await db.query(`INSERT INTO sources(id,project_id,source_key,kind,entry_url,visibility,source_config) VALUES($1,$2,'m0-local','html','http://127.0.0.1:45124/fail','private',$3)`,
        [source.id, project.id, JSON.stringify({ headers: { Authorization: `Bearer ${source.secretSentinel}` } })]);
      await db.query('INSERT INTO conversations(id,project_id,site_key,origin) VALUES($1,$2,$3,$4)', [conversation.id, project.id, project.siteKey, 'http://localhost:45103']);
      await db.query(`INSERT INTO messages(conversation_id,project_id,role,body) VALUES($1,$2,'user','M0 synthetic question'),($1,$2,'assistant','M0 synthetic answer')`, [conversation.id, project.id]);
      await db.query(`INSERT INTO lead_events(project_id,conversation_id,payload) VALUES($1,$2,'{"name":"M0 Synthetic Lead","email":"lead@example.test","need":"Synthetic local test"}')`, [project.id, conversation.id]);
      await db.query(`INSERT INTO analytics_events(project_id,conversation_id,event_type,payload) VALUES($1,$2,'message_sent','{"m0":true}')`, [project.id, conversation.id]);
      await db.query(`INSERT INTO documents(project_id,source_id,canonical_url,title,doc_type,visibility,current_version,last_ingested_at) VALUES($1,$2,$3,'M0 Synthetic Private Document','markdown','private',1,'2026-10-22T00:00:00Z')`, [project.id, source.id, `http://127.0.0.1:45101/v1/assets/documents/m0-${key}.txt`]);
      const document = (await db.query('SELECT id FROM documents WHERE source_id=$1', [source.id])).rows[0];
      const version = (await db.query(`INSERT INTO document_versions(document_id,version_no,checksum,raw_text,normalized_text) VALUES($1,1,'m0-checksum','M0 synthetic knowledge','M0 synthetic knowledge') RETURNING id`, [document.id])).rows[0];
      await db.query(`INSERT INTO chunks(project_id,document_id,document_version_id,chunk_index,body,search_vector) VALUES($1,$2,$3,0,'M0 synthetic knowledge',to_tsvector('simple','M0 synthetic knowledge'))`, [project.id, document.id, version.id]);
      await db.query(`INSERT INTO ingestion_jobs(project_id,source_id,status,summary) VALUES($1,$2,'done','{"m0":true,"created":1}')`, [project.id, source.id]);
      await db.query(`INSERT INTO ingestion_jobs(project_id,source_id,status,error_text,summary) VALUES($1,$2,'failed','M0 controlled historical failure','{"failedUrls":["http://127.0.0.1:45124/fail"]}')`, [project.id,source.id]);
      await db.query(`INSERT INTO lead_events(project_id,conversation_id,payload,delivery_status) VALUES($1,$2,$3,'failed')`,[project.id,conversation.id,JSON.stringify({name:'María "M0", 日本語\nSynthetic',email:'unicode@example.test',company:null,need:'=SUM(1,1)'})]);
      if(key==='a') await db.query(`INSERT INTO documents(project_id,source_id,canonical_url,title,doc_type,visibility,last_ingested_at)
        SELECT $1,$2,'http://127.0.0.1:45124/boundary/'||n,'M0 Synthetic Private Document '||n||' — información 日本語','markdown','private',CASE WHEN n%2=0 THEN NULL ELSE '2026-10-22T00:00:00Z'::timestamptz END FROM generate_series(1,51) n`,[project.id,source.id]);
      f.ratings[key] = { score: key === 'a' ? 4 : 2, comment: `M0 private rating ${key}` };
      await db.query('INSERT INTO conversation_ratings(conversation_id,project_id,score,comment) VALUES($1,$2,$3,$4)', [conversation.id, project.id, f.ratings[key].score, f.ratings[key].comment]);
      f.handover[key] = (await db.query(`INSERT INTO handover_events(conversation_id,project_id,reason) VALUES($1,$2,$3) RETURNING id`, [conversation.id, project.id, `M0 private handover ${key}`])).rows[0];
      await db.query(`INSERT INTO notification_prefs(tenant_id,email_recipients) VALUES($1,ARRAY['sink@example.test'])`, [tenant.id]);
      await db.query(`INSERT INTO webhooks(tenant_id,url,events,secret_hash,description) VALUES($1,'http://127.0.0.1:45124/webhook',ARRAY['handover.requested'],'m0-fake-hash','M0 local receiver')`, [tenant.id]);
      await db.query(`INSERT INTO ingestion_schedules(tenant_id,name,source_ids,cron_expr,active) VALUES($1,'M0 paused schedule',ARRAY[$2]::uuid[],'0 0 * * *',false)`, [tenant.id, source.id]);
      await db.query(`INSERT INTO invitations(tenant_id,email,role,token_hash) VALUES($1,'invited@example.test','viewer',$2)`, [tenant.id, `m0-fake-invite-${key}`]);
      await db.query(`INSERT INTO api_keys(tenant_id,name,key_hash,key_prefix,scopes) VALUES($1,'M0 synthetic key',$2,'tlk_m0_fake',ARRAY['conversations:read'])`, [tenant.id, createHash('sha256').update(`m0-key-${key}`).digest('hex')]);
    }
    await db.query(`INSERT INTO access_requests(name,company,email,requested_tenant_name) VALUES('M0 Applicant','M0 Synthetic','request@example.test','M0 Requested')`);
    await sanitizeSettings(db);
    await db.query('COMMIT');
    Object.assign(f, { tenantId: f.tenants.a.id, projectKey: f.projects.a.projectKey, conversationId: f.conversations.a.id, admin: f.users.superadmin,
      privateDocument: { url: 'http://127.0.0.1:45101/v1/assets/documents/m0-a.txt', contentSentinel: 'M0 synthetic private original A' } });
    await mkdir('evidence/m0/uploads/assets/documents', { recursive: true });
    await writeFile('evidence/m0/uploads/assets/documents/m0-a.txt', f.privateDocument.contentSentinel);
    await writeFile('evidence/m0/uploads/assets/documents/m0-b.txt', 'M0 synthetic private original B');
    await writeFile('evidence/m0/fixtures.json', JSON.stringify(f, null, 2));
    const counts = {};
    for (const table of ['tenants','users','tenant_memberships','projects','sources','documents','document_versions','chunks','conversations','messages','lead_events','conversation_ratings','handover_events','ingestion_jobs','invitations','api_keys','notification_prefs','webhooks','ingestion_schedules']) {
      counts[table] = Number((await db.query(`SELECT COUNT(*) FROM ${table}`)).rows[0].count);
      assert.ok(counts[table] > 0, `${table} must be populated`);
    }
    await writeFile('evidence/m0/fixture-counts.json', JSON.stringify(counts, null, 2));
    return f;
  } catch (error) {
    await db.query('ROLLBACK'); throw error;
  } finally { await db.end(); }
}
