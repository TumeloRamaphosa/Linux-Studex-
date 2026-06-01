"""
MCP (Model Context Protocol) — Tool discovery and calling.

Pattern matches Google ADK's MCP integration:
    tools = client.mcp.tools.list()
    result = client.mcp.tools.call("sandbox_spawn", {"template": "python"})
    
And Anthropic's tool-use pattern:
    response = client.mcp.tools.call("agent_cashclaw_chat", {"message": "hi"})
"""

from studex.mcp.client import MCPAPI

__all__ = ["MCPAPI"]
