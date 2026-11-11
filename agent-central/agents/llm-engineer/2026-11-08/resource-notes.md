# Resource notes — 8 November 2026

Public pages and repositories read in this pass. Star counts and update times
are what GitHub returned at read time; they will drift.

## Linux-Studex- (the intended Agent Central home)

https://github.com/TumeloRamaphosa/Linux-Studex-

Public repository, created 1 June 2026, description "Linux Studex Agent VM",
no license file on `main`, JavaScript as the recorded language, secret scanning
enabled. Default branch `main` (tree SHA starting `37dc5b5d…` at read).

On `main` there is no `agent-central/` folder. The tree is an Agent OS sketch:

- `README.md` — multi-VM agent platform on QEMU/UTM: tmux master, pixel-agent
  `dashboard.html`, Obsidian / TencentDB / FeedHive / OpenClaw mentions.
  Planned VM table: Cashclaw, Hermes, OpenHuman, Cursor, plus a 10-node agent
  farm. Stated totals in the README (130 GB disk, 28 GB RAM, 14 VMs) are
  design figures, not proof that those VMs exist today.
- `dashboard.html` and `hero-bg.png`
- `.tmux.conf`, `auto-push.sh` (README says the repo auto-commits every
  30 minutes via launchd; that automation was not verified running)
- `scripts/` (`orbit.sh`, `setup-naledi.sh`, `cursor`)
- `sdk/node` and `sdk/python` client SDKs
- `server/` Express-style agent server (cashclaw, hermes, openhuman, cursor,
  farm), LLM mesh, MCP, orchestrator, sandbox, routes, and dated logs from
  1–3 June 2026

Useful as the named operating-system repo and the public command home.
Treat June dashboard/VM numbers as design, not live inventory. Because the
repo is public, every Agent Central file must stay sanitized.

## TumeloRamaphosa/Eswatini

https://github.com/TumeloRamaphosa/Eswatini

Public, description "Eswatini Ai", no license stated, last pushed
6 November 2026. README title: "Studex Eswatini OS" — a dedicated country
operating system for the Studex Eswatini programme. It already has
`AGENTS.md`, `agents/`, `docs/` (scope, strategy, source register, deployment,
software factory, architecture, bootstrap), and `ops/` (daily routine, log
template, notifications, build status).

Current phase stated in the README: validation reset. September deployment
schedules were not verified as completed. Immediate objective: qualify one
paid discovery sponsor, prove one governed agent workflow in staging, and
package a 60-day pilot before any production or physical-infrastructure
commitment.

Useful as a country-OS pattern and a possible 2027 regional expansion lane.
It is not a substitute for Agent Central, and it should not receive fleet
secrets.

## openclaw.ai/enterprise

Fetched 8 November 2026. OpenClaw Enterprise is described as an open, vendor-
neutral, self-hosted control plane for persistent agents in sensitive
environments: multi-tenancy, governance, auditability, replaceable harness /
model / sandbox primitives. The page itself says: **pre-1.0 software,
intended for internal pilot workloads**. Self-hosting is described as free
for any organization. Bi-weekly office hours are offered.

Useful as the honest framing for any client conversation: internal pilot,
self-hosted, governance — not a production SLA and not a claim that Studex
owns the software. Licensing of every Enterprise component beyond this
marketing page was **not** independently verified in this pass.

## w95/awesome-claude-corporate-skills

https://github.com/w95/awesome-claude-corporate-skills — MIT, ~166
role-based Claude skills (leadership, finance, HR, marketing, sales, legal,
operations, engineering, product, data, customer success, procurement,
documents). Python, about 306 stars at read.

Useful as a catalogue to borrow role skills for Stud-Bot / corporate agents
after a licence and quality review. Catalogue only; do not install from this
PR.

## blader/humanizer

https://github.com/blader/humanizer — MIT. Agent skill that removes signs of
AI-generated writing. Very widely starred.

Useful for customer-facing copy (meat, coffee, Stud-Bot pages) after a human
review. It does not replace factual checks or legal review.

## headroomlabs-ai/headroom

https://github.com/headroomlabs-ai/headroom — Apache-2.0. Compresses tool
outputs, logs, files, and RAG chunks before they reach the model. Claims
(from the repo description, not re-benchmarked here): fewer tokens for
coding agents and much fewer for JSON, with the same answers. Library,
proxy, and MCP server.

Useful for Model House and long agent loops if token cost or context overflow
is hurting. Do not install without a yes and a test plan.

## Graphify-Labs/graphify

https://github.com/Graphify-Labs/graphify — Apache-2.0. Turns a codebase plus
docs, SQL, configs, and PDFs into a queryable knowledge graph via local
deterministic AST parsing; no vector store. Default branch observed as `v8`.

Useful later for explaining Linux-Studex-, Dark Factory, and client repos to
agents. Heavy; not a Black Friday dependency.

## deepseek-ai/deepseek-harness

https://github.com/deepseek-ai/deepseek-harness — MIT. Description:
"DeepSeek Harness: Everything is a Plugin." TypeScript, homepage
https://deepseek.com/harness. This is not Harness.io.

Useful as a plugin-harness reference if Studex standardizes how tools attach
to local models. Research only for now.

## disler/durable-pi

https://github.com/disler/durable-pi — MIT. Persistent, multi-device durable
agents with web and terminal clients (SQLite / durable-agent playground).

Useful as a pattern for agents that must survive machine sleep, disconnects,
and device swaps — relevant to the Mac-to-Razer/Omarchy migration. Research
only.

## garrytan/gbrain

https://github.com/garrytan/gbrain — MIT. "Garry's Opinionated OpenClaw/Hermes
Agent Brain." Active (pushed the same day as this read).

Useful as an opinionated OpenClaw/Hermes brain to compare with Studex Hermes
repair work. Do not copy it over a living Hermes config without a yes and a
backup.

## code.claude.com/docs/en/goal

Fetched 8 November 2026. Claude Code `/goal` sets a completion condition and
keeps working until a separate evaluator model says the condition is met,
judges it impossible, or a user-fixable error clears the goal. Best for
verifiable end states (tests pass, backlog empty). Complementary to auto
mode (which only approves tools inside one turn). Conditions should be
provable from the transcript itself.

Useful as an operating method for finishing Linux-Studex- and factory work:
write acceptance as a `/goal` condition instead of open-ended "keep going".
It does not remove approval gates.

## huihui-ai/Qwen3-8B-abliterated

Source: https://huggingface.co/huihui-ai/Qwen3-8B-abliterated (fetched
8 November 2026) plus public GGUF sizing pages.

What it is: an uncensored (abliterated) Qwen/Qwen3-8B. About 8B parameters,
published in BF16. The model card says this is a crude proof-of-concept to
remove refusals, and points to a newer
`huihui-ai/Huihui-Qwen3-8B-abliterated-v2`. Official Ollama tag mentioned on
the card: `huihui_ai/qwen3-abliterated` / `:8b`.

Size and fit (estimates from public GGUF writeups, not a local benchmark):

| Form | File / weights (approx.) | Fit notes |
|---|---|---|
| BF16 | about 16.4 GB | Needs roughly 18 GB class memory at short context. Does not fit an 8 GB GPU. |
| Q8_0 | about 8.7 GB | Too large for 8 GB VRAM at useful context. |
| Q5_K_M | about 5.9 GB file | Tight on 8 GB at 8K context. |
| Q4_K_M | about 5.0–5.03 GB file | Often estimated around 6.7–7.1 GB at 8K context; commonly the first quant people try on 8 GB. Longer context (16K–32K) may not fit. |
| Q2_K / IQ2 | about 3.1–3.3 GB | Fits more easily; quality drop expected. |

Mac mini (little babushka): unified memory size was **not** re-verified in
this pass. If the machine has 16 GB or more unified memory and other large
models are not loaded at the same time, a Q4 or Q5 quant is the realistic
candidate. Disk free space has recently been around 19–21 GiB; a 5 GB pull
is material and needs a yes. Do not pull while ornith empty-reply diagnosis
and cleanup approvals are still open.

8 GB GPU (possible Razer target; exact Razer model still unanswered): Q4_K_M
at modest context is the first quant that public estimates say can fit;
Q5 is tight; Q6+ likely will not. This is not a substitute for measuring
after the machine is on Linux.

How to add to Model House (LiteLLM) after a yes, a chosen quant, and an
Ollama (or LM Studio) pull — draft only, do not apply:

```yaml
# Draft route. Do not commit real keys or non-loopback hosts.
- model_name: local-qwen3-8b-abliterated
  litellm_params:
    model: ollama/huihui_ai/qwen3-abliterated:8b
    api_base: http://localhost:11434
```

Wire it only to a clearly named internal route. Do not alias it as a
general "reason" or customer chat model.

Guardrail needs (required, not optional):

- The publisher warns that safety filtering is significantly reduced, that
  the model is not suitable for public or underage settings, and that it
  should be treated as research / controlled use rather than production.
- Their own harm-instruction probe reports 320/320 "passed" for the
  abliterated model versus 195/320 for base Qwen3-8B. In that test,
  "passed" means the model did **not** refuse. That is the opposite of a
  safety score.
- Do not expose this route on WhatsApp, Hermes customer intake, Shopify
  support, or any public Model House alias.
- Keep a separate filtered model in front of customers. Add output review
  (human or a refused/filtered second model) before anything leaves the lab.
- Do not use it for any content involving minors.
- Pull, route change, and any exposure beyond loopback still need a yes.
