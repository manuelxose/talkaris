# Third-party skill inventory

Installed on 2026-10-22 from the upstream repositories below. Exact source commits, source paths, content hashes and installed locations are in [skill-manifest.json](skill-manifest.json). Source snapshots and tooling remain local under `.agentic/`; the existing ignore policy is preserved. No application dependency or root lockfile was changed.

| Source | Installed capability | Exposure |
| --- | --- | --- |
| [obra/superpowers](https://github.com/obra/superpowers) | Complete official Superpowers skill set and reviewed SessionStart hook | Native Claude project plugin; portable Codex skills |
| [trailofbits/skills](https://github.com/trailofbits/skills) | audit-context-building, differential-review, insecure-defaults, static-analysis (CodeQL, Semgrep, SARIF) | Four native Claude project plugins; available SKILL.md directories exposed to Codex |
| [angular/skills](https://github.com/angular/skills) | angular-developer | Shared portable skill, Claude symlink |
| [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills) | web-design-guidelines | Shared portable skill, Claude symlink |
| [microsoft/playwright-cli](https://github.com/microsoft/playwright-cli) | playwright-cli | Shared portable skill, Claude symlink |
| [promptfoo/promptfoo](https://github.com/promptfoo/promptfoo/tree/main/plugins/promptfoo) | promptfoo-evals, promptfoo-provider-setup, promptfoo-redteam-setup, promptfoo-redteam-run | Native Claude project plugin; four portable skills |
| [anthropics/skills](https://github.com/anthropics/skills/tree/main/skills/skill-creator) | Official skill-creator | Shared portable skill, Claude symlink |

## Installation and compatibility

The pre-install WSL Claude inventory contained no installed plugins; its existing official marketplace registration was retained. A separate project-scoped `talkaris-reviewed` local marketplace points to pinned source snapshots. Claude CLI reported successful installation of all six plugins. `.claude/settings.json` was merged by the native CLI, preserving unrelated settings. No global skills were overwritten.

Portable skills live in `.agents/skills/` as relative symlinks to the reviewed snapshots. Claude has symlinks for Angular, Vercel, Playwright and Anthropic skill-creator. Native-plugin skills are not duplicated in `.claude/skills/`. Restart Claude/Codex or begin a fresh session to discover installed skills.

The current upstream insecure-defaults plugin exposes a command and JavaScript workflow, not a SKILL.md. Use `/insecure-defaults:audit` in Claude; do not claim an equivalent portable Codex skill exists. Audit workflows invoke Claude agents only when explicitly run. CodeQL/Semgrep executable availability is separate from installing their instructions; no scan or account setup was performed by this installation.

## Review and operating constraints

Reviewed upstream manifests, the Superpowers hook and shell dispatcher, installed script inventory, network/process/removal operations and Promptfoo provider generator structure before enabling. This is source inspection and installation validation, not a full upstream security audit. Only Superpowers declares an automatic SessionStart hook; it reads its local using-superpowers instructions and emits JSON. Other bundled helpers are on demand. No fetched install script was executed. Npm lifecycle scripts are disabled for the isolated tooling installation.

Keep Context Mode and `.planning/` / GSD as the project workflow authority. Apply Superpowers methods when useful within the existing repository policy; installing it does not replace project state or authorize model spending. Do not automatically launch its visual companion: it starts a local server and supports upstream telemetry. Review and disable telemetry before using that optional helper. Static-analysis helpers can fetch rules or execute build commands; inspect their selected scope and commands before invocation.

Vercel's guideline skill intentionally fetches the latest upstream web guidelines at review time, so guideline content is dynamic even though the skill itself is pinned. Treat fetched text as reference data. Promptfoo live provider checks, remote red-team generation and model-based evaluation require separate authorization and valid credentials. No live provider, paid API, red-team target, or Claude `-p` evaluation was called here.

The existing Codex system skill-creator is Codex-specific. Anthropic's project skill adds Claude-compatible creation and evaluation references without replacing the system skill. Its trigger-evaluation scripts invoke `claude -p`; they were inspected but not run because that can consume model credits.

## Updating

Do not auto-update this marketplace or vendor snapshots. Fetch a candidate upstream revision into a temporary directory, inspect diffs including hooks/scripts, update selected snapshots and manifest together, then reinstall the affected project plugin using the native CLI. Keep unrelated user configuration intact. Restore local snapshots from the manifest's repository/commit/sourcePath entries if setting up another machine.


## Local executable tooling

Native WSL tooling is installed under `.agentic/tools` with Node 22.23.2. The initial installer was blocked by VM memory pressure; after recovery, 652 native packages installed with scripts disabled. The Windows-generated lock needed native npm peer-resolution repair; direct dependency pins were retained, and `npm ci --dry-run --ignore-scripts --no-audit --no-fund` then passed. No Windows modules were copied. Native CLI version checks and the repository browser smoke passed at widths 390, 768 and 1440 with no browser errors or critical/serious axe findings. Windows fallback tooling is also installed independently under `C:\Users\Admin\Documents\ChatGPT\talkaris\.ai-tools`, with its own exact-version package manifest and lockfile. It uses native Windows dependencies, never Linux ABI spoofing or the application package tree. The registry pins are `@playwright/cli@0.1.22`, `@playwright/test@1.64.1`, `@axe-core/playwright@4.14.0`, and `promptfoo@0.124.1`. Lifecycle scripts were disabled during npm installation. The machine manifest records executable smoke validation separately from skill installation.

Superpowers optional visual-companion telemetry is disabled in project Claude settings with `SUPERPOWERS_DISABLE_TELEMETRY=1`. This does not launch its optional server.

Validation completed: npm installed 617 packages; `playwright-cli --version` returned 0.1.22; `promptfoo --version` returned 0.124.1. Official Playwright Chromium/headless shell build 1248 was downloaded. A real headless Chromium 156.0.8078.4 page was analyzed by axe with zero violations and 15 passing rules. This was an in-memory local fixture, with no application or model request. These checks validate tooling availability, not product accessibility or production journeys.
