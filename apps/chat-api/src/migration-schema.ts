import { createHash } from 'node:crypto';
import type { Client } from 'pg';

// Include names as well as definitions: unexpected objects must not be silently adopted.
export async function schemaFingerprint(client: Client, schema: string): Promise<string> {
  const queries = [
    `SELECT c.relname, c.relkind, c.relrowsecurity, c.relforcerowsecurity,
       CASE WHEN c.relkind IN ('v','m') THEN pg_get_viewdef(c.oid, true) END AS view_definition
     FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
     WHERE n.nspname=$1 AND c.relkind IN ('r','p','v','m','S','f')
       AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.classid='pg_class'::regclass AND d.objid=c.oid AND d.deptype='e')
     ORDER BY c.relname`,
    `SELECT c.relname, a.attnum, a.attname, format_type(a.atttypid,a.atttypmod) AS type,
       a.attnotnull, a.attidentity, a.attgenerated, pg_get_expr(d.adbin,d.adrelid) AS default_value
     FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
       JOIN pg_attribute a ON a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped
       LEFT JOIN pg_attrdef d ON d.adrelid=c.oid AND d.adnum=a.attnum
     WHERE n.nspname=$1 AND c.relkind IN ('r','p','v','m','f')
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
  for (const query of queries) rows.push((await client.query(query, [schema])).rows);
  return createHash('sha256').update(JSON.stringify(rows)).digest('hex');
}
