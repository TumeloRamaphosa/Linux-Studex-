"""
Type definitions, dataclasses, and type aliases for the StudEx SDK.

Mirrors Google ADK's typed approach to agent definitions, tool schemas,
and response types.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Literal


# ── Agent Types ────────────────────────────────────────────────────────────

@dataclass
class AgentDefinition:
    """Definition of a StudEx agent, matching Google ADK Agent patterns."""
    name: str
    role: str
    rvs: str
    status: Literal["online", "busy", "offline"] = "online"
    uptime: int = 0
    messages: int = 0
    disk: str = "20GB"
    cpu: str = "2 vCPU"
    ram: str = "4GB"
    port: int = 3000
    color: str = "#FF6B35"

    def __repr__(self) -> str:
        return f"<Agent {self.name} [{self.status}] {self.rvs}>"


@dataclass
class AgentResponse:
    """Response from an agent chat call, matching Anthropic message patterns."""
    agent: str
    response: str
    timestamp: str = ""

    def __repr__(self) -> str:
        return f"<AgentResponse from {self.agent}: {self.response[:40]}...>"


# ── Sandbox Types ──────────────────────────────────────────────────────────

@dataclass
class SandboxTemplate:
    """A sandbox template definition."""
    name: str
    description: str
    image: str
    languages: List[str] = field(default_factory=lambda: ["python"])

    def __repr__(self) -> str:
        return f"<Template {self.name}: {self.description}>"


@dataclass
class SandboxInstance:
    """An active sandbox instance."""
    id: str
    template: str
    template_description: str = ""
    work_dir: str = ""
    commands: int = 0
    created_at: int = 0
    remaining_ms: int = 0

    @property
    def alive(self) -> bool:
        return self.remaining_ms > 0

    def __repr__(self) -> str:
        return f"<Sandbox {self.id[-12:]} [{self.template}] {self.commands}cmds>"


@dataclass
class CodeResult:
    """Result from executing code in a sandbox."""
    stdout: str = ""
    stderr: str = ""
    exit_code: int = 0
    files: List[str] = field(default_factory=list)
    sandbox_id: str = ""

    @property
    def success(self) -> bool:
        return self.exit_code == 0

    @property
    def output(self) -> str:
        """Combined output (stdout + stderr)."""
        parts = []
        if self.stdout:
            parts.append(self.stdout)
        if self.stderr:
            parts.append(f"[stderr]\n{self.stderr}")
        return "\n".join(parts)

    def __repr__(self) -> str:
        return f"<CodeResult exit={self.exit_code} stdout={len(self.stdout)}b>"


# ── MCP Types ──────────────────────────────────────────────────────────────

@dataclass
class MCPTool:
    """An MCP tool definition, matching Google ADK Tool patterns."""
    name: str
    description: str
    input_schema: Dict[str, Any] = field(default_factory=dict)
    parameters: List[str] = field(default_factory=list)

    def __repr__(self) -> str:
        return f"<MCPTool {self.name}: {self.description[:40]}...>"


@dataclass
class MCPResult:
    """Result from an MCP tool call."""
    tool: str
    status: str
    result: Any = None
    error: Optional[str] = None

    @property
    def success(self) -> bool:
        return self.status == "success"

    def __repr__(self) -> str:
        return f"<MCPResult {self.tool}: {self.status}>"


# ── Orchestrator Types ─────────────────────────────────────────────────────

@dataclass
class OrchestratorStatus:
    """Orchestrator status snapshot."""
    agents: int = 0
    registered: List[str] = field(default_factory=list)
    blackboard_keys: int = 0
    messages_logged: int = 0
    active_workflows: int = 0
    uptime: int = 0


@dataclass
class TaskAssignment:
    """A task assignment from Hermes routing."""
    agent: str
    task: str
    response: str = ""
    status: str = "completed"


@dataclass
class TaskResult:
    """Result from a multi-agent task routing."""
    plan: str = ""
    assignments: List[TaskAssignment] = field(default_factory=list)
    results: Dict[str, Any] = field(default_factory=dict)


@dataclass
class BlackboardEntry:
    """An entry in the shared blackboard."""
    key: str
    value: Any = None
    source: str = ""
    updated_at: int = 0


# ── Tool Types (Google ADK pattern) ────────────────────────────────────────

@dataclass
class ToolDefinition:
    """A tool definition matching Google ADK @tool decorator pattern."""
    name: str
    description: str
    parameters: Dict[str, Any] = field(default_factory=dict)
    handler: Any = None

    def to_mcp_format(self) -> Dict[str, Any]:
        """Convert to MCP-compatible format."""
        return {
            "name": self.name,
            "description": self.description,
            "inputSchema": {
                "type": "object",
                "properties": self.parameters,
            },
        }


# ── Helper Functions ────────────────────────────────────────────────────────

def map_status(status_str: str) -> Literal["online", "busy", "offline"]:
    """Map a status string to a literal type."""
    if status_str in ("online", "busy", "offline"):
        return status_str  # type: ignore
    return "offline"
