"""
Core HTTP client for the StudEx API.
Handles connection, retries, error wrapping, and async HTTP calls.
"""

import json
import time
from urllib.request import Request, urlopen
from urllib.error import URLError, HTTPError
from urllib.parse import urlencode


class StudExError(Exception):
    """Base exception for StudEx SDK errors."""
    pass


class ConnectionError_(StudExError):
    """Raised when the server cannot be reached."""
    pass


class APIError(StudExError):
    """Raised when the API returns an error response."""
    def __init__(self, status, message):
        self.status = status
        self.message = message
        super().__init__(f"[{status}] {message}")


class StudExClient:
    """
    Core client for the StudEx Agent Operating System API.

    Args:
        base_url: Root URL of the StudEx server (e.g. http://localhost:4000)
        timeout: Request timeout in seconds (default: 30)
        retries: Number of retries on connection failure (default: 2)
    """

    def __init__(self, base_url="http://localhost:4000", timeout=30, retries=2):
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self.retries = retries

        # API sub-clients
        self.sandbox = SandboxAPI(self)
        self.mcp = MCPAPI(self)
        self.agents = AgentAPI(self)
        self.orchestrator = OrchestratorAPI(self)

    # ── Low-level HTTP ────────────────────────────────────────────────────

    def _request(self, method, path, data=None, query=None):
        """Make an HTTP request with retry logic."""
        url = f"{self.base_url}/api{path}"

        if query:
            url += "?" + urlencode(query)

        body = None
        if data is not None:
            body = json.dumps(data).encode("utf-8")

        last_error = None
        for attempt in range(self.retries + 1):
            try:
                req = Request(url, data=body, method=method)
                req.add_header("Content-Type", "application/json")
                req.add_header("Accept", "application/json")

                with urlopen(req, timeout=self.timeout) as resp:
                    raw = resp.read().decode("utf-8")
                    if not raw:
                        return {}
                    return json.loads(raw)

            except HTTPError as e:
                body = e.read().decode("utf-8", errors="replace")
                try:
                    err_data = json.loads(body)
                    msg = err_data.get("error", body)
                except (json.JSONDecodeError, AttributeError):
                    msg = body or e.reason
                raise APIError(e.code, msg)

            except URLError as e:
                last_error = e
                if attempt < self.retries:
                    time.sleep(1 * (attempt + 1))
                    continue

        raise ConnectionError_(
            f"Cannot reach {self.base_url} after {self.retries + 1} attempts: {last_error.reason}"
        )

    def _get(self, path, query=None):
        return self._request("GET", path, query=query)

    def _post(self, path, data=None):
        return self._request("POST", path, data=data)

    def _delete(self, path):
        return self._request("DELETE", path)

    # ── High-level helpers ────────────────────────────────────────────────

    def health(self):
        """Check server health."""
        return self._get("/health")

    def ping(self):
        """Quick connectivity check. Returns True if server is reachable."""
        try:
            self._get("/health", query={"_t": str(time.time())})
            return True
        except (StudExError, ConnectionError_):
            return False

    def __repr__(self):
        return f"<StudExClient {self.base_url}>"


# Import sub-clients at the bottom to avoid circular imports
from studex_sdk.sandbox import SandboxAPI
from studex_sdk.mcp import MCPAPI
from studex_sdk.agent import AgentAPI
from studex_sdk.orchestrator import OrchestratorAPI
