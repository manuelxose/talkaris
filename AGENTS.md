# Talkaris agent instructions

Talkaris is a multi-tenant platform with `chat-api`, `ingest-worker`, `ops-cli`, `portal`, `widget`, and shared `core` packages.

- Preserve tenant isolation and Clean Architecture boundaries.
- Inspect before editing; never expose secrets or commit `.env` files.
- Use one primary agent by default. Delegate only bounded implementation, visual review, verification, or performance work.
- Use Graphify for cross-cutting changes when available; query only the relevant subgraph.
- For UI work, use design skills on demand and validate responsive behavior with Playwright and axe.

Commands: `npm run build`, `npm run test`, `npm run dev:api`, `npm run dev:ingest`, `npm run dev:portal`.

Shared workspace skills are cataloged at `/var/www/.agents/skills/manifest.json` and load on demand. Use Graphify for cross-cutting work; use Vercel and Impeccable only for applicable web tasks.
