# Calling Agents — Complete Reference

**How to call StudEx agents, run tasks, and drive the mesh from anywhere.**

Author: Hermes Agent (AI CTO, StudEx Group)
Last updated: 2026-11-25

---

## 0. TL;DR — the three ways to call an agent

| You want to | Do this |
|---|---|
| Chat with ONE agent from code | `POST /api/agents/{name}/chat` |
| Route a task to the RIGHT agent(s) | `POST /api/orchestrate/task` |
| Tell EVERY agent the same thing | `POST /api/orchestrate/broadcast` |
| Chain agent → agent | `POST /api/orchestrate/send` |
| Remember a fact across agents | `POST /api/orchestrate/blackboard` |

Base URL: `http://<host>:4000` (default port 4000)
Dashboard: `http://<host>:4000/dashboard.html`

---

## 1. The five agents

| Name | Role | RVS | Port | Capabilities |
|---|---|---|---|---|
| `hermes` | ORCHESTRATOR / GATEWAY | RVS2 | 3001 | routing, coordination, load balancing, health checks |
| `cashclaw` | Financial / Trading | RVS1 | 3000 | trading, markets, finance, positions, btc, eth, sol, portfolio |
| `openhuman` | Platform / Deployment | RVS3 | 3002 | deploy, containers, docker, infrastructure, network, platform |
| `cursor` | IDE / Development | RVS4 | 3003 | code, test, build, review, project, compile, git |
| `farm` | Worker nodes | RVS5 | 3004 | worker, compute, batch, ollama, model, task, distributed |

`hermes` is the brain. It owns a static route table (`server/agents/hermes.js`) and a
capability map used for keyword routing. The other four are leaves — they receive
tasks but do not route further.

---

## 2. Calling an agent directly

### HTTP

```bash
curl -X POST http://localhost:4000/api/agents/cashclaw/chat \
  -H 'Content-Type: application/json' \
  -d '{"message":"show open positions"}'
```

Response:

```json
{
  "agent": "cashclaw",
  "response": "...",
  "timestamp": "2026-11-25T05:02:00.000Z"
}
```

Rules:
- `message` is required, must be a non-empty string. Otherwise **400**.
- Unknown agent name → **404** `{"error":"Agent 'x' not found"}`.
- Thrown agent error → **500** `{"error":"<message>"}`.

### Python SDK

```python
from studex_sdk import StudExClient

client = StudExClient("http://localhost:4000")

resp = client.agents.chat("cashclaw", "show open positions")
print(resp["response"])

status = client.agents.status("hermes")
print(status["state"]["tokens"]["estimatedCost"])   # USD

logs = client.agents.logs("cursor", lines=20)
```

`StudExClient` retries connection failures twice with linear backoff, and wraps
HTTP errors in `APIError(status, message)`. `ConnectionError_` is raised when the
server is unreachable after all retries.

### Browser (dashboard)

The dashboard calls the same endpoint. The helper is `api()` in `dashboard.html`:

```js
async function api(path, options = {}) {
  const url = API_BASE + '/api' + path;   // API_BASE = window.location.origin
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${res.statusText}`);
  return res.json();
}
```

`handleAgentChat()` shows the pattern: POST to `/agents/{agent}/chat`, render a
"thinking" placeholder, then replace it with the response. Note the escaping —
`replace(/</g,'&lt;')` — before inserting into `innerHTML`.

---

## 3. Routing a task to the right agent(s)

**This is the preferred way to call agents.** You describe *what* you want, not
*who* should do it.

```bash
curl -X POST http://localhost:4000/api/orchestrate/task \
  -H 'Content-Type: application/json' \
  -d '{"from":"user","task":"deploy the new dashboard"}'
```

`hermes.coordinate()` matches keywords and returns a plan:

| Task contains | Assigns |
|---|---|
| `deploy`, `release`, `ship` | cursor → openhuman → farm (build → deploy → run) |
| `market`, `trade`, `portfolio`, `analysis` | cashclaw → farm |
| `all agents`, `everyone`, `broadcast`, `full status`, `system health` | all five |
| `trade`/`market`/`btc`/`eth`/`price`/`invest` | cashclaw |
| `deploy`/`docker`/`infra`/`network`/`host`/`server` | openhuman |
| `code`/`test`/`build`/`review`/`git`/`develop` | cursor |
| `worker`/`compute`/`batch`/`model`/`ollama`/`task`/`distribute` | farm |

**Careful:** the word `task` alone routes to `farm`. If you mean "do this task",
prefer a verb that names the work (`deploy`, `review`, `analyse`) — otherwise
`farm` picks it up before the specific rules are checked.

### Multi-step workflows

```bash
curl -X POST http://localhost:4000/api/orchestrate/workflow \
  -H 'Content-Type: application/json' \
  -d '{
    "name":"release-v2",
    "steps":[
      {"agent":"cursor","task":"build and test v2"},
      {"agent":"openhuman","task":"deploy v2 to production"}
    ]
  }'
```

---

## 4. Agent → agent messaging

```bash
curl -X POST http://localhost:4000/api/orchestrate/send \
  -H 'Content-Type: application/json' \
  -d '{"from":"hermes","to":"cursor","message":"review PR 42"}'
```

The receiving agent gets the message prefixed with `[from hermes]`, so it knows
who is talking. Unknown target → **404**.

### Broadcast

```bash
curl -X POST http://localhost:4000/api/orchestrate/broadcast \
  -H 'Content-Type: application/json' \
  -d '{"from":"user","message":"status report"}'
```

Returns `{from, message, responses: {...}}` — one response per agent.

---

## 5. The Blackboard — shared memory

Any agent can write a fact that any other agent can read. This is how state
survives between calls.

```bash
# write
curl -X POST http://localhost:4000/api/orchestrate/blackboard \
  -H 'Content-Type: application/json' \
  -d '{"key":"deploy_target","value":"rvs3","source":"hermes"}'

# read one
curl http://localhost:4000/api/orchestrate/blackboard/deploy_target

# read all
curl http://localhost:4000/api/orchestrate/blackboard

# delete
curl -X DELETE http://localhost:4000/api/orchestrate/blackboard/deploy_target
```

Each fact records `{value, source, updatedAt}` and every write is appended to the
message log.

---

## 6. The message log

```bash
curl http://localhost:4000/api/orchestrate/log
```

Every inter-agent exchange is recorded with `{from, to, message, response, timestamp}`.
Use it to audit what actually happened after a broadcast or workflow.

---

## 7. tmux control

The dashboard is not the only terminal — it drives tmux windows directly.

```bash
curl -X POST http://localhost:4000/api/tmux \
  -H 'Content-Type: application/json' \
  -d '{"command":"npm run build","window":"main"}'
```

Window names are sanitised server-side (`[^a-zA-Z0-9_-]` is stripped), so the
target becomes `linux-studex:{window}`.

---

## 8. Status, tokens, cost

```bash
curl http://localhost:4000/api/status                    # all agents
curl http://localhost:4000/api/status/events             # SSE live stream
curl http://localhost:4000/api/agents/hermes             # one agent, full detail
curl http://localhost:4000/api/agents/cursor/logs?lines=50
curl http://localhost:4000/api/health
```

Each agent tracks token usage and estimated USD cost:

```json
{
  "tokens": {
    "inputTokens": 0, "outputTokens": 0, "totalTokens": 0,
    "estimatedCost": 0, "lastMessageTokens": 0, "peakTokens": 0
  }
}
```

Estimation is rough: **1 token ≈ 4 characters**, plus a flat 50-token system
prompt overhead per interaction. Costs use static per-1K rates from
`server/agents/base.js` — local models are effectively free, API models are
billed at the flat rate in that file, not at live provider pricing.

---

## 9. LLM Mesh

```bash
curl http://localhost:4000/api/llm-mesh                # status + provider
curl http://localhost:4000/api/llm-mesh/models         # models available
curl -X POST http://localhost:4000/api/llm-mesh/chat \
  -H 'Content-Type: application/json' \
  -d '{"message":"hello","model":"..."}'
curl -X POST http://localhost:4000/api/llm-mesh/switch \
  -H 'Content-Type: application/json' \
  -d '{"provider":"lmstudio"}'
curl -X POST http://localhost:4000/api/llm-mesh/embed \
  -H 'Content-Type: application/json' \
  -d '{"text":"embed this"}'
```

The mesh scans for available local providers on boot (LM Studio / Ollama). If the
mesh is `disconnected`, start the local provider — the server falls back to
disconnected and the dashboard shows it.

---

## 10. MCP tools

```bash
curl http://localhost:4000/api/mcp/tools
curl http://localhost:4000/api/mcp
curl -X POST http://localhost:4000/api/mcp/call \
  -H 'Content-Type: application/json' \
  -d '{"tool":"<tool-name>","arguments":{}}'
```

The MCP server is built on top of the orchestrator, so MCP tools can drive the
same agents.

---

## 11. Sandboxes

```bash
curl http://localhost:4000/api/sandbox/templates
curl http://localhost:4000/api/sandbox
curl http://localhost:4000/api/sandbox/stats
curl -X POST http://localhost:4000/api/sandbox/spawn \
  -H 'Content-Type: application/json' \
  -d '{"template":"node","name":"build-01"}'
curl -X POST http://localhost:4000/api/sandbox/{id}/run \
  -H 'Content-Type: application/json' \
  -d '{"command":"npm test"}'
```

Sandbox files are browsable and editable:
`GET|POST|DELETE /api/sandbox/{id}/files[/{path}]`

---

## 12. Network diagnostics

```bash
curl http://localhost:4000/api/network/ping
curl http://localhost:4000/api/network/speedtest
```

---

## 13. Full endpoint index

### Agents
| Method | Path | Purpose |
|---|---|---|
| GET | `/api/agents` | list agents |
| GET | `/api/agents/:name` | agent detail + status |
| POST | `/api/agents/:name/chat` | send message to agent |
| GET | `/api/agents/:name/logs?lines=N` | recent logs |

### Orchestrator
| Method | Path | Purpose |
|---|---|---|
| GET | `/api/orchestrate` | orchestrator status |
| GET | `/api/orchestrate/agents` | registered agents |
| POST | `/api/orchestrate/send` | agent → agent message |
| POST | `/api/orchestrate/task` | route task to best agent(s) |
| POST | `/api/orchestrate/broadcast` | message all agents |
| POST | `/api/orchestrate/workflow` | run multi-step workflow |
| GET | `/api/orchestrate/blackboard` | all facts |
| GET | `/api/orchestrate/blackboard/:key` | one fact |
| POST | `/api/orchestrate/blackboard` | set fact |
| DELETE | `/api/orchestrate/blackboard/:key` | delete fact |
| GET | `/api/orchestrate/log` | message log |

### Status
| Method | Path | Purpose |
|---|---|---|
| GET | `/api/status` | all agent status |
| GET | `/api/status/events` | SSE live stream |
| GET | `/api/health` | health check |

### LLM Mesh
| Method | Path | Purpose |
|---|---|---|
| GET | `/api/llm-mesh` | mesh status |
| GET | `/api/llm-mesh/models` | models |
| POST | `/api/llm-mesh/chat` | chat via mesh |
| POST | `/api/llm-mesh/switch` | switch provider |
| POST | `/api/llm-mesh/embed` | embeddings |

### MCP
| Method | Path | Purpose |
|---|---|---|
| GET | `/api/mcp` | server status |
| GET | `/api/mcp/tools` | tool list |
| POST | `/api/mcp/call` | invoke tool |

### Sandbox
| Method | Path | Purpose |
|---|---|---|
| GET | `/api/sandbox/templates` | templates |
| GET | `/api/sandbox` | running sandboxes |
| GET | `/api/sandbox/stats` | stats |
| POST | `/api/sandbox/spawn` | create sandbox |
| POST | `/api/sandbox/:id/run` | run command |
| GET | `/api/sandbox/:id/files` | list files |
| GET | `/api/sandbox/:id/files/:path` | read file |
| POST | `/api/sandbox/:id/files` | write file |
| DELETE | `/api/sandbox/:id` | destroy sandbox |

### Network / tmux
| Method | Path | Purpose |
|---|---|---|
| GET | `/api/network/ping` | reachability |
| GET | `/api/network/speedtest` | bandwidth |
| POST | `/api/tmux` | send command to tmux window |

---

## 14. Gotchas

1. **`task` routes to `farm`.** The keyword list includes the bare word `task`.
   Name the actual work instead.
2. **Token cost is an estimate, not billing.** 1 token ≈ 4 chars, flat rates in
   `base.js`. Do not reconcile against a provider invoice.
3. **`register()` double-wraps `chat`.** It is guarded against double
   registration of the same agent, but if you re-register an agent under a
   second name you will log every message twice.
4. **The route table in `hermes.js` is static.** `rvs1.local` … `rvs5.local` are
   hardcoded placeholders, not DNS. Update them for your network.
5. **SSE (`/api/status/events`) needs a proxy that does not buffer.** nginx
   must set `proxy_buffering off;` or the stream will appear to hang.
6. **No auth on any endpoint.** Every route is open. Do not expose port 4000 to
   the public internet — put it behind Tailscale or an authenticating proxy.
7. **`/api/tmux` executes shell commands.** Treat it as root-equivalent.

---

## 15. Quick start

```bash
# 1. start the backend
node server/index.js

# 2. confirm the mesh is up
curl http://localhost:4000/api/health
curl http://localhost:4000/api/agents

# 3. say hello to one agent
curl -X POST http://localhost:4000/api/agents/hermes/chat \
  -H 'Content-Type: application/json' -d '{"message":"status"}'

# 4. let hermes route a real task
curl -X POST http://localhost:4000/api/orchestrate/task \
  -H 'Content-Type: application/json' \
  -d '{"from":"user","task":"review the deploy script"}'
```
