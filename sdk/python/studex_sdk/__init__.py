"""
StudEx Python SDK — Programmatic client for the StudEx Agent Operating System.

Allows agents to call the sandbox, MCP, orchestrator, and agent APIs
from Python code. Works with any server running the StudEx backend.

Quick start:
    from studex_sdk import StudExClient

    client = StudExClient("http://localhost:4000")

    # Spawn a sandbox and run code
    sb = client.sandbox.spawn("python")
    result = client.sandbox.run(sb["id"], "print('hello from studex')")
    print(result["stdout"])

    # Discover MCP tools
    tools = client.mcp.list_tools()
    for t in tools:
        print(f"{t['name']}: {t['description']}")

    # Chat with an agent
    resp = client.agents.chat("cashclaw", "check positions")
    print(resp["response"])

    # Route a multi-agent task
    task = client.orchestrator.route_task("deploy the dashboard")
    print(task)
"""

__version__ = "0.1.0"
__all__ = ["StudExClient", "SandboxAPI", "MCPAPI", "AgentAPI", "OrchestratorAPI"]

from studex_sdk.client import StudExClient
from studex_sdk.sandbox import SandboxAPI
from studex_sdk.mcp import MCPAPI
from studex_sdk.agent import AgentAPI
from studex_sdk.orchestrator import OrchestratorAPI
