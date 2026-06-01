"""
Agent API — Chat with agents, get status, stream responses.

Pattern matches Anthropic's messages.create:
    resp = client.agents.create("cashclaw", "check positions")
    print(resp.response)

    # Streaming (future: SSE support)
    # with client.agents.stream("cashclaw") as stream:
    #     for chunk in stream:
    #         print(chunk, end="")
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from studex._client import StudExClient
from studex._types import AgentDefinition, AgentResponse


class AgentAPI:
    """
    API for chatting with agents and checking their status.

    All 5 agents are accessible:
      - cashclaw   (Financial/Trading)
      - hermes     (Orchestrator/Gateway)
      - openhuman  (Platform/Deployment)
      - cursor     (IDE/Development)
      - farm       (Worker nodes)
    """

    def __init__(self, client: StudExClient) -> None:
        self._client = client

    # ── Core Chat (matching Anthropic messages.create) ───────────────────

    def create(
        self,
        agent: str,
        message: str,
        **kwargs: Any,
    ) -> AgentResponse:
        """
        Send a message to an agent and receive a response.

        Args:
            agent: Agent name (cashclaw, hermes, openhuman, cursor, farm)
            message: Message text

        Returns:
            AgentResponse with agent name, response text, and timestamp

        Example:
            resp = client.agents.create("cashclaw", "check positions")
            print(resp.response)
        """
        if not message or not message.strip():
            raise ValueError("Message must not be empty")

        data = self._client._post(
            f"/agents/{agent}/chat",
            {"message": message.strip()},
        )
        return AgentResponse(
            agent=data.get("agent", agent),
            response=data.get("response", ""),
            timestamp=data.get("timestamp", ""),
        )

    # ── Status ──────────────────────────────────────────────────────────

    def list(self) -> List[AgentDefinition]:
        """List all agents with status."""
        data = self._client._get("/agents")
        return [
            AgentDefinition(
                name=a.get("name", ""),
                role=a.get("role", ""),
                rvs=a.get("rvs", ""),
                status=a.get("status", "offline"),
                uptime=a.get("uptime", 0),
                messages=a.get("messages", 0),
            )
            for a in data
        ]

    def status(self, name: str) -> Dict[str, Any]:
        """Get detailed status for a specific agent."""
        return self._client._get(f"/agents/{name}")

    def logs(self, name: str, lines: int = 50) -> List[str]:
        """Get recent agent logs."""
        data = self._client._get(
            f"/agents/{name}/logs",
            {"lines": str(lines)},
        )
        return data.get("logs", [])

    # ── Convenience ─────────────────────────────────────────────────────

    @property
    def names(self) -> List[str]:
        """List of all agent names."""
        return [a.name for a in self.list()]

    def broadside(self, message: str) -> Dict[str, str]:
        """
        Send the same message to all agents.

        Args:
            message: Message to broadcast to every agent

        Returns:
            Dict mapping agent names to their responses
        """
        results: Dict[str, str] = {}
        for agent in self.names:
            try:
                resp = self.create(agent, message)
                results[agent] = resp.response
            except Exception as e:
                results[agent] = f"Error: {e}"
        return results

    # ── Google ADK-style agent configuration ─────────────────────────────

    def config(self, name: str) -> AgentDefinition:
        """Get an agent's configuration as an AgentDefinition object."""
        data = self.status(name)
        return AgentDefinition(
            name=data.get("name", name),
            role=data.get("role", ""),
            rvs=data.get("rvs", ""),
            status=data.get("status", "offline"),
            uptime=data.get("uptime", 0),
            messages=data.get("messages", 0),
            disk=data.get("disk", "20GB"),
            cpu=data.get("cpu", "2 vCPU"),
            ram=data.get("ram", "4GB"),
            port=data.get("port", 3000),
            color=data.get("color", "#888888"),
        )

    def __repr__(self) -> str:
        return "<AgentAPI>"
