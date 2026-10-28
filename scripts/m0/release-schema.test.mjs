import assert from 'node:assert/strict';
import { createHash, randomBytes } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { Client } from 'pg';
import { validateReleaseSchema } from '../../apps/chat-api/src/migration-schema.ts';

const url = process.env.MIGRATION_TEST_DATABASE_URL;
if (!url) throw new Error('MIGRATION_TEST_DATABASE_URL must point to a disposable PostgreSQL database');
const schema = `release_schema_test_${randomBytes(8).toString('hex')}`;
const admin = new Client({ connectionString: url });
await admin.connect();
await admin.query('CREATE EXTENSION IF NOT EXISTS pgcrypto');
await admin.query('CREATE EXTENSION IF NOT EXISTS vector');
await admin.query(`CREATE SCHEMA ${schema}`);
const client = new Client({ connectionString: url, options: `-c search_path=${schema},public` });
await client.connect();
const names = (await readdir('apps/chat-api/migrations')).filter(name => name.endsWith('.sql')).sort();
const migrations = [];

test('release schema validation requires lock, maintenance, matching ledger and structure', async () => {
  const confirmation = 'EXCLUSIVE_DDL_FREE_MAINTENANCE';
  try {
    for (const name of names) {
      const sql = await readFile(`apps/chat-api/migrations/${name}`, 'utf8');
      await client.query(sql);
      migrations.push({ name, checksum: createHash('sha256').update(sql).digest('hex') });
    }
    await client.query('CREATE TABLE talkaris_schema_migrations (version integer PRIMARY KEY, filename text NOT NULL UNIQUE, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())');
    for (const [index, migration] of migrations.entries()) await client.query('INSERT INTO talkaris_schema_migrations(version,filename,checksum) VALUES ($1,$2,$3)', [index + 1, migration.name, migration.checksum]);
    await assert.rejects(validateReleaseSchema(client, migrations, undefined), /maintenance/);
    await assert.rejects(validateReleaseSchema(client, migrations, confirmation), /read-only transaction/);
    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    await assert.rejects(validateReleaseSchema(client, migrations, confirmation), /advisory lock/);
    await client.query('ROLLBACK');
    await client.query('SELECT pg_advisory_lock(hashtext(current_database()), hashtext(current_schema()))');
    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    await validateReleaseSchema(client, migrations, confirmation);
    await assert.rejects(validateReleaseSchema(client, migrations.slice(0, -1), confirmation), /no approved schema reference/);
    await assert.rejects(validateReleaseSchema(client, migrations.map((item, i) => i ? item : { ...item, checksum: 'tampered' }), confirmation), /does not match/);
    await client.query('ROLLBACK');
    await client.query('ALTER TABLE users DROP CONSTRAINT users_email_key');
    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    await assert.rejects(validateReleaseSchema(client, migrations, confirmation), /schema differs/);
    await client.query('ROLLBACK');
    await client.query('ALTER TABLE users ADD CONSTRAINT users_email_key UNIQUE (email)');
    await client.query('ALTER TABLE tenant_memberships DISABLE TRIGGER ALL');
    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    await assert.rejects(validateReleaseSchema(client, migrations, confirmation), /trigger enforcement/);
    await client.query('ROLLBACK');
  } finally {
    await client.query('ROLLBACK');
    await client.query('SELECT pg_advisory_unlock(hashtext(current_database()), hashtext(current_schema()))');
    await client.end();
    await admin.query(`DROP SCHEMA ${schema} CASCADE`);
    await admin.end();
  }
});
