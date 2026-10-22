# Native Talkaris agent registry

Eight project roles are registered under `.claude/agents/talkaris-*.md` and `.codex/config.toml` with role layers in `.codex/agents/`.

| Role | Canonical responsibility reference | Mode |
| --- | --- | --- |
| coordinator | .agentic/agents/architect.md | Read-only planning; primary session orchestrates |
| security | .agentic/agents/security.md | Read-only assessment |
| backend | .agentic/agents/backend.md | Isolated writer |
| frontend | .agentic/agents/frontend.md | Isolated writer |
| rag | .agentic/agents/database.md | Isolated writer; retrieval/ingestion scope |
| qa | .agentic/agents/qa.md | Isolated test writer |
| devops | .agentic/agents/devops.md | Isolated infrastructure writer |
| reviewer | .agentic/agents/reviewer.md | Read-only independent assessment |

Historical references in role documents to global Claude agents do not establish registration; these project native files do. Descriptions reference responsibilities rather than duplicate a second architecture policy. Applicable talkaris-* skills load on demand; missing skills must be reported.

| Role | Primary skills available | Preferred model class / fallback |
| --- | --- | --- |
| coordinator | talkaris-architecture, talkaris-milestone-gate | High reasoning / inherit verified parent; stop if unavailable |
| security | talkaris-tenant-security, audit-context-building, differential-review, static-analysis plugin | High reasoning / verified independent family preferred; never weaken checks |
| backend | talkaris-api-postgres, talkaris-architecture | Standard coding / inherit verified parent |
| frontend | talkaris-ui-quality, angular-developer, web-design-guidelines | Standard coding / inherit verified parent |
| rag | talkaris-ingestion, talkaris-rag-quality, four promptfoo-* skills | Standard coding, high reasoning for prompt security / inherit verified parent |
| qa | talkaris-milestone-gate, playwright-cli, test-driven-development, systematic-debugging | Standard coding; deterministic scripts first / inherit verified parent |
| devops | talkaris-operations, talkaris-api-postgres | Standard coding, high reasoning for data recovery / inherit verified parent |
| reviewer | talkaris-architecture, talkaris-tenant-security, differential-review, verification-before-completion | High reasoning, independent family preferred / report missing independent provider |

These are selection classes, not promises of account model availability. All roles share the file-claim policy; backend/RAG cannot edit worker files concurrently. Review is serialized after writers. The primary session performs integration; the read-only coordinator role returns task proposals and cannot itself write state or invoke children.

## Model and concurrency behavior

Claude explicitly uses `model: inherit`; Codex omits model overrides and inherits the primary session. Inherited routing is the default class and fallback until the shared routing policy selects a locally verified entitlement. Model labels do not prove account access. No model request or paid inference was made during registration validation.

Codex `agents.max_threads = 3` caps children; `max_depth = 1` prevents nested children. Claude worker tool allowlists omit Agent; the primary coordinator limits children to three as workflow policy. The primary stops writers and runs independent review serially. These are bounded sessions, not persistent teams.

Claude writer definitions use native `isolation: worktree`. Codex supports session `--worktree`; its role TOML has no invented isolation field, so the primary must launch an isolated session/worktree before assigning writers. Workers stop if isolation is absent. No merges or deployments are authorized by a role file.

## Actual tools and fallbacks

Claude read-only definitions permit only Read, Grep, Glob and LSP; no shell, file writer or MCP tools. Availability still depends on the parent runtime; read-only roles return shell validation requests to the primary. This deliberately restricts their direct Graphify/Context Mode execution: the primary supplies scoped evidence. Writers permit Read, Grep, Glob, LSP, Bash, Edit, Write and Skill; no Agent or arbitrary MCP tool access is granted.

Codex role layers use native `sandbox_mode = "read-only"` for coordinator/security/reviewer and `workspace-write` for writers. Tools inherit the active Codex runtime; filesystem sandboxing is not a guarantee against side effects in remote connector tools. Role instructions prohibit external side effects. Current WSL doctor reports **no MCP servers configured**. Do not claim Context Mode/Graphify MCP parity with the desktop app.

Native Node is installed under `~/.nvm/versions/node/v24.13.0/bin`, but the default noninteractive shell lacks Node and rg on PATH. Codex ships its own rg. Default shell `graphify`, `context-mode`, and GSD commands were unavailable during the audit. Use the existing shared wrapper/environment setup where provided; report unavailable capabilities instead of silently substituting paid inference.

## Validation evidence (22 October 2026)

- WSL Codex `0.156.1`; Claude `2.1.282`; Windows Codex `0.163.0-alpha.10.2`.
- Installed Codex `--help` documents `--strict-config`, `--worktree`, read-only/workspace-write sandboxes.
- In the project directory: `codex --strict-config doctor --summary --no-color` exited 0; configuration **loaded**; 19 OK, 3 notes, 2 warnings, 0 failures. Warnings concern terminal dimensions and stale/unreachable background server. Doctor performs endpoint connectivity checks; no inference was invoked.
- `codex --strict-config features list` is **not supported** by that subcommand; it is not used as validation evidence. Ordinary feature inventory reports stable multi_agent enabled.
- `claude agents --help` and `claude agents --json` exited 0. In this installed release JSON lists active/background **sessions**, not custom agent definitions. It therefore does not prove definition discovery. Definitions use documented native frontmatter; runtime dispatch was intentionally not attempted because it would invoke a model.
- Strict config load proves accepted registry syntax, not that every agent was spawned. Worktree isolation and tool resolution have not been exercised by model sessions.

References: [Codex config reference](https://developers.openai.com/codex/config-reference/), [Claude native subagents](https://code.claude.com/docs/en/sub-agents). Installed CLI help and strict parser take precedence when documentation differs.
