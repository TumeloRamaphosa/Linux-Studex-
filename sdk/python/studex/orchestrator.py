"""
Orchestrator API — Multi-agent coordination.

Pattern matches Google ADK's workflow orchestration:
    task = client.orchestrator.tasks.create("deploy the dashboard")
    print(task.plan)
    for a in task.assignments:
        print(f"  → {a.agent}: {a.task}")
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from studex._client import StudExClient
from studex._types import (
    OrchestratorStatus,
    TaskResult,
    TaskAssignment,
    BlackboardEntry,
)


class OrchestratorAPI:
    """
    Orchestrator API — Coordinate all 5 agents, route tasks, manage workflows.

    Agents can send messages to each other, share facts via the blackboard,
    and execute multi-step workflows through Hermes routing.
    """

    def __init__(self, client: StudExClient) -> None:
        self._client = client
        self.tasks = TaskAPI(client)
        self.blackboard = BlackboardAPI(client)
        self.workflows = WorkflowAPI(client)

    # ── Status ────────────────────────────────────────────────────────────

    def status(self) -> OrchestratorStatus:
        """Get orchestrator status snapshot."""
        data = self._client._get("/orchestrate")
        return OrchestratorStatus(
            agents=data.get("agents", 0),
            registered=data.get("registered", []),
            blackboard_keys=data.get("blackboardKeys", 0),
            messages_logged=data.get("messagesLogged", 0),
            active_workflows=data.get("activeWorkflows", 0),
            uptime=data.get("uptime", 0),
        )

    def agents(self) -> List[Dict[str, Any]]:
        """List all registered agents in the mesh."""
        return self._client._get("/orchestrate/agents")

    def message_log(self, count: int = 50) -> List[Dict[str, Any]]:
        """Get inter-agent message history."""
        data = self._client._get("/orchestrate/log", {"count": str(count)})
        return data.get("messages", [])

    # ── Agent-to-Agent (direct) ──────────────────────────────────────────

    def send(
        self,
        from_agent: str,
        to_agent: str,
        message: str,
    ) -> Dict[str, Any]:
        """Send a message from one agent to another."""
        return self._client._post("/orchestrate/send", {
            "from": from_agent,
            "to": to_agent,
            "message": message,
        })

    def broadcast(
        self,
        from_agent: str,
        message: str,
    ) -> Dict[str, Any]:
        """Broadcast a message to all agents."""
        return self._client._post("/orchestrate/broadcast", {
            "from": from_agent,
            "message": message,
        })

    def __repr__(self) -> str:
        return "<OrchestratorAPI>"


class TaskAPI:
    """Task routing via Hermes coordinator."""

    def __init__(self, client: StudExClient) -> None:
        self._client = client

    def create(self, task: str, from_agent: str = "user") -> TaskResult:
        """
        Route a multi-agent task through Hermes.

        Args:
            task: Task description (e.g. "deploy the dashboard")
            from_agent: Who is requesting (default: "user")

        Returns:
            TaskResult with plan, assignments, and results

        Example:
            task = client.orchestrator.tasks.create("deploy the dashboard")
            print(f"Plan: {task.plan}")
        """
        data = self._client._post("/orchestrate/task", {
            "from": from_agent,
            "task": task,
        })
        assignments = [
            TaskAssignment(
                agent=a.get("agent", ""),
                task=a.get("task", ""),
                response=a.get("response", ""),
                status=a.get("status", "completed"),
            )
            for a in data.get("assignments", [])
        ]
        return TaskResult(
            plan=data.get("plan", ""),
            assignments=assignments,
            results=data.get("results", {}),
        )

    def __repr__(self) -> str:
        return "<TaskAPI>"


class WorkflowAPI:
    """Multi-step workflow execution."""

    def __init__(self, client: StudExClient) -> None:
        self._client = client

    def create(
        self,
        name: str,
        steps: List[Dict[str, str]],
    ) -> Dict[str, Any]:
        """
        Execute a multi-step workflow across multiple agents.

        Args:
            name: Workflow name (e.g. "deploy-app")
            steps: List of {"agent": str, "task": str} dicts

        Example:
            client.orchestrator.workflows.create("deploy-app", [
                {"agent": "cursor", "task": "run tests"},
                {"agent": "openhuman", "task": "deploy to production"},
            ])
        """
        return self._client._post("/orchestrate/workflow", {
            "name": name,
            "steps": steps,
        })

    def __repr__(self) -> str:
        return "<WorkflowAPI>"


class BlackboardAPI:
    """Shared agent state (facts any agent can read/write)."""

    def __init__(self, client: StudExClient) -> None:
        self._client = client

    def get(self, key: str) -> Optional[BlackboardEntry]:
        """Get a fact from the blackboard."""
        try:
            data = self._client._get(f"/orchestrate/blackboard/{key}")
            if not data:
                return None
            return BlackboardEntry(
                key=key,
                value=data.get("value"),
                source=data.get("source", ""),
                updated_at=data.get("updatedAt", 0),
            )
        except Exception as e:
            if getattr(e, "status_code", None) == 404:
                return None
            raise

    def set(
        self,
        key: str,
        value: Any,
        source: str = "sdk",
    ) -> Dict[str, Any]:
        """Write a fact to the blackboard."""
        return self._client._post("/orchestrate/blackboard", {
            "key": key,
            "value": value,
            "source": source,
        })

    def delete(self, key: str) -> Dict[str, Any]:
        """Delete a fact from the blackboard."""
        return self._client._delete(f"/orchestrate/blackboard/{key}")

    def all(self) -> Dict[str, BlackboardEntry]:
        """Get all blackboard facts."""
        data = self._client._get("/orchestrate/blackboard")
        return {
            k: BlackboardEntry(
                key=k,
                value=v.get("value"),
                source=v.get("source", ""),
                updated_at=v.get("updatedAt", 0),
            )
            for k, v in data.items()
        }

    def __repr__(self) -> str:
        return "<BlackboardAPI>"
