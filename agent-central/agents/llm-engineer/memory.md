# LLM ENGINEER memory

Last updated: 8 November 2026, afternoon (Africa/Johannesburg).
Owner desk: LLM ENGINEER, reporting to Agent Chief Lord (Tumelo).
This file is sanitized for a public repository.

## Role

Oversee Studex LLM inference and the machine/VM fleet used for local models,
Model House (LiteLLM), and agent workplaces. Do not spend, send, flash, wipe,
pull models, restart services, or merge without an explicit yes.

## Fleet picture (operational, not a live telemetry proof)

Codename map used in notes: Robuska's house = MacBook; little babushka = Mac mini;
Robuska's mom's house = the private mesh; Charlie's Corner = Pangolin.
The phone has been offline in recent checks. The Razer and big babushka are not
registered to the assistant computers list.

Model House is LiteLLM. On the Mini the config path commonly cited is
`~/model-house/litellm-config.yaml` (launch agent `ai.studex.model-house-mini`),
local port 4001. Routes reported: `local-ornith9b`, `local-llama3b`,
`local-qwen14b` (model not installed), and minimax. On the MacBook the config
path commonly cited is `~/Projects/model-warehouse/config/model-house.yaml`.
Routes reported: `reason-local`, `vision-local`, `jev-decision`, and `laya`.
Both gateways have been described as local-only listeners, so other machines
cannot reach them yet. Port 4000 on the MacBook has also been used by NoMachine;
do not assume Model House owns that port without checking.

These paths and routes are **REPORTED** from prior desk notes. They were not
re-probed from this Agent Central pass.

## Standing safety

- Never put keys, tokens, IPs, or passwords in docs, repos, or chat.
- Never name the private-mesh product; say "Robuska's mom's house".
- Nothing is deleted, sent, installed, flashed, pulled, or restarted without a yes.
- Never touch MacBook-Models, OrbStack, model weights, agent data, `.hermes`,
  or `.openclaw` without a yes.
- Little babushka and the Razer never hold Shopify or payment keys.
- secrets-vault, buzz-keys, and studex-api-keys never go to GitHub or Drive.

## What this desk has been building (Nov 2026)

Dark Factory daily loop (research, build, hourly checks, Short drafts, local
model tests) under `/workspace/dark-factory/YYYY-MM-DD/`. Plans under
`/workspace/plans/`. Vault-bound copies under `/workspace/obsidian-pending/`.

Named projects on the Notion Projects queue owned by this desk:

- Model House (status recorded as Blocked)
- Local model tests (Active)
- Razer Dev Station (Proposed; plan written, nothing installed)
- Machine Migration (Proposed; every wipe needs per-machine confirmation)
- Studex Computer (Proposed; manufacturer meetings not started)

## Recent machine facts (label carefully)

From the midnight 8 Nov work-shift note (written by this desk on the shared box):

- little babushka was online around 00:03 SAST with about 19 GiB free. Ollama
  reported 0.40.15 with `llama3.2:3b`, `ornith:9b`, and `nomic-embed-text`.
  llama3.2 smoke passed; ornith:9b returned HTTP 200 with empty text (FAIL).
  No restart was performed.
- Robuska's house was online with very high load (about 146–178) and about
  33 GiB free. Ollama reported 0.40.8 with `qwen2.5:14b` and `qwen3-vl:8b`.
  Hermes path was broken. Model House on that machine reported down (HTTP 000).
  14b smoke was skipped because of load.

From the 3 PM SAST status note the same day:

- Robuska's house load had settled (about 32/26/29), about 43 GiB free, Model
  House liveliness HTTP 200, Ollama still 0.40.8, Hermes CLI still broken.
- little babushka was not connected at that check (last seen around 10:42 SAST
  with about 21 GiB free).
- Phone still offline; Razer and big babushka still unlisted.

From later afternoon parent/status notes (REPORTED, not re-probed here):
Ollama on Robuska's house has been observed accepting outside connections;
locking it to local-only is waiting on a yes. Mini cleanup B+E is estimated
to free about 5.5–6 GiB, including about 4 GiB from Chrome's on-device AI
model; that cleanup is also waiting on a yes.

Ollama version reports for the Mini have conflicted in earlier notes (0.35.1
against 0.40.15). Treat the exact Mini version as needing a fresh check.

## Razer USB / Omarchy

Agent Chief Lord chose the about-63 GB stick and Omarchy. A `dd` command was
prepared pointing at an `omarchy-4.0.4.iso` path on the MacBook. DC Engineer
later reported that the Omarchy ISO files found on the Macs look like failed
downloads, not a verified image. **Hold the flash** until a checksum-verified
ISO exists. No flashing or wiping was done from this pass.

## Models waiting on a yes (do not pull)

MiMo, PLaMo, AutoTrust (`autotrust-jev:9b`, about 11 GB per earlier checklist),
LFM3, and now `huihui-ai/Qwen3-8B-abliterated` (see today's resource notes).
The abliterated model is uncensored; it must not be wired to customer-facing
routes without guardrails.

## Other desks visible today

Robusca prepared Agent Central business-context notes on the shared box at
about 12:12–12:13 SAST (`/workspace/agent-central-robusca-handoff.md` and
`/workspace/agent-central-reviewed-context.md`). Those notes say Sentinel owns
the canonical project queue and Agent Central should not become a second queue.

Open Linux-Studex- pull requests as of this pass: #1–#4 skills-library updates,
#5 Agent Central command plane, #6 complementary security/foundation review.
This PR is a third Agent Central contribution (LLM ENGINEER desk files) and
should be reviewed against #5 and #6 rather than duplicated into them blindly.
