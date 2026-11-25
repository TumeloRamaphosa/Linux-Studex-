# TASK SHEET — Calling Agents & Wiring the Work In

**Status:** READY TO PICK UP
**Owner:** any agent in the mesh (hermes routes it)
**Last updated:** 2026-11-25

---

## Where things are

| Thing | Path |
|---|---|
| Full API reference | [`docs/AGENT-CALLING.md`](AGENT-CALLING.md) |
| Backend | `server/index.js` |
| Agent classes | `server/agents/*.js` |
| Orchestrator | `server/lib/orchestrator.js` |
| HTTP routes | `server/routes/*.js` |
| Dashboard | `dashboard.html` |
| Python SDK | `sdk/python/studex_sdk/` |
| MCP server | `server/lib/mcp.js` |
| LLM mesh | `server/lib/llm-mesh.js` |
| Sandbox manager | `server/lib/sandbox.js` |

---

## TASK 1 — Verify the agent call path end to end

**Why:** the calling surface has never been exercised as a whole. Every endpoint
below is written but unproven against a live server.

**Do:**

```bash
node server/index.js &
sleep 3

curl -s localhost:4000/api/health
curl -s localhost:4000/api/agents | python3 -m json.tool
curl -s localhost:4000/api/agents/hermes | python3 -m json.tool
```

**Then run the five core call shapes and record the actual response of each:**

```bash
# 1. direct chat
curl -s -X POST localhost:4000/api/agents/cashclaw/chat \
  -H 'Content-Type: application/json' -d '{"message":"show positions"}'

# 2. task routing
curl -s -X POST localhost:4000/api/orchestrate/task \
  -H 'Content-Type: application/json' -d '{"from":"user","task":"deploy the dashboard"}'

# 3. agent to agent
curl -s -X POST localhost:4000/api/orchestrate/send \
  -H 'Content-Type: application/json' -d '{"from":"hermes","to":"cursor","message":"review PR 42"}'

# 4. blackboard write + read
curl -s -X POST localhost:4000/api/orchestrate/blackboard \
  -H 'Content-Type: application/json' -d '{"key":"smoke_test","value":"2026-11-25","source":"hermes"}'
curl -s localhost:4000/api/orchestrate/blackboard/smoke_test

# 5. broadcast
curl -s -X POST localhost:4000/api/orchestrate/broadcast \
  -H 'Content-Type: application/json' -d '{"from":"user","message":"status report"}'
```

**Done when:** all five return HTTP 200 with a well-formed body, and you have
pasted the real responses into `docs/SMOKE-TEST-RESULTS.md`.

**Watch for:** the `task` keyword routing to `farm` when you expected a
specific agent. Record what actually happens — that is the point of the test.

---

## TASK 2 — Make the route table real

**Why:** `server/agents/hermes.js` hardcodes `rvs1.local` … `rvs5.local`. These
are placeholders. `hermes.coordinate()` plans against hosts that do not resolve,
so multi-agent workflows silently degrade to single-agent behaviour.

**Do:**

1. Move the host map into one config file — `server/config/agents.json`:
   ```json
   {
     "cashclaw":  { "host": "10.0.0.11", "port": 3000 },
     "openhuman": { "host": "10.0.0.13", "port": 3002 },
     "cursor":    { "host": "10.0.0.14", "port": 3003 },
     "farm":      { "host": "10.0.0.15", "port": 3004 }
   }
   ```
2. Read it in `hermes.js` at construction instead of hardcoding.
3. Let env vars override: `process.env.CASHCLAW_HOST` etc.
4. Add a `/api/orchestrate/agents` field showing the resolved host for each agent
   so the dashboard can display where work actually goes.

**Done when:** the resolved host for each agent appears in the orchestrator
status output and matches a real reachable address.

---

## TASK 3 — Real routing instead of keyword matching

**Why:** `coordinate()` is keyword matching. "Refactor the auth module" matches
nothing useful. "Check the market for BTC" matches `market` and routes to
cashclaw even when the real intent was research.

**Do:**

1. Add a `server/lib/router.js` that scores agents on:
   - explicit agent name in the task text → score 100
   - capability keyword match → score +10 each
   - a required-capability hint on the request → score +50
   - agent availability (`state.status === 'online'`) → score +5, offline → disqualify
2. Support an explicit override on the request:
   ```json
   { "from": "user", "task": "…", "prefer": "cursor" }
   ```
3. Return the scores in the response so the decision is inspectable:
   ```json
   { "explanation": "…", "assignments": [ … ], "scores": { "cursor": 24, "farm": 10 } }
   ```
4. Keep `hermes.coordinate()` as the fallback when the LLM mesh is disconnected —
   never lose the ability to route.

**Done when:** a task with an explicit `prefer` always goes to that agent, and
the response shows the score breakdown.

---

## TASK 4 — Call an agent from an external script

**Why:** right now the only callers are the dashboard and the Python SDK inside
the repo. Nothing can trigger an agent from a CI job, a cron, or another repo.

**Do:**

Add a thin, dependency-free CLI that speaks the HTTP API directly:

```
scripts/agent-call.sh
```

```bash
#!/usr/bin/env bash
# Usage: agent-call.sh <agent|task|broadcast|send> <payload> [host]
set -euo pipefail
HOST="${STUDEX_HOST:-http://localhost:4000}"
KIND="$1"; PAYLOAD="$2"
case "$KIND" in
  agent)     curl -sS -X POST "$HOST/api/agents/$3/chat" \
              -H 'Content-Type: application/json' -d "{\"message\":$(jq -Rn --arg m "$PAYLOAD" '$m')}" ;;
  task)      curl -sS -X POST "$HOST/api/orchestrate/task" \
              -H 'Content-Type: application/json' -d "{\"from\":\"cli\",\"task\":$(jq -Rn --arg t "$PAYLOAD" '$t')}" ;;
  broadcast) curl -sS -X POST "$HOST/api/orchestrate/broadcast" \
              -H 'Content-Type: application/json' -d "{\"from\":\"cli\",\"message\":$(jq -Rn --arg m "$PAYLOAD" '$m')}" ;;
  send)      curl -sS -X POST "$HOST/api/orchestrate/send" \
              -H 'Content-Type: application/json' -d "$PAYLOAD" ;;
  *) echo "usage: agent-call.sh {agent|task|broadcast|send} <payload> [agent-name]" >&2; exit 2 ;;
esac
```

Requirements:
- `STUDEX_HOST` environment override so it works against a remote node.
- Non-zero exit on HTTP error — do not swallow failures in a cron job.
- Timeout via `--max-time 30`.

**Done when:** `STUDEX_HOST=https://node.example scripts/agent-call.sh task "deploy the api"` returns JSON and exits 0.

---

## TASK 5 — Make the SDK the supported path

**Why:** there are two SDK copies — `sdk/python/studex_sdk/` and
`sdk/python/studex/` — with overlapping and inconsistent APIs. Agents will pick
the wrong one.

**Do:**

1. Diff the two packages and pick one as canonical.
2. Delete the other, or reduce it to a thin `from studex_sdk import *` shim
   that prints a deprecation warning.
3. Add `sdk/python/studex_sdk/calls.py` with one function per call shape so
   callers never hand-build URLs:
   ```python
   def chat(agent, message) -> dict
   def route_task(task, prefer=None) -> dict
   def send(frm, to, message) -> dict
   def broadcast(message) -> dict
   def set_fact(key, value, source=None) -> dict
   def get_fact(key) -> dict
   def run_workflow(name, steps) -> dict
   ```
4. Publish to PyPI as `studex-agent-os` (or keep local — your call, but decide).
5. Add an `examples/` folder with three runnable scripts: `chat_one.py`,
   `route_a_task.py`, `fan_out.py`.

**Done when:** `pip install -e sdk/python` and all three examples run against a
live server with no manual URL editing.

---

## TASK 6 — Wire the calling work into the task sheet

**Why:** the task sheet is where work gets tracked. Right now calling agents is
a set of docs, not tracked work.

**Do:**

Add these rows to the board, each with an owner agent and a verification step:

| # | Task | Owner | Verify by |
|---|---|---|---|
| 1 | Smoke test all 5 call shapes | hermes | `docs/SMOKE-TEST-RESULTS.md` filled |
| 2 | Real host config | openhuman | `/api/orchestrate/agents` shows live hosts |
| 3 | Scored router | hermes | `prefer` override works |
| 4 | `scripts/agent-call.sh` | cursor | non-zero exit on failure |
| 5 | SDK consolidation | cursor | `pip install -e` + 3 examples run |
| 6 | Dashboard "call any agent" panel | cursor | panel visible, calls land |

**Done when:** the board shows every row with an owner and a green verification.

---

## Definition of Done — the whole sheet

- [ ] All five call shapes return 200 against a live server
- [ ] Real responses recorded in `docs/SMOKE-TEST-RESULTS.md`
- [ ] Route table resolves to real hosts
- [ ] `prefer` override works and is inspectable
- [ ] `scripts/agent-call.sh` works against a remote host
- [ ] One canonical Python SDK with three working examples
- [ ] Board rows assigned with verification steps
- [ ] Dashboard has a panel for calling any agent
- [ ] Nothing exposed publicly without auth (see gotcha 6 in AGENT-CALLING.md)

---

## Notes for the agent picking this up

1. **Start with TASK 1.** Everything else assumes the call path works.
2. **Read `docs/AGENT-CALLING.md` first** — it has the full endpoint index and
   the gotchas.
3. **Do not expose port 4000 publicly.** There is no auth on any route.
4. **The `task` keyword routes to `farm`** — if a task looks mis-routed, check
   `coordinate()` before assuming the agent is broken.
5. **Token costs are estimates** (1 token ≈ 4 chars, flat rates). Do not try to
   reconcile them against provider invoices.
