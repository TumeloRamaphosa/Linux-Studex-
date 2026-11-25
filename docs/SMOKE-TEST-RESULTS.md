# Smoke Test Results — Agent Calling

**Date:** 2026-11-25  
**Server:** \`node server/index.js\` (local, port 4000)  
**Boot:** 5 agents registered, 20 MCP tools, 4 sandbox templates, LLM mesh disconnected (no local provider running)

---

## Result: ALL FIVE CALL SHAPES PASS

| # | Call shape | Endpoint | Status |
|---|------------|----------|--------|
| 1 | Direct chat | \`POST /api/agents/:name/chat\` | 200 |
| 2 | Task routing | \`POST /api/orchestrate/task\` | 200 |
| 3 | Agent -> agent | \`POST /api/orchestrate/send\` | 200 |
| 4 | Blackboard set/get | \`POST/GET /api/orchestrate/blackboard\` | 200 |
| 5 | Broadcast | \`POST /api/orchestrate/broadcast\` | 200 |

---

## 1. Direct chat

```bash
$ scripts/agent-call.sh agent "show open positions" cashclaw
```

```json
{
  "agent": "cashclaw",
  "response": "3 open positions.\nBTC/USD: 0.5 @ 84720 -> 85310 (0.7%)\nETH/USD: 5 @ 3180 -> 3245 (2.0%)\nSOL/USD: 20 @ 142 -> 148 (4.2%)\nP&L today: +2.4% | Total trades: 1327",
  "timestamp": "2026-11-25T05:05:18.989Z"
}
```

## 2. Task routing — deploy workflow

```bash
$ scripts/agent-call.sh task "deploy the new dashboard"
```

```json
{
  "plan": "Deploy workflow: Coder builds -> OpenHuman deploys -> Farm runs",
  "assignments": [
    { "agent": "cursor",    "task": "Build for deploy: deploy the new dashboard" },
    { "agent": "openhuman", "task": "Deploy: deploy the new dashboard" },
    { "agent": "farm",      "task": "Run deployment tasks for: deploy the new dashboard" }
  ],
  "results": {
    "cursor":    { "response": "Built in 2s. No errors.", "status": "completed" },
    "openhuman": { "response": "Usage: deploy farm <5-14> or deploy all", "status": "completed" },
    "farm":      { "response": "Farm workload: 123 tasks distributed | Avg CPU: 32% | Queue depth: 12 | No backpressure detected.", "status": "completed" }
  }
}
```

**Routing confirmed correct** — \`deploy\` matched the 3-step workflow rule.

## 3. Agent -> agent

```bash
$ scripts/agent-call.sh send '{"from":"hermes","to":"cursor","message":"review PR 42"}'
```

```json
{
  "from": "hermes",
  "to": "cursor",
  "message": "review PR 42",
  "response": "Cursor ready. 4 workspaces open.\n82/84 tests passing.\nSay \"help\" for commands or \"list\" to see projects."
}
```

## 4. Blackboard

```bash
$ scripts/agent-call.sh fact set smoke_test 2026-11-25 hermes
{ "key": "smoke_test", "value": "2026-11-25", "status": "stored" }

$ scripts/agent-call.sh fact get smoke_test
{ "value": "2026-11-25", "source": "hermes", "updatedAt": 1795583119111 }
```

## 5. Broadcast — all 5 agents responded

```json
{
  "from": "cli",
  "message": "status report",
  "responses": {
    "cashclaw":  "3 open positions. BTC/USD: 0.5 @ 84720 -> 85310 (0.7%) ...",
    "hermes":    "Gateway: 4/4 healthy | Inter-agent messages: 17 | Uptime: 0h0m | Mesh: 4 agents",
    "openhuman": "Platform stable. 7 containers running. 0 active deployments. 0 sandbox environments active.",
    "cursor":    "Cursor ready. 4 workspaces open. 82/84 tests passing.",
    "farm":      "Farm: 8/10 online | 123 total tasks processed (RVS5-RVS14, per-node CPU/RAM)"
  }
}
```

---

## Supporting endpoints verified

| Endpoint | Result |
|----------|--------|
| \`GET /api/health\` | \`{"status":"ok","agents":5,"orchestrator":25}\` |
| \`GET /api/agents\` | 5 agents, all \`status: "online"\` |
| \`GET /api/orchestrate\` | \`messagesLogged: 25\`, \`blackboardKeys: 1\` |
| \`GET /api/orchestrate/log\` | 25 messages (key is \`messages\`, not \`log\`) |
| \`GET /api/mcp/tools\` | 20 tools |
| \`GET /api/sandbox/templates\` | 4 (python, node, shell, go) |
| \`GET /api/llm-mesh\` | \`disconnected\` — lm-studio + ollama both unreachable |
| \`GET /api/network/ping\` | 3 targets, avg 24.59ms |

## Error handling

| Case | Expected | Actual |
|------|----------|--------|
| Unknown agent | 404 | \`{"error":"Agent 'nonexistent_agent' not found"}\` |
| Empty message | 400 | HTTP 400 |
| \`agent-call.sh\` on 404 | exit != 0 | prints error to stderr, exits 1 |

## Findings

1. **The call path works.** All five shapes return 200 with well-formed bodies.
2. **The CLI error contract holds.** Non-zero exit on HTTP failure — safe for cron.
3. **LLM mesh is disconnected** in this environment. Routing still worked because
   \`coordinate()\` falls back to keyword matching. This confirms the fallback works.
4. **\`/api/orchestrate/log\` returns \`{messages: [...]}**, not a bare array — easy to
   mis-read. Worth a note in the SDK wrapper.
5. **\`openhuman\` replied "Usage: deploy farm <5-14> or deploy all"** — the agent
   expects a more specific deploy target than the task text carried. Not a bug,
   but the routing could pass the target through.
