# StudEx Python SDK

[![Python 3.8+](https://img.shields.io/badge/python-3.8+-blue.svg)](https://www.python.org/)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

Python SDK for the **StudEx Agent Operating System** — sandbox, MCP,
orchestration, and agent APIs.

Designed with patterns inspired by the **Google Agent Development Kit (ADK)**
and the **Anthropic Python SDK**:
- `StudEx` / `AsyncStudEx` client (like `Anthropic` / `AsyncAnthropic`)
- `@tool` decorator for tool registration (like Google ADK)
- Context managers for resource lifecycle (like ADK sessions)
- Professional error hierarchy
- Type hints throughout

## Install

```bash
pip install studex
```

Or from source:

```bash
cd sdk/python
pip install -e .
```

## Quick Start

```python
from studex import StudEx

client = StudEx()

# Check server health
print(client.health())

# Chat with an agent
resp = client.agents.create("cashclaw", "check positions")
print(resp.response)
```

## Agent API (Anthropic messages.create pattern)

```python
# Chat with an agent
resp = client.agents.create("cashclaw", "check positions")
print(resp.response)

# Get agent status
status = client.agents.status("hermes")
print(f"Uptime: {status['uptime']}m")

# List all agents
for agent in client.agents.list():
    print(f"{agent.name}: {agent.role} [{agent.status}]")

# Get recent logs
logs = client.agents.logs("cursor", lines=20)
```

## Sandbox API (Google ADK session pattern)

```python
# Spawn a sandbox
sb = client.sandbox.spawn("python")
print(f"Sandbox ID: {sb.id}")

# Run code
result = client.sandbox.run(sb.id, "import numpy; print(numpy.__version__)")
print(result.stdout)

# Work with files
client.sandbox.write_file(sb.id, "hello.txt", "Hello from StudEx!")
content = client.sandbox.read_file(sb.id, "hello.txt")
print(content)

# Destroy when done
client.sandbox.destroy(sb.id)

# Or use a context manager (auto-cleanup)
with client.sandbox.session("python") as sb:
    result = sb.run("print('hello from session')")
    sb.write_file("test.txt", "auto-cleaned")
    print(result.stdout)
# Sandbox destroyed on exit
```

## MCP — Tool Discovery (Google ADK ToolRegistry pattern)

```python
# Discover all MCP tools
tools = client.mcp.tools.list()
for t in tools:
    params = ", ".join(t.parameters)
    print(f"{t.name}: {t.description} ({params})")

# Call a tool
result = client.mcp.tools.call("sandbox_spawn", {"template": "node"})
print(result)

# Convenience methods
resp = client.mcp.chat_with_agent("cashclaw", "check positions")
client.mcp.blackboard_set("last_action", "checked positions")
```

## @tool Decorator (Google ADK pattern)

```python
from studex import tool

@tool
def get_weather(location: str) -> str:
    """Get the weather for a location."""
    return f"Weather for {location}: sunny, 72°F"

# The tool automatically extracts parameter schemas from type hints
print(get_weather.name)       # "get_weather"
print(get_weather.description) # "Get the weather for a location."
print(get_weather.parameters)  # {"location": {"type": "string", "required": true}}
```

## Orchestrator — Multi-Agent Coordination

```python
# Route a task through Hermes
task = client.orchestrator.tasks.create("deploy the dashboard")
print(f"Plan: {task.plan}")
for a in task.assignments:
    print(f"  → {a.agent}: {a.task}")

# Send agent-to-agent message
resp = client.orchestrator.send("cashclaw", "hermes", "route my trade alert")

# Broadcast to all agents
client.orchestrator.broadcast("user", "system health check")

# Multi-step workflow
client.orchestrator.workflows.create("deploy-app", [
    {"agent": "cursor", "task": "run tests on dashboard"},
    {"agent": "openhuman", "task": "deploy to production"},
])

# Blackboard (shared state)
client.orchestrator.blackboard.set("btc_price", 67200, source="cashclaw")
entry = client.orchestrator.blackboard.get("btc_price")
print(f"Value: {entry.value}, Source: {entry.source}")
```

## CLI

The `studex` CLI matches Google ADK's `adk` command pattern:

```bash
# Health
studex health
studex ping

# Agent operations
studex agent list
studex agent chat cashclaw "check positions"
studex agent status hermes

# Interactive sandbox session
studex sandbox session
studex sandbox spawn python
studex sandbox run <id> "print('hello')"

# MCP
studex mcp tools
studex mcp call sandbox_spawn '{"template": "python"}'

# Mesh orchestration
studex mesh task "deploy the dashboard"
studex mesh log

# Blackboard
studex bb set btc_price 67200
studex bb get btc_price

# Custom server
STUDEX_URL=http://my-server:4000 studex health
```

## Error Handling (Anthropic SDK pattern)

```python
from studex import StudEx, NotFoundError, ConnectionError, RateLimitError

client = StudEx()

try:
    sb = client.sandbox.spawn("python")
    result = client.sandbox.run(sb.id, "print('hello')")
    print(result.stdout)

except NotFoundError as e:
    print(f"Resource not found: {e}")
except ConnectionError as e:
    print(f"Cannot reach server: {e}")
except RateLimitError as e:
    print(f"Rate limited: {e}")
```

## Development

```bash
cd sdk/python
pip install -e .
studex health
```

## API Reference

| Namespace | Method | Description |
|-----------|--------|-------------|
| `client.agents` | `.create(name, msg)` | Chat with an agent |
| | `.status(name)` | Get agent status |
| | `.list()` | List all agents |
| | `.logs(name, lines)` | Get agent logs |
| | `.broadside(msg)` | Message all agents |
| `client.sandbox` | `.spawn(template)` | Spawn a sandbox |
| | `.run(id, code)` | Execute code |
| | `.destroy(id)` | Destroy a sandbox |
| | `.list_files(id)` | List workspace files |
| | `.read_file(id, path)` | Read a workspace file |
| | `.write_file(id, path, content)` | Write a workspace file |
| | `.session(template)` | Context manager (auto-cleanup) |
| `client.mcp` | `.tools.list()` | Discover MCP tools |
| | `.tools.call(name, args)` | Call an MCP tool |
| | `.chat_with_agent(...)` | Chat via MCP |
| `client.orchestrator` | `.tasks.create(task)` | Route multi-agent task |
| | `.send(from, to, msg)` | Agent-to-agent message |
| | `.broadcast(from, msg)` | Broadcast to all |
| | `.workflows.create(name, steps)` | Multi-step workflow |
| | `.blackboard.get(key)` | Read shared fact |
| | `.blackboard.set(key, val)` | Write shared fact |
| | `.blackboard.all()` | Get all facts |
