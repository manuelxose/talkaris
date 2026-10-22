> Historical setup snapshot, consolidated into PR #1 after M0. Current execution state: `.planning/STATE.md`; current workflow uses one working directory, see `workflow.md`. Earlier pending/branch statements below describe the setup session only.

# Setup validation — 22 October 2026

**PARTIALLY READY.** Local skills, native role configuration, isolated tooling and regression/build execution are installed and verified. Provider entitlement/model inference, real application browser/RAG journeys, and the absent GSD/Context Mode/Graphify integrations are not certified. No MVP feature, production deployment, customer-data fixture or new paid API request was performed.

## Deliverables

- [Architecture](architecture.md) and [environment inventory](environment-inventory.md)
- [Per-skill installation report](installation-report.md), [upstream review](skill-inventory.md), [pinned manifest](skill-manifest.json)
- [Native agent registry](agent-registry.md), [model routing](model-routing.md), [cost controls](cost-controls.md)
- [Parallel work](parallel-execution.md), [quality gates](quality-gates.md), [browser/eval commands](evaluation-testing.md)
- [Exact M0 workflow](workflow.md); workflow position in `.planning/STATE.md`

## Confirmed checks

| Check | Result and scope |
| --- | --- |
| Third-party installation | Six project Claude plugins enabled, native CLI list confirms versions; 28 portable upstream skills from pinned snapshots |
| Project skills | Eight skills passed bundled frontmatter validation; `python3 scripts/ai-development/validate_setup.py` confirms all 36 skill directories readable and eight roles per client |
| Native Codex configuration | `codex --strict-config doctor --summary --no-color` exit 0, zero failures; inherited models, three children, one delegation level |
| Native Claude configuration | Eight documented frontmatter definitions; six native plugins enabled. `claude agents --json` lists sessions, so it was not misrepresented as a definition activation test |
| CLI authentication | `codex login status`: logged in using ChatGPT; this establishes local account mode, not model entitlement or remaining quota |
| Existing application tests | Final `npm test`: API 10/10, portal 12/12; exit 0. Raw output `evidence/npm-test-final.log` |
| Build | `NG_BUILD_MAX_WORKERS=1 npm run build` exit 0 for the complete monorepo. Raw output `evidence/npm-build-limited.log`; portal build 174 seconds |
| Accounting/ownership | `python3 scripts/ai-development/test_control.py`: 2/2 tests passed Windows and WSL; temporary usage event recorded; budget/unknown-provider rejection, path overlap and three-task cap checked |
| Concurrent claims | Two simultaneous independent SQLite connections contend for the same path; exactly one succeeds. Shared registry is derived from Git common directory |
| Worktree isolation | Created `codex/setup-validation` at committed HEAD, confirmed both checkouts share Git common directory, then removed the unchanged temporary worktree and branch |
| Provider adapter | 4/4 offline/local synthetic tests passed; real widget SSE envelope parsed; unsafe destinations, redirects and missing live approval rejected |
| Browser/axe | Actual project smoke passed in Windows and native WSL Chromium at widths 390/768/1440: zero browser errors, zero critical/serious axe findings; synthetic local form only |
| Promptfoo | Windows and native WSL CLI offline adapter evaluation each 1/1 passed; no remote model or red-team scan |
| Independent review | Separate reviewing agent found SSE transport mismatch and per-worktree ledger divergence; both corrected and reviewed again with no remaining actionable findings in that scope |

Raw `.log` files remain local under the repository's existing ignore rules; do not claim they were committed or uploaded. Test output is summarized here so the check results survive review without including customer data.

## Initial failures and corrections

The first baseline had API 8/10 and portal 12/12: two source-structure tests hardcoded `/var/www/talkaris`. `apps/chat-api/src/canonical-runtime.test.ts` now derives repository root from `import.meta.url`; no business behavior changed. Final 22/22 pass. The first root shell result reflected its last workspace, so the full log was inspected and the earlier passing claim corrected.

Default Angular parallel build was killed with code 137 amid WSL memory pressure; esbuild then reported a deadlock. Native process creation intermittently failed `Wsl/Service/0x8007274c`. The verified full rebuild uses one worker; `env.sh` and the new development CI set that memory-conscious default without changing Angular or application dependencies. WSL has approximately 6 GiB RAM and 2 GiB swap; other applications were left running.

Windows dependency lock was incompatible with native npm peer resolution; only the isolated Linux tooling lock was repaired while retaining identical direct version pins. Root application package/lock changes already present before setup were preserved.

## Installed but unverified

Native model-driven activation of each agent/skill, independent model-family review through WSL providers, current model entitlement and remaining quota, Claude account/billing mode, provider-side spending controls, CI execution on GitHub, branch protection, real authenticated portal routes, migration/restore tests and live RAG quality. Offline adapter and browser harness smoke do not satisfy those acceptance criteria.

## Configured without automatic execution

Manual model-class policy and dry-run provider adapter; advisory usage ledger with monthly/task/agent limits; cooperative file ownership; CI pull-request checks; milestone acceptance gates. No hard spending firewall, automatic cross-provider router, automatic cost importer or deployment permission is claimed.

## Missing integrations

GSD executable/state tooling was absent, so `.planning/STATE.md` is an explicit manual fallback referencing the one existing roadmap. Context Mode is installed in user clients but no compatible MCP access was available to this setup session; memory search remains unverified. Graphify CLI and the referenced shared `/var/www/.agents/skills/manifest.json` were absent. The broken project Codex Graphify hook was backed up and disabled. Do not install a second orchestration framework merely to hide these gaps.

## Changes and reversibility

Setup is on `codex/ai-development-environment`; no commit, push or deployment was made. Added project skills/roles in the repository's existing ignored local directories; reviewed vendor snapshots and isolated Linux tools remain `.agentic/`. Claude project settings were merged by the native installer; user-wide configuration was preserved apart from required native marketplace/plugin registration. AGENTS/CLAUDE gained a concise reality-based fallback section. Original Codex hook is `.codex/hooks.json.pre-talkaris-setup`.

Tracked/reviewable additions are `docs/ai-development`, `scripts/ai-development`, `.planning/STATE.md`, `.github/workflows/development-checks.yml`, plus the two-line portability adjustment in the existing API test. The current checkout also contains unrelated pre-existing Google Login and roadmap changes; do not stage them indiscriminately. Native config and skill sources are intentionally local-only under the pre-existing ignore policy; the manifest records reproduction inputs. Windows tooling lives in `C:\Users\Admin\Documents\ChatGPT\talkaris\.ai-tools`, now ignored in that evidence workspace.

To reverse, review/remove only these setup additions, restore the backed-up hook and remove the appended instruction section, uninstall the six project plugins with Claude's native CLI, and remove only the listed local snapshot/tool directories after checking resolved paths. Do not reset the entire checkout or delete user configurations.

Next: use the command in [workflow.md](workflow.md) to begin **M0.1**, with any account/entitlement gap reported before invoking a model. No milestone is marked complete by this setup.
