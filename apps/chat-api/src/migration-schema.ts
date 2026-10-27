import { createHash } from 'node:crypto';
import type { Client } from 'pg';
import { historical, historicalNames } from './migration-reference.js';

// Caller keeps the session advisory lock and its read-only transaction through the release decision.
export async function validateReleaseSchema(client: Client, migrations: Array<{ name: string; checksum: string }>, maintenance: string | undefined): Promise<void> {
  if (maintenance !== 'EXCLUSIVE_DDL_FREE_MAINTENANCE') throw new Error('Exclusive DDL-free maintenance must be independently confirmed');
  const context = (await client.query("SELECT current_schema() AS schema, current_setting('transaction_read_only') AS read_only, current_setting('transaction_isolation') AS isolation")).rows[0];
  if (!context.schema || context.read_only !== 'on' || context.isolation !== 'repeatable read') throw new Error('A repeatable-read, read-only transaction is required');
  const lock = await client.query("SELECT 1 FROM pg_locks WHERE pid=pg_backend_pid() AND locktype='advisory' AND classid=hashtext(current_database())::oid AND objid=hashtext(current_schema())::oid AND objsubid=2 AND mode='ExclusiveLock' AND granted");
  if (!lock.rowCount) throw new Error('The migration advisory lock must be held by this session');
  if (migrations.length !== historical.length) throw new Error('Release migration history has no approved schema reference');
  const quoted = '"' + context.schema.replace(/"/g, '""') + '"';
  const ledger = await client.query(`SELECT version,filename,checksum FROM ${quoted}.talkaris_schema_migrations ORDER BY version`);
  if (ledger.rows.length !== migrations.length || ledger.rows.some((row, index) => row.version !== index + 1 || row.filename !== migrations[index].name || row.checksum !== migrations[index].checksum)) {
    throw new Error('Release migration history does not match the database ledger');
  }
  const disabled = await client.query("SELECT 1 FROM pg_trigger g JOIN pg_class t ON t.oid=g.tgrelid JOIN pg_namespace n ON n.oid=t.relnamespace WHERE n.nspname=$1 AND g.tgisinternal AND g.tgenabled NOT IN ('O','A') LIMIT 1", [context.schema]);
  if (disabled.rowCount || (await client.query("SHOW session_replication_role")).rows[0].session_replication_role !== 'origin') throw new Error('Constraint trigger enforcement is disabled');
  await verifyHistoricalSchema(client, context.schema, ledger.rows.length, migrations, true);
}

export async function verifyHistoricalSchema(client: Client, schema: string, version: number, migrations: Array<{ name: string; checksum: string }>, ignoreLedger: boolean): Promise<void> {
  if (version > historical.length || migrations.length < historical.length || migrations.slice(0, historical.length).some((migration, index) => migration.name !== historicalNames[index] || migration.checksum !== historical[index][0])) {
    throw new Error("Historical migration files do not match the verified reference");
  }
  const serverVersion = Number((await client.query("SHOW server_version_num")).rows[0].server_version_num);
  if (Math.floor(serverVersion / 10000) !== 16) throw new Error("Historical baseline verification supports PostgreSQL 16 only");
  const extensions = await client.query("SELECT extname,extversion FROM pg_extension WHERE extname IN ('pgcrypto','vector') ORDER BY extname");
  if (extensions.rows.length !== 2 || extensions.rows[0].extname !== 'pgcrypto' || extensions.rows[0].extversion !== '1.3' ||
      extensions.rows[1].extname !== 'vector' || !['0.6.0', '0.8.7'].includes(extensions.rows[1].extversion)) {
    throw new Error("Historical baseline verification requires the tested pgcrypto and vector versions");
  }
  if (await schemaFingerprint(client, schema, ignoreLedger) !== historical[version - 1][1]) {
    throw new Error("Historical schema differs from the verified reference; no writes performed");
  }
}

// Include names as well as definitions: unexpected objects must not be silently adopted.
export async function schemaFingerprint(client: Client, schema: string, ignoreLedger = false): Promise<string> {
  const queries = [
    `SELECT c.relname, c.relkind, c.relrowsecurity, c.relforcerowsecurity,
       CASE WHEN c.relkind IN ('v','m') THEN pg_get_viewdef(c.oid, true) END AS view_definition
     FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
     WHERE n.nspname=$1 AND c.relkind IN ('r','p','v','m','S','f','c')
       AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.classid='pg_class'::regclass AND d.objid=c.oid AND d.deptype='e')
     ORDER BY c.relname`,
    `SELECT c.relname, a.attnum, a.attname, format_type(a.atttypid,a.atttypmod) AS type,
       a.attnotnull, a.attidentity, a.attgenerated, pg_get_expr(d.adbin,d.adrelid) AS default_value
     FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
       JOIN pg_attribute a ON a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped
       LEFT JOIN pg_attrdef d ON d.adrelid=c.oid AND d.adnum=a.attnum
     WHERE n.nspname=$1 AND c.relkind IN ('r','p','v','m','f','c')
       AND NOT EXISTS (SELECT 1 FROM pg_depend x WHERE x.classid='pg_class'::regclass AND x.objid=c.oid AND x.deptype='e')
     ORDER BY c.relname,a.attnum`,
    `SELECT t.relname, c.conname, c.contype, c.convalidated, pg_get_constraintdef(c.oid,true) AS definition
     FROM pg_constraint c JOIN pg_class t ON t.oid=c.conrelid JOIN pg_namespace n ON n.oid=t.relnamespace
     WHERE n.nspname=$1 ORDER BY t.relname,c.conname`,
    `SELECT t.relname, x.relname AS index_name, am.amname, i.indisunique, i.indisprimary, i.indisvalid,
       ARRAY(SELECT pg_get_indexdef(i.indexrelid,k,true) FROM generate_series(1,i.indnatts) k) AS columns,
       pg_get_expr(i.indpred,i.indrelid) AS predicate
     FROM pg_index i JOIN pg_class t ON t.oid=i.indrelid JOIN pg_namespace n ON n.oid=t.relnamespace
       JOIN pg_class x ON x.oid=i.indexrelid JOIN pg_am am ON am.oid=x.relam
     WHERE n.nspname=$1 ORDER BY t.relname,x.relname`,
    `SELECT t.relname, g.tgname, pg_get_triggerdef(g.oid,true) AS definition
     FROM pg_trigger g JOIN pg_class t ON t.oid=g.tgrelid JOIN pg_namespace n ON n.oid=t.relnamespace
     WHERE n.nspname=$1 AND NOT g.tgisinternal ORDER BY t.relname,g.tgname`,
    `SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS arguments, pg_get_functiondef(p.oid) AS definition
     FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
     WHERE n.nspname=$1 AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.classid='pg_proc'::regclass AND d.objid=p.oid AND d.deptype='e')
     ORDER BY p.proname,arguments`,
    `SELECT t.typname, t.typtype, format_type(t.typbasetype,t.typtypmod) AS base_type, t.typnotnull,
       ARRAY(SELECT e.enumlabel FROM pg_enum e WHERE e.enumtypid=t.oid ORDER BY e.enumsortorder) AS labels
     FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace
     WHERE n.nspname=$1 AND t.typtype IN ('d','e','r','m')
       AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.classid='pg_type'::regclass AND d.objid=t.oid AND d.deptype='e')
     ORDER BY t.typname`,
    `SELECT c.relname, p.polname, p.polcmd, p.polpermissive,
       pg_get_expr(p.polqual,p.polrelid) AS qualification, pg_get_expr(p.polwithcheck,p.polrelid) AS check_expression
     FROM pg_policy p JOIN pg_class c ON c.oid=p.polrelid JOIN pg_namespace n ON n.oid=c.relnamespace
     WHERE n.nspname=$1 ORDER BY c.relname,p.polname`,
  ];
  const rows = [];
  for (const query of queries) {
    const result = (await client.query(query, [schema])).rows;
    rows.push(ignoreLedger ? result.filter((row) => row.relname !== 'talkaris_schema_migrations') : result);
  }
  return createHash('sha256').update(JSON.stringify(rows)).digest('hex');
}
