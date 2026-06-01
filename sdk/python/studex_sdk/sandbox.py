"""
Sandbox API — Ephemeral code execution environments.

Each sandbox is an isolated Docker container with its own filesystem.
Templates: python, node, shell, go.
"""


class SandboxAPI:
    """
    Wrapper around the StudEx Sandbox API.

    Usage:
        client = StudExClient()
        sb = client.sandbox.spawn("python")
        result = client.sandbox.run(sb["id"], "print('hello')")
        print(result["stdout"])
    """

    def __init__(self, client):
        self._client = client

    # ── Lifecycle ─────────────────────────────────────────────────────────

    def spawn(self, template="python", ttl_ms=120_000):
        """
        Spawn a new sandbox.

        Args:
            template: One of "python", "node", "shell", "go"
            ttl_ms: Time-to-live in milliseconds before auto-destroy

        Returns:
            dict with keys: id, template, workDir, commands
        """
        return self._client._post("/sandbox/spawn", {
            "template": template,
            "ttlMs": ttl_ms,
        })

    def run(self, sandbox_id, code, language=None, timeout=None):
        """
        Execute code in a sandbox.

        Args:
            sandbox_id: The sandbox ID from spawn()
            code: Source code to execute
            language: Override language (defaults to sandbox template)
            timeout: Execution timeout in ms (default: 30000)

        Returns:
            dict with keys: stdout, stderr, exitCode, files
        """
        body = {"code": code}
        if language:
            body["language"] = language
        if timeout:
            body["timeout"] = timeout
        return self._client._post(f"/sandbox/{sandbox_id}/run", body)

    def destroy(self, sandbox_id):
        """
        Destroy a sandbox immediately.

        Args:
            sandbox_id: The sandbox ID to destroy
        """
        return self._client._delete(f"/sandbox/{sandbox_id}")

    # ── Files ─────────────────────────────────────────────────────────────

    def list_files(self, sandbox_id, path="."):
        """
        List files in a sandbox workspace.

        Args:
            sandbox_id: The sandbox ID
            path: Directory path within the workspace (default: ".")

        Returns:
            list of file info dicts with keys: name, size, isDirectory, modifiedAt
        """
        data = self._client._get(f"/sandbox/{sandbox_id}/files", {"path": path})
        return data.get("files", [])

    def read_file(self, sandbox_id, file_path):
        """
        Read a file from a sandbox workspace.

        Args:
            sandbox_id: The sandbox ID
            file_path: Path to the file within the workspace

        Returns:
            File content as string, or None if not found
        """
        try:
            data = self._client._get(f"/sandbox/{sandbox_id}/files/{file_path}")
            return data.get("content")
        except self._client.APIError as e:
            if e.status == 404:
                return None
            raise

    def write_file(self, sandbox_id, file_path, content):
        """
        Write a file to a sandbox workspace.

        Args:
            sandbox_id: The sandbox ID
            file_path: Path within the workspace
            content: File content as string

        Returns:
            dict with keys: path, size
        """
        return self._client._post(f"/sandbox/{sandbox_id}/files", {
            "path": file_path,
            "content": content,
        })

    # ── Info ──────────────────────────────────────────────────────────────

    def list(self):
        """List all active sandboxes with stats."""
        return self._client._get("/sandbox")

    def stats(self):
        """Get sandbox system stats (active count, docker availability, templates)."""
        return self._client._get("/sandbox/stats")

    def templates(self):
        """List available sandbox templates."""
        return self._client._get("/sandbox/templates")

    # ── Context Manager ───────────────────────────────────────────────────

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        # Destroy all sandboxes on exit
        data = self.list()
        for sb in data.get("sandboxes", []):
            try:
                self.destroy(sb["id"])
            except Exception:
                pass

    def __repr__(self):
        return "<SandboxAPI>"
