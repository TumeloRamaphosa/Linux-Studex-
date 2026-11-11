# Dark Factory — Master Plan (v1, 2026-11-04)

Owner: Tumelo. Operator: Kimi (control plane). Review weekly at Monday brief.

## 1. What this is
An autonomous agent company: research → content → publishing for our own brands (StudEx), plus a revenue fleet that builds/sells websites, stores, and content for clients. Zero-touch by default; human approves spend and external client delivery.

## 2. Current state — LIVE and verified
- **Mac (control plane):** OpenRig daemon :7433, studex7 rig — 8 seats (director, scout, analyst, writer, visual, video, publisher, memory). Full pack produced Nov 3 (3 PNG + video.mp4 + publish log).
- **Open Interpreter :3100** — free local code-execution agent, Ollama qwen2.5:14b on GPU, launchd-persistent, verified.
- **Ollama :11434** — local models (qwen2.5:14b, qwen3-vl:8b).
- **Discrawl** — Discord guild → SQLite archive; full sync + launchd tail; org memory.
- **Cloudflare tunnel** (launchd) — remote access to control plane.
- **Hermes + OpenClaw gateways** — WhatsApp/Facebook transport.
- **CashClaw** — guard ($50/day cap) + money ledger.
- **Obsidian `50-Marketing-Fleet`** — command centre: briefs, content, decisions (LLM wiki), skills, daily reports.
- **OS integration:** launchd on Mac (boot, 05:47 loop, 06:37 brief, 2× watchdog, tunnel, OI, discrawl), systemd on VM (boot factory rig).
- **Fleet link:** `rig ps --host herd` drives GCP VM from Mac (SSH, doctor green).
- **GCP VM studex-dev-rome** (e2-standard-4, 4vCPU/15GB): factory rig — 7 seats provisioned, bypass accepted, guidance delivered.

## 3. The ONE blocker
Cloud seats have no model access: OpenRouter account = $0 credits; claude-3.5-sonnet retired.
**Fix = ONE of:**
- A) OpenRouter top-up ($10) → I set model `anthropic/claude-haiku-4.5` and verify.
- B) VM Claude `/login` (Claude Max OAuth) → I remove the OpenRouter override.

## 4. Phases

### P0 — Unblock cloud (YOU, 2–10 min)
Choose 3.A or 3.B. I verify all 7 seats answer.

### P1 — Revenue fleet activation (me, 1–2 days)
- gigs: weekly demand scan → ranked opportunity list + draft proposals (approval-gated)
- builder: first StudEx ecosystem site builds via higgsfield-websites
- deployer: Cloud Build → Cloud Run microservices, preview URLs
- qa: smoke tests + screenshots before anything ships
- seller: drafts client comms; every mission writes CashClaw ledger entries
- Done = one test gig built, deployed to Cloud Run preview, QA-passed, ledger entry written

### P2 — Asset & distribution layer (needs your keys)
- Google Drive folder ID + service-account JSON → asset archive (builder/video save there)
- Blotato API key → multi-platform publishing (replaces per-channel posting)
- Freepik API key → stock assets for visual seat
- SCRAPECREATORS_API_KEY → full-coverage research (currently degraded)
- Cadence: 3 packs/day (05:47, 12:47, 18:47) across rotating platforms — NOT hourly (account bans)

### P3 — Voice + knowledge loop (me, 2–3 days)
- voice-agent on stores (text fallback first, realtime voice when creds allow)
- Transcripts → Obsidian `Voice/` via obsidian-sync
- Unanswered questions → product/FAQ gap report in 03-Decisions
- discrawl Git snapshots → VM herd reads org memory token-free
- Prime Agent assigned to long-running research seats (native schedules + /refine self-improvement)

### P4 — Productize (decision: A internal / B sell / C both)
- If B/C: multi-client structure — per-brand folders, per-client CashClaw missions, Stripe invoicing (keys already present), white-label site
- Pricing model from your other session: $500 starter / $1,200 pro / $3k enterprise per month
- Only after P1 proves one full client-delivery cycle

## 5. Guardrails (permanent)
- Human approval: spend above policy, external client delivery, cadence changes
- No auto-bidding/messaging on Fiverr/Upwork (ToS) — drafts only
- No placeholder text, invented prices, stock, or certifications in any output
- Legal/compliance flags (like R.6634) escalate to you, never auto-publish

## 6. Costs
- Current: existing VM (~$100/mo e2-standard-4) + Higgsfield usage + LLM (Claude Max + $50/day CashClaw cap)
- No new VMs planned. GPU rendering stays on your Mac (M1 Max) or Higgsfield API.
- Local inference (OI + Ollama + discrawl embeddings): $0

## 7. Next review
After P0: confirm cloud seats live → kick P1. Master plan updated as phases complete.
