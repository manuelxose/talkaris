import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "pg";
import { z } from "zod";
import { verifyHistoricalSchema } from "./migration-schema.js";

const env = z.object({
  DATABASE_URL: z.string().min(1),
  // Only for an independently verified, backed-up database without a historical ledger.
  MIGRATION_BASELINE_VERSION: z.coerce.number().int().positive().optional(),
  MIGRATION_BASELINE_CONFIRM: z.string().optional(),
  MIGRATION_BASELINE_MAINTENANCE_CONFIRM: z.string().optional(),
}).parse(process.env);

const migrationsDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../migrations");
const confirmation = "VERIFIED_SCHEMA_AND_RECOVERABLE_BACKUP";
type Migration = { name: string; sql: string; checksum: string };


// Distinguishing markers are deliberately checked before a historical baseline is recorded.
// These are NOT a complete schema audit; an operator must also verify the schema and backup.
const markers: Record<number, Array<{ table: string; column?: string; kind?: string }>> = {
  1: [{ table: "projects" }, { table: "documents" }, { table: "messages" }, { table: "sources" }],
  2: [{ table: "tenants" }, { table: "users" }, { table: "tenant_memberships" },
      { table: "platform_settings" }, { table: "projects", column: "tenant_id" }],
  3: [{ table: "platform_settings", column: "default_locale" },
      { table: "platform_settings", column: "seo_title" }],
  4: [{ table: "blog_posts" }],
  5: [{ table: "api_keys" }, { table: "webhooks" }, { table: "ingestion_schedules" },
      { table: "conversation_ratings" }],
  6: [{ table: "handover_events" }],
  7: [{ table: "projects", column: "ai_config" }],
  8: [{ table: "handover_events", column: "claimed_by" }],
  9: [{ table: "projects", column: "enable_handover" }],
  10: [{ table: "sources", column: "source_config" }, { table: "sources", kind: "api_endpoint" }],
  11: [{ table: "sources", kind: "notion" }],
  12: [{ table: "projects", column: "language_mode" },
       { table: "conversations", column: "detected_language" }],
  13: [{ table: "channels" }],
  14: [{ table: "sources", kind: "gemini_file" }],
};

function quoted(identifier: string): string {
  return '"' + identifier.replace(/"/g, '""') + '"';
}

async function exists(client: Client, schema: string, marker: { table: string; column?: string; kind?: string }): Promise<boolean> {
  if (marker.kind) {
    const result = await client.query(
      "SELECT pg_get_constraintdef(c.oid) AS definition FROM pg_constraint c " +
      "JOIN pg_class t ON t.oid=c.conrelid JOIN pg_namespace n ON n.oid=t.relnamespace " +
      "WHERE n.nspname=$1 AND t.relname=$2 AND c.conname='sources_kind_check'",
      [schema, marker.table],
    );
    return result.rows.some((row: { definition: string }) => row.definition.includes("'" + marker.kind + "'"));
  }
  if (marker.column) {
    const result = await client.query(
      "SELECT 1 FROM information_schema.columns WHERE table_schema=$1 AND table_name=$2 AND column_name=$3",
      [schema, marker.table, marker.column],
    );
    return result.rowCount !== null && result.rowCount > 0;
  }
  const result = await client.query(
    "SELECT 1 FROM information_schema.tables WHERE table_schema=$1 AND table_name=$2 AND table_type='BASE TABLE'",
    [schema, marker.table],
  );
  return result.rowCount !== null && result.rowCount > 0;
}

async function inspectMarkers(client: Client, schema: string, latest: number): Promise<boolean[]> {
  const result: boolean[] = [];
  for (let version = 1; version <= latest; version += 1) {
    const checks = markers[version];
    if (!checks?.length) throw new Error("Missing schema marker definition for migration " + version);
    result.push((await Promise.all(checks.map((marker) => exists(client, schema, marker)))).every(Boolean));
  }
  return result;
}

async function hasSchemaObjects(client: Client, schema: string): Promise<boolean> {
  const objects = await client.query(
    "SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace " +
    "WHERE n.nspname=$1 AND c.relkind IN ('r','p','v','m','S','f','c') AND c.relname<>'talkaris_schema_migrations' " +
    "AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.classid='pg_class'::regclass " +
    "AND d.objid=c.oid AND d.deptype='e') " +
    "UNION ALL SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace " +
    "WHERE n.nspname=$1 AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.classid='pg_proc'::regclass AND d.objid=p.oid AND d.deptype='e') " +
    "UNION ALL SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace " +
    "WHERE n.nspname=$1 AND t.typtype IN ('d','e','r','m') AND NOT EXISTS " +
    "(SELECT 1 FROM pg_depend d WHERE d.classid='pg_type'::regclass AND d.objid=t.oid AND d.deptype='e') LIMIT 1", [schema],
  );
  return objects.rows.length > 0;
}

async function verifyMarkers(client: Client, schema: string, version: number, total: number): Promise<void> {
  const disabled = await client.query(
    "SELECT 1 FROM pg_trigger g JOIN pg_class t ON t.oid=g.tgrelid JOIN pg_namespace n ON n.oid=t.relnamespace " +
    "WHERE n.nspname=$1 AND g.tgisinternal AND g.tgenabled NOT IN ('O','A') LIMIT 1", [schema],
  );
  if (disabled.rows.length) throw new Error("Internal constraint triggers are disabled; refusing to migrate");
  if ((await client.query("SHOW session_replication_role")).rows[0].session_replication_role !== 'origin') {
    throw new Error("Migration requires the origin replication role");
  }
  for (let current = 1; current <= total; current += 1) {
    const state = await Promise.all(markers[current].map((marker) => exists(client, schema, marker)));
    if (state.some((present) => (current <= version) !== present)) {
      throw new Error("Migration history disagrees with schema markers; no writes performed");
    }
  }
}

async function verifyBaseline(client: Client, schema: string, version: number, migrations: Migration[]): Promise<void> {
  if (env.MIGRATION_BASELINE_CONFIRM !== confirmation) {
    throw new Error("MIGRATION_BASELINE_CONFIRM must explicitly attest a verified schema and recoverable backup");
  }
  if (env.MIGRATION_BASELINE_MAINTENANCE_CONFIRM !== 'EXCLUSIVE_DDL_FREE_MAINTENANCE') {
    throw new Error("MIGRATION_BASELINE_MAINTENANCE_CONFIRM must attest exclusive DDL-free maintenance");
  }
  await verifyHistoricalSchema(client, schema, version, migrations, false);
  await verifyMarkers(client, schema, version, migrations.length);
}


async function main(): Promise<void> {
  const names = (await readdir(migrationsDir)).filter((name) => name.endsWith(".sql"))
    .sort((a, b) => a.localeCompare(b));
  if (names.some((name, index) => !name.startsWith(String(index + 1).padStart(3, "0") + "_"))) {
    throw new Error("Migration filenames must have contiguous numeric versions");
  }
  if (names.length !== Object.keys(markers).length) {
    throw new Error("Schema marker coverage must be updated before changing the migration set");
  }
  const migrations: Migration[] = await Promise.all(names.map(async (name) => {
    const sql = await readFile(path.join(migrationsDir, name), "utf8");
    return { name, sql, checksum: createHash("sha256").update(sql).digest("hex") };
  }));

  const client = new Client({ connectionString: env.DATABASE_URL });
  await client.connect();
  let locked = false;
  try {
    // Two-key advisory lock serializes migrators for this database and current schema.
    await client.query("SELECT pg_advisory_lock(hashtext(current_database()), hashtext(current_schema()))");
    locked = true;
    const row = await client.query("SELECT current_schema() AS schema");
    const schema = row.rows[0]?.schema as string | undefined;
    if (!schema) throw new Error("No writable schema selected");
    const ledger = quoted(schema) + "." + quoted("talkaris_schema_migrations");
    const ledgerExists = await client.query("SELECT to_regclass($1) AS name", [ledger]);
    const hasLedger = Boolean(ledgerExists.rows[0]?.name);

    if (!hasLedger) {
      const schemaState = await inspectMarkers(client, schema, migrations.length);
      const populated = await hasSchemaObjects(client, schema) || schemaState.some(Boolean) || (await Promise.all(
        ["projects", "tenants", "users", "sources", "documents", "platform_settings"].map(
          (table) => exists(client, schema, { table }),
        ),
      )).some(Boolean);
      const baseline = env.MIGRATION_BASELINE_VERSION;
      if (populated && baseline === undefined) {
        throw new Error("MIGRATION_BASELINE_REQUIRED: existing schema has no migration ledger; " +
          "inspect the actual schema and verify a consistent backup before selecting a baseline");
      }
      if (!populated && baseline !== undefined) {
        throw new Error("Cannot baseline an empty schema; apply migrations normally");
      }
      if (baseline !== undefined) await verifyBaseline(client, schema, baseline, migrations);

      await client.query("BEGIN");
      try {
        await client.query(
          "CREATE TABLE " + ledger + " (" +
          "version integer PRIMARY KEY, filename text NOT NULL UNIQUE, " +
          "checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())",
        );
        if (baseline !== undefined) {
          for (let index = 0; index < baseline; index += 1) {
            const migration = migrations[index];
            await client.query(
              "INSERT INTO " + ledger + " (version,filename,checksum) VALUES ($1,$2,$3)",
              [index + 1, migration.name, migration.checksum],
            );
          }
          console.log("Recorded operator-attested baseline through migration " + baseline);
        }
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    } else if (env.MIGRATION_BASELINE_VERSION !== undefined) {
      throw new Error("Cannot baseline a database that already has a migration ledger");
    }

    const existing = await client.query(
      "SELECT version, filename, checksum FROM " + ledger + " ORDER BY version",
    );
    if (existing.rows.length > migrations.length) {
      throw new Error("Database contains migrations newer than this application");
    }
    for (let index = 0; index < existing.rows.length; index += 1) {
      const entry = existing.rows[index];
      const expected = migrations[index];
      if (entry.version !== index + 1 || entry.filename !== expected.name || entry.checksum !== expected.checksum) {
        throw new Error("Migration history mismatch at version " + (index + 1) + "; refusing to replay or rewrite it");
      }
    }
    if (existing.rows.length === 0 && await hasSchemaObjects(client, schema)) {
      throw new Error("Empty migration ledger on a populated schema; refusing to replay migrations");
    }
    await verifyMarkers(client, schema, existing.rows.length, migrations.length);
    if (existing.rows.length > 0 && existing.rows.length < migrations.length) {
      if (env.MIGRATION_BASELINE_MAINTENANCE_CONFIRM !== 'EXCLUSIVE_DDL_FREE_MAINTENANCE') {
        throw new Error("MIGRATION_BASELINE_MAINTENANCE_CONFIRM must attest exclusive DDL-free maintenance before resuming migrations");
      }
      await verifyHistoricalSchema(client, schema, existing.rows.length, migrations, true);
    }
    for (let index = existing.rows.length; index < migrations.length; index += 1) {
      const migration = migrations[index];
      await client.query("BEGIN");
      try {
        // Migration 003 predates the ledger and overwrites the settings of existing 002 installs.
        const preserveSettings = index === 2 && existing.rows.length === 2;
        if (preserveSettings) {
          await client.query("LOCK TABLE platform_settings IN SHARE ROW EXCLUSIVE MODE");
          await client.query("CREATE TEMP TABLE migration_002_settings ON COMMIT DROP AS SELECT * FROM platform_settings WHERE id='default'");
        }
        await client.query(migration.sql);
        if (preserveSettings) {
          await client.query("UPDATE platform_settings p SET (brand_name, legal_name, tagline, summary, support_email, website_url, product_domain, portal_base_url, api_base_url, widget_base_url, developed_by, demo_project_key, demo_site_key, hero_points, feature_flags, updated_at) = " +
            "(SELECT brand_name, legal_name, tagline, summary, support_email, website_url, product_domain, portal_base_url, api_base_url, widget_base_url, developed_by, demo_project_key, demo_site_key, hero_points, feature_flags, updated_at FROM migration_002_settings) " +
            "WHERE p.id='default' AND EXISTS (SELECT 1 FROM migration_002_settings)");
        }
        await client.query(
          "INSERT INTO " + ledger + " (version,filename,checksum) VALUES ($1,$2,$3)",
          [index + 1, migration.name, migration.checksum],
        );
        await client.query("COMMIT");
        console.log("Applied migration " + migration.name);
      } catch (error) {
        await client.query("ROLLBACK");
        throw new Error("Migration " + migration.name + " failed; transaction rolled back", { cause: error });
      }
    }
    console.log("Migration ledger verified: " + migrations.length + " migrations");
  } finally {
    if (locked) await client.query("SELECT pg_advisory_unlock(hashtext(current_database()), hashtext(current_schema()))");
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
