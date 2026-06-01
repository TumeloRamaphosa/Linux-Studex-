"""
Sandbox API — Ephemeral code execution environments.

Pattern matches Google ADK's tool-oriented design + Anthropic's context managers:

    sb = client.sandbox.spawn(template="python")
    result = client.sandbox.run(sb.id, code="print('hi')")
    print(result.stdout)

    # Context manager for auto-cleanup
    with client.sandbox.session(template="python") as sb:
        result = sb.run("print('hello')")
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from studex._client import StudExClient
from studex._types import SandboxInstance, CodeResult, SandboxTemplate


class SandboxAPI:
    """
    Sandbox API — spawn isolated code execution environments.

    Each sandbox is an ephemeral Docker container with filesystem isolation.
    Templates: python, node, shell, go.
    """

    def __init__(self, client: StudExClient) -> None:
        self._client = client

    # ── Lifecycle ─────────────────────────────────────────────────────────

    def spawn(
        self,
        template: str = "python",
        ttl_ms: int = 120_000,
    ) -> SandboxInstance:
        """
        Spawn a new sandbox.

        Args:
            template: One of "python", "node", "shell", "go"
            ttl_ms: Time-to-live in milliseconds before auto-destroy

        Returns:
            SandboxInstance with id, template, work_dir, commands

        Example:
            sb = client.sandbox.spawn("python")
            print(f"Sandbox ID: {sb.id}")
        """
        data = self._client._post("/sandbox/spawn", {
            "template": template,
            "ttlMs": ttl_ms,
        })
        return SandboxInstance(
            id=data["id"],
            template=data.get("template", template),
            work_dir=data.get("workDir", ""),
            commands=data.get("commands", 0),
            created_at=int(time.time() * 1000) if hasattr(__builtins__, 'time') else 0,
            remaining_ms=ttl_ms,
        )

    def run(
        self,
        sandbox_id: str,
        code: str,
        *,
        language: Optional[str] = None,
        timeout: Optional[int] = None,
    ) -> CodeResult:
        """
        Execute code in a sandbox.

        Args:
            sandbox_id: The sandbox ID from spawn()
            code: Source code to execute
            language: Override language (defaults to sandbox template)
            timeout: Execution timeout in ms (default: 30000)

        Returns:
            CodeResult with stdout, stderr, exit_code, files

        Example:
            result = client.sandbox.run(sb.id, "print('hello')")
            print(result.stdout)
        """
        body: Dict[str, Any] = {"code": code}
        if language:
            body["language"] = language
        if timeout:
            body["timeout"] = timeout

        data = self._client._post(f"/sandbox/{sandbox_id}/run", body)
        return CodeResult(
            stdout=data.get("stdout", ""),
            stderr=data.get("stderr", ""),
            exit_code=data.get("exitCode", 1),
            files=data.get("files", []),
            sandbox_id=sandbox_id,
        )

    def destroy(self, sandbox_id: str) -> Dict[str, Any]:
        """
        Destroy a sandbox immediately.

        Args:
            sandbox_id: The sandbox ID to destroy

        Example:
            client.sandbox.destroy(sb.id)
        """
        return self._client._delete(f"/sandbox/{sandbox_id}")

    # ── Files ─────────────────────────────────────────────────────────────

    def list_files(
        self,
        sandbox_id: str,
        path: str = ".",
    ) -> List[Dict[str, Any]]:
        """
        List files in a sandbox workspace.

        Args:
            sandbox_id: Sandbox ID
            path: Directory path within workspace (default: ".")

        Returns:
            List of file info dicts with name, size, isDirectory, modifiedAt
        """
        data = self._client._get(f"/sandbox/{sandbox_id}/files", {"path": path})
        return data.get("files", [])

    def read_file(
        self,
        sandbox_id: str,
        file_path: str,
    ) -> Optional[str]:
        """
        Read a file from a sandbox workspace.

        Args:
            sandbox_id: Sandbox ID
            file_path: Path within workspace

        Returns:
            File content string, or None if not found
        """
        try:
            data = self._client._get(f"/sandbox/{sandbox_id}/files/{file_path}")
            return data.get("content")
        except Exception as e:
            if getattr(e, "status_code", None) == 404:
                return None
            raise

    def write_file(
        self,
        sandbox_id: str,
        file_path: str,
        content: str,
    ) -> Dict[str, Any]:
        """
        Write a file to a sandbox workspace.

        Args:
            sandbox_id: Sandbox ID
            file_path: Path within workspace
            content: File content

        Returns:
            Dict with path and size
        """
        return self._client._post(f"/sandbox/{sandbox_id}/files", {
            "path": file_path,
            "content": content,
        })

    # ── Info ──────────────────────────────────────────────────────────────

    def list(self) -> List[SandboxInstance]:
        """List all active sandboxes."""
        data = self._client._get("/sandbox")
        return [
            SandboxInstance(
                id=sb["id"],
                template=sb.get("template", "?"),
                template_description=sb.get("templateDescription", ""),
                commands=sb.get("commands", 0),
                created_at=sb.get("createdAt", 0),
                remaining_ms=sb.get("remainingMs", 0),
            )
            for sb in data.get("sandboxes", [])
        ]

    def templates(self) -> List[SandboxTemplate]:
        """List available sandbox templates."""
        data = self._client._get("/sandbox/templates")
        return [
            SandboxTemplate(
                name=t["name"],
                description=t.get("description", ""),
                image=t.get("image", ""),
            )
            for t in data.get("templates", [])
        ]

    def stats(self) -> Dict[str, Any]:
        """Get sandbox system stats."""
        return self._client._get("/sandbox/stats")

    # ── Context Manager (Google ADK pattern) ────────────────────────────────

    def session(self, template: str = "python", ttl_ms: int = 120_000) -> "SandboxSession":
        """
        Create a sandbox session with auto-cleanup.

        Usage:
            with client.sandbox.session("python") as sb:
                result = sb.run("print('hello')")
                print(result.stdout)
        """
        return SandboxSession(self._client, template, ttl_ms)

    def __repr__(self) -> str:
        return "<SandboxAPI>"


import time  # noqa: E402 (import after class definition for type clarity)


class SandboxSession:
    """
    A sandbox session that auto-destroys on exit.

    Matches Google ADK's context-manager pattern for resource lifecycle.
    """

    def __init__(
        self,
        client: StudExClient,
        template: str = "python",
        ttl_ms: int = 120_000,
    ) -> None:
        self._client = client
        self._template = template
        self._ttl_ms = ttl_ms
        self._instance: Optional[SandboxInstance] = None

    @property
    def id(self) -> str:
        """Sandbox ID (raises if not spawned)."""
        if not self._instance:
            raise RuntimeError("Sandbox not yet spawned. Use 'with' block.")
        return self._instance.id

    def run(
        self,
        code: str,
        *,
        language: Optional[str] = None,
        timeout: Optional[int] = None,
    ) -> CodeResult:
        """Run code in this sandbox session."""
        if not self._instance:
            raise RuntimeError("Sandbox not yet spawned. Use 'with' block.")
        return SandboxAPI(self._client).run(
            self._instance.id, code,
            language=language, timeout=timeout,
        )

    def write_file(self, path: str, content: str) -> Dict[str, Any]:
        """Write a file in this sandbox session."""
        if not self._instance:
            raise RuntimeError("Sandbox not yet spawned.")
        return SandboxAPI(self._client).write_file(self._instance.id, path, content)

    def read_file(self, path: str) -> Optional[str]:
        """Read a file in this sandbox session."""
        if not self._instance:
            raise RuntimeError("Sandbox not yet spawned.")
        return SandboxAPI(self._client).read_file(self._instance.id, path)

    def __enter__(self) -> "SandboxSession":
        api = SandboxAPI(self._client)
        self._instance = api.spawn(self._template, self._ttl_ms)
        return self

    def __exit__(self, *args: Any) -> None:
        if self._instance:
            try:
                SandboxAPI(self._client).destroy(self._instance.id)
            except Exception:
                pass
            self._instance = None

    def __repr__(self) -> str:
        return f"<SandboxSession {self._instance.id if self._instance else '(pending)'}>"
