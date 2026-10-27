import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { Client } from 'pg';

const databaseUrl = process.env.MIGRATION_TEST_DATABASE_URL;
if (!databaseUrl) throw new Error('MIGRATION_TEST_DATABASE_URL must point to a disposable PostgreSQL database');
const names = (await readdir('apps/chat-api/migrations')).filter(name => name.endsWith('.sql')).sort();
const sql = await Promise.all(names.map(name => readFile(`apps/chat-api/migrations/${name}`, 'utf8')));
const admin = new Client({ connectionString: databaseUrl });
await admin.connect();
await admin.query('CREATE EXTENSION IF NOT EXISTS pgcrypto');
await admin.query('CREATE EXTENSION IF NOT EXISTS vector');

function migrate(schema, baseline) {
  const url = new URL(databaseUrl);
  url.searchParams.set('options', `-c search_path=${schema},public`);
  const env = { ...process.env, DATABASE_URL: url.toString() };
  delete env.MIGRATION_BASELINE_VERSION;
  delete env.MIGRATION_BASELINE_CONFIRM;
  delete env.MIGRATION_BASELINE_MAINTENANCE_CONFIRM;
  if (baseline) {
    env.MIGRATION_BASELINE_VERSION = String(baseline);
    env.MIGRATION_BASELINE_CONFIRM = 'VERIFIED_SCHEMA_AND_RECOVERABLE_BACKUP';
    env.MIGRATION_BASELINE_MAINTENANCE_CONFIRM = 'EXCLUSIVE_DDL_FREE_MAINTENANCE';
  }
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['--import', 'tsx', 'apps/chat-api/src/migrate.ts'], { env });
    let output = '';
    child.stdout.on('data', data => { output += data; });
    child.stderr.on('data', data => { output += data; });
    child.on('error', reject);
    child.on('close', code => resolve({ code, output }));
  });
}

test('migration upgrade matrix and failure paths', async () => {
  const schemas = [];
  async function setup(version) {
    const schema = `migration_test_${process.pid}_${schemas.length}`;
    schemas.push(schema);
    await admin.query(`CREATE SCHEMA ${schema}`);
    const client = new Client({ connectionString: databaseUrl, options: `-c search_path=${schema},public` });
    await client.connect();
    for (let i = 0; i < version; i++) await client.query(sql[i]);
    if (version >= 1) {
      if (version === 1) await client.query("INSERT INTO projects(project_key,name,site_key,bot_name,welcome_message) VALUES ('fixture','Fixture','fixture-key','Bot','Hello')");
      else await client.query("INSERT INTO projects(project_key,name,site_key,bot_name,welcome_message,tenant_id) SELECT 'fixture','Fixture','fixture-key','Bot','Hello',id FROM tenants WHERE slug='platform-default'");
    }
    if (version >= 2) {
      await client.query("INSERT INTO users(email,password_hash,status) VALUES ('fixture@example.test','synthetic-hash','active')");
      await client.query("INSERT INTO tenant_memberships(tenant_id,user_id,role) SELECT t.id,u.id,'admin' FROM tenants t, users u WHERE t.slug='platform-default' AND u.email='fixture@example.test'");
      await client.query("UPDATE platform_settings SET brand_name='Custom brand', website_url='https://custom.example.test', feature_flags='{}' WHERE id='default'");
    }
    if (version >= 1) {
      const kind = version >= 14 ? 'gemini_file' : version >= 11 ? 'notion' : 'sitemap';
      await client.query("INSERT INTO sources(project_id,source_key,kind,entry_url) SELECT id,'fixture-source',$1,'https://example.test' FROM projects WHERE project_key='fixture'", [kind]);
    }
    const settings = version >= 2 ? (await client.query("SELECT row_to_json(p) AS settings FROM platform_settings p WHERE id='default'")).rows[0].settings : null;
    return { schema, client, settings };
  }
  try {
    for (let version = 0; version <= 14; version++) {
      const { schema, client, settings } = await setup(version);
      const result = await migrate(schema, version);
      assert.equal(result.code, 0, `v${version}: ${result.output}`);
      for (let i = 0; i < version; i++) assert.doesNotMatch(result.output, new RegExp(`Applied migration ${names[i]}`));
      assert.equal((await client.query('SELECT count(*)::int AS n FROM talkaris_schema_migrations')).rows[0].n, 14);
      assert.equal((await client.query("SELECT count(*)::int AS n FROM pg_indexes WHERE schemaname=current_schema() AND indexname='idx_tenant_memberships_user'")).rows[0].n, 1);
      assert.match((await client.query("SELECT column_default FROM information_schema.columns WHERE table_schema=current_schema() AND table_name='platform_settings' AND column_name='brand_name'")).rows[0].column_default, /Talkaris/);
      if (version >= 1) assert.equal((await client.query("SELECT name FROM projects WHERE project_key='fixture'")).rows[0].name, 'Fixture');
      if (version >= 1) assert.equal((await client.query("SELECT count(*)::int AS n FROM sources WHERE source_key='fixture-source'")).rows[0].n, 1);
      if (version >= 2) {
        assert.equal((await client.query("SELECT password_hash FROM users WHERE email='fixture@example.test'")).rows[0].password_hash, 'synthetic-hash');
        assert.equal((await client.query('SELECT count(*)::int AS n FROM tenant_memberships')).rows[0].n, 1);
        assert.deepEqual((await client.query("SELECT brand_name, website_url, feature_flags FROM platform_settings WHERE id='default'")).rows[0], { brand_name: 'Custom brand', website_url: 'https://custom.example.test', feature_flags: {} });
        const after = (await client.query("SELECT row_to_json(p) AS settings FROM platform_settings p WHERE id='default'")).rows[0].settings;
        for (const [key, value] of Object.entries(settings)) assert.deepEqual(after[key], value, `v${version} changed platform_settings.${key}`);
      }
      const before = (await client.query('SELECT * FROM talkaris_schema_migrations ORDER BY version')).rows;
      const repeat = await migrate(schema);
      assert.equal(repeat.code, 0, repeat.output);
      assert.deepEqual((await client.query('SELECT * FROM talkaris_schema_migrations ORDER BY version')).rows, before);
      if (version === 0) {
        await client.query("UPDATE talkaris_schema_migrations SET checksum='tampered' WHERE version=1");
        assert.match((await migrate(schema)).output, /history mismatch/);
      }
      await client.end();
    }
    const unknown = await setup(0);
    await unknown.client.query('CREATE TABLE unrelated (id integer)');
    assert.match((await migrate(unknown.schema)).output, /MIGRATION_BASELINE_REQUIRED/);
    await unknown.client.end();

    for (const mutation of [
      "ALTER TABLE users ALTER COLUMN status SET DEFAULT 'disabled'",
      'ALTER TABLE users DROP CONSTRAINT users_email_key',
      'DROP INDEX idx_tenant_memberships_user',
      'CREATE TABLE unexpected_table (id integer)',
      "CREATE TYPE unexpected_type AS ENUM ('a')",
      'CREATE POLICY unexpected_policy ON users USING (true)',
    ]) {
      const changed = await setup(2);
      await changed.client.query(mutation);
      const rejected = await migrate(changed.schema, 2);
      assert.notEqual(rejected.code, 0, mutation);
      assert.match(rejected.output, /schema differs from the verified reference/);
      assert.equal((await changed.client.query("SELECT to_regclass('talkaris_schema_migrations') AS ledger")).rows[0].ledger, null);
      assert.equal((await changed.client.query("SELECT password_hash FROM users WHERE email='fixture@example.test'")).rows[0].password_hash, 'synthetic-hash');
      await changed.client.end();
    }

    const disabled = await setup(2);
    await disabled.client.query('ALTER TABLE tenant_memberships DISABLE TRIGGER ALL');
    assert.match((await migrate(disabled.schema, 2)).output, /constraint triggers are disabled/);
    await disabled.client.end();

    for (const ledgerVersion of [0, 1]) {
      const ahead = await setup(2);
      await ahead.client.query('CREATE TABLE talkaris_schema_migrations (version integer PRIMARY KEY, filename text NOT NULL UNIQUE, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())');
      if (ledgerVersion) await ahead.client.query('INSERT INTO talkaris_schema_migrations(version,filename,checksum) VALUES (1,$1,$2)', [names[0], createHash('sha256').update(sql[0]).digest('hex')]);
      const rejected = await migrate(ahead.schema);
      assert.notEqual(rejected.code, 0);
      assert.match(rejected.output, /Empty migration ledger|schema markers/);
      assert.equal((await ahead.client.query("SELECT brand_name FROM platform_settings WHERE id='default'")).rows[0].brand_name, 'Custom brand');
      assert.equal((await ahead.client.query('SELECT count(*)::int AS n FROM talkaris_schema_migrations')).rows[0].n, ledgerVersion);
      await ahead.client.end();
    }

    const interrupted = await setup(2);
    await interrupted.client.query('CREATE TABLE talkaris_schema_migrations (version integer PRIMARY KEY, filename text NOT NULL UNIQUE, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())');
    for (let i = 0; i < 2; i++) await interrupted.client.query('INSERT INTO talkaris_schema_migrations(version,filename,checksum) VALUES ($1,$2,$3)', [i + 1, names[i], createHash('sha256').update(sql[i]).digest('hex')]);
    await interrupted.client.query("CREATE FUNCTION fail_migration() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic interruption'; END $$");
    await interrupted.client.query('CREATE TRIGGER fail_migration BEFORE INSERT ON talkaris_schema_migrations FOR EACH ROW EXECUTE FUNCTION fail_migration()');
    const failed = await migrate(interrupted.schema);
    assert.notEqual(failed.code, 0);
    assert.match(failed.output, /transaction rolled back/);
    assert.equal((await interrupted.client.query("SELECT count(*)::int AS n FROM information_schema.columns WHERE table_schema=current_schema() AND table_name='platform_settings' AND column_name='seo_title'")).rows[0].n, 0);
    assert.equal((await interrupted.client.query('SELECT count(*)::int AS n FROM talkaris_schema_migrations')).rows[0].n, 2);
    await interrupted.client.query('DROP TRIGGER fail_migration ON talkaris_schema_migrations');
    const recovered = await migrate(interrupted.schema);
    assert.equal(recovered.code, 0, recovered.output);
    assert.equal((await interrupted.client.query("SELECT brand_name FROM platform_settings WHERE id='default'")).rows[0].brand_name, 'Custom brand');
    await interrupted.client.end();

    const concurrentSettings = await setup(2);
    await concurrentSettings.client.query('CREATE TABLE talkaris_schema_migrations (version integer PRIMARY KEY, filename text NOT NULL UNIQUE, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())');
    for (let i = 0; i < 2; i++) await concurrentSettings.client.query('INSERT INTO talkaris_schema_migrations(version,filename,checksum) VALUES ($1,$2,$3)', [i + 1, names[i], createHash('sha256').update(sql[i]).digest('hex')]);
    await concurrentSettings.client.query('BEGIN');
    await concurrentSettings.client.query("UPDATE platform_settings SET brand_name='Concurrent update' WHERE id='default'");
    const upgrade = migrate(concurrentSettings.schema);
    let waiting = false;
    for (let i = 0; i < 100 && !waiting; i++) {
      waiting = Boolean((await admin.query("SELECT 1 FROM pg_stat_activity WHERE wait_event_type='Lock' AND query LIKE 'LOCK TABLE platform_settings%'" )).rowCount);
      if (!waiting) await new Promise(resolve => setTimeout(resolve, 100));
    }
    assert.ok(waiting, 'migration did not wait for the active settings update');
    await concurrentSettings.client.query('COMMIT');
    const upgraded = await upgrade;
    assert.equal(upgraded.code, 0, upgraded.output);
    assert.equal((await concurrentSettings.client.query("SELECT brand_name FROM platform_settings WHERE id='default'")).rows[0].brand_name, 'Concurrent update');
    await concurrentSettings.client.end();

    const concurrent = await setup(0);
    const runs = await Promise.all([migrate(concurrent.schema), migrate(concurrent.schema)]);
    for (const run of runs) assert.equal(run.code, 0, run.output);
    assert.equal((await concurrent.client.query('SELECT count(*)::int AS n FROM talkaris_schema_migrations')).rows[0].n, 14);
    await concurrent.client.end();
  } finally {
    for (const schema of schemas) await admin.query(`DROP SCHEMA ${schema} CASCADE`);
    await admin.end();
  }
});
