# Marketing Fleet — Command Centre

The StudEx-7 content pod (Mac) and factory pod (VM) report here. This note is the human dashboard; agents read and write the folders below.

## How it works
- **Research + briefs** → `01-Briefs/` (daily last30days competitor scan + analyst brief)
- **Content packs** → `02-Content/YYYY-MM-DD/` (copy, visuals, video, publish log)
- **Decisions + learnings** → `03-Decisions/` (what worked, what failed, strategy pivots — the LLM wiki)
- **Skills library** → `04-Skills/` (reusable playbooks agents load before acting)
- **Fleet reports** → `05-Reports/` (daily fleet status, earnings vs. spend)

## Live status
- Rig: `studex7` (8 seats, Mac) — director, scout, analyst, writer, visual, video, publisher, memory
- Rig: `factory` (7 seats, GCP studex-dev-rome) — gigs, builder, deployer, qa, seller, voice-agent, obsidian-sync
- Schedule: daily content loop 05:47 SAST, fleet brief 06:37, watchdog 07:13 + 17:13 (launchd)
- Machine output mirror: `~/dark-factory-rig/out/`

## Approval gates (human only)
- Spend above CashClaw policy ($50/day cap)
- Any delivery to external clients or third-party accounts
- Publishing cadence changes

## Links
- Control plane (Cloudflare tunnel): see `~/dark-factory-rig/logs/tunnel.log` for current URL
- Money ledger: `~/.cashclaw/ledger.jsonl`
