# Talkaris agent guide

Own the requested Talkaris change directly. Keep API, worker, portal, widget, and shared package boundaries explicit, and scope every data query by tenant.

Read relevant files first, keep prompts and delegated tasks small, and do not create persistent swarms or consensus orchestration. Use Graphify for architectural or cross-cutting work. Use Playwright and axe for browser-facing changes.

Commands: `npm run build`, `npm run test`, `npm run dev:api`, `npm run dev:ingest`, `npm run dev:portal`.

<!-- BEGIN AGENTIC-ENGINEERING-PLATFORM -->
# Managed engineering policy

Use repository evidence before assumptions. For non-local codebase, architecture, dependency, or data-flow questions, query Graphify first when `graphify-out/graph.json` exists; use scoped query/path/explain output to find the smallest relevant source set. Never bulk-read generated graph artifacts.

For non-trivial changes: understand → graph discovery → plan → implement narrowly → test → independent review when practical → verify. Preserve unrelated work. Claude Code may delegate to globally installed native agents; Codex must use its own supported decomposition and review workflow, not Claude agent files.

Never hardcode secrets or claim unexecuted checks. Refresh Graphify after material structural changes. UI work must assess responsive, keyboard/focus, accessibility, and all interaction states.
<!-- END AGENTIC-ENGINEERING-PLATFORM -->
