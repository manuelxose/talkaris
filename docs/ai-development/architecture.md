# Development environment: observed architecture

Source inspected 2026-10-22, base revision `a23eab9`, setup branch `codex/ai-development-environment`. The checkout already contained uncommitted Google Login and roadmap changes; they are not setup deliverables.

`apps/chat-api/src/main.ts` imports the Express base runtime in `runtime-base.ts` and registers additional routes. Inspect registration order and early responses before deciding which handler to change. `apps/ingest-worker/src/main.ts` loads its base runtime. Shared packages include `core`, `domain`, `application`, and `infrastructure`; preserve those boundaries while tracing actual runtime callers. PostgreSQL migrations are in `apps/chat-api/migrations`. The Angular portal uses standalone components and Angular 20.3.x; the widget's canonical assets are `apps/widget/public/embed.js` and `frame.html`.

The canonical widget reply endpoint is `POST /v1/widget/messages`; the portal test-chat path has a different contract. The worker queues and processes ingestion, but the roadmap's scheduler, notification and reliable delivery requirements are not evidence of implemented executors. Never infer implementation from a form or a checked box in the historical roadmap.

Execution roadmap: [talkaris-viability-roadmap.md](../talkaris-viability-roadmap.md). Historical product roadmap remains background. Latest audit is the Windows workspace's `auditoria-2026-10-22/INFORME.md`, with F01–F26; its finding IDs are mapped in the execution roadmap. The audit reports tenant authorization, private-file exposure, SSRF and source-secret defects before broader feature work.

Available root commands: `npm test`, `npm run build`; targeted tests use `npm run -w @tecnoria-chat/chat-api test` and `npm run -w @tecnoria-chat/portal test`. The worker has no test script. Existing portal tests run through `tsx`, not a browser runner. `npm run -w @tecnoria-chat/chat-api migrate` writes to the configured database and must only be used against a deliberately isolated database during development.

Source `scripts/ai-development/env.sh` in WSL: login PATH initially resolved Windows npm and omitted native Node. Existing production deployment runs on pushes to `main`; no push or deployment is part of this setup.
