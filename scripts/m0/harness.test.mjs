import assert from 'node:assert/strict';
import { test } from 'node:test';
import net from 'node:net';
import { classify } from './results.mjs';
import { Client } from 'pg';
import { databaseUrl, verifyDatabase } from './seed.mjs';

test('known failures require an exact defect fingerprint; a fix requires baseline review', () => {
  assert.equal(classify(false, true), 'known-defect');
  assert.equal(classify(false, false), 'unexpected-failure');
  assert.equal(classify(true, false), 'unexpected-pass');
});
test('TCP guard denies external, unapproved local, and Unix socket connections', () => {
  for (const options of [{host:'192.0.2.1',port:443},{host:'127.0.0.1',port:5434},{path:'/tmp/production.sock'}]) {
    assert.throws(() => net.connect(options), /M0_EGRESS_DENIED/);
  }
});
test('fresh populated fixtures have explicit ownership and every role', async () => {
  assert.equal(process.env.DATABASE_URL, databaseUrl);
  const db = new Client({ connectionString: databaseUrl }); await db.connect();
  try {
    await verifyDatabase(db);
    for (const table of ['projects','sources','documents','ingestion_jobs','conversations','lead_events']) {
      const sql = table === 'projects'
        ? 'SELECT COUNT(DISTINCT t.id) AS n FROM tenants t JOIN projects x ON t.id=x.tenant_id WHERE t.slug IN (\'m0-a\',\'m0-b\')'
        : `SELECT COUNT(DISTINCT p.tenant_id) AS n FROM ${table} x JOIN projects p ON p.id=x.project_id JOIN tenants t ON t.id=p.tenant_id WHERE t.slug IN ('m0-a','m0-b')`;
      assert.equal(Number((await db.query(sql)).rows[0].n), 2, table);
    }
    assert.equal(Number((await db.query('SELECT COUNT(*) FROM users')).rows[0].count), 6);
    assert.equal(Number((await db.query("SELECT COUNT(DISTINCT role) FROM tenant_memberships")).rows[0].count), 3);
  } finally { await db.end(); }
});
