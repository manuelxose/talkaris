# TALKARIS M0 — execution evidence

Status: **PARTIAL — G0 not approved**. Branch `codex/m0-baseline`, based on `a23eab97df894e3ee3a4a9eaa7d9083b92be8788`. No M1–M8 business fixes, merge, deployment, or production access. Delivery identifiers and subsequent verification are recorded in `.planning/STATE.md` and the official roadmap.

## Architecture and current behavior

| Surface | Source evidence | Observed status |
|---|---|---|
| API | `apps/chat-api/src/main.ts`, `runtime-base.ts` | Actual HTTP endpoints tested with synthetic PostgreSQL fixtures. Base imports register middleware/routes/error handler first; main then prepends canonical overrides with `prependLatestRouteLayer`. Exported stack is recorded by `scripts/m0/api.mjs` after all registrations. F09's canonical SQL error verifies the override, rather than mistakenly testing the base handler. |
| Tenant/session | `runtime-base.ts` `authenticateCookieUser`, `authorizeTenant`; main tenant middleware | Real cookie login and A/B permission controls. Viewer handover writes/foreign reads and source secret exposure reproduced. Superadmin bypass followed by membership-only checks produces F06. |
| PostgreSQL | `apps/chat-api/migrations/001_init.sql` through `014_gemini_source.sql`, `src/migrate.ts` | 14 ordered migrations; pgcrypto/vector required. Runner reexecutes SQL without version ledger/checksums. Fresh and repeated migrations passed locally; populated replay passed. Migration 003 resets platform defaults; harness restores synthetic settings afterward. Production applied versions are unverified. |
| Worker | `apps/ingest-worker/src/main.ts`, `runtime-base.ts` | Import performs one job; `--watch` polls every 15 seconds. `FOR UPDATE SKIP LOCKED` claim transaction. Actual worker reproduced all URL failures reported as `done`. Scheduling, recovery and document transaction completeness remain unverified/outside M0 repairs. |
| Portal | `apps/portal/src/app/app.routes.ts`, `cockpit-store.service.ts`, shell components, `src/server.ts` | 27 authenticated leaf routes (22 tenant, five admin), resolved from source. Browser uses `/api` proxy, SSR session check and first returned tenant selection. Authenticated execution pending complete build. |
| Widget | `apps/widget/server.mjs`, `public/embed.js`, `frame.html` | Existing static widget served on separate M0 loopback port; compiled portal proxies it. No new chat engine. |
| Deployment | `.github/workflows/deploy.yml`, `infra/deploy-chat.sh`, `infra/systemd`, `docs/DEPLOYMENT_PORTAL.md` | Existing main deployment preserved; never triggered by M0 branch. Deployed commit, migrations and external providers unverified. |

Historical audit figures (26 findings, 27 routes, 100 checks, 22 tests) were not assumed current. The original audit was found outside the repository in the Windows Talkaris evidence workspace; `audit-source.md` records its SHA-256 and original reproduction mappings. Latest additions preserve its viewer/nonexistent-project crawl, Notion token listing, created analytics key and superadmin/queue variants; those additions need runtime verification. UI defects remain unverified until real browser evidence exists. Source-contract tests alone do not prove runtime behavior.

## Executed local baseline

The last completed backend run before WSL launch failures recorded:

- 14 passing authentication/ownership controls, 18 expected defect probes, zero unexpected API outcomes; original-audit source blocked, F05/F17 referred to pending browser suite.
- Three harness checks passed: classification of failures/unexpected fixes, TCP guard rejection, populated tenant ownership/role fixtures.
- Existing committed API 8/8 and portal 12/12 unit/source tests passed (20 total), zero skipped. Earlier 22-test references included two pre-existing uncommitted Google-auth tests in the original checkout; those unrelated feature changes were deliberately not transferred into this isolated branch. The production Google deployment described by the audit is not certified by this committed-source baseline.
- Fresh migration, repeat migration and populated migration replay passed. Shared package builds, API/worker/CLI TypeScript builds passed; full monorepo build exited 137 during Angular compilation on two attempts.
- Second failed full build duration 115456 ms. Local API startup 838 ms (one sample); health 10 samples, 1.61–4.01 ms. These are local observations, not performance thresholds or production SLOs. Hardware/Node metadata is in raw `environment.json`.
- WSL exposed approximately 5.9 GiB RAM and 2 GiB swap; concurrent pre-existing processes consumed most memory. Later WSL command launches stalled or returned `Wsl/Service/0x8007274c`. No user processes were stopped and WSL was not restarted.

Runner-local evidence from cancelled obsolete run `39819169410` (commit `a648dae`) additionally verified 22 controls, 18 exact known defects, three harness checks, the same 20 committed tests, populated migration replay and **successful complete monorepo build** (Angular bundle 11.778 seconds). Browser artifacts exposed a harness wait on a mobile-hidden workspace select; corrected in `0825fce`, with final verification pending. Cancellation is not a passing full-run result. Artifacts are attached to that GitHub Actions run; local downloaded copy is ignored under `evidence/ci-39819169410/`.

Cancelled obsolete run `39820886174` (`a583d28`) verified the original-audit additions: **23 controls and 28 exact known-defect probes**, three harness checks, 20 committed tests and complete build (Angular 17.670 seconds), including viewer/nonexistent-project crawler, controlled DNS/redirect, Notion-token exposure and newly created analytics key. Its browser stopped after partial snapshots because the then-unfixed mobile wait was obsolete. These are stage results, not a passing full run. CI setup logs also showed all Chromium runtime libraries already installed; a redundant apt font/upgrade pass took nearly ten minutes. CI now pins Ubuntu 24.04 and installs only the pinned Chromium binary, retaining all test checks.

Raw execution artifacts: ignored `evidence/m0/` with process logs, `run.json`, `regressions.json/.md`, `harness-tests.log`, `unit-tests.log`, `fixture-counts.json`, `runtime-routes.json`, receiver/config/environment evidence. Subsequent runs archive prior evidence under ignored `evidence/m0-history/`; reports must be tied to their run, never mixed. Latest source additions (pagination/Unicode fixtures, extra role/session and local mail/webhook controls, serial TypeScript compilation and final evidence handling) require rerun and must not be counted in the earlier passing totals.

## Finding coverage

All commands use `npm run m0:test` (see `README.md`). API cases are in `scripts/m0/regressions.mjs`; browser cases in `scripts/m0/browser.mjs`.

| ID | Existing behavior / expected behavior | Local evidence | Repair |
|---|---|---|---|
| F01 | Foreign rating/handover disclosed and viewer foreign handover persisted / deny by owner and role | Three exact HTTP defect probes plus persisted DB proof | M1 |
| F02 | Private original publicly served / authorized download only | Existing original and actual upload endpoint followed by anonymous download | M1 |
| F03 | Loopback website accepted and receiver contacted / reject before fetch | Canonical website-integration endpoint and receiver `/robots.txt` proof | M1 |
| F04 | Viewer sees synthetic Authorization sentinel / redact secrets | Populated source list HTTP response | M1 |
| F05 | Missing pipes/populated-table rendering / records visible | Browser implementation with content/count checks; execution blocked by build | M2 |
| F06 | Superadmin credential creation denied without membership / legitimate global management | HTTP 403 FORBIDDEN fingerprint | M1 |
| F07 | Invitation treats partial index as constraint / persist and deliver invitation | HTTP 500 naming `idx_invitations_tenant_email` | M5 |
| F08 | Rating upsert treats unique index as constraint / persist/update score | HTTP 500 naming `idx_conversation_ratings_unique` | M4 |
| F09 | Canonical CSAT aggregation invalid / aggregate fixture correctly | HTTP 500 requiring `distribution.data` GROUP BY | M4 |
| F10 | Queue queries missing session column / populated queue loads | HTTP 500 `c.session_id` | M4 |
| F11 | Three exports query obsolete columns / CSV from current data | HTTP 500 fingerprints for conversations/leads/analytics | M4 |
| F12 | Stored scoped key rejected / advertised API accepts valid key | HTTP 401 UNAUTHENTICATED | M5 |
| F16 | Test-chat uses incompatible project shape / fallback or cited response | HTTP 500 undefined `salesKeywords`; no paid provider | M4 |
| F17 | Direct/reload tenant availability / selected tenant and resource loaded | Browser implementation; execution blocked by build | M2 |
| F18 | Worker reports success after every fetch fails / failed status | Real one-shot worker; DB `done`, discovered 1, fetched/processed 0, failed local URL | M3 |

Known defects execute, not skip. Narrow fingerprints distinguish expected failures from arbitrary 500s. An unexpected fix also fails the gate for review. API passing here means faithful characterization, not fixed security. DNS/redirect crawler variants are implemented; unsupported-scheme/rebinding/timeout/size coverage remains incomplete, so loopback evidence does not certify comprehensive SSRF coverage. Public-logo/authenticated private download/access variants are not yet a complete private-document matrix. Full keyboard/modal and loading/error scenarios remain incomplete; navigation/workspace-switch implementation still needs execution.

## Independent review and remaining gate

A separate read-only architecture/review agent inspected source and raw artifacts. It reported missing reviewed browser baseline; missing widget startup; insufficient SSRF receiver proof/private-upload realism; missing populated-table assertions; stale evidence mixing; completion written before teardown; and migration 003 undoing sanitized settings. Source fixes were implemented; final execution/re-review remains required. No independent GO was issued.

G0 remains PARTIAL/NO-GO for closure: full build now verified on the runner, but no completed browser run/reviewed baseline, no equivalent clean full reruns, and remaining coverage gaps. CI executes only runner-local services and uploads failure artifacts. Its results must be verified, not inferred from workflow presence. M1 must not begin automatically.

Once available, inspect CI browser artifacts, review failure fingerprints/screenshots and table content, commit the reviewed candidate, run two clean full baselines, obtain final independent review, and update roadmap/state with commit/PR identifiers. Recommended first later M1 package: tenant-scoped conversation/handover/rating authorization, using F01 probes as the reproduction; preserve all M0 evidence while replacing the expected failures with correct passing assertions.
