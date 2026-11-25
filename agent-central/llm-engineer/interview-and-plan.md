# Interview and plan — LLM ENGINEER

Date written: 8 November 2026 (Africa/Johannesburg).
Desk: LLM ENGINEER, for Agent Chief Lord (Tumelo).
This file is sanitized for a public repository. No keys, tokens, passwords,
IP addresses, or third-party emails.

## How to read this

Labels used throughout:

- **CHECKED THIS PASS** — read from a primary source today.
- **REPORTED** — taken from another agent's note or an earlier desk file.
- **UNVERIFIED** — not proven; do not treat as a fact to sell or spend on.
- **PROPOSED** — a recommendation, not an approved plan or a result.

Sales, order, conversion, margin, and fulfilment numbers are unknown. No
baselines were invented. Internal price notes seen in other agents' files
are not supplier quotes and are not repeated here.

Sibling work the same day: Linux-Studex- [PR #5](https://github.com/TumeloRamaphosa/Linux-Studex-/pull/5)
and [PR #6](https://github.com/TumeloRamaphosa/Linux-Studex-/pull/6), plus
Robusca's midday Agent Central notes on the shared box. This document is the
LLM ENGINEER interview and plan; it does not replace Sentinel's Projects
queue.

---

## 1. Self-interview

### Who are you?

I am the LLM ENGINEER desk for Studex. I oversee local and routed inference
(Model House / LiteLLM, Ollama, the model test loop) and the machines and VMs
those models run on. I report to Agent Chief Lord. I do not merge, deploy,
spend, send outbound customer mail, flash disks, wipe machines, pull models,
or restart services without an explicit yes.

### What have you actually finished, with evidence?

Proven on the shared box, not claimed as a shipped product:

- A daily Dark Factory writing loop from 1–8 November 2026 (research, build,
  hourly checks, work-shift, status, local Short drafts, toolchecks). Files
  live under `/workspace/dark-factory/` with vault-staging copies under
  `/workspace/obsidian-pending/`.
- Written plans for Model House on little babushka, the Razer dev station,
  machine migration, the Studex Computer, Mini cleanup, and related factory
  notes under `/workspace/plans/`.
- Repeated local-model probes. The 8 November midnight note records
  `llama3.2:3b` passing a short smoke on little babushka and `ornith:9b`
  returning empty text. That is a recorded fail, not a pass marked complete.
- Model House was stood up earlier as a local LiteLLM gateway (MacBook and
  Mini configs are named in memory). Live reachability changes through the
  day; see status notes rather than treating a historical wiki line as proof.
- This Agent Central desk: convention README, memory, status, today's drop,
  and this interview.

I have **not** finished a verified Omarchy USB, a Hermes repair, an Ollama
lockdown, a Mini cleanup, a customer-ready meat or coffee sale, or a merged
Linux-Studex- change. Those remain gated or blocked.

### What are you in the middle of?

- Holding the Razer flash until a checksum-verified Omarchy ISO exists
  (DC Engineer reported the copies on the Macs look like failed downloads —
  **REPORTED**).
- Watching disk and load on Robuska's house, which recovered during 8 November
  but has been losing and then regaining free space.
- Diagnosing empty `ornith:9b` replies without restarting Ollama.
- Preparing Model House route changes (including any new local model) as
  drafts only.
- Filing work into Agent Central so other agents can see this desk.

### What will you not do?

I will not flash, wipe, pull, delete, restart, merge, deploy, spend, or send
external messages on a guess. I will not put secrets or private-mesh details
in this public repo. I will not tell a client that OpenClaw Enterprise is
production-ready. I will not wire an uncensored model to a customer channel.

### How do you plan to grow this desk?

1. Make Agent Central the daily write-back so work stops living only in chat.
2. Close the inference reliability loop: ornith empty replies, Hermes repair,
   Model House visibility, Ollama local-only on Robuska's house.
3. Finish one Linux workstation path (verified ISO → Razer Omarchy → measured
   GPU) instead of planning three OS migrations at once.
4. Score local models with written prompts and results, then add only the
   routes that pass.
5. Support sales desks with working inference, not with new storefronts.
6. Keep approval gates with Agent Chief Lord.

---

## 2. Breakdown of work (November 2026)

### Inference and Model House

Purpose: one house for local and API models so Hermes, Cursor, and factory
agents stop pointing at drifting endpoints.

Known shape (**REPORTED** from prior notes, not re-probed in this filing):
Mini LiteLLM on local port 4001; MacBook Model House config under the
model-warehouse tree; both historically local-only, so other machines cannot
use them yet. MacBook port 4000 has also been used by NoMachine.

Open defects: Mini `ornith:9b` empty completions; Hermes broken on Robuska's
house; at least one afternoon where little babushka was disconnected from the
assistant; Ollama on Robuska's house reported accepting outside connections
(**REPORTED** — lockdown waiting on a yes). Notion records Model House as
Blocked.

### Machines and migration

Intended sequence from earlier plans: Studex Computer (longer-horizon
hardware), Razer becomes the Omarchy dev station, big babushka moves to
Linux, MacBook backed up and wiped last. Notion still has these as Proposed.
Every wipe needs its own yes. The next recorded actions are: confirm Mac
chip and backup drive; verify an Omarchy ISO before any `dd`.

### Dark Factory loop

Night and day notes, YouTube Short drafts, toolchecks against local models,
and factory hygiene. The Short remains a draft awaiting review. Local
toolcheck on 8 November scored 3/5 on a small prompt set.

### What other agents are busy with

See `agents/llm-engineer/2026-11-08/fleet-survey.md`. In short: Claudiou is
on many public sites and the skills library; Hermes on Stud-Bot / Arcade /
intake; Naledi on the marketing site and coffee digests; AutoMEat on StudEx
Meat PRs; DC Engineer on MSI/control-desk and ISO/cleanup drafts; Sentinel
on factory backup and queue hygiene; Robusca on business packaging (Agentic
Rise, Founders Hub, Golf Series, Gaming World Cup row). Many rows are Active
or Proposed without acceptance evidence.

---

## 3. Human and agent KPI review

Baselines are **UNKNOWN** unless stated. Targets are **PROPOSED**. Do not
treat a proposed target as a result.

### Agent KPIs

| KPI | What good looks like | Current reading |
|---|---|---|
| Daily filing | Each working agent updates `agents/<name>/YYYY-MM-DD/` plus `status.md` | This desk starts that habit today. Fleet-wide compliance is unverified. |
| Acceptance, not "FINISHED" | A written test or review, then a human or named reviewer accepts | Notion and Robusca notes warn that mapped Cursor runs are not acceptance. Coffee and Stud-Bot rows explicitly say finished ≠ merged/tested/deployed. |
| Secrets hygiene | Zero secrets or IPs in public repos | This drop was written to that rule. Historical repo content was not fully re-scanned in this pass. |
| Local inference reliability | Named smoke tests pass (non-empty, on-brief replies) | llama3.2:3b pass and ornith:9b fail recorded 8 Nov ~00:03. MacBook 14b skipped due to load. |
| Change control | No pull, restart, flash, merge, or send without a yes | Holding. Several yeses are queued. |
| Review before merge | Open PRs have checks and an independent read | Linux-Studex- #1–#6 open. Stud-Bot Launch PR #1 recorded (7 Nov evidence on the Notion row) as open, not mergeable, zero check runs. |

### Tumelo's solopreneur KPIs

| KPI | Why it matters | Current reading |
|---|---|---|
| One hero offer in market | A solopreneur cannot launch meat, coffee, bots, VMs, and an event at the same quality in five weeks | Hero line not chosen. Both meat and coffee still have evidence gates. |
| Decision turnaround | Most factory work is blocked on a yes/no, not on ideas | A long yes-list is open (Ollama lockdown, Mini cleanup, Hermes repair, ISO, model pulls, Drive pause, Short review, and others). |
| Weekly orders and contribution | Vanity traffic does not pay fulfilment | Order/conversion/margin baselines unknown. |
| Fulfilment reliability | Food and coffee cannot be advertised without stock, labelling, courier, and lead time | Coffee row: order readiness not demonstrated. Meat: read-only PR review next; payment keys must not be connected from agent machines that are not allowed to hold them. |
| Founder deep work | Agents multiply writing and checks; they cannot replace packed, labelled, shipped product or a signed client pilot | Hours of deep work per week: unknown. |
| Open-loop count | Every extra live project taxes review attention | Notion shows a large set of Active/Proposed/Blocked rows across many owners. |

No score is assigned. Scoring without a baseline would be fiction.

---

## 4. What Tumelo needs to do to grow, and to do better as a solopreneur

These are operating habits, not a request to spend.

1. **Pick one November–December hero.** Meat or coffee (or a single Stud-Bot
   pilot offer), not all of them at campaign strength. The other lines keep
   moving through gates quietly.
2. **Hold a daily decision window.** Clear the yes/no list in one sitting:
   Ollama local-only, Mini cleanup, Hermes repair, verified ISO download
   (no flash yet), and whether any model may be pulled. Unanswered yeses
   are the main queue.
3. **Stop opening parallel surfaces until existing PRs are merged, closed,
   or explicitly paused.** Linux-Studex- already has six open PRs; Stud-Bot,
   coffee, meat, and dark-factory each have open work. Review-or-close is
   cheaper than another twin repo.
4. **Measure before advertising.** First week of truthful numbers: orders,
   add-to-cart, failed checkouts, refunds, and time-to-ship. There is no
   safe Black Friday spend without those, plus stock and legal pages.
5. **Protect fulfilment and legal before reach.** Coffee blockers on the
   Notion row include unverified stock, labelled bags, storefront choice,
   and checkout. Stud-Bot legal pages are recorded as drafts with
   placeholders. Do not run ads or blasts against draft terms.
6. **Be the approver, not the only pair of hands.** Agents should file here
   and ask yes/no questions. You approve flashes, wipes, spends, sends,
   merges, and anything that touches customer data or payments.
7. **Confirm the Rwanda item as a real commitment or park it.** See section 8.
   Do not budget travel or sponsorship on an unverified "world cup next month".
8. **Answer the two Sentinel questions already asked** if they are still
   open: which repo holds the screengrounding branch, and the exact Razer
   Blade model (needed to pick a GPU driver).
9. **Keep secrets off public Drive and public GitHub.** Robusca reported a
   Drive hub shared too widely (**REPORTED, not rechecked this pass**).
   Little babushka and the Razer still must not hold Shopify or payment keys.
10. **Restore assistant connectivity on little babushka when you are next
    beside it**, if it is still disconnected, so Model House and Mini
    cleanup can be verified rather than guessed.

What you should stop doing personally: being the merge button, the USB flash
technician, the only copy editor, and the only person who knows whether a
"finished" agent run was accepted. What you should not delegate yet: money,
legal publication, machine wipes, and customer sends.

---

## 5. Online growth plan for the rest of 2026

Horizon: 8 November 2026 through 31 December 2026.
Black Friday is Friday 27 November 2026. Cyber Monday is 30 November 2026.
Christmas Day is 25 December 2026. Order cut-offs depend on real packing and
courier lead times, which are **UNVERIFIED** here.

### 5.1 Current resources (checked or clearly reported)

Present and usable, with caveats:

- A working founder, a named agent fleet, Notion Projects, and this public
  Linux-Studex- repo as the intended command home.
- Shared-box work already written (Dark Factory, plans, vault staging).
- Local models on the Macs (exact inventory changes; see memory).
- Model House / LiteLLM as the intended router (reliability uneven).
- Existing product repos and open PRs: StudEx Meat (`studex-auto-meat`),
  coffee (`studex-coffee`), Stud-Bot Launch, Hermes intake, marketing site,
  Arcade, and others listed in Notion.
- OpenClaw as a self-hosted agent platform to learn and, later, to pilot
  (pre-1.0; internal workloads).
- A large public skills and tooling catalogue (corporate skills, humanizer,
  headroom, graphify, deepseek-harness, durable-pi, gbrain) for research,
  not for unreviewed installs.
- Eswatini country OS repo as a regional template, currently in a validation
  reset.

### 5.2 Resources still needed (no invented prices)

Founder must approve any spend. Amounts need real quotes.

- A checksum-verified Omarchy ISO and a known-good USB stick (flash still
  gated).
- Confirmed backup drive and Mac chip before any Mac wipe.
- Exact Razer model / GPU notes.
- Written supplier quotes and lead times for meat and coffee (not internal
  hallway numbers).
- A named operator and stock location for any coffee sell (Riversands and
  related decisions remain founder calls).
- Working checkout, published privacy/terms, and ex-VAT display before any
  paid campaign.
- Packaging, labels, and courier that match the claim on the page.
- Independent review of Stud-Bot legal pages and pricing sheet.
- Usage headroom on Grok Bot if hourly routines are stopping
  (**REPORTED** outage around 11:36 SAST 8 Nov).
- If campaigns go ahead: an ads test budget chosen by the founder, plus
  time to answer customers the same day.
- For VM / agent-workplace sales: one reference environment that is
  documented, backed up, and not running on a machine that is about to be
  wiped.

Three scenarios, still without fake figures:

- **Lean:** current subscriptions and agents only. Founder approves every
  send. Organic posts and private outreach drafts, no paid ads.
- **Base:** lean, plus a founder-set ads test and real packaging/courier
  quotes, only after gates clear.
- **Growth:** base, plus extra VM capacity and a part-time human for packing
  or customer replies if order volume appears. Hire only against measured
  orders, not against a hope.

### 5.3 Meat — StudEx Meat (Shopify)

Notion owner: AutoMEat. Status Active. Purpose: commerce plus automation,
described there as a template / first revenue line. Next action on the row:
locate draft evidence and inspect current PRs read-only; do not connect
payment keys, merge, or deploy. Repo recorded:
`https://github.com/TumeloRamaphosa/studex-auto-meat`.

What "grow online" means here, **PROPOSED**:

1. Read-only pass over the open meat PRs and the live storefront state
   (owner or a named reviewer; payment keys stay off little babushka and
   the Razer).
2. Write down SKUs that are actually in stock, pack time, courier, and
   whether the product page claims match the pack.
3. Only then draft a Black Friday offer (one hero SKU, not a catalogue
   rewrite). No send without a yes.
4. Track orders and refunds weekly. Do not invent a revenue target.

### 5.4 Coffee — RoboNoir / Studex Coffee

Notion row `studex-coffee digests` (Naledi) states: packaging draft exists;
order readiness not demonstrated. Blockers include unverified stock and
terms, printed labelled bags / real photos, chosen deployed storefront,
working checkout, waitlist integration, and unresolved back-label / roaster
placeholders. Evidence points at `studex-coffee` PR #38 and a Sunday launch
plan that itself marks physical and commercial go/no-go items as needing
evidence. Robusca's midday note separately reported coffee launch gates at
0/6 accepted (**REPORTED**).

What "grow online" means here, **PROPOSED**:

1. Reconcile the existing launch checklist against receipts only. Keep
   no-go until stock, label, storefront, and checkout evidence exist.
2. Do not execute old outreach drafts that mention held or excluded
   partners (the Notion row already warns about this).
3. A Christmas coffee offer is only honest after those gates and a cutoff
   date based on roast and courier times you can show.

### 5.5 VM and agent-workplace expansion

Linux-Studex- on `main` is a June 2026 Agent OS design (dashboard, tmux,
SDK, server, planned VM farm). That is a product sketch, not a sold
workplace. Useful 2026 motion:

1. Use this repo as Agent Central (this PR plus review of #5 and #6).
2. Finish one real workstation (Razer / Omarchy) and keep Model House
   reachable and local-locked.
3. Sell workplaces only as a scoped pilot: a documented environment, a
   named support hour, and no production promises. Pair with OpenClaw
   Enterprise's own "internal pilot" language.
4. GCP build VM remains Proposed and spend-gated on the Notion row. Do not
   treat it as available capacity.

durable-pi and gbrain are research inputs for persistence and Hermes-like
brains, not install tickets.

### 5.6 Black Friday (27 November) and Christmas

**PROPOSED calendar, all campaigns gated:**

| When | Work | Gate |
|---|---|---|
| 9–13 Nov | Founder picks the hero line; yes/no on Ollama lock, Mini cleanup, Hermes repair, verified ISO download; independent read of Stud-Bot and storefront legal pages | Decisions, not spend |
| 16–20 Nov | Offer page and email/WhatsApp drafts prepared, not sent; checkout and stock evidenced for the hero SKU | If gates fail, there is no campaign |
| 27 Nov | Black Friday, only if the hero SKU can be bought, packed, and described truthfully | Same-day reply capacity |
| 30 Nov | Cyber Monday follow-through on the same SKU, not a new catalogue | |
| Early Dec | Publish a Christmas order cutoff based on real lead time | If unknown, say so and do not imply delivery by the 25th |
| Through 31 Dec | Weekly order review; pause ads if fulfilment slips | |

Ads stay off until prices, stock, product claims, and legal pages are
written and checked by Tumelo.

---

## 6. 2027 year plan (directional)

This is a sequencing plan, not a forecast. No revenue targets.

- **Q1 2027 — Reliability.** Omarchy workstation in daily use; Mac migration
  only after backup evidence; Model House reachable where intended and
  local-locked; Hermes healthy; Agent Central used every weekday; one food
  or coffee line that can take a repeat order without heroics.
- **Q2 2027 — Offer.** Stud-Bot tiers published only after legal and
  checkout pages are finished; first paid agent or workplace pilots using
  honest "internal pilot" language; meat and coffee on a weekly ops rhythm.
- **Q3 2027 — Expansion only after proof.** Eswatini country OS moves past
  validation only if a paid discovery sponsor and a governed staging
  workflow exist (that is already the repo's own current phase). VM
  workplace packaging can widen if one reference deploy was boringly
  reliable in H1.
- **Q4 2027 — Review.** What sold, what failed fulfilment, which agents
  produced accepted work, which subscriptions to cut. Hire or add capacity
  only against measured load.

Studex Computer (China manufacturer conversations) stays a parallel hardware
track and should not block Q1 reliability.

---

## 7. How to sell OpenClaw Enterprise, Grok Bot, and Stud-Bot

### Stud-Bot tiers (ex-VAT)

As supplied for this brief:

- Starter — R1,500
- Company — R2,800
- Agentic Rise — R4,500
- Founders Hub — listed as a tier; **price not supplied**

Notion and Robusca both treat the published price sheet as a draft, not as
something approved to print. The Stud-Bot Launch PR #1 row (evidence dated
7 November 2026) records the PR as open and unmerged, zero check runs at
that head, mergeable false, landing page without clear ex-VAT disclosure,
and privacy/terms still marked draft with legal placeholders. Intake
source-to-deployment mapping was recorded as unknown.

Do not publish or invoice these numbers until Tumelo approves the sheet,
Founders Hub has a stated price or is removed, and the legal pages are
finished.

### OpenClaw Enterprise

The product page (CHECKED THIS PASS) says: open source, self-hosted, free,
vendor-neutral control plane; **pre-1.0; intended for internal pilot
workloads**.

How to sell it without overclaiming:

1. Sell a **governed internal pilot**: we help the client run OpenClaw on
   their infrastructure, with boundaries, an audit trail, and a named
   support window.
2. Do not sell "production-ready enterprise software" or imply Studex is
   the vendor of OpenClaw.
3. Have counsel review trademarks, dependency licences, and what the
   Enterprise components actually allow before any paid external deploy.
   That review has not been done in this pass.
4. Pair the pilot with Grok Bot / Stud-Bot as the human-facing operator
   experience, and with Model House only if the client understands which
   models are local, which are API, and which are not safe for the public.

### Grok Bot

Position it as the operator console already in use at Studex: machines,
mail, connectors, and daily filing. Sell the working habit (decision log,
approvals, Agent Central) rather than a feature list that has not been
acceptance-tested for that client.

### A clean client conversation (PROPOSED)

1. Discover: what work should an agent be forbidden to do?
2. Show Stud-Bot tier intent (draft until approved) and an OpenClaw internal
   pilot, not a go-live next week.
3. Scope one workflow with a written completion test (the same idea as
   Claude Code `/goal`: a verifiable end state).
4. Contract: data stay on their side where required; no payment keys on
   build machines; change control matches Studex's own yes-gates.
5. Only after a boring pilot, talk about a wider rollout.

humanizer is useful for making sales copy sound like a person, after a
human factual pass. Corporate skills catalogues are useful after a
licence/quality review. Neither replaces a finished legal page.

---

## 8. Gaming World Cup, Rwanda, "next month"

Notion has a Proposed row, owner Robusca, purpose "African AI & Gaming World
Cup positioning (Rwanda focus)", environment TBD, no dates, no evidence,
no next action.

A public web search on 8 November 2026 did **not** find a "Gaming World Cup"
in Rwanda in December 2026. What did appear:

- SportsBiz Africa Esports Cup at BK Arena, Kigali, **12–13 September 2026**
  (already in the past as of this writing), part of SportsBiz Africa Week
  around 10–13 September 2026.
- Africa Games Week, **6–8 December 2026 in Cape Town**, not Rwanda.

So "Gaming World Cup next month in Rwanda" is **UNVERIFIED**. It may be a
private plan, a misremembered September event, or a different December
event that is not public under that name. Before any travel, sponsorship,
content series, or client promise, Tumelo should write down: the official
event name, dates, city, Studex's role, and whether money or attendance is
already committed.

Until then, Naledi and Robusca should keep the row Proposed and should not
be asked to produce campaign assets as if December Rwanda were booked.

---

## 9. Resource library — what is useful, and how

Full write-up: `agents/llm-engineer/2026-11-08/resource-notes.md`.

| Resource | Use for Studex | Do not |
|---|---|---|
| Linux-Studex- | Command home and Agent OS sketch | Treat June VM counts as live |
| Eswatini repo | Country-OS pattern; 2027 expansion only after a paid discovery sponsor | Dump fleet secrets into it |
| OpenClaw Enterprise | Honest internal-pilot offer | Promise production |
| awesome-claude-corporate-skills | Role-skill ideas for Stud-Bot | Mass-install unreviewed |
| humanizer | Clean AI tells from public copy | Skip factual/legal review |
| headroom | Later token/context savings on Model House | Install without a test |
| graphify | Later repo knowledge graphs | Block November sales on it |
| deepseek-harness | Plugin-harness research | Confuse with Harness.io |
| durable-pi | Ideas for multi-device durable agents during migration | Silent production install |
| gbrain | Compare with Hermes brain design | Overwrite live Hermes without backup and a yes |
| Claude `/goal` | Finish work against a verifiable condition | Use it to bypass approvals |
| Qwen3-8B-abliterated | Optional internal lab model, quantized, guarded | Customer channels; pull without a yes |

---

## 10. Owner decisions needed

Yes/no, preferably in one sitting:

1. Which single line is the November–December hero: meat, coffee, or a
   Stud-Bot pilot?
2. Approve, change, or withhold the Stud-Bot tier sheet (including a
   Founders Hub price or its removal)?
3. Lock Ollama on Robuska's house to local-only?
4. Run Mini cleanup B+E?
5. Repair Hermes on Robuska's house now that load has eased?
6. Download or otherwise obtain a verified Omarchy ISO (still no flash)?
7. May any new model be pulled (AutoTrust, MiMo, PLaMo, LFM3,
   Qwen3-8B-abliterated)? If the abliterated model: lab-only route, yes or no?
8. What is the official Rwanda / gaming event, if any?
9. Monthly spend ceiling for November and December?
10. Who independently reviews Stud-Bot legal pages and the meat/coffee
    storefronts before anything is sent?

---

## 11. Bounded next task

- **Owner:** LLM ENGINEER, after Agent Chief Lord's yes.
- **Task:** Obtain and checksum-verify an Omarchy ISO only. Write the
  checksum and file path into `agents/llm-engineer/` the same day. Do not
  flash, do not wipe, do not install on the Razer.
- **Acceptance:** A named ISO file, a checksum that matches the publisher,
  and a short note that the previous failed-download copies will not be used.
- **Dependencies:** A reachable Mac with enough disk; publisher checksum
  source; founder yes to download (if a new download is required).
- **Required approvals:** The download/verification yes. A separate, later
  yes is required for `dd` and for any machine wipe.

If the hero-line decision arrives first, the next bounded sales task is a
read-only storefront evidence note for that one line (stock, checkout, legal,
lead time) with no send and no ads.
