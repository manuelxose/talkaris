// Run only against a disposable PostgreSQL 16 database with pgcrypto and vector installed.
import { createHash, randomBytes } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { Client } from 'pg';
import { schemaFingerprint } from '../../apps/chat-api/src/migration-schema.ts';

const url = process.env.MIGRATION_TEST_DATABASE_URL;
if (!url) throw new Error('A disposable MIGRATION_TEST_DATABASE_URL is required');
const schema = `migration_reference_${randomBytes(8).toString('hex')}`;
const client = new Client({ connectionString: url });
await client.connect();
try {
  const version = Number((await client.query('SHOW server_version_num')).rows[0].server_version_num);
  if (Math.floor(version / 10000) !== 16) throw new Error('Reference fingerprints require PostgreSQL 16');
  await client.query(`CREATE SCHEMA ${schema}`);
  await client.query(`SET search_path TO ${schema}, public`);
  const names = (await readdir('apps/chat-api/migrations')).filter(name => name.endsWith('.sql')).sort();
  for (const name of names) {
    const sql = await readFile(`apps/chat-api/migrations/${name}`, 'utf8');
    await client.query(sql);
    console.log(`${name} ${createHash('sha256').update(sql).digest('hex')} ${await schemaFingerprint(client, schema)}`);
  }
} finally {
  await client.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
  await client.end();
}
