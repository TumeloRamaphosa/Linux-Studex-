"""
Agent API — Chat with agents, check status, read logs.

All 5 agents are accessible:
  - cashclaw   (Financial/Trading agent)
  - hermes     (Orchestrator/Gateway)
  - openhuman  (Platform/Deployment)
  - cursor     (IDE/Development)
  - farm       (Worker nodes)
"""


class AgentAPI:
    """
    Wrapper around the StudEx Agent API.

    Usage:
        client = StudExClient()
        resp = client.agents.chat("cashclaw", "check positions")
        status = client.agents.status("hermes")
        logs = client.agents.logs("cursor", lines=20)
    """

    def __init__(self, client):
        self._client = client

    # ── List and Status ───────────────────────────────────────────────────

    def list(self):
        """
        List all agents with basic status.

        Returns:
            list of agent dicts with keys: name, role, rvs, status, uptime
        """
        return self._client._get("/agents")

    def status(self, name):
        """
        Get detailed status for a specific agent.

        Args:
            name: Agent name (cashclaw, hermes, openhuman, cursor, farm)

        Returns:
            Full agent status dict
        """
        return self._client._get(f"/agents/{name}")

    def all_status(self):
        """
        Get detailed status for all agents at once.

        Returns:
            dict mapping agent names to their status dicts
        """
        agents = {}
        for a in self.list():
            try:
                agents[a["name"]] = self.status(a["name"])
            except Exception:
                agents[a["name"]] = {"error": "unreachable"}
        return agents

    # ── Chat ──────────────────────────────────────────────────────────────

    def chat(self, name, message):
        """
        Send a message to an agent and get its response.

        Args:
            name: Agent name
            message: Message text

        Returns:
            dict with keys: agent, response, timestamp

        Examples:
            client.agents.chat("cashclaw", "check positions")
            client.agents.chat("hermes", "route cashclaw through premium")
            client.agents.chat("cursor", "run tests on dashboard")
        """
        if not message or not message.strip():
            raise ValueError("Message is required")
        return self._client._post(f"/agents/{name}/chat", {
            "message": message.strip(),
        })

    # ── Logs ──────────────────────────────────────────────────────────────

    def logs(self, name, lines=50):
        """
        Get recent agent logs.

        Args:
            name: Agent name
            lines: Number of log lines to retrieve (default: 50)

        Returns:
            dict with keys: agent, logs, lines
        """
        return self._client._get(f"/agents/{name}/logs", {"lines": str(lines)})

    # ── Convenience ───────────────────────────────────────────────────────

    def chat_with_all(self, message):
        """
        Send the same message to all agents.

        Args:
            message: Message to broadcast

        Returns:
            dict mapping agent names to their responses
        """
        results = {}
        for a in self.list():
            try:
                resp = self.chat(a["name"], message)
                results[a["name"]] = resp.get("response", "")
            except Exception as e:
                results[a["name"]] = f"Error: {e}"
        return results

    @property
    def names(self):
        """List of all agent names."""
        return [a["name"] for a in self.list()]

    def __getitem__(self, name):
        """Convenience: client.agents['cashclaw'].chat('hello')"""
        return _AgentHandle(self._client, name)

    def __repr__(self):
        return "<AgentAPI>"


class _AgentHandle:
    """Handle for a single agent, returned by AgentAPI.__getitem__."""

    def __init__(self, client, name):
        self._client = client
        self._name = name

    def chat(self, message):
        return self._client.agents.chat(self._name, message)

    def status(self):
        return self._client.agents.status(self._name)

    def logs(self, lines=50):
        return self._client.agents.logs(self._name, lines)

    def __repr__(self):
        return f"<AgentHandle '{self._name}'>"
