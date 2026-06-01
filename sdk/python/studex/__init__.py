"""
StudEx — Python SDK for the StudEx Agent Operating System.

Pattern matches the Anthropic/Google ADK SDK design:
    from studex import StudEx

    client = StudEx(base_url="http://localhost:4000")

    # Agent chat (matching Anthropic messages.create)
    resp = client.agents.create("cashclaw", "check positions")

    # Sandbox (with Google ADK-style context manager)
    with client.sandbox.session("python") as sb:
        result = sb.run("print('hello')")

    # MCP tool discovery (matching Google ADK ToolRegistry)
    tools = client.mcp.tools.list()

    # Orchestrator (multi-agent task routing)
    task = client.orchestrator.tasks.create("deploy the dashboard")

    # Blackboard (shared state)
    client.orchestrator.blackboard.set("btc_price", 67200)
"""

from __future__ import annotations

from typing import Any, Dict, Optional

from studex._client import StudExClient, AsyncStudExClient
from studex._exceptions import (
    StudExError,
    ConnectionError,
    TimeoutError,
    APIError,
    BadRequestError,
    NotFoundError,
    RateLimitError,
    InternalError,
)
from studex.sandbox import SandboxAPI
from studex.agent import AgentAPI
from studex.mcp import MCPAPI
from studex.orchestrator import OrchestratorAPI
from studex.tools import Tool, ToolRegistry, tool

__version__ = "0.2.0"
__all__ = [
    "StudEx",
    "AsyncStudEx",
    "StudExError",
    "ConnectionError",
    "TimeoutError",
    "APIError",
    "BadRequestError",
    "NotFoundError",
    "RateLimitError",
    "InternalError",
    "Tool",
    "ToolRegistry",
    "tool",
]


class StudEx:
    """
    StudEx client — primary entry point for all API operations.

    Pattern matches Anthropic's Anthropic() and Google ADK's AgentClient:
        client = StudEx(base_url="http://localhost:4000")
        resp = client.agents.create("cashclaw", "check positions")

    Args:
        base_url: StudEx server URL (default: http://localhost:4000)
        timeout: Request timeout in seconds (default: 30)
        max_retries: Max retry attempts (default: 2)
        default_headers: Custom headers to include in all requests
        api_key: API key for future cloud-mode authentication
    """

    def __init__(
        self,
        base_url: str = "http://localhost:4000",
        *,
        timeout: float = 30.0,
        max_retries: int = 2,
        default_headers: Optional[Dict[str, str]] = None,
        api_key: Optional[str] = None,
    ) -> None:
        self._client = StudExClient(
            base_url=base_url,
            timeout=timeout,
            max_retries=max_retries,
            default_headers=default_headers,
            api_key=api_key,
        )

        # API sub-clients — namespace access matches Anthropic's
        # client.messages, client.beta pattern
        self.sandbox = SandboxAPI(self._client)
        self.agents = AgentAPI(self._client)
        self.mcp = MCPAPI(self._client)
        self.orchestrator = OrchestratorAPI(self._client)

    # ── Convenience ─────────────────────────────────────────────────────

    def health(self) -> Dict[str, Any]:
        """Check server health."""
        return self._client.health()

    def ping(self) -> bool:
        """Quick connectivity check. Returns True if server is reachable."""
        return self._client.ping()

    def __repr__(self) -> str:
        return f"<StudEx {self._client.base_url}>"


class AsyncStudEx:
    """
    Async StudEx client — for use with asyncio.

    Pattern matches Anthropic's AsyncAnthropic:
        client = AsyncStudEx(base_url="http://localhost:4000")
        health = await client.health()

    Note: Async methods use thread pool for now. Full async support
    with httpx/aiohttp will be added in a future release.
    """

    def __init__(
        self,
        base_url: str = "http://localhost:4000",
        *,
        timeout: float = 30.0,
        max_retries: int = 2,
        default_headers: Optional[Dict[str, str]] = None,
        api_key: Optional[str] = None,
    ) -> None:
        self._client = AsyncStudExClient(
            base_url=base_url,
            timeout=timeout,
            max_retries=max_retries,
            default_headers=default_headers,
            api_key=api_key,
        )

    async def health(self) -> Dict[str, Any]:
        return await self._client.health()

    async def ping(self) -> bool:
        return await self._client.ping()

    def __repr__(self) -> str:
        return f"<AsyncStudEx {self._client._sync.base_url}>"
