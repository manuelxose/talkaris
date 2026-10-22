# Development workflow

Use the single workspace `/home/manuelxose/workspace/tecnoria-chat-platform`. The user consolidated the M0 worktree into this directory; do not create another worktree unless requested. Switch branches within this directory only after preserving pending changes. Never push main: its workflow deploys production.

M0 is complete. Read `.planning/STATE.md`, `docs/talkaris-viability-roadmap.md` and `docs/m0/report.md` for current scope, evidence and the G0 decision. The current PR also consolidates the earlier Google Login and engineering setup work in separate commits. Do not start M1 without a new instruction.

In WSL, source `scripts/ai-development/env.sh` before native Node commands. Inspect actual handlers and affected data flows, claim files using `scripts/ai-development/control.py`, implement narrowly, run relevant checks and obtain independent review for security changes. Release ownership after delivery. Use Context Mode/GSD/Graphify when available; otherwise retain scoped source evidence and the existing manual state fallback, and record the limitation. Never claim unavailable tool execution.

All engineering tests run on isolated localhost services and synthetic fixtures, including runner-local CI. Do not load application `.env` files for test runs. Use `npm test`, `npm run build`, `python3 scripts/ai-development/test_control.py`, `node --test scripts/ai-development/evals/provider.test.cjs` and `npm run m0:test` as applicable. Browser tooling is pinned in `scripts/m0/tools`; `TALKARIS_TOOLS_DIR` can point the generic browser harness there. Offline adapters and mocked Google SDK tests do not certify real providers.

Use scoped commits on codex/ branches and create/update a PR with exact executed checks, review, risks and rollback. Record SHAs/PR URL in existing state/roadmap. No paid API spending, automatic provider fallback, production tests, automatic merge or deployment. Ignored native skills/config remain local; do not commit credentials, dependencies, caches or build artifacts.
