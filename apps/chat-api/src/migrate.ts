import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "pg";
import { z } from "zod";
import { schemaFingerprint } from "./migration-schema.js";

const env = z.object({
  DATABASE_URL: z.string().min(1),
  // Only for an independently verified, backed-up database without a historical ledger.
  MIGRATION_BASELINE_VERSION: z.coerce.number().int().positive().optional(),
  MIGRATION_BASELINE_CONFIRM: z.string().optional(),
}).parse(process.env);

const migrationsDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../migrations");
const confirmation = "VERIFIED_SCHEMA_AND_RECOVERABLE_BACKUP";
type Migration = { name: string; sql: string; checksum: string };

// Generated from the unmodified migrations in a disposable PostgreSQL 16 database.
const historical = [
  ['9ebfa3c2de62e730df9c75dc5e9827df9167ddc6ddaaff9d4dbd427c4f8d6a15','ff30c773745941f929fd8ba02be3df52475f1813d10147204f57c44346a6c684'],
  ['dfd9a0be34130222c36d2e38fcb81ad37f1c4e089e856fd4c2bbef5e8d092703','549c0e7e34cf39c20f79bac3b0fc8b12f1969f98aea6215ded423fad020f10e4'],
  ['29818e00812a08a0cf81aab7e78f9f6e2abb2d087f18a746d00304f6bf8a623c','55f83da83af001a5eedbee247c179136061087533dd840dc724f10d2c63a1a82'],
  ['6f82332a42313c8e4595cdabe989f67fe101debc3dbc9375a0c5adef92ac2cd4','5d0de48cb4dfc728bfb130241ba030bbd26707fad592d30abb047540aecaceec'],
  ['b410533284dfaa6375fe3f59da05545251a58d1be79bbc4334ad3336c5cf2dc8','753d07e926edf157e63ccf765e851d479c5ed5c614cddde3fe28b4449381106e'],
  ['28de88720cc6a3a52f2732beeb649d34d9e376728feb0827aa9c0e3cfe2e4b64','ba82b88bd33151021b336c34af5305ce81b263284488fbe78181d21e670cf508'],
  ['a3b1d24474df96c12500b4be3d82326a86d0f3f44a8c0ca75a537370bb7f3203','902db2fb36b9463ec490557422f1711e3e6564e603f887cac58c8cd58ccaacd0'],
  ['862ee369c4cb0524a1486cd1d7f67766bff1447342cf96810b1128fd011d6e04','dcd67bb160bde7259a011d9c3f20b1c0d0e8188eeaeebfa48f4b1a104aad554a'],
  ['e412eace255f0e7178720e28a054981b53cd50376cb11c166eb0be67df97f424','02d313653d2f2242ec5ecefb2189dc0976316f56bc7464ca2aca1353e1747ec5'],
  ['353caab22a8400b789e08724842ad324d54c59be9036331320ac7f0cc9c78c2a','2717194d39518281a30700c4a454d40a08aacc3d4eba527df1a527a9a1014c3b'],
  ['66208bc36ec09cd3cc1c162bfd5701942599f4468e774cc773e942f2358cbd45','a8306b146daf4aa3c038c178cff3c4acd3e941d43f346e74dc80136f5aa54c19'],
  ['400cc1d24a2fd6b047506a90204123af8e67f600f2999d2989ce332d0455d35b','128dbf20db8c57be4d20930e5354547fa5ccf54b2ffd64c9716cfcc5af76755a'],
  ['fd93d871c2e8250984fc64b6e7a0851c651d7a3504753c1a5fb98f0dd9925128','c3f904c6555f10aa48e1e80244b8bd7b5471c004fca4bfc44cef5bc3d27810cc'],
  ['5d3ed0318a44cca3665f1c0560d832cff87318eb9ce4b3c745bca6336f939a4a','409d904cdaee1a78c9ed176b61ff6ffc2cdcc541cff18c3ef3707245dbc1ccc9'],
];
const historicalNames = ['001_init.sql', '002_portal_auth.sql', '003_talkaris_launch.sql', '004_blog_module.sql',
  '005_v1_5_features.sql', '006_handover_events.sql', '007_ai_config.sql', '008_handover_queue.sql',
  '009_project_features.sql', '010_api_endpoint_source.sql', '011_more_source_kinds.sql', '012_language_mode.sql',
  '013_channels.sql', '014_gemini_source.sql'];

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

async function verifyBaseline(client: Client, schema: string, version: number, migrations: Migration[]): Promise<void> {
  if (env.MIGRATION_BASELINE_CONFIRM !== confirmation) {
    throw new Error("MIGRATION_BASELINE_CONFIRM must explicitly attest a verified schema and recoverable backup");
  }
  if (version > historical.length || migrations.length !== historical.length || migrations.some((migration, index) => migration.name !== historicalNames[index] || migration.checksum !== historical[index][0])) {
    throw new Error("Historical migration files do not match the verified reference");
  }
  const serverVersion = Number((await client.query("SHOW server_version_num")).rows[0].server_version_num);
  if (Math.floor(serverVersion / 10000) !== 16) throw new Error("Historical baseline verification supports PostgreSQL 16 only");
  if (await schemaFingerprint(client, schema) !== historical[version - 1][1]) {
    throw new Error("Historical schema differs from the verified reference; no writes performed");
  }
  for (let current = 1; current <= migrations.length; current += 1) {
    const state = await Promise.all(markers[current].map((marker) => exists(client, schema, marker)));
    if (state.some((present) => (current <= version) !== present)) {
      throw new Error("Migration baseline " + version + " disagrees with schema markers; no writes performed");
    }
  }
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
      const schemaObjects = await client.query(
        "SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace " +
        "WHERE n.nspname=$1 AND c.relkind IN ('r','p','v','m','S','f') " +
        "AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.classid='pg_class'::regclass " +
        "AND d.objid=c.oid AND d.deptype='e') " +
        "UNION ALL SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace " +
        "WHERE n.nspname=$1 AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.classid='pg_proc'::regclass AND d.objid=p.oid AND d.deptype='e') " +
        "UNION ALL SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace " +
        "WHERE n.nspname=$1 AND t.typtype IN ('d','e','r','m') AND NOT EXISTS " +
        "(SELECT 1 FROM pg_depend d WHERE d.classid='pg_type'::regclass AND d.objid=t.oid AND d.deptype='e') LIMIT 1", [schema],
      );
      const populated = schemaObjects.rows.length > 0 || schemaState.some(Boolean) || (await Promise.all(
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
    for (let index = existing.rows.length; index < migrations.length; index += 1) {
      const migration = migrations[index];
      await client.query("BEGIN");
      try {
        // Migration 003 predates the ledger and overwrites the settings of existing 002 installs.
        const preserveSettings = index === 2 && existing.rows.length === 2;
        if (preserveSettings) {
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
