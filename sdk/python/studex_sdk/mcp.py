"""
MCP API — Model Context Protocol tool discovery and calling.

Allows agents and external LLMs to discover and call all available
tools dynamically through the MCP standard.
"""


class MCPAPI:
    """
    Wrapper around the StudEx MCP (Model Context Protocol) API.

    Usage:
        client = StudExClient()
        tools = client.mcp.list_tools()
        result = client.mcp.call_tool("sandbox_spawn", {"template": "python"})
    """

    def __init__(self, client):
        self._client = client

    # ── Discovery ─────────────────────────────────────────────────────────

    def info(self):
        """
        Get MCP protocol info.

        Returns:
            dict with keys: protocol, version, endpoints, toolsCount, agentsCount
        """
        return self._client._get("/mcp")

    def list_tools(self):
        """
        Discover all available MCP tools.

        Returns:
            list of tool dicts with keys: name, description, inputSchema
        """
        data = self._client._get("/mcp/tools")
        return data.get("tools", [])

    # ── Execution ─────────────────────────────────────────────────────────

    def call_tool(self, name, arguments=None):
        """
        Call a tool by name.

        Args:
            name: Tool name (e.g. "sandbox_spawn", "agent_cashclaw_chat")
            arguments: dict of parameters matching the tool's inputSchema

        Returns:
            Tool-specific result dict with keys: tool, status, result
        """
        return self._client._post("/mcp/call", {
            "name": name,
            "arguments": arguments or {},
        })

    # ── Convenience wrappers ──────────────────────────────────────────────

    def chat_with_agent(self, agent_name, message):
        """
        Convenience: chat with an agent via MCP.

        Args:
            agent_name: One of "cashclaw", "hermes", "openhuman", "cursor", "farm"
            message: Message to send

        Returns:
            Agent response text
        """
        result = self.call_tool(f"agent_{agent_name}_chat", {"message": message})
        return result.get("result", {}).get("response", "")

    def route_task(self, task_description):
        """
        Convenience: route a multi-agent task via MCP.

        Args:
            task_description: e.g. "deploy the dashboard"

        Returns:
            Task routing result
        """
        return self.call_tool("orchestrate_task", {"task": task_description})

    def sandbox_spawn(self, template="python", ttl_ms=120_000):
        """
        Convenience: spawn a sandbox via MCP.

        Args:
            template: "python", "node", "shell", or "go"
            ttl_ms: Time-to-live in ms

        Returns:
            dict with keys: id, template, workDir, commands
        """
        return self.call_tool("sandbox_spawn", {
            "template": template,
            "ttlMs": ttl_ms,
        })

    def sandbox_run(self, sandbox_id, code, language=None):
        """
        Convenience: run code in a sandbox via MCP.

        Args:
            sandbox_id: Sandbox ID
            code: Source code to run
            language: Optional language override

        Returns:
            dict with keys: stdout, stderr, exitCode
        """
        args = {"sandboxId": sandbox_id, "code": code}
        if language:
            args["language"] = language
        return self.call_tool("sandbox_run", args)

    def blackboard_get(self, key):
        """
        Convenience: read from the shared blackboard via MCP.

        Args:
            key: Fact key

        Returns:
            Fact value or None
        """
        result = self.call_tool("blackboard_get", {"key": key})
        return result.get("result")

    def blackboard_set(self, key, value):
        """
        Convenience: write to the shared blackboard via MCP.

        Args:
            key: Fact key
            value: Any JSON-serializable value
        """
        return self.call_tool("blackboard_set", {"key": key, "value": value})

    def __repr__(self):
        return "<MCPAPI>"
