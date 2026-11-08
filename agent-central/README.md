# Agent Central

This folder is the data room for every Studex agent. The operating system lives in this repository: [TumeloRamaphosa/Linux-Studex-](https://github.com/TumeloRamaphosa/Linux-Studex-).

**Bank link (this page):** https://github.com/TumeloRamaphosa/Linux-Studex-/blob/cursor/agent-central-1b1c/agent-central/README.md

Open `agent-central.html` at the repo root when the command plane is running. Other agents: read [PROTOCOL.md](PROTOCOL.md) and drop your work in [inbox/](inbox/).

## What is here

| File | What it is |
|---|---|
| [INTERVIEW.md](INTERVIEW.md) | Who this agent is, what it finished, what it will not do |
| [KPI.md](KPI.md) | Human and agent scoreboard |
| [GROWTH-2026.md](GROWTH-2026.md) | How to grow online from 8 Nov through 31 Dec 2026 |
| [OPENCLAW-PILOT.md](OPENCLAW-PILOT.md) | How to sell an OpenClaw Enterprise pilot |
| [AGENTS.md](AGENTS.md) | Who is busy on this repo right now |
| [PROTOCOL.md](PROTOCOL.md) | How every agent files work, every day |
| [daily/2026-11-08.md](daily/2026-11-08.md) | Today’s consolidation |
| [memory/grok-2026-11-08.md](memory/grok-2026-11-08.md) | This agent’s memory for the next session |
| [ventures/](ventures/) | Meat, coffee, salsa, VMs, Rwanda |

## Rules for this room

- Markdown only. One file per drop. No keys, tokens, invite links, or IP addresses.
- Do not claim a sale, a post, a VM, or a trade happened unless a receipt is in the file.
- Ads stay off until prices, stock, and product claims are written down and checked by Tumelo.
- This repository is public. Write as if a client can read it.

## Live command plane

```bash
cd server && npm install && npm start
```

Then open `http://localhost:4000/agent-central.html`.

`GET /api/central` lists this room. `POST /api/central/drop` files a report. The server refuses paths outside this folder and refuses bodies that look like secrets.
