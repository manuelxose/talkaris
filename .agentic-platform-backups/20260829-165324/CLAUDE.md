# Talkaris agent guide

Own the requested Talkaris change directly. Keep API, worker, portal, widget, and shared package boundaries explicit, and scope every data query by tenant.

Read relevant files first, keep prompts and delegated tasks small, and do not create persistent swarms or consensus orchestration. Use Graphify for architectural or cross-cutting work. Use Playwright and axe for browser-facing changes.

Commands: `npm run build`, `npm run test`, `npm run dev:api`, `npm run dev:ingest`, `npm run dev:portal`.

<!-- BEGIN AGENTIC-ENGINEERING-PLATFORM -->
# Managed engineering policy

Use repository evidence before assumptions. For codebase, architecture, dependency, or data-flow questions, query Graphify first when `graphify-out/graph.json` exists; use its scoped query/path/explain output to identify the smallest relevant file set. Do not bulk-read generated graph artifacts.

For non-trivial changes: understand → graph discovery → plan → implement narrowly → test → independent review when practical → verify. Preserve repository architecture and unrelated working-tree changes. Select skills and a focused specialist only when they materially help; do not create persistent swarms.

Never hardcode secrets, providers, credentials, or machine-local assumptions. Never claim a check passed unless it was executed. Keep context lean without skipping security, migrations, dependency inspection, or validation. Refresh Graphify after material structural changes.

For UI work, use the existing design system and assess responsive layouts, keyboard/focus behavior, accessibility, loading/empty/error/success states, and light/dark themes where supported. Do not present placeholders or fake metrics as working product behavior.
<!-- END AGENTIC-ENGINEERING-PLATFORM -->
