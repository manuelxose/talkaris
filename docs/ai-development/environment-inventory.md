# Environment inventory

Observed 2026-10-22, Windows PowerShell host and Ubuntu WSL2. Native project execution: Node 22.23.2, npm 10.9.8, Git 2.43.0, Linux 5.15.153.1-microsoft-standard-WSL2. Additional native Node versions 22.22.0 and 24.13.0 exist; the wrapper selects 22.23.2. WSL Codex 0.156.1 and Claude 2.1.282; Windows Codex 0.163.0-alpha.10.2. Windows fallback Node 24.18.0. No CLI update was necessary for the verified setup.

| Category | Observed state / action |
| --- | --- |
| Already installed | Native Claude/Codex, Node versions, Git, existing application dependencies, global methodology skills, Context Mode plugins and local role documents |
| Installed now | Six native Claude plugins; pinned portable skills; eight Talkaris skills; eight native roles/client; isolated Playwright/axe/Promptfoo tools Linux and Windows |
| Missing | GSD executable, Context Mode MCP access in this setup session, Graphify CLI, referenced `/var/www/.agents/skills/manifest.json`; remote branch protection unverified |
| Outdated | No authoritative latest-version comparison for existing clients was performed; no unsupported claim that they are outdated. Installed CLIs support the used formats |
| Incompatible | Default WSL PATH omitted native Node and selected Windows npm; wrapper fixed. Windows npm lock not directly reusable on Linux; isolated native lock repaired. Broken Graphify hook disabled with backup |
| Requires migration | Historical `.agentic/agents` documents now have native registrations; phantom GSD state replaced by explicit manual `.planning/STATE.md` fallback. Existing global Superpowers skills are preserved; project-scoped portable links select the reviewed pinned project snapshot, no second source per client |
| Requires explicit authorization | Newly billable API/model evaluations, real red-team targets, production changes/deployment, DNS/billing; none executed |

No GSD Pi/OpenGSD replacement or swarm service was installed. Native delegation and ordinary Git worktrees cover the bounded parallelism requirement. Context Mode user plugin state does not prove tools are exposed to this desktop chat or WSL CLI; doctor reports no configured WSL MCP servers. No unrelated remote-execution plugin was added.

The existing production workflow deploys pushes to main and has no pull-request testing job. The new `development-checks.yml` adds non-deploying PR/manual tests and build with read-only repository token permissions. Its first GitHub execution and remote protection rules are not verified. No push was made.

Model defaults observed in configuration are `gpt-6.1-sol` and Claude `opus`. The installed Codex bundled catalog lists `gpt-6-astra`, `gpt-6-sol`, `gpt-6-luna`, `gpt-5.6-sol`, `gpt-5.6-terra`, `gpt-5.6-luna`, `gpt-5.5` as visible candidates. Catalog visibility is not account entitlement; the configured newer default is not present in that bundled visible list. Preserve it until live account metadata confirms compatibility; do not silently substitute a billable provider. `codex login status` confirms ChatGPT authentication. No model generation was invoked through installed WSL clients.
