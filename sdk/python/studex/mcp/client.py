"""
MCP Client — Tool discovery and calling via Model Context Protocol.

Pattern matches Google ADK's MCPClient class:
    from google.adk.mcp import MCPClient
    client = MCPClient(server_command="node", args=["server.js"])

StudEx equivalent:
    tools = client.mcp.tools.list()       # discover
    result = client.mcp.tools.call(...)    # execute
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from studex._client import StudExClient
from studex._types import MCPTool, MCPResult


class MCPAPI:
    """
    MCP API — Discover and call tools via the Model Context Protocol.

    Provides both raw tool discovery/calling and convenience wrappers
    for common operations.
    """

    def __init__(self, client: StudExClient) -> None:
        self._client = client
        self.tools = ToolRegistry(client)

    # ── Info ─────────────────────────────────────────────────────────────

    def info(self) -> Dict[str, Any]:
        """Get MCP protocol info."""
        return self._client._get("/mcp")

    # ── Convenience wrappers ─────────────────────────────────────────────

    def chat_with_agent(self, agent_name: str, message: str) -> str:
        """Convenience: chat with an agent via MCP."""
        result = self.tools.call(f"agent_{agent_name}_chat", {"message": message})
        response_data = result.get("result", {}) if isinstance(result, dict) else {}
        if isinstance(response_data, dict):
            return response_data.get("response", "") or str(response_data)
        return str(response_data or "")

    def route_task(self, task: str) -> Dict[str, Any]:
        """Convenience: route a multi-agent task via MCP."""
        return self.tools.call("orchestrate_task", {"task": task})

    def sandbox_spawn(self, template: str = "python", ttl_ms: int = 120_000) -> Dict[str, Any]:
        """Convenience: spawn a sandbox via MCP."""
        return self.tools.call("sandbox_spawn", {"template": template, "ttlMs": ttl_ms})

    def sandbox_run(self, sandbox_id: str, code: str, language: Optional[str] = None) -> Dict[str, Any]:
        """Convenience: run code in a sandbox via MCP."""
        args: Dict[str, Any] = {"sandboxId": sandbox_id, "code": code}
        if language:
            args["language"] = language
        return self.tools.call("sandbox_run", args)

    def blackboard_get(self, key: str) -> Any:
        """Convenience: read from the shared blackboard via MCP."""
        result = self.tools.call("blackboard_get", {"key": key})
        if isinstance(result, dict):
            return result.get("result")
        return result

    def blackboard_set(self, key: str, value: Any) -> Dict[str, Any]:
        """Convenience: write to the shared blackboard via MCP."""
        return self.tools.call("blackboard_set", {"key": key, "value": value})

    def __repr__(self) -> str:
        return "<MCPAPI>"


class ToolRegistry:
    """
    Tool registry for discovering and calling MCP tools.

    Pattern matches Google ADK's ToolRegistry:
        registry.list_tools()  # discover
        registry.call_tool()   # execute
    """

    def __init__(self, client: StudExClient) -> None:
        self._client = client

    def list(self) -> List[MCPTool]:
        """
        Discover all available MCP tools.

        Returns:
            List of MCPTool with name, description, input_schema, parameters

        Example:
            tools = client.mcp.tools.list()
            for t in tools:
                print(f"{t.name}: {t.description}")
        """
        data = self._client._get("/mcp/tools")
        tools_data = data.get("tools", [])
        tools = []
        for t in tools_data:
            props = t.get("inputSchema", {}).get("properties", {})
            tools.append(MCPTool(
                name=t["name"],
                description=t.get("description", ""),
                input_schema=t.get("inputSchema", {}),
                parameters=list(props.keys()),
            ))
        return tools

    def call(self, name: str, args: Optional[Dict[str, Any]] = None) -> Any:
        """
        Call a tool by name.

        Args:
            name: Tool name (e.g. "sandbox_spawn", "agent_cashclaw_chat")
            args: Parameters matching the tool's inputSchema

        Returns:
            Tool result

        Example:
            result = client.mcp.tools.call("sandbox_spawn", {"template": "python"})
        """
        data = self._client._post("/mcp/call", {
            "name": name,
            "arguments": args or {},
        })
        return data

    def __repr__(self) -> str:
        return "<ToolRegistry>"
