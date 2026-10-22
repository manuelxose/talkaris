# M0 local regression environment

Use Node 22.23.2, npm, Docker Engine with Compose, and Linux Chromium dependencies. Run from the repository root. Do not load application `.env` files. All credentials below are synthetic and usable only by the disposable M0 environment.

```sh
npm ci
npm ci --prefix scripts/m0/tools
scripts/m0/tools/node_modules/.bin/playwright install --with-deps chromium
npm run m0:test
```

`m0:test` starts a dedicated `talkaris-m0` Compose project, verifies database identity, builds shared packages, applies real migrations twice, seeds populated tenants A/B, starts the real API, executes integration/security characterization and existing unit tests, builds every workspace, starts the compiled portal, and runs authenticated browser checks. It tears down its services in `finally`. PostgreSQL data uses tmpfs, not a production volume. No application `.env` or existing database is reused. The run refuses an already-running M0 project or populated database. Do not run concurrent M0 suites.

Ports (all host bindings are loopback): PostgreSQL 45432; API 45101; portal 45103; HTTP/webhook failure receiver 45124; Mailpit SMTP 45125 and API/UI 45126; isolated Google-auth HTTP unit fixture 45127. Docker 29 suppresses published ports on internal networks, so the bridge disables outbound masquerading instead. Mailpit has no SMTP relay. Application Node children use a TCP allowlist and sanitized environment without AI keys; only these local services are allowed. The tsx parent IPC pipe is the only Unix socket exception. Browser page requests to external origins are aborted. This is a deterministic development harness, not a hostile-code sandbox.

Migrations, seed and reset run as part of the single command. Teardown/reset after an interrupted run:

```sh
npm run m0:down
# If a process was forcibly killed, verify no M0 runner remains before removing
# its advisory /tmp/talkaris-m0-baseline.lock file.
npm run m0:test
```

Raw evidence is written to ignored `evidence/m0/`: process logs, fixture ownership/counts, actual Express route order, machine/human regression reports, timing/environment metadata, browser route/viewport/phase matrix, screenshots, and receiver records. Each new run archives prior evidence under ignored `evidence/m0-history/`; CI uploads current evidence even when checks fail. Generated fixture IDs and session credentials are not committed.

Known API defects use executable correct-behavior expectations plus narrow failure fingerprints. A different failure or an unexpected pass fails the suite. Browser signatures are reviewed against `scripts/m0/browser-baseline.json`; both new errors and disappearing known errors fail until reviewed. To capture a candidate after a deliberate change, use `npm run m0:test -- --capture-browser`; this does **not** approve it. Inspect raw observations and screenshots before updating the committed baseline. Never approve authentication/harness failures as product defects.

Existing deployment workflows remain untouched. M0 CI uses runner-local Docker services and cannot deploy. Production version, applied production migrations, provider access, and customer behavior are unverified. The original audit was found in the Windows evidence workspace after repository-only discovery; see `audit-source.md` for its hash and exact reproduction mappings.

## Change contract for M1–M8

Every PR records migration and existing-data compatibility, tenant/authorization impact, executable regression evidence, operational compatibility, rollback, and acceptance criteria. No migration means explicitly say so. Migration reversibility must preserve data; do not promise a down migration that does not exist. A passing characterization baseline means known defects reproduced, not that the product is secure. Fixing one requires replacing its expected failure with a reviewed passing assertion in the owning milestone. Do not skip the test or widen its fingerprint.

No M1–M8 business repair is part of M0. Never merge or deploy automatically. G0 requires repeatable clean runs and independent review; use PARTIAL until essential evidence is present.
