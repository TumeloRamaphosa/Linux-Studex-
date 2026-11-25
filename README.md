# Linux StudEx — Agent Operating System

> **Studex OS — the online computer.** Every VM and machine joins with one line, and its agents and models show up in one place, served from one gateway address that works as an app on phone and laptop. Start with [OS-PLAN.md](OS-PLAN.md). The code lives in [`os/`](os): `os/rooms` (relay, gateway, Company Rooms) and `os/apps` (launcher, Factory, Stud-Bot, Mission Control).
>
> This repo is public. `auto-push.sh` only publishes the folders in its `PUBLISH` list and blocks keys and personal emails.

A multi-VM agent platform running on QEMU/UTM with pixel-agent dashboard, tmux command center, and Obsidian memory logging.

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                 tmux Master Terminal                 │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────────┐ │
│  │ main │ │cash  │ │hermes│ │human │ │  farm*   │ │
│  │      │ │claw  │ │      │ │      │ │  (×10)   │ │
│  └──────┘ └──────┘ └──────┘ └──────┘ └──────────┘ │
├─────────────────────────────────────────────────────┤
│  Agent OS Dashboard (open dashboard.html)           │
│  3D pixel agents  ·  per-agent chat  ·  live status │
├─────────────────────────────────────────────────────┤
│  Integrations                                       │
│  Obsidian ◆  TencentDB ◈  FeedHive ♢  OpenClaw ⬡   │
└─────────────────────────────────────────────────────┘
```

## VMs

| RVS  | Agent         | Size  | Port  | Role                    |
|------|---------------|-------|-------|-------------------------|
| RVS1 | Cashclaw      | 20GB  | :3000 | Financial Agent/Trading |
| RVS2 | Hermes        | 20GB  | :3001 | Gateway/Orchestrator    |
| RVS3 | OpenHuman     | 20GB  | :3002 | Platform/Deployment     |
| RVS4 | Cursor        | 20GB  | :3003 | IDE/Development         |
| RVS5-14 | Agent Farm | 5GB×10 | :3004+ | Worker nodes (Ollama) |

Total: 130GB disk, 28GB RAM, 14 VMs

## Quick Start

```bash
# 1. Open the dashboard
open dashboard.html

# 2. Launch tmux session
tmux new-session -s linux-studex -n main \; \
  new-window -n cashclaw \; \
  new-window -n hermes \; \
  new-window -n openhuman \; \
  new-window -n cursor \; \
  new-window -n farm \; \
  select-window -t 0

# 3. Deploy VMs
./scripts/orbit.sh --deploy all

# 4. View status
./scripts/orbit.sh --status
```

## Calling Agents

The full API reference lives in **[`docs/AGENT-CALLING.md`](docs/AGENT-CALLING.md)** —
every endpoint, the routing rules, and the gotchas.

Tracked work for the calling surface: **[`docs/TASK-SHEET-AGENT-CALLING.md`](docs/TASK-SHEET-AGENT-CALLING.md)**.
Verified results from a live server: **[`docs/SMOKE-TEST-RESULTS.md`](docs/SMOKE-TEST-RESULTS.md)**.

```bash
# talk to one agent
./scripts/agent-call.sh agent "show open positions" cashclaw

# let hermes route the task to the right agent(s)
./scripts/agent-call.sh task "deploy the new dashboard"

# agent -> agent
./scripts/agent-call.sh send '{"from":"hermes","to":"cursor","message":"review PR 42"}'

# shared memory across agents
./scripts/agent-call.sh fact set deploy_target rvs3 hermes
./scripts/agent-call.sh fact get deploy_target

# everyone at once
./scripts/agent-call.sh broadcast "status report"
```

Point it at any node with `STUDEX_HOST`:
```bash
STUDEX_HOST=https://rvs2.local ./scripts/agent-call.sh task "run the tests"
```

The five call shapes:

| You want to | Endpoint |
|---|---|
| Chat with one agent | `POST /api/agents/:name/chat` |
| Route a task to the right agent(s) | `POST /api/orchestrate/task` |
| Agent → agent message | `POST /api/orchestrate/send` |
| Tell every agent the same thing | `POST /api/orchestrate/broadcast` |
| Remember a fact across agents | `POST /api/orchestrate/blackboard` |

> **Note:** no endpoint has authentication. Do not expose port 4000 publicly.

## Studex Arcade

**Gamer** (Head of Studex Arcade) owns the **Stud-Bot gaming hub** at [`agents/gamer/arcade/`](agents/gamer/arcade/) — retro and new browser games with an **All / Retro / New** library. Open from the dashboard Integrations grid or `python3 -m http.server` → `/agents/gamer/arcade/`.

## Dashboard

Open `dashboard.html` for the full Agent OS interface:
- **Master Terminal** — tmux-style command center
- **Pixel Agents** — 3D pixel figurines for each agent
- **Per-Agent Chat** — talk to each agent individually
- **VM Specs** — live status table
- **Tmux Cheatsheet** — full command reference
- **Integrations** — Obsidian, TencentDB, FeedHive, OpenClaw config

## Integrations

### Obsidian Vault
Agent activities logged to `Agent-Logs/{agent-name}/YYYY-MM-DD.md`.
Install: `git clone https://github.com/kepano/obsidian-skills.git .claude`

### TencentDB Agent Memory
Symbolic short-term + layered long-term memory. 61% fewer tokens, 51% better pass rate.
Install: `openclaw plugins install @tencentdb-agent-memory/memory-tencentdb`

### FeedHive / Naledi
Daily content agent posting across Twitter/X, LinkedIn, Instagram, Facebook.
Setup: `bash scripts/setup-naledi.sh YOUR_FEEDHIVE_API_KEY`

### OpenClaw Gateway
API gateway routing all agent requests on ports 3000-3013.

## Naledi Content Agent

Posts daily at 08:00 and 15:00 SAST:
- AI agents built in South Africa
- 10 years blockchain experience
- Product demos & founder stories
- Harari philosophy × AI business
- Always includes stud.exchange link

## Auto-Push

The repo auto-commits and pushes every 30 minutes via launchd.
Log: `auto-push.log`

## Design System

- **Aesthetic:** Obsidian-gold, editorial luxury, cinematic
- **Fonts:** Cormorant Garamond (headings) · Bebas Neue (display) · Inter (body) · Space Mono (code)
- **Colors:** #C9A84C (gold) · #0A0A0A (obsidian black)

---

*Studex Group, Johannesburg SA · Built on QEMU/UTM · Powered by Ollama + n8n + OpenClaw*
