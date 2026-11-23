# Studex OS — the online computer

**Goal:** one online computer for the whole business. Every VM, Mac and server joins with one line; every agent and every model on them is visible and usable from one address; all the business tools are wired in; it works as an app on any phone or laptop.

## How it fits together

```
  Any machine (VM · Mac · GPU box · laptop)          Phone / laptop / TV
  herdr + CLI agents · Ollama / LM Studio            browser → gateway address
  studex_relay.py  (joined with one line)                     │
        │  HTTPS, one key per machine,                        │
        │  queues while offline                               │
        ▼                                                     ▼
  ┌──────────────────────── Gateway (FastMCP, GCP box) ───────────────────────┐
  │  /            Company Rooms        /apps/        launcher + all OS apps    │
  │  /rooms       live JSON            /join.sh      one-line join             │
  │  /mcp         tools for agents: rooms_list · room_get · agent_find ·       │
  │               models_list  (+ connector tools, phase 3)                    │
  └────────────────────────────────────────────────────────────────────────────┘
        │
        ▼  memory + files: Obsidian vault, Google Drive, repo (phase 4)
```

## What is in this repo now

| Path | What it is | State |
|---|---|---|
| `os/rooms/relay/` | The relay every machine runs: reports its agents (herdr) and its models (Ollama, LM Studio, any OpenAI-compatible server). Standard-library Python. | Built, tested |
| `os/rooms/relay/join.sh` | One-line join for Linux and macOS: installs the relay as a service that survives reboots. | Built |
| `os/rooms/gateway/` | FastMCP gateway: rooms, models, join, apps, MCP tools. `mint <id>` creates a machine key. | Built, tested |
| `os/rooms/web/` | Company Rooms page with promo reels. | Built |
| `os/apps/index.html` | Launcher: all apps, join command, models on the network. | Built |
| `os/apps/factory/` | Studex Factory page (client details replaced with placeholders) + `intro/` film plan and her call drafts. | Page built; film in planning |
| `os/apps/stud-bot/` | Stud-Bot app prototype (sample data). | Prototype |
| `os/apps/mission-control/` | Work tracker. | Built |
| `dark-factory-rig/`, `server/`, `sdk/`, `scripts/` | Existing Linux StudEx agent platform. | Unchanged |

## Phases

### 0 · Lock down — done in this change
The repo is public and the Mac auto-pushes every 30 minutes. `auto-push.sh` now only stages the folders in its `PUBLISH` list and refuses to push if it sees an API key, a private key, a personal email address or a file over 20 MB. `.gitignore` keeps `.env`, keys, `clients/`, `uploads/`, `private/`, databases and model files off GitHub.

### 1 · Go live (needs Tumelo, about 30 minutes)
1. On the GCP box: `pip install -r os/rooms/gateway/requirements.txt`, then `python3 os/rooms/gateway/rooms_gateway.py mint <id>` once per machine.
2. Put the gateway behind HTTPS: a free Cloudflare Tunnel (already used for the control plane) or Caddy. Set `STUDEX_PUBLIC_URL` and a `STUDEX_VIEW_TOKEN`.
3. On each VM and Mac: the one-line join from the launcher. Add `STUDEX_ADVERTISE_HOST` so other machines can reach its models.
4. Open the gateway address on your phone and add it to the home screen.

### 2 · One design — Factory retro
Every page moves to the Factory look: charcoal `#0a0805`, amber `#FFB000`, yellow `#FFD21F`, cream `#E8DDBA`, brown-gold lines `#3a2c10`, VT323 titles over IBM Plex Mono, square corners, scanlines. Rooms and the launcher already use it; next are Stud-Bot (currently gold/Chakra Petch), Mission Control and `dashboard.html` (currently Obsidian gold). The Stud-Bot handoff spec moves to the same tokens.

### 3 · Connect the tools
Each tool becomes an MCP server the gateway proxies, so every agent on every machine gets the same tools with one key, scoped per agent. Free and open-source options first.

| Group | Tools | How |
|---|---|---|
| Work | Notion, ClickUp, Slack, Gmail, Google Calendar, Google Drive | Their official MCP servers / APIs with an OAuth app per tool; tokens live only on the gateway |
| Commerce + data | Shopify, Supabase, Windsor.ai (ads + analytics), Vercel | Official MCP servers; read-only first, writes behind approval |
| Agent stack | Hermes, OpenClaw, Discord/Buzz, n8n, FeedHive, CashClaw | Hermes and OpenClaw already speak HTTP; n8n via its MCP trigger; CashClaw spend cap stays the guard |
| Creative | Higgsfield | Its MCP server; every generation quoted before credits are spent |

Rule for all of them: reading is open to agents, anything that sends, spends, publishes or deploys goes through the Approvals step (Stud-Bot / Studex Deck).

### 4 · Memory and files
- **Obsidian vault:** keep it as the source of truth. Free: the Obsidian Git plugin, or Syncthing (open source), to a private repo or the GCP box; paid: Obsidian Sync. The gateway then indexes it read-only for agents, with private folders excluded.
- **Files:** Google Drive as the shared drive; local files on the Mac reached through the Claude desktop app's linked-computer bridge, never copied into this public repo.

### 5 · Apps
Turn the launcher into an installable app (home-screen icon, works offline from cache) for phone and laptop, then the Stud-Bot app proper from the handoff spec, and the Factory opening film (`os/apps/factory/intro/INTRO-PLAN.md`).

## Decisions open
- Gateway host: the GCP box (`studex-dev-rome`) or a new small VM.
- Which tool connects first in phase 3.
- Obsidian sync: Git plugin, Syncthing, or Obsidian Sync.
- Her voice for the opening (Bella or Nicole), the Harari quote, and the Lacrimosa recording.
