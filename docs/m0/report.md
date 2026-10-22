# TALKARIS M0 - EXECUTION REPORT

## 1. Executive outcome

**GO for M0 / Gate G0.** Reproducible engineering baseline completed; known product defects remain. No M1-M8 repairs, merge, deployment, production/staging/customer tests or paid provider calls were performed. No unresolved M0 implementation blocker remains after independent review. This is permission to begin evidence-based repairs, not product security or launch approval.

## 2. Git state

Branch `codex/m0-baseline`, isolated from the original dirty checkout; base `a23eab97df894e3ee3a4a9eaa7d9083b92be8788`. Verified implementation SHA: `fdababf429180af41478858c5d6e6577f2a49262`. Final documentation is a subsequent scoped commit. [PR #1](https://github.com/manuelxose/tecnoria-chat-platform/pull/1) is open and unmerged. Unrelated Google-auth work and local configuration were not transferred or committed.

## 3. Architecture baseline

Existing surfaces retained: Express chat-api, PostgreSQL/pgvector, ingest-worker, ops-cli, Angular portal, static widget and shared packages. Actual API inventory contains 110 registered route layers. `main.ts` prepends canonical handlers over `runtime-base.ts`; regressions exercise the actual stack, including F09's canonical SQL error. Session/tenant middleware and membership checks have inconsistent authorization, reproduced without repair.

All 14 migrations executed on a fresh synthetic database, repeated, then replayed against populated fixtures. The migration runner has no version/checksum ledger. Migration 003 resets platform settings; the harness reapplies sanitized settings afterward. Actual worker one-shot execution reproduces F18. Production deployed SHA, applied migrations, credentials, Google authentication and providers are **unverified**: external verification is blocked by the localhost-only scope.

## 4. Test infrastructure

Dedicated `talkaris-m0` Compose project, PostgreSQL tmpfs, verified database identity and loopback bindings. Sanitized application environment with Node TCP allowlist; browser external requests aborted. Mailpit and local HTTP/webhook/crawler receivers replace external services. This is a controlled development harness, not a hostile-code sandbox.

Fixtures include tenants A/B, six identity types (superadmin/admin/editor/viewer/disabled/outsider), explicit ownership, projects, conversations/messages, leads, ratings, handovers, invitations, keys, sources, jobs/errors, webhooks and schedules. There are 53 documents, pagination boundaries, Unicode/null values, private originals and public-logo controls. No customer snapshots or secrets are copied.

Reproduce using `npm ci`, `npm ci --prefix scripts/m0/tools`, pinned Chromium installation and `npm run m0:test`; full prerequisites/reset/rollback are in [README.md](README.md). `npm run m0:down` removes only the dedicated services. The runner always cleans up and records completion after teardown; both final executions report cleanup passed.

## 5. Regression results

Both clean runs produced **25 passing controls and 32 exact known-defect probes**, plus three harness tests and 20 existing tests (API 8 + portal 12), with zero unexpected outcomes or skipped tests. The historical audit's 22 tests included two pre-existing uncommitted Google-auth tests; those are outside this committed-source baseline.

| Findings | Executable characterization | Owning repair |
|---|---|---|
| F01 | Foreign rating/handover read, viewer write and persistence; messages 404 control | M1 |
| F02 | Existing/new private originals readable anonymously/foreign member, permanent public cache fingerprint; own-member and actual public PNG logo controls | M1 |
| F03 | Viewer/nonexistent-project crawl, website sibling, loopback/DNS/redirect receiver proof, unsupported FTP, controlled slow and 2 MiB responses | M1 |
| F04/F06 | Viewer secret disclosure; superadmin key/invite/webhook/notification denial without membership | M1 |
| F05/F17 | Populated browser rendering, direct/reload resource context and workspace navigation | M2 |
| F07/F12 | Exact invitation index error; created analytics key and stored conversation key rejected | M5 |
| F08-F11/F16 | Exact rating/CSAT/queue/export SQL errors and undefined salesKeywords test-chat failure | M4 |
| F18 | Real worker marks all-fetch-failed job done: discovered 1, fetched/processed 0 | M3 |

Known defects are executed, not skipped; new errors and unexpected fixes fail the gate for review. Role/session controls, local reset email and webhook delivery passed. One explicit extension entry remains blocked: public-origin timeout/byte-limit/rebinding policy is not defined or verified. Private controlled slow/large/unsupported scenarios did execute; they do not establish protective limits. Independent review found this an M1 extension, not an essential M0 gap. See [audit-source.md](audit-source.md) for original reproduction mappings and report hash.

## 6. Browser results

**27 authenticated routes, 390x844 / 768x1024 / 1440x900**, direct and reload (162 observations), plus real client navigation/workspace A-to-B switch: **163 observations per run**. All 81 direct/reload signature pairs match. Both clean runs match each other and the independently reviewed committed baseline SHA-256 `463c1c298e6fd6655b527afbda0681eff5c3e4d90c5b117578d7ac4a348464d7`.

Each run classifies 150 observations with existing defects, 12 external-font-only boundaries and one passing workspace scenario; zero fatal harness or isolation observations. Angular missing-pipe/factory/onDestroy exceptions, API HTTP failures, missing populated rows, clipping and serious/critical axe findings remain captured, not repaired. Raw stacks, failed requests, counts, keyboard focus, bounding boxes and screenshots are in each browser artifact. External Google Fonts are intentionally blocked; production-font appearance is not certified. Full modal/loading/error-state remediation remains M2.

## 7. CI and quality

Two clean executions passed at the exact verified implementation SHA:

- [Manual run 39824730685](https://github.com/manuelxose/tecnoria-chat-platform/actions/runs/39824730685)
- [PR run 39824738406](https://github.com/manuelxose/tecnoria-chat-platform/actions/runs/39824738406)

Every executable stage exited zero: migrations, harness, API/worker integration, existing tests, full monorepo build (including TypeScript compilation), browser comparison and cleanup. No separate lint result is claimed. Fresh tenant UUIDs differ between runs. The independent read-only reviewer compared normalized full observed payloads, browser signatures and raw artifacts and issued **GO**, with no unresolved P1/P2 implementation blocker.

Runner: Node 22.23.2, Ubuntu 24.04.5, AMD EPYC 9V74, four logical CPUs, 16,766,414,848 bytes memory; pinned Playwright 1.64.1, axe 4.14.0, Chromium 156.0.8078.4 revision 1248. API startup 950/952 ms, regressions 3895/3924 ms, existing tests 1437/1425 ms, full builds 29290/30059 ms, browser phases 236419/239091 ms. Browser duration includes axe/screenshots, not pure page latency; these are observations, not SLOs.

The shared local WSL workstation suffered build exit 137 and later Chromium crashes/resource pressure and intermittent WSL launch errors. Those attempts are not counted as passes; cleanup passed. No user processes were stopped or WSL restarted. Earlier cancelled/candidate CI runs are not counted as successful full runs. Final evidence comes from the two isolated runner-local executions above.

Artifacts are attached to each Actions run and downloaded under ignored `evidence/ci-<run>/`; raw machine/human reports, environment, process logs, route inventory, receiver records and screenshots remain separate per run. CI retains uploaded artifacts for seven days; the committed reviewed baseline and this report persist.

## 8. Files changed

| Files | Purpose |
|---|---|
| `infra/m0-compose.yml` | Disposable database/mail services |
| `scripts/m0/{run,seed,api,regressions,browser,results}.mjs`, `guard.cjs`, `harness.test.mjs` | Orchestration, fixtures, actual-stack evidence, isolation and executable characterization |
| `scripts/m0/browser-baseline.json`, `scripts/m0/tools/` manifests/lock | Reviewed signatures and pinned browser tooling |
| `.github/workflows/m0.yml`, root `package.json`, `.gitignore` | Runner-local CI, commands and ignored generated evidence |
| `apps/chat-api/src/canonical-runtime.test.ts` | Portable repository root resolution only |
| `scripts/ai-development/{env.sh,control.py,routing.json}` | Reviewed environment/cooperative ownership prerequisites |
| `docs/m0/`, `.planning/STATE.md`, `docs/talkaris-viability-roadmap.md` | Reproduction, delivery contract, audit mapping, evidence and official milestone state |

No business migration or application behavior repair. Existing main deployment workflow untouched. Rollback is reverting the scoped M0 commits and removing the disposable project; no production/data migration rollback is needed.

## 9. Risks

Tenant leakage, private-file exposure, SSRF, connector secret disclosure and role inconsistencies remain known security risks. Canonical/base handler duplication, unversioned migrations and worker success semantics remain architectural limitations. The suite characterizes existing behavior and is not a security certification. External providers, deployed version, production migrations, backups and customer behavior remain unverified. Public-origin timeout/size/rebinding policy and complete UI interaction remediation belong to later milestones.

Skills applied: Ponytail, talkaris-architecture, operations, milestone-gate, ui-quality and tenant-security. Native bounded discovery agents and independent review were used. Context Mode/GSD/Graphify CLI were unavailable; scoped source tracing and the existing manual `.planning/STATE.md` fallback were used, with no invented tool execution or graph refresh.

## 10. Gate G0 decision

**GO:** isolated populated services, actual original-audit reproductions, reviewed authenticated browser baseline, complete builds/tests, two equivalent clean executions, independent review, scoped commits and published PR are all evidenced. No essential M0 gate requirement remains. Production/provider checks incompatible with the localhost rule remain explicitly blocked, not silently passed. G0 does not approve release, merge or deployment.

## 11. M1 handoff

M0 fixtures, exact failure fingerprints, actual route ordering and role/ownership controls are ready. Begin with **M1.1 tenant-scoped conversation/handover/rating authorization (F01)**: resolve resources inside tenant before read/write and enforce role consistently across sibling canonical/base paths. Replace reviewed expected failures with correct passing assertions; preserve public-logo and own-member controls. Then address F02-F04/F06 and extend crawler policy tests. M1 is recommended only; **not executed**.
