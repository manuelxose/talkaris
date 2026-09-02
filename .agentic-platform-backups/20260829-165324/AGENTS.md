# Talkaris agent instructions

Talkaris is a multi-tenant platform with `chat-api`, `ingest-worker`, `ops-cli`, `portal`, `widget`, and shared `core` packages.

- Preserve tenant isolation and Clean Architecture boundaries.
- Inspect before editing; never expose secrets or commit `.env` files.
- Use one primary agent by default. Delegate only bounded implementation, visual review, verification, or performance work.
- Use Graphify for cross-cutting changes when available; query only the relevant subgraph.
- For UI work, use design skills on demand and validate responsive behavior with Playwright and axe.

Commands: `npm run build`, `npm run test`, `npm run dev:api`, `npm run dev:ingest`, `npm run dev:portal`.

Shared workspace skills are cataloged at `/var/www/.agents/skills/manifest.json` and load on demand. Use Graphify for cross-cutting work; use Vercel and Impeccable only for applicable web tasks.

<!-- BEGIN AGENTIC-ENGINEERING-PLATFORM -->
# Managed engineering policy

Use repository evidence before assumptions. For codebase, architecture, dependency, or data-flow questions, query Graphify first when `graphify-out/graph.json` exists; use its scoped query/path/explain output to identify the smallest relevant file set. Do not bulk-read generated graph artifacts.

For non-trivial changes: understand → graph discovery → plan → implement narrowly → test → independent review when practical → verify. Preserve repository architecture and unrelated working-tree changes. Select skills and a focused specialist only when they materially help; do not create persistent swarms.

Never hardcode secrets, providers, credentials, or machine-local assumptions. Never claim a check passed unless it was executed. Keep context lean without skipping security, migrations, dependency inspection, or validation. Refresh Graphify after material structural changes.

For UI work, use the existing design system and assess responsive layouts, keyboard/focus behavior, accessibility, loading/empty/error/success states, and light/dark themes where supported. Do not present placeholders or fake metrics as working product behavior.
<!-- END AGENTIC-ENGINEERING-PLATFORM -->
