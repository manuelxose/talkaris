# M0 local regression environment

`npm run m0:test` invokes the protected Docker launcher. It snapshots tracked and nonignored files, excluding evidence and `.env` files, and refuses common secret-shaped filenames and non-regular files. Do not place credentials in the source snapshot. The snapshot manifest and launcher output are stored in a unique `evidence/talkaris-m0-*` directory. Dependency installation runs before source is copied into the image.

The runner uses Docker `--network none`; disposable tmpfs PostgreSQL and Mailpit join its network namespace. Before setting `M0_NAMESPACE_SERVICES`, preflight checks interfaces and routes, proxy variables, external IPv4/IPv6 and DNS, host gateway probes, service ports, a Node child and Chromium. The runner has no Docker socket or host volume. A marker alone is not proof of isolation. Preparation needs network access to download dependencies, images and Chromium; the test flow runs after isolation is checked.

Use Node, npm, Git and Docker Engine with a Linux container backend. Run from the repository root. The Node 22.23.2, PostgreSQL and Mailpit images are pinned by digest, as is Playwright Chromium. Do not load application `.env` files. Filename screening is not a complete secret scan: inspect source inputs before running.

```sh
npm run m0:test
```

The launcher creates uniquely named containers and removes the ones it created after the flow; PostgreSQL uses tmpfs. It verifies the synthetic database identity, applies fresh, repeat and populated migrations, then runs regressions, unit tests, build, login, browser and accessibility checks. No existing database or application `.env` is used. A forcibly terminated launcher may leave its uniquely named resources; inspect ownership before removing them.

Ports are private to the shared network namespace: PostgreSQL 45432; API 45101; portal 45103; receiver 45124; Mailpit 45125 and 45126; auth fixture 45127. Application children also use the existing TCP allowlist and synthetic configuration. This is a deterministic development harness, not a hostile-code sandbox.

Raw evidence is copied from the runner into its unique evidence directory: process logs, fixture ownership/counts, route order, regression reports, timings, browser observations, screenshots and receiver records. CI uploads those directories even on failure. Generated fixture IDs and session credentials are not committed. `m0:down` is the legacy Compose cleanup command and is not used by the launcher; do not run it against services whose ownership is unknown.

Known API defects use executable correct-behavior expectations plus narrow failure fingerprints. A different failure or an unexpected pass fails the suite. Browser signatures are reviewed against `scripts/m0/browser-baseline.json`; both new errors and disappearing known errors fail until reviewed. To capture a candidate after a deliberate change, use `npm run m0:test -- --capture-browser`; this does **not** approve it. Inspect raw observations and screenshots before updating the committed baseline. Never approve authentication/harness failures as product defects.

Existing deployment workflows remain untouched. M0 CI uses runner-local Docker services and cannot deploy. Production version, applied production migrations, provider access, and customer behavior are unverified. The original audit was found in the Windows evidence workspace after repository-only discovery; see `audit-source.md` for its hash and exact reproduction mappings.

## Change contract for M1–M8

Every PR records migration and existing-data compatibility, tenant/authorization impact, executable regression evidence, operational compatibility, rollback, and acceptance criteria. No migration means explicitly say so. Migration reversibility must preserve data; do not promise a down migration that does not exist. A passing characterization baseline means known defects reproduced, not that the product is secure. Fixing one requires replacing its expected failure with a reviewed passing assertion in the owning milestone. Do not skip the test or widen its fingerprint.

No M1–M8 business repair is part of M0. Never merge or deploy automatically. G0 requires repeatable clean runs and independent review; use PARTIAL until essential evidence is present.
