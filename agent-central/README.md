# Agent Central

This folder is the shared data room for Studex agents: the place every agent
saves daily work, memory, and status so the next agent can see what is already
in motion.

Repository: [TumeloRamaphosa/Linux-Studex-](https://github.com/TumeloRamaphosa/Linux-Studex-)
(public "Linux Studex Agent VM" / Agent Operating System).

This pull request is the LLM ENGINEER desk drop for 8 November 2026 (Africa/Johannesburg).
It does **not** replace Sentinel's canonical Projects queue in Notion, and it
does **not** merge or close the earlier Agent Central pull requests opened the
same day:

- PR #5: [Open Agent Central on the command plane](https://github.com/TumeloRamaphosa/Linux-Studex-/pull/5) (`cursor/agent-central-1b1c`, currently based on `skills-library`)
- PR #6: [independent PR #5 security review + foundation index](https://github.com/TumeloRamaphosa/Linux-Studex-/pull/6) (`cursor/agent-central-foundation-7328`)

If those land first, keep their `PROTOCOL.md` / `inbox/` flow and add the
per-agent desks below beside them. Do not invent a second queue.

## Filing convention

```
agent-central/
  README.md                          <- this file (the bank / index)
  llm-engineer/                      <- long-form briefs for this desk
    interview-and-plan.md
  agents/
    <agent-name>/
      memory.md                      <- rolling memory the next session should read first
      status.md                      <- current work, blockers, waiting-on-yes
      YYYY-MM-DD/                    <- that day's notes (markdown only)
```

Example for this desk:

- `agents/llm-engineer/memory.md`
- `agents/llm-engineer/status.md`
- `agents/llm-engineer/2026-11-08/`
- `llm-engineer/interview-and-plan.md`

Agent names use lowercase kebab-case (`llm-engineer`, `sentinel`, `dc-engineer`,
`robusca`, `hermes`). One folder per calendar day in Africa/Johannesburg.

## Daily rhythm

1. Read this README and your `memory.md` / `status.md`.
2. Read today's folder if it exists; otherwise create `agents/<you>/YYYY-MM-DD/`.
3. Look at sibling desks and open pull requests before starting parallel work.
4. File markdown only. Update `memory.md` and `status.md` when the facts change.
5. Link evidence (PR, test command, Notion page) instead of copying secrets or private data.

## Hard rules (this repository is public)

- No keys, tokens, passwords, private keys, or invite links.
- No IP addresses.
- No third-party email addresses.
- Never write the private-mesh product name; say "Robuska's mom's house".
- Never paste contents of secrets-vault, buzz-keys, or studex-api-keys folders.
- Do not claim a sale, send, spend, flash, wipe, merge, deploy, or restart
  happened unless approval and evidence are linked.
- Mark anything not checked in this pass as **UNVERIFIED** or **REPORTED**.
- Finished Cursor runs are not acceptance. Merged PRs with passing checks and
  a written test result are.

## What this PR adds

| Path | What it is |
|---|---|
| [agents/llm-engineer/memory.md](agents/llm-engineer/memory.md) | Rolling memory for the LLM ENGINEER desk |
| [agents/llm-engineer/status.md](agents/llm-engineer/status.md) | Status, blockers, and pending yeses as of 8 Nov 2026 |
| [agents/llm-engineer/2026-11-08/](agents/llm-engineer/2026-11-08/) | Today's sanitized work drop |
| [llm-engineer/interview-and-plan.md](llm-engineer/interview-and-plan.md) | Self-interview, KPI review, growth plan |

Nothing in this PR installs software, flashes a disk, merges another PR, or
contacts another agent.
