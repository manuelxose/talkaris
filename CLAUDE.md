# Talkaris agent guide

Own the requested Talkaris change directly. Keep API, worker, portal, widget, and shared package boundaries explicit, and scope every data query by tenant.

Read relevant files first, keep prompts and delegated tasks small, and do not create persistent swarms or consensus orchestration. Use Graphify for architectural or cross-cutting work. Use Playwright and axe for browser-facing changes.

Commands: `npm run build`, `npm run test`, `npm run dev:api`, `npm run dev:ingest`, `npm run dev:portal`.
