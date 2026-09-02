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

Use repository evidence before assumptions. For non-local codebase, architecture, dependency, or data-flow questions, query Graphify first when `graphify-out/graph.json` exists; use scoped query/path/explain output to find the smallest relevant source set. Never bulk-read generated graph artifacts.

For non-trivial changes: understand → graph discovery → plan → implement narrowly → test → independent review when practical → verify. Preserve unrelated work. Claude Code may delegate to globally installed native agents; Codex must use its own supported decomposition and review workflow, not Claude agent files.

Never hardcode secrets or claim unexecuted checks. Refresh Graphify after material structural changes. UI work must assess responsive, keyboard/focus, accessibility, and all interaction states.
<!-- END AGENTIC-ENGINEERING-PLATFORM -->
