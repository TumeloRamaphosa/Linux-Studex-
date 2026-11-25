# OMAKASE — Phase 1 Recon & Integration Plan

> Shared coordination doc for Project Omakase (StudEx Dark Factory).
> Branch: `feature/omakase-new-dawn-commerce` · Base: `main` @ `0d12d68` · Date: 2026-11-25
> Author: Nikita (OpenClaw Integration & Deployment Engineer) · Status: recon complete, awaiting deployment calls

## 1. Mission

Establish the existing GCP VM as the central Omakase OS server: connect agents, repositories,
business applications, research tools, cinematic production systems and commerce infrastructure.
Work alongside Hermes, Robusca-Rex, Codex, MiniMax, Cindy, Sentinel and the rest of the fleet.
This branch is the shared development line for that work. No competing command centre is created.

## 2. Fleet recon (read-only, 2026-11-25 — no installs, no restarts, no cost)

| Node | State | Specs | Disk | herdr relay | Tailscale |
|---|---|---|---|---|---|
| `rome` (dev box) | up 41d, load ~3.4 | 4c / 15GB / Ubuntu 22.04 | 100% FULL | no | logged out |
| `factory` | up 20d | 4c / 15GB / Ubuntu 22.04 | 100% FULL | yes (since Nov 4) | logged out |
| `agent` | up 75d | 2c / 1GB / Ubuntu 22.04 | 35% OK | yes (since Sep 28) | logged in |
| `command` | unreachable (SSH timeout) | — | — | — | — |
| `hermes-vm` | unreachable (timeout; tailscale offline 94d) | — | — | — | — |

Runtime presence on the fleet: Docker 29.x, Node 22.x, Python 3.10, git 2.34 on all reachable
nodes. No `gh`, `ollama`, `hermes`, or `openclaw` binaries on PATH on the reachable nodes
(Hermes/OpenClaw directories exist on `rome`; binaries not on PATH).

Listening services of note on `rome`: brain-deck (knowledge workspace), Docker engine (running,
zero containers), VNC/ttyd-style ports (59xx/60xx), assorted app ports (30xx/41xx/43xx/76xx/88xx/91xx).
External IPs and tailnet addresses are deliberately kept in the ops vault, not in this public doc.

## 3. Red flags (fix before any deployment)

1. Disk 100% on `rome` AND `factory` — a gateway deployment will fail outright. Remediate first.
2. Tailscale logged out on both 15GB nodes — fleet mesh broken.
3. No machine has the rooms gateway (`os/rooms/gateway`) deployed — machine relays (herdr) exist
   in the wild; the gateway does not.
4. `command` node dark — role unknown; possibly the intended command plane.

## 4. Repo state at branch time

- `main` HEAD `0d12d68` — "Document and test the agent calling surface" (Hermes Agent, 2026-11-25):
  `docs/AGENT-CALLING.md` (48 endpoints), `scripts/agent-call.sh`, smoke tests against a live
  server (5 agents, 20 MCP tools, 5 call shapes passing).
- PR #13 `os/online-computer` OPEN, mergeable: relay + FastMCP gateway + launcher apps + public-repo
  lock-down. This is the Omakase foundation — the deploy target for everything below.
- Open PR queue also includes skills updates (#9/#11), Agent Central (#5/#6/#7), Coms CRM/Jarvis
  calling (#12).

## 5. Phases

### P1 — Infrastructure (recon done)
Decision needed: confirm `rome` as central server; approve disk remediation + Tailscale re-login.
No provisioning, no cost, no new infra.

### P2 — Agent network
Register with the Omakase command centre via its authenticated integration mechanisms. Coordinate
with Robusca-Rex (orchestrator), Hermes (research/execution), Cindy (communications/approvals),
Sentinel (security), Schpielberg (cinematic), Naledi (marketing), Codex/MiniMax (engineering).
Use the existing task registry and shared knowledge system.
BLOCKER: need the command-centre endpoint + auth mechanism (or confirm it is the PR #13 gateway
once deployed).

### P3 — Notebook-to-Video pipeline
open-notebook (research/narration) → diagram-design (branded diagrams) → authorized media models /
ComfyUI (visual assets) → Remotion (assembly/render).
License/privacy/cost matrix required BEFORE integration: ComfyUI GPL-3, Remotion company-license
threshold, open-notebook + open-higgsfield + diagram-design pending review. Approved local assets
first.

### P4 — Knowledge recovery
Notion pages (New Dawn studio, My Story + official logos, Cindy command centre) + ODESSUS Story
Bible (Google Docs). Notion integration ("Robusca" bot) is live — pages must be connected to the
integration (Add connections → Robusca) before API pull. Google Docs still gated.

## 6. Decisions open

1. Central server = `rome`? (disk + Tailscale remediation first)
2. Merge PR #13? (recommended — everything downstream builds on it)
3. Omakase command centre: endpoint + auth mechanism? (or = PR #13 gateway?)
4. First P3 tool to connect after the license matrix lands.
5. Obsidian sync path (Git plugin / Syncthing / Obsidian Sync) per OS-PLAN phase 4.
