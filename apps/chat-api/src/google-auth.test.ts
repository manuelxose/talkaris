import assert from "node:assert/strict";
import test from "node:test";
import { OAuth2Client, TokenPayload } from "google-auth-library";
import { googleLoginEmail, verifyGoogleCredential } from "./google-auth.js";

test("Google login requires a verified Google-hosted identity", () => {
  const payload = { sub: "google-user", email: "USER@gmail.com", email_verified: true } as TokenPayload;
  assert.equal(googleLoginEmail(payload), "user@gmail.com");
  assert.equal(googleLoginEmail({ ...payload, email: "user@company.com", hd: "company.com" }), "user@company.com");
  for (const invalid of [undefined, { ...payload, sub: "" }, { ...payload, email_verified: false },
    { ...payload, email_verified: undefined }, { ...payload, email: "user@third-party.com" }]) {
    assert.throws(() => googleLoginEmail(invalid));
  }
});

test("Google login verifies audience, rejects invalid tokens and preserves portal permissions", async () => {
  process.env.CHAT_API_DISABLE_LISTEN = "true";
  process.env.DATABASE_URL = "postgres://unused:unused@localhost/unused";
  process.env.ADMIN_BEARER_TOKEN = "test-token";
  process.env.LEAD_WEBHOOK_SHARED_SECRET = "test-secret";
  process.env.JWT_SECRET = "test-session-secret-long-enough";
  process.env.GOOGLE_CLIENT_ID = "shared-client.apps.googleusercontent.com";
  process.env.CORS_ORIGIN = "https://talkaris.com";
  const { app, pool } = await import("./runtime-base.js");
  const originalVerify = OAuth2Client.prototype.verifyIdToken;
  const originalQuery = pool.query;
  let status = "active";
  let exists = true;
  let databaseCalls = 0;
  OAuth2Client.prototype.verifyIdToken = (async (options: { idToken: string; audience: string }) => {
    assert.equal(options.audience, process.env.GOOGLE_CLIENT_ID);
    if (options.idToken !== "valid") throw new Error("Invalid signature or expired token");
    return { getPayload: () => ({ sub: "google-user", email: "user@gmail.com", email_verified: true }) };
  }) as typeof originalVerify;
  pool.query = (async (sql: string) => {
    databaseCalls++;
    if (sql.includes("FROM tenant_memberships")) return { rows: [{ tenant_id: "tenant-one", role: "viewer" }], rowCount: 1 };
    if (sql.includes("FROM users")) return { rows: exists ? [{ id: "user-one", email: "user@gmail.com", platform_role: "member", status }] : [], rowCount: exists ? 1 : 0 };
    return { rows: [], rowCount: 1 };
  }) as typeof originalQuery;
  const server = app.listen(45127, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address() as { port: number };
  const base = `http://127.0.0.1:${address.port}/v1/auth/google`;
  const login = (credential: unknown, origin = "https://talkaris.com") => fetch(base, {
    method: "POST", headers: { "Content-Type": "application/json", Origin: origin }, body: JSON.stringify({ credential }),
  });
  try {
    const config = await fetch(`${base}/config`);
    assert.deepEqual(await config.json(), { clientId: process.env.GOOGLE_CLIENT_ID });
    assert.equal((await login("valid", "https://attacker.invalid")).status, 403);
    assert.equal((await login(null)).status, 400);
    assert.equal((await login("invalid")).status, 401);
    assert.equal(databaseCalls, 0);
    for (const denied of ["pending", "disabled"]) {
      status = denied;
      assert.equal((await login("valid")).status, 401);
    }
    exists = false;
    assert.equal((await login("valid")).status, 401);
    exists = true;
    status = "active";
    const response = await login("valid");
    assert.equal(response.status, 200);
    assert.match(response.headers.get("set-cookie") ?? "", /HttpOnly/);
    const user = await response.json() as { platformRole: string; memberships: { tenantId: string; role: string }[] };
    assert.equal(user.platformRole, "member");
    assert.equal(user.memberships[0].tenantId, "tenant-one");
    assert.equal(user.memberships[0].role, "viewer");
    await assert.rejects(verifyGoogleCredential("valid", ""));
  } finally {
    OAuth2Client.prototype.verifyIdToken = originalVerify;
    pool.query = originalQuery;
    await new Promise<void>((resolve, reject) => server.close((error?: Error) => error ? reject(error) : resolve()));
    await pool.end();
  }
});
