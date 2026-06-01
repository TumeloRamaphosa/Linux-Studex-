"""
Orchestrator API — Inter-agent messaging, task routing, blackboard, workflows.

The orchestrator is the central hub that coordinates all 5 agents.
Agents can send messages to each other, share facts via the blackboard,
and execute multi-step workflows.
"""


class OrchestratorAPI:
    """
    Wrapper around the StudEx Orchestrator API.

    Usage:
        client = StudExClient()
        status = client.orchestrator.status()
        resp = client.orchestrator.send("cashclaw", "hermes", "check route")
        task = client.orchestrator.route_task("deploy the dashboard")
        facts = client.orchestrator.blackboard_get_all()
    """

    def __init__(self, client):
        self._client = client

    # ── Status ────────────────────────────────────────────────────────────

    def status(self):
        """
        Get orchestrator status.

        Returns:
            dict with keys: agents, registered, blackboardKeys, messagesLogged,
                           activeWorkflows, uptime
        """
        return self._client._get("/orchestrate")

    def agents(self):
        """
        List all registered agents in the mesh.

        Returns:
            list of agent dicts with keys: name, role, status, rvs
        """
        return self._client._get("/orchestrate/agents")

    def message_log(self, count=50):
        """
        Get inter-agent message history.

        Args:
            count: Number of recent messages to fetch (default: 50)

        Returns:
            list of message dicts with keys: from, to, message, response, timestamp
        """
        data = self._client._get("/orchestrate/log", {"count": str(count)})
        return data.get("messages", [])

    # ── Agent-to-Agent Messaging ──────────────────────────────────────────

    def send(self, from_agent, to_agent, message):
        """
        Send a message from one agent to another.

        Args:
            from_agent: Sender agent name
            to_agent: Recipient agent name
            message: Message text

        Returns:
            dict with keys: from, to, message, response
        """
        return self._client._post("/orchestrate/send", {
            "from": from_agent,
            "to": to_agent,
            "message": message,
        })

    def broadcast(self, from_agent, message):
        """
        Broadcast a message to all agents.

        Args:
            from_agent: Sender name
            message: Message to broadcast

        Returns:
            dict with keys: from, message, responses (dict of agent → response)
        """
        return self._client._post("/orchestrate/broadcast", {
            "from": from_agent,
            "message": message,
        })

    def route_task(self, task, from_agent="user"):
        """
        Route a multi-agent task through Hermes coordinator.

        Hermes analyses the task and assigns it to the best agent(s).

        Args:
            task: Task description (e.g. "deploy the dashboard", "check market")
            from_agent: Who is requesting (default: "user")

        Returns:
            dict with keys: plan, assignments, results
        """
        return self._client._post("/orchestrate/task", {
            "from": from_agent,
            "task": task,
        })

    # ── Workflows ─────────────────────────────────────────────────────────

    def workflow(self, name, steps):
        """
        Execute a multi-step workflow across multiple agents.

        Args:
            name: Workflow name
            steps: list of dicts with keys: agent, task

        Example:
            client.orchestrator.workflow("deploy-app", [
                {"agent": "cursor", "task": "run tests on dashboard"},
                {"agent": "openhuman", "task": "deploy to production"},
                {"agent": "farm", "task": "verify health on all nodes"},
            ])
        """
        return self._client._post("/orchestrate/workflow", {
            "name": name,
            "steps": steps,
        })

    # ── Blackboard (shared state) ─────────────────────────────────────────

    def blackboard_get_all(self):
        """
        Get all facts from the shared blackboard.

        Returns:
            dict mapping keys to fact dicts with: value, source, updatedAt
        """
        return self._client._get("/orchestrate/blackboard")

    def blackboard_get(self, key):
        """
        Get a specific fact from the blackboard.

        Args:
            key: Fact key

        Returns:
            Fact dict with keys: value, source, updatedAt, or None
        """
        try:
            return self._client._get(f"/orchestrate/blackboard/{key}")
        except Exception as e:
            if hasattr(e, 'status') and e.status == 404:
                return None
            raise

    def blackboard_set(self, key, value, source="sdk"):
        """
        Write a fact to the shared blackboard.

        Args:
            key: Fact key
            value: Any JSON-serializable value
            source: Source identifier (default: "sdk")

        Returns:
            dict with keys: key, value, status
        """
        return self._client._post("/orchestrate/blackboard", {
            "key": key,
            "value": value,
            "source": source,
        })

    def blackboard_delete(self, key):
        """
        Delete a fact from the blackboard.

        Args:
            key: Fact key to delete
        """
        return self._client._delete(f"/orchestrate/blackboard/{key}")

    # ── Convenience ───────────────────────────────────────────────────────

    def chat_via_hermes(self, message):
        """
        Convenience: send a message to Hermes to route intelligently.

        This is equivalent to chatting with Hermes directly.

        Args:
            message: Message for Hermes (e.g. "what's the mesh status?")
        """
        return self._client.agents.chat("hermes", message)

    def __repr__(self):
        return "<OrchestratorAPI>"
