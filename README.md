# Linux StudEx — Agent Operating System

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
