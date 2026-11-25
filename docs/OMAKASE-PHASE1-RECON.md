# OMAKASE — Phase 1 Recon & Integration Plan

> Shared coordination doc for **Project Omakase** (StudEx Dark Factory).
> Branch: `feature/omakase-new-dawn-commerce` · Base: `main` @ `0d12d68` · 2026-11-25
> Author: Nikita (OpenClaw Integration & Deployment) · Status: recon complete, awaiting deployment calls

## 1 · Mission

Establish the existing GCP VM as the central Omakase operating-system server — connecting agents, repositories, business applications, research tools, cinematic production systems and commerce infrastructure. This branch is the shared development line for that work. Coordinate; do not fork the command plane.

## 2 · Fleet recon (read-only, 2026-11-25)

| Node | State | Specs | Disk | herdr relay | Tailscale |
|---|---|---|---|---|---|
| `rome` (dev box) | 🟢 up 41d, load ~3.4 | 4c · 15GB · Ubuntu 22.04 | 🔴 **100% FULL** | no | logged out |
| `factory` | 🟢 up 20d | 4c · 15GB · Ubuntu 22.04 | 🔴 **100% FULL** | yes (since Nov 4) | logged out |
| `agent` | 🟢 up 75d | 2c · 1GB · Ubuntu 22.04 | 🟢 35% OK | yes (since Sep 28) | logged in |
| `command` | 🔴 SSH timeout | — | — | — | — |

- Runtimes on all reachable nodes: Docker 29.x, Node 22.x, Python 3.10.12, git 2.34.
- No `gh`, `ollama`, `hermes` or `openclaw` on PATH anywhere reachable (Hermes/OpenClaw dirs exist on `rome` — installed non-PATH).
- `rome` services of note: `brain-deck` (knowledge workspace), Docker (idle — zero containers), VNC/ttyd-style ports, app ports 30xx/41xx/43xx/76xx/88xx/91xx. Home usage ≈7GB — the 97G fill is **outside `$HOME`** (needs on-box triage).
- Machine relays (herdr) already run in the wild on `factory` + `agent`. The rooms gateway from PR #13 is **not deployed on any node**.

## 3 · Red flags — fix before any deployment

1. Disk 100% on `rome` AND `factory` — a gateway deploy will fail outright.
2. Tailscale logged out on both 15GB nodes — mesh broken.
3. `command` node dark (SSH timeout) — ownership/role unknown; possibly the intended command plane.
4. No node has `gh` — PR workflows from VMs need auth setup first.

## 4 · Repo state at branch time

- `main` HEAD `0d12d68` (2026-11-25, Hermes Agent): *"Document and test the agent calling surface"* — `docs/AGENT-CALLING.md` (48 endpoints), `scripts/agent-call.sh`, smoke tests against a live server (5 agents, 20 MCP tools, all 5 call shapes 200).
- **PR #13** `os/online-computer` OPEN, mergeable: relay + FastMCP gateway + launcher apps + public-repo lock-down. This is the Omakase foundation.
- Open queue: skills updates (#9/#11), Agent Central (#5/#6/#7), Coms CRM/Jarvis calling (#12).

## 5 · Phases

**P1 · Infrastructure — recon done.** Awaiting calls: confirm `rome` as central server; approve disk remediation + Tailscale re-login. No provisioning, no cost.

**P2 · Agent network.** Register with the Omakase command centre via its authenticated integration mechanisms. Teammates: Robusca-Rex (orchestrator), Hermes (research/exec), Cindy (comms/approvals), Sentinel (security), Schpielberg (cinematic), Naledi (marketing), Codex + MiniMax (eng), Data Center Engineer (infra). Use the existing task registry + shared knowledge system — **no competing command centre**.
→ *Blocker: command-centre endpoint + auth mechanism needed (or confirm it = the PR #13 gateway once live).*

**P3 · Notebook-to-Video pipeline.** open-notebook (research/narration) → diagram-design (branded diagrams) → authorized media models → ComfyUI (visual assets) → Remotion (assembly/render). License/privacy/cost matrix **before** integration: ComfyUI GPL-3, Remotion company-license threshold check, open-notebook / open-higgsfield / diagram-design pending review. Approved local assets first.

**P4 · Knowledge recovery.** Notion: New Dawn studio, My Story + official StudEx logos, Cindy command centre. Integration ("Robusca" bot) is live — pages must each be connected (⋯ → Add connections → Robusca). ODESSUS Story Bible (Google Docs) still gated on Google auth.

## 6 · Decisions open

1. Central server = `rome`? (disk + tailscale remediation first)
2. Merge PR #13? (recommended — everything downstream builds on it)
3. Omakase command centre: endpoint + auth? (or = PR #13 gateway post-deploy)
4. First P3 tool to connect, after the license matrix lands
5. Obsidian sync path per OS-PLAN P4 (Git plugin / Syncthing / Obsidian Sync)

---

*External IPs, tokens and credentials are deliberately kept out of this public repo — see the ops vault.*
