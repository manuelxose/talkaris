# Evaluation and browser capability setup

This setup does not close M0 or certify Talkaris RAG quality. It uses synthetic data only and loads no .env files. Tool dependencies belong to the isolated .agentic/tools installation, not application manifests.

## Safe defaults and commands

From the repository root in Linux/WSL:

```sh
node --test scripts/ai-development/evals/provider.test.cjs
cd scripts/ai-development/evals
../../../.agentic/tools/node_modules/.bin/promptfoo eval --config promptfooconfig.yaml --no-cache
# Return to repository root:
cd ../../..
node scripts/ai-development/browser/smoke.mjs
```

Disable Promptfoo telemetry and update checks in the invoking shell as supported by the installed CLI; never use remote providers or model-graded assertions in the installation smoke. The supplied config uses only the local provider and deterministic JavaScript assertion.

The provider's offline default returns an explicitly marked synthetic fixture. This validates adapter/config wiring, not retrieval, grounding, citations, tenant isolation or generation. quality-cases.json enumerates all 13 requested evaluation dimensions as unevaluated synthetic templates. Expand to an approved, versioned corpus with expected facts/citations and at least 30 cases per pilot bot before a milestone evaluation. Retrieval relevance and unauthorized tool use require retrieval/tool traces; the public answer alone cannot establish them.

## Isolated real-runtime evaluation

Source inspection found the effective widget handler in apps/chat-api/src/main.ts prepended over runtime-base.ts. POST /v1/widget/messages accepts { conversationId, message }, writes conversation messages/analytics, and returns text/event-stream with a data envelope { type: answer, payload: answer }. The adapter parses that SSE answer payload, including message and citations, and rejects JSON-only or missing-answer responses. The portal test-chat route in runtime-base.ts uses composeAnswer, so its result must not stand in for the canonical widget pipeline.

For a real run, prepare an isolated database, synthetic tenant and bot, corpus and existing test conversation using the normal fixture setup. Supply provider config explicitly: mode: live, isolated: true, runtimeCallsApproved: true, testBot, conversationId, baseUrl and costPolicy. baseUrl must be a literal loopback HTTP(S) origin (127.0.0.1 or [::1]); hostnames, URL credentials and redirects are rejected. No session credentials are needed by this public widget endpoint; do not embed real secrets in config. Authenticated portal tests must instead use an untracked session fixture.

costPolicy must be non-billable-verified after verifying the isolated runtime cannot call paid providers, or paid-explicitly-approved after explicit user approval. A loopback URL alone does not establish database isolation or prevent the server from calling an external LLM. No real-runtime or paid evaluation is part of this setup. Red-team skills are available for later authorized work; no scan is automatically launched.

## Browser journeys

browser/journey.mjs resolves the installer's @playwright/test and @axe-core/playwright from .agentic/tools. For the Windows tooling fallback, set TALKARIS_TOOLS_DIR to the absolute .ai-tools installation directory before execution. This explicit tool-path override loads no .env file. It runs each supplied journey at widths 390/768/1440, checks console/page/network/HTTP errors and axe critical/serious findings, supports an optional storageState and screenshotDir, and blocks non-loopback requests, all WebSockets and service workers. Use only isolated application instances with local assets/providers.

browser/smoke.mjs serves a harmless local HTML form and exercises the helper. It does not log into Talkaris or test business routes. Add bounded test modules calling runJourney for authenticated navigation, direct URL/reload, session expiry, tenant switching, real synthetic rows, forms/errors and embedded widget frames. Pass an exercise callback that enters the widget frame and verifies messages; merely finding embed.js does not test the widget. Keep session-state files and screenshots containing data out of version control. Optional screenshots require an existing output directory.

## Verification status

- Provider safety/transport regressions: 4/4 passed under Windows Node 24.18.0 using exact copies of the two dependency-free CJS files in a temporary directory. Tests prove offline mode makes no fetch, remote/credentialed/non-HTTP targets are rejected, live mode requires explicit gates, canonical body reaches a local synthetic HTTP receiver, its SSE answer and citations are parsed, JSON-only/missing-answer responses are rejected, and redirects are rejected.
- Native WSL Node 22.23.2 provider regressions: 4/4 passed after VM recovery; no blocked WSL verification remains.
- Promptfoo 0.124.1 offline config: 1/1 passed on both native WSL and Windows with cache disabled, local offline fixture provider, deterministic JavaScript assertion, and telemetry/update checks disabled. No live model/provider was invoked.
- Playwright/axe browser smoke passed on both native WSL and Windows at widths 390, 768 and 1440: zero browser errors and zero critical/serious axe findings. These smokes exercise a synthetic local form, not Talkaris business routes.
- No application integration, RAG quality, real-provider evaluation, authenticated portal journey or business regression suite executed by this setup.
