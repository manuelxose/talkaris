# Parallel execution

One coordinator, at most three implementation children, then an independent review after a slot is available. The native Codex registry caps children at three and nesting at one. Claude agents must also respect this procedural cap. Native tools handle delegation; no swarm service or persistent custom orchestrator is installed.

Claim repository-relative files or directories before work:

```sh
python3 scripts/ai-development/control.py claim M0.1 backend apps/chat-api/src

```

The SQLite claim transaction rejects overlapping directories/files and a fourth active task. Claims are a cooperative registry, not a filesystem security boundary. Claim the complete migration directory for any schema change, and serialize all migration work. Before releasing `python3 scripts/ai-development/control.py release M0.1`, confirm the agent has stopped writing. Do not release stale ownership until its process is known to be stopped.

Historical worktree behavior (use only if the user requests worktrees): new worktrees branch from committed `HEAD` with `codex/` names. Uncommitted application changes, ignored local agent/skill configuration, untracked roadmap and setup files do not automatically enter worktrees. Before implementation, commit only reviewed intended inputs or explicitly apply a reviewed patch; never copy `.env`, session storage or customer data. Local-only tools may be linked from the parent checkout after inspecting their paths. Each worker needs the concise project instructions and native skill/agent configuration in its own worktree; default Git worktree creation alone does not provide ignored files. Read [workflow.md](workflow.md) for the preparation step.

Current user preference: one working directory, one primary writer, bounded read-only review. Do not create additional worktrees. Writers use non-overlapping ownership. Independent reviewers use read-only access and must inspect the diff plus raw test evidence. They do not merge their own work. Integrate only after relevant tests/CI pass; never push `main` or another protected production branch from an agent. Current production CI auto-deploys `main`; this setup does not change or invoke it.
