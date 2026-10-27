# TALKARIS M0 - EXECUTION REPORT

## Scoped PR and release guard (2026-10-27)

The scoped PR excludes the unrelated local development launcher and portal start-port change. The previously recorded 245-file snapshot `42c5052b55bb5e73e02dae18982333923859423f40253d05daf8c6bed0417a89` matched the original checkout, but is not the scoped PR tree. Run the protected flow on the PR tree and inspect its actual CI artifacts before drawing conclusions about that tree.

Read-only production inspection found tracked and untracked application changes on checkout `a23eab97df894e3ee3a4a9eaa7d9083b92be8788`, active services and healthy API. The existing script would build that dirty checkout. The proposed guard requires a clean checkout pre-staged at the workflow SHA and refuses a different fetched branch SHA; normal automatic deployment is intentionally blocked until the server is prepared safely. This is a source guard, not proof of artifact identity. The migration runner has no applied-migration ledger. Production migration state, actual built artifact SHA, database backup/restore and usable rollback are unverified; do not deploy while these gates remain open.

## Protected launcher first run (2026-10-27)

The new `npm run m0:test` Docker launcher passed its first complete run on source snapshot SHA-256 `a6526dea0a7260cc40774228e16cae417bcbcf61c6e13df17a42af7b4ff0e0ea`. Evidence and the per-file snapshot manifest are in `evidence/talkaris-m0-c92d5b30-9f6/`. Namespace preflight verified loopback-only routes, IPv4 and IPv6 external and gateway probes, DNS failure, absence of proxy variables, loopback service connectivity, a child and seven Chromium processes. Fresh, repeat and populated migrations, harness and regression tests, workspace tests and build, nine login-browser cases and the 163 browser observations passed. The regression counts were 25 controls, 32 expected defects, two browser references, one source-reviewed and one blocked F03 extension. Runner `cleanup: not-started` denotes externally managed sidecars; launcher logs and Docker inspection confirmed removal of the uniquely named run containers. The separate synthetic local containers were not removed.

An ordinary Docker bridge with the marker set rejected execution before stages with `M0 namespace must have loopback only`; local entrypoint tests cover missing prerequisites and marker bypass. Independent review found a snapshot race, startup cleanup gap, credential-shaped input and evidence logging issues; fixes were applied after the first snapshot. Check the latest final-tree run and actual remote CI separately. F03 public-origin timeout/size and DNS-rebinding checks remain blocked; the roadmap places their protective policy and tests in M1, while M0 requires reproducible characterization of the original findings. Known defects are not security clearance. Forced termination can leave run resources requiring ownership-checked cleanup.

The subsequent independent review found mutable image tags and interruption handling gaps. The launcher now pins Node, PostgreSQL and Mailpit image digests and handles SIGINT/SIGTERM; a Linux interruption test passed in a disposable network-disabled container. Package repository system libraries can still change between clean builds. Filename screening does not prove source files are free of credentials.

## Entrypoint and local recheck (2026-10-27)

On `main` at `b4ec793d42b02b217381de77d95759310481a656` with existing tracked and untracked changes, `node --test scripts/m0/entrypoint.test.mjs` passed (1/1), `npm run m0:test` failed at the namespace assertion before any stage, and `git diff --check` passed. Host Node was 24.18.0, npm 12.0.1, Docker Engine 27.2.0 and Compose 2.29.2. Local API health, widget frame, portal health, home and login returned HTTP 200; the synthetic DB, app and relay containers were running. The database uses tmpfs and was not restarted. These checks do not verify a new launcher, complete flow, CI, production readiness or the current deployed artifact. M0 remains partial.

## Entrypoint safeguard (2026-10-27)

The legacy default harness invocation now rejects execution before any stage unless the experimental namespace mode is explicitly selected. `node --test scripts/m0/entrypoint.test.mjs` passed, and `npm run m0:test` without that mode failed before stages on Windows. This is only a safeguard: the variable does not create or independently verify the complete isolation boundary. A reproducible launcher, protected CI integration, final-tree full flow and independent review remain outstanding. The current CI job will fail at `m0:test` until integrated. M0 remains partial; no release is authorized by this result.

## Isolated continuation (2026-10-27)

Read-only production inspection found the server checkout at `a23eab97df894e3ee3a4a9eaa7d9083b92be8788` with tracked and untracked changes; its actual built artifact SHA remains unknown. The API, worker, widget and portal services reported active, API and portal health returned OK, and the widget frame returned 200. This is not backup, migration, provider or release verification.

On HEAD `b4ec793` with the tracked diff identified in `evidence/m0-windows-20261027/isolation-local-20261027.md`, two complete runs passed in a loopback-only Linux Docker namespace, including fresh/repeat/populated migrations, harness and existing tests, regression characterization, full build, login/browser and accessibility checks. The 163 browser rows retained the known baseline defects, the browser fingerprints matched, and the regression report includes 25 passing controls, 32 known defects and the explicitly blocked F03 additional boundaries. The runner's `cleanup: not-started` means its externally managed sidecars required separate cleanup; those disposable containers were subsequently removed. A populated-database attempt failed before migration as intended. The synthetic local API, widget and portal and a temporary database were also started and exercised. The legacy entrypoint and CI do not enforce the new boundary; independent review and release/production verification remain open. M0 remains partial. Earlier statements below are preserved as historical observations.

## Current Windows checkout verification (2026-10-27)

Continuation: an isolated Windows copy matching all tracked files and the two non-evidence untracked files passed `npm test` and the complete workspace build with Node 22.23.2 and npm 10.9.8. Angular warned that its optional `lmdb` JavaScript cache could not initialize; the build exited successfully. The existing tests also passed in Linux Docker with Node 22.23.2 and networking disabled. The original caches and build outputs were not cleaned. A Docker bridge probe blocked one external IPv4 TCP connection while a control bridge allowed it; this is not sufficient to establish complete harness isolation. The full M0 flow, migrations and browser checks remain unverified. See `evidence/m0-windows-20261027/continuation.md` for the tree, commands and limitations.

**PARTIAL for the current tree.** The historical G0 below remains tied to `fdababf429180af41478858c5d6e6577f2a49262`; it is not a pass for this checkout. Tests ran on branch `main`, HEAD `b4ec793d42b02b217381de77d95759310481a656`, with pre-existing changes to README.md, apps/portal/package.json and package.json, untracked scripts/dev.mjs and docs/project-diagnostic.md, plus the Windows path fix in apps/portal/src/design-governance.test.ts. The exact tracked diff, status, untracked file hashes and test logs are retained locally in untracked `evidence/m0-windows-20261027/` (not CI artifacts).

On Windows, Node v24.18.0 and npm 12.0.1, `npm run test --workspace apps/portal` before the fix failed with three ENOENT errors; `npm test` after the fix passed API 10/10 and portal 12/12. `python -m unittest discover -s scripts/ai-development -p test_control.py` passed 2/2 and `node --test scripts/ai-development/evals/provider.test.cjs` passed 4/4. Logs are in the evidence directory. `git diff --check` passed. CI specifies Node 22.23.2; this local result does not establish compatibility with that version. Ubuntu WSL is present but `node` and `npm` are unavailable there; Linux execution of this change is unverified.

The full M0 harness, migrations and browser checks were not run: its documented flow requires Linux, Node 22.23.2, Docker Compose, pinned Chromium and verified isolation; these prerequisites and outbound isolation have not been established for this checkout. Individual harness files must not be run outside that flow. Docker server reports 27.2.0; the harness documentation discusses Docker 29 networking, so its network assumptions require verification in the actual Linux runner. The runner can archive existing evidence and manage the fixed Compose project; neither was touched. Build was not run: its scripts clean portal `dist`, `.angular` and `node_modules/.cache`, and API/worker `dist`; existing cache and build outputs have not been established as disposable. No deployment or push was performed. Before M1, reproduce the complete isolated flow twice on the exact proposed tree, verify migration and browser evidence and independently review it; existing product and security findings remain unresolved.

An independent read-only review identified two additional fixed Linux paths in test failure messages; these were corrected before `npm-test-final.log` (22/22). It also identified Windows-specific runner assumptions including `/tmp`, negative process IDs and `process.geteuid()`, and noted that `m0:down` does not check ownership or acquire the runner lock. No independent full harness execution or verification of the initial contents of unrelated changes was performed. The captured tested patch includes the initial additions to this report and `.planning/STATE.md`; this paragraph was added after the test and changes documentation only.

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
