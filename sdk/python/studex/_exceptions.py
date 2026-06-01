"""
StudEx exception hierarchy.

Mirrors the Anthropic Python SDK error pattern:
    StudExError
    ├── APIError          # Base for all API errors
    │   ├── BadRequestError   # 400
    │   ├── NotFoundError     # 404
    │   ├── RateLimitError    # 429
    │   └── InternalError     # 500
    ├── ConnectionError   # Cannot reach server / network issues
    └── TimeoutError      # Request timed out
"""

from typing import Optional


class StudExError(Exception):
    """Base exception for all StudEx SDK errors."""

    def __init__(self, message: str, *, request_id: Optional[str] = None) -> None:
        self.request_id = request_id
        super().__init__(message)


class ConnectionError(StudExError):
    """Raised when the server cannot be reached (network issue)."""

    def __init__(
        self,
        message: str = "Failed to connect to StudEx server",
        *,
        request_id: Optional[str] = None,
        url: Optional[str] = None,
    ) -> None:
        self.url = url
        super().__init__(message, request_id=request_id)


class TimeoutError(StudExError):
    """Raised when a request times out."""

    def __init__(
        self,
        message: str = "Request timed out",
        *,
        request_id: Optional[str] = None,
        timeout: Optional[float] = None,
    ) -> None:
        self.timeout = timeout
        super().__init__(message, request_id=request_id)


class APIError(StudExError):
    """Base class for all API response errors."""

    def __init__(
        self,
        message: str,
        *,
        status_code: int,
        request_id: Optional[str] = None,
        body: Optional[str] = None,
    ) -> None:
        self.status_code = status_code
        self.body = body
        super().__init__(message, request_id=request_id)


class BadRequestError(APIError):
    """Raised for 400 Bad Request responses."""

    def __init__(
        self,
        message: str = "Bad request",
        *,
        request_id: Optional[str] = None,
        body: Optional[str] = None,
    ) -> None:
        super().__init__(message, status_code=400, request_id=request_id, body=body)


class NotFoundError(APIError):
    """Raised for 404 Not Found responses."""

    def __init__(
        self,
        message: str = "Resource not found",
        *,
        request_id: Optional[str] = None,
        body: Optional[str] = None,
    ) -> None:
        super().__init__(message, status_code=404, request_id=request_id, body=body)


class RateLimitError(APIError):
    """Raised for 429 Too Many Requests responses."""

    def __init__(
        self,
        message: str = "Rate limit exceeded",
        *,
        request_id: Optional[str] = None,
        body: Optional[str] = None,
        retry_after: Optional[float] = None,
    ) -> None:
        self.retry_after = retry_after
        super().__init__(message, status_code=429, request_id=request_id, body=body)


class InternalError(APIError):
    """Raised for 500+ server errors."""

    def __init__(
        self,
        message: str = "Internal server error",
        *,
        request_id: Optional[str] = None,
        body: Optional[str] = None,
    ) -> None:
        super().__init__(message, status_code=500, request_id=request_id, body=body)


__all__ = [
    "StudExError",
    "ConnectionError",
    "TimeoutError",
    "APIError",
    "BadRequestError",
    "NotFoundError",
    "RateLimitError",
    "InternalError",
]
