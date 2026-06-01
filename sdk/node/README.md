# StudEx Node.js SDK

[![Node.js 18+](https://img.shields.io/badge/node-18+-green.svg)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

Node.js SDK for the **StudEx Agent Operating System** — sandbox, MCP,
orchestration, and agent APIs.

Designed with patterns inspired by the **Google Agent Development Kit (ADK)**
and the **Anthropic Python SDK**:
- `StudEx` client class (like `Anthropic` SDK)
- Error hierarchy: `StudExError`, `APIError`, `ConnectionError`, `NotFoundError`, etc.
- `agent.create()` pattern (like `messages.create`)
- `Tool.create()` for tool registration (like Google ADK `@tool`)
- Context-manager sessions for sandbox lifecycle (like ADK sessions)

## Install

```bash
npm install studex
```

Or copy the file directly:
```bash
cp sdk/node/studex.js ./studex.js
```

## Quick Start

```js
const { StudEx } = require('studex');

const client = new StudEx();

// Check server health
const health = await client.health();
console.log(health);

// Chat with an agent
const resp = await client.agents.create('cashclaw', 'check positions');
console.log(resp.response);
```

## Agent API (Anthropic messages.create pattern)

```js
// Chat with an agent
const resp = await client.agents.create('cashclaw', 'check positions');
console.log(resp.response);

// Get agent status
const status = await client.agents.status('hermes');
console.log(`Uptime: ${status.uptime}m`);

// List all agents
const agents = await client.agents.list();
agents.forEach(a => console.log(`${a.name}: ${a.role} [${a.status}]`));

// Get recent logs
const logs = await client.agents.logs('cursor', 20);
```

## Sandbox API (Google ADK session pattern)

```js
// Spawn a sandbox
const sb = await client.sandbox.spawn('python');
console.log(`Sandbox ID: ${sb.id}`);

// Run code
const result = await client.sandbox.run(sb.id, "print('hello from studex')");
console.log(result.stdout);

// Work with files
await client.sandbox.writeFile(sb.id, 'hello.txt', 'Hello from StudEx!');
const content = await client.sandbox.readFile(sb.id, 'hello.txt');
console.log(content);

// Destroy when done
await client.sandbox.destroy(sb.id);

// Or use a session (with auto-destroy safety net)
const sess = await client.sandbox.session('python');
const sr = await sess.run("print('session works')");
console.log(sr.stdout);
await sess.destroy(); // always clean up
```

## MCP — Tool Discovery (Google ADK ToolRegistry pattern)

```js
// Discover all MCP tools
const tools = await client.mcp.tools.list();
tools.forEach(t => console.log(`${t.name}: ${t.description}`));

// Call a tool
const result = await client.mcp.tools.call('sandbox_spawn', { template: 'node' });
console.log(result);

// Convenience methods
const msg = await client.mcp.chatWithAgent('cashclaw', 'check positions');
await client.mcp.blackboardSet('last_action', 'checked positions');
```

## Tool Registration (Google ADK pattern)

```js
const { Tool } = require('studex');

// Create a tool from a function (like @tool decorator)
const greet = Tool.create(function greet(name, age) {
  return `Hello ${name}, age ${age}`;
});

console.log(greet.name);       // "greet"
console.log(greet.parameters); // { name: { type: 'string', ... }, age: { type: 'string', ... } }

// Manual tool definition
const myTool = new Tool('get_weather', 'Get weather for a location', (args) => {
  return { temperature: '72F', condition: 'Sunny' };
}, {
  location: { type: 'string', description: 'City name', required: true },
});
```

## Orchestrator — Multi-Agent Coordination

```js
// Route a task through Hermes
const task = await client.orchestrator.tasks.create('deploy the dashboard');
console.log(`Plan: ${task.plan}`);
task.assignments.forEach(a => console.log(`  → ${a.agent}: ${a.task}`));

// Send agent-to-agent message
await client.orchestrator.send('cashclaw', 'hermes', 'route my trade alert');

// Broadcast to all agents
await client.orchestrator.broadcast('user', 'system health check');

// Multi-step workflow
await client.orchestrator.workflows.create('deploy-app', [
  { agent: 'cursor', task: 'run tests on dashboard' },
  { agent: 'openhuman', task: 'deploy to production' },
]);

// Blackboard (shared state)
await client.orchestrator.blackboard.set('btc_price', 67200, 'cashclaw');
const entry = await client.orchestrator.blackboard.get('btc_price');
console.log(`Value: ${entry.value}`);

// Get all facts
const all = await client.orchestrator.blackboard.all();
```

## CLI

The `studex` CLI matches Google ADK's `adk` command pattern:

```bash
studex health
studex agent list
studex agent chat cashclaw "check positions"
studex sandbox spawn python
studex sandbox run <id> "print('hello')"
studex sandbox session          # Interactive mode
studex mcp tools
studex mcp call sandbox_spawn '{"template": "python"}'
studex mesh task "deploy the dashboard"
studex bb set btc_price 67200
studex bb get btc_price

# Custom URL
STUDEX_URL=http://my-server:4000 studex health
```

## Error Handling

```js
const { StudEx, NotFoundError, ConnectionError, RateLimitError } = require('studex');

const client = new StudEx();

try {
  const sb = await client.sandbox.spawn('python');
  const result = await client.sandbox.run(sb.id, "print('hello')");
  console.log(result.stdout);
} catch (err) {
  if (err instanceof NotFoundError) {
    console.error('Resource not found');
  } else if (err instanceof ConnectionError) {
    console.error('Cannot reach server');
  } else if (err instanceof RateLimitError) {
    console.error('Rate limited');
  } else {
    console.error(`Error: ${err.message}`);
  }
}
```

## API Reference

| Namespace | Method | Description |
|-----------|--------|-------------|
| `client.agents` | `.create(name, msg)` | Chat with an agent |
| | `.status(name)` | Get agent status |
| | `.list()` | List all agents |
| | `.logs(name, lines)` | Get agent logs |
| `client.sandbox` | `.spawn(template)` | Spawn a sandbox |
| | `.run(id, code)` | Execute code |
| | `.destroy(id)` | Destroy a sandbox |
| | `.listFiles(id, path)` | List workspace files |
| | `.readFile(id, path)` | Read a workspace file |
| | `.writeFile(id, path, content)` | Write a workspace file |
| | `.session(template)` | Session with auto-destroy safety |
| `client.mcp` | `.tools.list()` | Discover MCP tools |
| | `.tools.call(name, args)` | Call an MCP tool |
| | `.chatWithAgent(name, msg)` | Chat via MCP |
| `client.orchestrator` | `.tasks.create(task)` | Route multi-agent task |
| | `.send(from, to, msg)` | Agent-to-agent message |
| | `.broadcast(from, msg)` | Broadcast to all |
| | `.workflows.create(name, steps)` | Multi-step workflow |
| | `.blackboard.get(key)` | Read shared fact |
| | `.blackboard.set(key, val)` | Write shared fact |
| | `.blackboard.all()` | Get all facts |
