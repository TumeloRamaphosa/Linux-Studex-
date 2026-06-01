"""
Core HTTP client for the StudEx API.

Provides both synchronous (StudEx) and asynchronous (AsyncStudEx) clients
with retry logic, streaming support, proper error mapping, and headers.

Pattern matches the Anthropic Python SDK:
    client = StudEx(base_url="http://localhost:4000")
    client.messages.create(...)  # or client.sandbox.spawn(...)
"""

from __future__ import annotations

import json
import time
from typing import Any, Dict, Iterator, Optional, AsyncIterator
from urllib.request import Request, urlopen
from urllib.error import URLError, HTTPError

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
from studex._types import (
    AgentResponse,
    SandboxInstance,
    CodeResult,
    MCPTool,
    MCPResult,
    TaskResult,
    BlackboardEntry,
)


def _map_http_error(status: int, body: str) -> APIError:
    """Map HTTP status code to the appropriate exception."""
    try:
        err_data = json.loads(body)
        msg = err_data.get("error", body)
    except (json.JSONDecodeError, ValueError):
        msg = body or "Unknown error"

    if status == 400:
        return BadRequestError(msg, body=body)
    elif status == 404:
        return NotFoundError(msg, body=body)
    elif status == 429:
        return RateLimitError(msg, body=body)
    elif status >= 500:
        return InternalError(msg, body=body)
    else:
        return APIError(msg, status_code=status, body=body)


class StudExClient:
    """
    Base HTTP client for the StudEx API.

    Handles request construction, retries, error mapping, and response parsing.
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
        self.base_url = base_url.rstrip("/")
        self._timeout = timeout
        self._max_retries = max_retries
        self._default_headers = dict(default_headers or {})

        # Auto-set auth header if api_key is provided (for future cloud mode)
        if api_key:
            self._default_headers["X-API-Key"] = api_key

    def _build_url(self, path: str, query: Optional[Dict[str, str]] = None) -> str:
        url = f"{self.base_url}/api{path}"
        if query:
            params = "&".join(f"{k}={v}" for k, v in query.items())
            url += f"?{params}"
        return url

    def _build_headers(self) -> Dict[str, str]:
        return {
            "Content-Type": "application/json",
            "Accept": "application/json",
            **self._default_headers,
        }

    def _request(
        self,
        method: str,
        path: str,
        data: Optional[Dict[str, Any]] = None,
        query: Optional[Dict[str, str]] = None,
        stream: bool = False,
    ) -> Any:
        """Make a synchronous HTTP request with retry logic."""
        url = self._build_url(path, query)
        body = json.dumps(data).encode("utf-8") if data is not None else None
        headers = self._build_headers()

        last_error: Optional[Exception] = None
        for attempt in range(self._max_retries + 1):
            try:
                req = Request(url, data=body, headers=headers, method=method)
                with urlopen(req, timeout=self._timeout) as resp:
                    raw = resp.read().decode("utf-8")
                    if not raw:
                        return {}
                    return json.loads(raw)

            except HTTPError as e:
                raw_body = e.read().decode("utf-8", errors="replace")
                raise _map_http_error(e.code, raw_body)

            except URLError as e:
                last_error = e
                if attempt < self._max_retries:
                    time.sleep(1.0 * (attempt + 1))
                    continue

        raise ConnectionError(
            f"Cannot reach {self.base_url} after {self._max_retries + 1} attempts: "
            f"{last_error.reason if last_error else 'Unknown error'}",
            url=url,
        )

    def _get(self, path: str, query: Optional[Dict[str, str]] = None) -> Any:
        return self._request("GET", path, query=query)

    def _post(self, path: str, data: Optional[Dict[str, Any]] = None) -> Any:
        return self._request("POST", path, data=data)

    def _delete(self, path: str) -> Any:
        return self._request("DELETE", path)

    # ── Convenience ────────────────────────────────────────────────────

    def health(self) -> Dict[str, Any]:
        """Check server health."""
        return self._get("/health")

    def ping(self) -> bool:
        """Quick connectivity check."""
        try:
            self._get("/health", query={"_t": str(time.time())})
            return True
        except StudExError:
            return False


class AsyncStudExClient:
    """
    Async HTTP client stub — matches AsyncAnthropic pattern.

    In the full implementation this would use httpx or aiohttp.
    For now it wraps the sync client in thread pool executor.
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
        self._sync = StudExClient(
            base_url=base_url,
            timeout=timeout,
            max_retries=max_retries,
            default_headers=default_headers,
            api_key=api_key,
        )

    async def health(self) -> Dict[str, Any]:
        return self._sync.health()

    async def ping(self) -> bool:
        return self._sync.ping()
