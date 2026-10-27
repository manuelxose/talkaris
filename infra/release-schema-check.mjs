import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const [release, digest] = process.argv.slice(2);
if (!release || !digest || !process.env.DATABASE_URL) throw new Error('Usage: DATABASE_URL=... node release-schema-check.mjs <release> <trusted-manifest-sha256>');
execFileSync(process.execPath, [fileURLToPath(new URL('./release-manifest.mjs', import.meta.url)), 'verify', release, digest], { stdio: 'inherit' });
const manifest = JSON.parse(await readFile(path.join(release, 'manifest.json'), 'utf8'));
const migrations = manifest.migrations.sort();
if (!migrations.length || migrations.some((name, i) => !name.startsWith(`apps/chat-api/migrations/${String(i + 1).padStart(3, '0')}_`))) throw new Error('Invalid migration sequence');
const require = createRequire(path.resolve(release, 'package.json'));
const { Client } = require('pg');
const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  await client.query('BEGIN READ ONLY');
  await client.query('SELECT pg_advisory_xact_lock(hashtext(current_database()), hashtext(current_schema()))');
  const schema = (await client.query('SELECT current_schema() AS name')).rows[0]?.name;
  if (!schema) throw new Error('No current schema');
  const table = `"${schema.replaceAll('"', '""')}"."talkaris_schema_migrations"`;
  const { rows } = await client.query(`SELECT version, filename, checksum FROM ${table} ORDER BY version`);
  if (rows.length !== migrations.length || rows.some((row, i) => row.version !== i + 1 || row.filename !== path.posix.basename(migrations[i]) || row.checksum !== manifest.files[migrations[i]]?.sha256)) {
    throw new Error('Database migration ledger does not exactly match release');
  }
  await client.query('COMMIT');
  console.log(`Database ledger matches ${migrations.length} migrations`);
} finally {
  await client.end();
}
