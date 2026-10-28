import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

test('release schema check requires an exact migration ledger', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'release-check-'));
  const dir = path.dirname(fileURLToPath(import.meta.url));
  const run = (script, args, env = {}) => spawnSync(process.execPath, [path.join(dir, script), ...args], { encoding: 'utf8', env: { ...process.env, ...env } });
  try {
    const files = ['apps/chat-api/dist/main.js', 'apps/ingest-worker/dist/main.js', 'apps/widget/server.mjs', 'apps/portal/dist/portal/server/server.mjs', 'apps/chat-api/migrations/001_test.sql', 'package.json'];
    for (const file of files) {
      await mkdir(path.dirname(path.join(root, file)), { recursive: true });
      await writeFile(path.join(root, file), file === 'package.json' ? '{}' : 'test');
    }
    await mkdir(path.join(root, 'node_modules/pg'), { recursive: true });
    await writeFile(path.join(root, 'node_modules/pg/index.js'), `exports.Client = class { async connect() {} async end() {} async query(sql) { if (sql.includes('current_schema() AS name')) return { rows: [{ name: 'public' }] }; if (sql.includes('SELECT version')) return { rows: JSON.parse(process.env.ROWS) }; return { rows: [] }; } };`);
    const created = run('release-manifest.mjs', ['create', root, 'a'.repeat(40), 'b'.repeat(40)]);
    assert.equal(created.status, 0, created.stderr);
    const digest = created.stdout.trim();
    const manifest = JSON.parse(await readFile(path.join(root, 'manifest.json'), 'utf8'));
    const row = { version: 1, filename: '001_test.sql', checksum: manifest.files['apps/chat-api/migrations/001_test.sql'].sha256 };
    const check = (rows, hash = digest) => run('release-schema-check.mjs', [root, hash], { DATABASE_URL: 'test', ROWS: JSON.stringify(rows) });
    assert.equal(check([row]).status, 0);
    assert.notEqual(check([]).status, 0);
    assert.notEqual(check([{ ...row, checksum: 'wrong' }]).status, 0);
    assert.notEqual(check([row], '0'.repeat(64)).status, 0);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('release schema check against PostgreSQL', { skip: !process.env.TEST_DATABASE_URL }, async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'release-pg-'));
  const dir = path.dirname(fileURLToPath(import.meta.url));
  const run = (script, args) => spawnSync(process.execPath, [path.join(dir, script), ...args], { encoding: 'utf8', env: { ...process.env, DATABASE_URL: process.env.TEST_DATABASE_URL } });
  try {
    await writeFile(path.join(root, 'package.json'), '{"private":true}');
    const install = spawnSync('npm', ['install', '--prefix', root, '--no-audit', '--no-fund', 'pg@8.16.3'], { encoding: 'utf8', shell: process.platform === 'win32' });
    assert.equal(install.status, 0, install.stderr);
    for (const file of ['apps/chat-api/dist/main.js', 'apps/ingest-worker/dist/main.js', 'apps/widget/server.mjs', 'apps/portal/dist/portal/server/server.mjs', 'apps/chat-api/migrations/001_test.sql']) {
      await mkdir(path.dirname(path.join(root, file)), { recursive: true });
      await writeFile(path.join(root, file), 'test');
    }
    const created = run('release-manifest.mjs', ['create', root, 'a'.repeat(40), 'b'.repeat(40)]);
    assert.equal(created.status, 0, created.stderr);
    const digest = created.stdout.trim();
    const manifest = JSON.parse(await readFile(path.join(root, 'manifest.json'), 'utf8'));
    const { Client } = createRequire(path.join(root, 'package.json'))('pg');
    const client = new Client({ connectionString: process.env.TEST_DATABASE_URL });
    await client.connect();
    try {
      assert.notEqual(run('release-schema-check.mjs', [root, digest]).status, 0);
      await client.query('CREATE TABLE talkaris_schema_migrations (version integer, filename text, checksum text)');
      await client.query('INSERT INTO talkaris_schema_migrations VALUES ($1, $2, $3)', [1, '001_test.sql', manifest.files['apps/chat-api/migrations/001_test.sql'].sha256]);
      const valid = run('release-schema-check.mjs', [root, digest]);
      assert.equal(valid.status, 0, valid.stderr);
      await client.query("UPDATE talkaris_schema_migrations SET checksum = 'bad'");
      assert.notEqual(run('release-schema-check.mjs', [root, digest]).status, 0);
    } finally {
      await client.end();
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
