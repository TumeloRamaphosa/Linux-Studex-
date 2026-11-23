"""Write-only secrets vault for the Studex gateway.

You paste API keys (OpenAI, Ollama, Freepik, Brevo ...) into /secrets; the gateway keeps them in
secrets.json (chmod 600, gitignored) and uses them for the tools it proxies. A value is never sent
back out: not to the page, not to /rooms, not to agents. Agents only see which names are set.

Security:
  * Needs an admin key, separate from the view key. Create it with:  python3 rooms_gateway.py admin
    Only its SHA-256 is stored (admin.key.sha256, chmod 600). Without it, /secrets is switched off.
  * Changes are accepted only over HTTPS, from this machine, or from the Tailscale network
    (100.64.0.0/10), unless STUDEX_SECRETS_ALLOW_HTTP=1.
  * Five wrong admin keys from one address in 10 minutes locks that address out for 10 minutes.
"""
import hashlib
import hmac
import ipaddress
import json
import os
import re
import secrets as _rand
import tempfile
import threading
import time
from pathlib import Path

from starlette.requests import Request
from starlette.responses import FileResponse, JSONResponse

HERE = Path(__file__).resolve().parent
SECRETS_FILE = Path(os.environ.get("STUDEX_SECRETS_FILE", HERE / "secrets.json"))
ADMIN_HASH_FILE = Path(os.environ.get("STUDEX_ADMIN_HASH_FILE", HERE / "admin.key.sha256"))
PAGE = HERE.parent / "web" / "secrets.html"
NAME_RE = re.compile(r"^[A-Z][A-Z0-9_]{1,63}$")
MAX_VALUE = 8192

# Shown on the page with a short note; any other NAME_LIKE_THIS can be added too.
KNOWN = {
    "OPENAI_API_KEY": "OpenAI",
    "OLLAMA_API_KEY": "Ollama cloud (local Ollama needs no key)",
    "OLLAMA_BASE_URL": "Ollama server address, if not the default",
    "ANTHROPIC_API_KEY": "Anthropic API",
    "FREEPIK_API_KEY": "Freepik API (images, video, stock)",
    "HIGGSFIELD_API_KEY": "Higgsfield API",
    "MUAPI_API_KEY": "Muapi.ai (what Open-Higgsfield calls)",
    "BREVO_API_KEY": "Brevo email",
    "BASE44_API_KEY": "Base44 apps",
    "CHATWOOT_API_TOKEN": "Chatwoot (WhatsApp inbox)",
    "WHATSAPP_TOKEN": "WhatsApp Cloud API",
    "TAILSCALE_AUTH_KEY": "Tailscale join key for new machines",
}

_lock = threading.Lock()
_fails: dict[str, list[float]] = {}
_TAILNET = ipaddress.ip_network("100.64.0.0/10")


# ---------------------------------------------------------------- storage ----

def _write_private(path: Path, text: str):
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(dir=path.parent, prefix=f".{path.name}.")
    try:
        os.fchmod(fd, 0o600)
        with os.fdopen(fd, "w") as f:
            f.write(text)
        os.replace(tmp, path)
    except BaseException:
        try:
            os.unlink(tmp)
        except FileNotFoundError:
            pass
        raise


def _load() -> dict:
    try:
        data = json.loads(SECRETS_FILE.read_text())
        return data if isinstance(data, dict) else {}
    except (FileNotFoundError, ValueError):
        return {}


def get_secret(name: str, default: str = "") -> str:
    """For gateway code only (proxied tools). Environment variables win over the vault."""
    return os.environ.get(name) or (_load().get(name) or {}).get("value", default)


def status() -> list[dict]:
    """Names and when they were set. Never values."""
    data = _load()
    names = list(KNOWN) + sorted(n for n in data if n not in KNOWN)
    return [{"name": n, "note": KNOWN.get(n, ""), "set": n in data or bool(os.environ.get(n)),
             "source": "vault" if n in data else ("environment" if os.environ.get(n) else None),
             "updated": (data.get(n) or {}).get("updated")} for n in names]


def make_admin_key() -> str:
    key = _rand.token_urlsafe(32)
    _write_private(ADMIN_HASH_FILE, hashlib.sha256(key.encode()).hexdigest() + "\n")
    return key


# ------------------------------------------------------------------- auth ----

def _admin_hash() -> str:
    try:
        return ADMIN_HASH_FILE.read_text().strip()
    except FileNotFoundError:
        return ""


def _client(request: Request) -> str:
    return request.client.host if request.client else "?"


def _transport_ok(request: Request) -> bool:
    if os.environ.get("STUDEX_SECRETS_ALLOW_HTTP") == "1":
        return True
    host = _client(request)
    try:
        ip = ipaddress.ip_address(host)
    except ValueError:
        return False
    if request.url.scheme == "https":
        return True
    if ip.is_loopback:  # direct, or via a tunnel/proxy on this machine (Cloudflare Tunnel, Caddy)
        return True
    return ip in _TAILNET


def _locked(ip: str) -> bool:
    now = time.time()
    recent = [t for t in _fails.get(ip, []) if now - t < 600]
    _fails[ip] = recent
    return len(recent) >= 5


def _admin_ok(request: Request) -> tuple[bool, JSONResponse | None]:
    expected = _admin_hash()
    if not expected:
        return False, JSONResponse({"error": "Secrets are switched off. On the gateway run: python3 rooms_gateway.py admin"}, status_code=503)
    if not _transport_ok(request):
        return False, JSONResponse({"error": "Use HTTPS or the Tailscale address to manage secrets."}, status_code=403)
    ip = _client(request)
    if _locked(ip):
        return False, JSONResponse({"error": "Too many wrong admin keys. Try again in 10 minutes."}, status_code=429)
    auth = request.headers.get("authorization", "")
    given = auth[7:].strip() if auth.lower().startswith("bearer ") else ""
    if not given or not hmac.compare_digest(hashlib.sha256(given.encode()).hexdigest(), expected):
        _fails.setdefault(ip, []).append(time.time())
        return False, JSONResponse({"error": "Admin key not valid."}, status_code=401)
    _fails.pop(ip, None)
    return True, None


NO_STORE = {"Cache-Control": "no-store", "X-Content-Type-Options": "nosniff"}


# ----------------------------------------------------------------- routes ----

def register(mcp):
    @mcp.custom_route("/secrets", methods=["GET"])
    async def secrets_page(request: Request):
        return FileResponse(PAGE, headers={**NO_STORE, "X-Frame-Options": "DENY",
                                           "Content-Security-Policy": "default-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; script-src 'self' 'unsafe-inline'; frame-ancestors 'none'"})

    @mcp.custom_route("/secrets/status", methods=["POST"])
    async def secrets_status(request: Request):
        ok, err = _admin_ok(request)
        if not ok:
            return err
        return JSONResponse({"secrets": status()}, headers=NO_STORE)

    @mcp.custom_route("/secrets/set", methods=["POST"])
    async def secrets_set(request: Request):
        ok, err = _admin_ok(request)
        if not ok:
            return err
        try:
            body = await request.json()
        except ValueError:
            return JSONResponse({"error": "Send JSON: {\"name\": ..., \"value\": ...}"}, status_code=400)
        name, value = str(body.get("name", "")).strip(), body.get("value")
        if not NAME_RE.match(name):
            return JSONResponse({"error": "Name must look like OPENAI_API_KEY (capitals, digits, underscores)."}, status_code=400)
        with _lock:
            data = _load()
            if value in (None, ""):
                data.pop(name, None)
                action = "removed"
            else:
                value = str(value).strip()
                if len(value) > MAX_VALUE or "\n" in value:
                    return JSONResponse({"error": "Value too long or has line breaks."}, status_code=400)
                data[name] = {"value": value, "updated": time.strftime("%Y-%m-%d %H:%M UTC", time.gmtime())}
                action = "saved"
            _write_private(SECRETS_FILE, json.dumps(data, indent=2))
        return JSONResponse({"ok": True, "name": name, "action": action}, headers=NO_STORE)

    @mcp.tool
    def secrets_configured() -> list[dict]:
        """Which API keys the gateway holds (names and dates only, never values), so an agent knows
        which proxied tools will work. Keys are added by the owner on the gateway's /secrets page."""
        return [{"name": s["name"], "set": s["set"], "updated": s["updated"]} for s in status()]
