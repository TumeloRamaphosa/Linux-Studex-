# StudEx Node.js SDK

Programmatic client for the **StudEx Agent Operating System** — sandbox, MCP,
orchestration, and agent APIs from JavaScript/TypeScript.

Agents (especially Cursor) use this SDK to execute code in isolated sandboxes,
discover and call MCP tools, chat with each other, share state via the
blackboard, and coordinate multi-agent workflows.

## Install

```bash
npm install studex-sdk
```

Or link locally:

```bash
cd sdk/node
npm link
```

## Usage

### Connect

```js
const { StudExClient } = require('studex-sdk');

const client = new StudExClient('http://localhost:4000');

// Check the server is alive
const health = await client.health();
console.log(health);
```

### Sandbox — Run Code in Isolated Environments

```js
// Spawn a Python sandbox
const sb = await client.sandbox.spawn('python');
console.log(`Sandbox ID: ${sb.id}`);

// Run code
const result = await client.sandbox.run(sb.id, `
import numpy as np
print("numpy version:", np.__version__)
const data = [1, 2, 3, 4, 5]
print("mean:", np.mean(data))
`);
console.log(result.stdout);

// Write files and read them back
await client.sandbox.writeFile(sb.id, 'hello.txt', 'Hello from StudEx!');
const content = await client.sandbox.readFile(sb.id, 'hello.txt');
console.log(content);

// List files
const files = await client.sandbox.listFiles(sb.id);
files.forEach(f => console.log(`  ${f.name} (${f.size} bytes)`));

// Destroy when done
await client.sandbox.destroy(sb.id);
```

### Chat with Agents

```js
// Talk to Cashclaw (trading agent)
const resp = await client.agents.chat('cashclaw', 'check positions');
console.log(resp.response);

// Talk to Hermes (orchestrator)
const resp2 = await client.agents.chat('hermes', 'route status');
console.log(resp2.response);

// Get agent status
const status = await client.agents.status('hermes');
console.log(`Uptime: ${status.uptime}m, messages: ${status.messages}`);

// List all agents
const agents = await client.agents.list();
agents.forEach(a => console.log(`${a.name} — ${a.role} — ${a.status}`));
```

### MCP — Discover and Call Tools

```js
// Discover all tools
const tools = await client.mcp.listTools();
tools.forEach(t => {
  const params = Object.keys(t.inputSchema?.properties || {}).join(', ');
  console.log(`${t.name}: ${t.description} (${params})`);
});

// Call a tool
const result = await client.mcp.callTool('sandbox_spawn', { template: 'node' });
console.log(result);

// Convenience methods
const msg = await client.mcp.chatWithAgent('cashclaw', 'check positions');
await client.mcp.blackboardSet('last_action', 'checked positions');
const fact = await client.mcp.blackboardGet('last_action');
```

### Orchestrator — Multi-Agent Coordination

```js
// Route a multi-agent task through Hermes
const task = await client.orchestrator.routeTask('deploy the dashboard');
console.log(`Plan: ${task.plan}`);
task.assignments.forEach(a => console.log(`  → ${a.agent}: ${a.task}`));

// Send a message from one agent to another
const resp = await client.orchestrator.send('cashclaw', 'hermes', 'route my trade alert');

// Broadcast to all agents
const broadcast = await client.orchestrator.broadcast('user', 'system health check');

// Run a multi-step workflow
const wf = await client.orchestrator.workflow('deploy-app', [
  { agent: 'cursor', task: 'run tests on dashboard' },
  { agent: 'openhuman', task: 'deploy to production' },
]);

// Shared blackboard
await client.orchestrator.blackboardSet('btc_price', 67200, 'cashclaw');
const price = await client.orchestrator.blackboardGet('btc_price');
const allFacts = await client.orchestrator.blackboardGetAll();
```

## CLI

The SDK includes a `studex` CLI (same as the Python version):

```bash
studex --help
studex health
studex sandbox spawn python
studex sandbox run <id> "print('hello')"
studex agent chat cashclaw "check positions"
studex mcp tools
studex mesh task "deploy the dashboard"
studex blackboard set btc_price 67200

# Custom URL
STUDEX_URL=http://my-server:4000 studex health
```

## API Reference

| Method | Description |
|--------|-------------|
| `client.sandbox.spawn(template)` | Spawn an ephemeral code sandbox |
| `client.sandbox.run(id, code, opts)` | Execute code in a sandbox |
| `client.sandbox.destroy(id)` | Destroy a sandbox |
| `client.sandbox.listFiles(id, path)` | List workspace files |
| `client.sandbox.readFile(id, path)` | Read a workspace file |
| `client.sandbox.writeFile(id, path, content)` | Write a workspace file |
| `client.agents.chat(name, msg)` | Talk to an agent |
| `client.agents.status(name)` | Get agent status |
| `client.agents.list()` | List all agents |
| `client.mcp.listTools()` | Discover all MCP tools |
| `client.mcp.callTool(name, args)` | Call an MCP tool |
| `client.mcp.chatWithAgent(name, msg)` | Chat via MCP |
| `client.orchestrator.routeTask(task)` | Route task via Hermes |
| `client.orchestrator.send(from, to, msg)` | Agent-to-agent message |
| `client.orchestrator.broadcast(from, msg)` | Broadcast to all |
| `client.orchestrator.workflow(name, steps)` | Multi-step workflow |
| `client.orchestrator.blackboardSet(key, val)` | Write shared fact |
| `client.orchestrator.blackboardGet(key)` | Read shared fact |
