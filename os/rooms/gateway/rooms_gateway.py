#!/usr/bin/env python3
"""
Studex rooms gateway (FastMCP).

Receives reports from the relay on every computer, places each agent in its
company room, and serves the rooms three ways:

  GET  /rooms          JSON for the web rooms page and the Obsidian plugin
  GET  /               the web rooms page
  POST /relay/report   relays push here (one token per computer)
  GET  /join.sh        one-line join for a new computer (Linux or macOS)
  GET  /relay.py       the relay itself, fetched by join.sh
  /mcp                 MCP tools for agents: rooms_list, room_get, agent_find, models_list

Add a computer:  python3 rooms_gateway.py mint <computer-id>   (prints its token once)

Environment:
  STUDEX_RELAY_TOKENS  optional "meat-desk:<token>,..." (added to tokens.json)
  STUDEX_TOKENS_FILE   default ./tokens.json (never commit it; chmod 600)
  STUDEX_PUBLIC_URL    the gateway's public https address, used inside join.sh
  STUDEX_VIEW_TOKEN    optional; when set, /rooms and / need ?key=<token>
                       or "Authorization: Bearer <token>"
  STUDEX_ROOMS_FILE    default ../rooms.json
  STUDEX_SECRETS_FILE  default ./secrets.json (API keys from /secrets; chmod 600, never committed)
  STUDEX_ROOMS_PRIVATE default ../rooms.private.json (repo, Drive and file links per room; never committed)
  STUDEX_DB            default ./rooms.sqlite3
  PORT                 default 8787
"""
import hmac
import json
import os
import sqlite3
import threading
import time
from pathlib import Path

from fastmcp import FastMCP
from starlette.requests import Request
from starlette.responses import FileResponse, JSONResponse, PlainTextResponse

HERE = Path(__file__).resolve().parent
ROOMS_FILE = Path(os.environ.get("STUDEX_ROOMS_FILE", HERE.parent / "rooms.json"))
PRIVATE_ROOMS_FILE = Path(os.environ.get("STUDEX_ROOMS_PRIVATE", HERE.parent / "rooms.private.json"))
WEB_PAGE = HERE.parent / "web" / "index.html"
DB_PATH = os.environ.get("STUDEX_DB", str(HERE / "rooms.sqlite3"))
STATUSES = ("working", "blocked", "idle", "done", "unknown")


def parse_tokens(raw):
    out = {}
    for part in (raw or "").split(","):
        if ":" in part:
            cid, tok = part.split(":", 1)
            if cid.strip() and tok.strip():
                out[cid.strip()] = tok.strip()
    return out


TOKENS_FILE = Path(os.environ.get("STUDEX_TOKENS_FILE", HERE / "tokens.json"))
RELAY_FILE = HERE.parent / "relay" / "studex_relay.py"
JOIN_FILE = HERE.parent / "relay" / "join.sh"


def relay_tokens():
    """Env tokens plus tokens.json, read fresh so a newly minted computer can join without a restart."""
    toks = parse_tokens(os.environ.get("STUDEX_RELAY_TOKENS"))
    try:
        toks.update(json.loads(TOKENS_FILE.read_text()))
    except (OSError, ValueError):
        pass
    return toks


def mint(cid):
    import secrets
    toks = {}
    try:
        toks = json.loads(TOKENS_FILE.read_text())
    except (OSError, ValueError):
        pass
    toks[cid] = secrets.token_hex(24)
    TOKENS_FILE.write_text(json.dumps(toks, indent=2))
    os.chmod(TOKENS_FILE, 0o600)
    return toks[cid]
VIEW_TOKEN = os.environ.get("STUDEX_VIEW_TOKEN", "")

# ------------------------------------------------------------------ store ----

_lock = threading.Lock()
_db = sqlite3.connect(DB_PATH, check_same_thread=False)
_db.executescript("""
CREATE TABLE IF NOT EXISTS computers (
  id TEXT PRIMARY KEY, hostname TEXT, last_seen REAL, report TEXT);
CREATE TABLE IF NOT EXISTS agent_state (
  key TEXT PRIMARY KEY, computer TEXT, status TEXT, since REAL);
CREATE TABLE IF NOT EXISTS events (
  ts REAL, computer TEXT, agent TEXT, workspace TEXT, status TEXT);
CREATE INDEX IF NOT EXISTS events_ts ON events(ts);
""")


def load_rooms():
    """rooms.json (public) merged with rooms.private.json (never published): per room, the
    private file adds `links` (repos, agents repo, Drive folder, working files) and may add
    whole rooms. Links only leave the gateway behind the view key."""
    with open(ROOMS_FILE) as f:
        cfg = json.load(f)
    if PRIVATE_ROOMS_FILE.is_file():
        try:
            extra = json.loads(PRIVATE_ROOMS_FILE.read_text())
        except (OSError, ValueError):
            extra = {}
        by_id = {r["id"]: r for r in cfg.get("rooms", [])}
        for pr in extra.get("rooms", []):
            if pr.get("id") in by_id:
                room = by_id[pr["id"]]
                room["links"] = (room.get("links") or []) + (pr.get("links") or [])
                for k, v in pr.items():
                    if k not in ("id", "links"):
                        room.setdefault(k, v)
            elif pr.get("id") and pr.get("name"):
                cfg.setdefault("rooms", []).append(pr)
    return cfg


def safe_links(links):
    """Only http(s) links with a label make it out; anything else is dropped."""
    out = []
    for l in links or []:
        url, label = str(l.get("url", "")), str(l.get("label", "")).strip()
        if label and url.startswith(("https://", "http://")):
            out.append({"kind": str(l.get("kind", "link"))[:16], "label": label[:60], "url": url})
    return out


def agent_key(computer, session, a):
    return f"{computer}/{session}/{a.get('pane') or a.get('name')}"


def store_report(rep):
    """Save one report. Older (replayed) reports only add history; the newest wins."""
    cid, ts = rep["computer"], float(rep.get("ts") or time.time())
    with _lock:
        row = _db.execute("SELECT last_seen FROM computers WHERE id=?", (cid,)).fetchone()
        newest = row is None or ts >= (row[0] or 0)
        for sess in (rep.get("herdr") or {}).get("sessions") or []:
            for a in sess.get("agents") or []:
                key = agent_key(cid, sess.get("name"), a)
                status = a.get("status") if a.get("status") in STATUSES else "unknown"
                prev = _db.execute("SELECT status, since FROM agent_state WHERE key=?", (key,)).fetchone()
                if prev is None or (prev[0] != status and ts >= (prev[1] or 0)):
                    _db.execute("INSERT OR REPLACE INTO agent_state VALUES (?,?,?,?)", (key, cid, status, ts))
                    _db.execute("INSERT INTO events VALUES (?,?,?,?,?)",
                                (ts, cid, a.get("name"), a.get("workspace"), status))
        if newest:
            _db.execute("INSERT OR REPLACE INTO computers VALUES (?,?,?,?)",
                        (cid, rep.get("hostname"), ts, json.dumps(rep)))
        _db.commit()


# ------------------------------------------------------------- placement ----

def _match(value, words):
    v = (value or "").lower()
    return bool(v) and any(w.lower() == v or w.lower() in v for w in words)


def place(agent, computer_id, rooms):
    """Workspace name wins, then the computer's own room, then the agent's name."""
    for r in rooms:
        if _match(agent.get("workspace"), r.get("workspaces", [])):
            return r["id"]
    for r in rooms:
        if (r.get("computer") or {}).get("id") == computer_id:
            return r["id"]
    for r in rooms:
        if _match(agent.get("name"), r.get("agents", [])) or _match(agent.get("tool"), r.get("agents", [])):
            return r["id"]
    return "unassigned"


def snapshot():
    cfg = load_rooms()
    rooms_cfg, now = cfg["rooms"], time.time()
    offline_after = float(cfg.get("offline_after_seconds", 90))
    with _lock:
        comps = _db.execute("SELECT id, hostname, last_seen, report FROM computers").fetchall()
        since = dict(_db.execute("SELECT key, since FROM agent_state").fetchall())

    computers, buckets = {}, {r["id"]: [] for r in rooms_cfg}
    buckets["unassigned"] = []
    for cid, host, seen, rep_json in comps:
        rep = json.loads(rep_json)
        online = (now - (seen or 0)) <= offline_after
        sessions = (rep.get("herdr") or {}).get("sessions") or []
        computers[cid] = {"id": cid, "hostname": host, "online": online,
                          "last_seen": seen, "herdr": (rep.get("herdr") or {}).get("found", False),
                          "errors": [s["error"] for s in sessions if s.get("error")],
                          "advertise": rep.get("advertise"), "models": rep.get("models") or []}
        for sess in sessions:
            for a in sess.get("agents") or []:
                if a.get("status") not in STATUSES:
                    a = {**a, "status": "unknown"}
                rid = place(a, cid, rooms_cfg)
                buckets.setdefault(rid, []).append({
                    "name": a.get("name"), "tool": a.get("tool"),
                    "status": a.get("status") if online else "offline",
                    "last_status": a.get("status"), "workspace": a.get("workspace"),
                    "session": sess.get("name"), "computer": cid, "online": online,
                    "title": a.get("title"),
                    "since": since.get(agent_key(cid, sess.get("name"), a)),
                })

    def counts(agents):
        c = {s: 0 for s in STATUSES + ("offline",)}
        for a in agents:
            c[a["status"]] = c.get(a["status"], 0) + 1
        return c

    rooms = []
    for r in rooms_cfg:
        comp_cfg = r.get("computer") or {}
        live = computers.get(comp_cfg.get("id"))
        agents = sorted(buckets[r["id"]], key=lambda a: (STATUSES + ("offline",)).index(a["status"]))
        rooms.append({
            "id": r["id"], "name": r["name"], "lead": r.get("lead"), "accent": r.get("accent"),
            "reel": r.get("reel"), "about": r.get("about"), "links": safe_links(r.get("links")),
            "computer": {**comp_cfg, "connected": bool(live), "online": bool(live and live["online"]),
                         "last_seen": live and live["last_seen"], "hostname": live and live["hostname"]},
            "agents": agents, "counts": counts(agents),
        })
    return {"generated": now, "rooms": rooms,
            "unassigned": {"agents": buckets["unassigned"], "counts": counts(buckets["unassigned"])},
            "computers": sorted(computers.values(), key=lambda c: c["id"])}


# ---------------------------------------------------------------- server ----

mcp = FastMCP("studex-rooms")


def _bearer(request):
    h = request.headers.get("authorization", "")
    return h[7:].strip() if h.lower().startswith("bearer ") else ""


VIEW_COOKIE = "studex_view"


def _key_ok(given):
    return bool(given) and hmac.compare_digest(given, VIEW_TOKEN)


def _viewer_ok(request):
    """Any one valid credential is enough, so a stale ?key= saved in a browser can't shadow a valid session cookie."""
    if not VIEW_TOKEN:
        return True
    return any(_key_ok(g) for g in (_bearer(request), request.query_params.get("key", ""), request.cookies.get(VIEW_COOKIE, "")))


def _remember(request, response):
    """A valid ?key= becomes an HttpOnly cookie, so an app's scripts, images and media load without the key in every URL."""
    if VIEW_TOKEN and _key_ok(request.query_params.get("key", "")):
        response.set_cookie(VIEW_COOKIE, VIEW_TOKEN, max_age=30 * 86400, httponly=True, samesite="lax",
                            secure=request.url.scheme == "https", path="/")
    return response


@mcp.custom_route("/relay/report", methods=["POST"])
async def relay_report(request: Request):
    token = _bearer(request)
    try:
        body = await request.json()
        reports = body.get("reports") or []
    except ValueError:
        return JSONResponse({"error": "bad json"}, status_code=400)
    if not reports or len(reports) > 500:
        return JSONResponse({"error": "send 1 to 500 reports"}, status_code=400)
    for rep in reports:
        cid = str(rep.get("computer") or "")
        expected = relay_tokens().get(cid)
        if not expected or not hmac.compare_digest(token, expected):
            return JSONResponse({"error": f"token not valid for computer '{cid}'"}, status_code=403)
    for rep in sorted(reports, key=lambda r: r.get("ts") or 0):
        store_report(rep)
    return JSONResponse({"ok": True, "stored": len(reports)})


@mcp.custom_route("/rooms", methods=["GET"])
async def rooms_json(request: Request):
    if not _viewer_ok(request):
        return JSONResponse({"error": "view token required"}, status_code=401)
    return _remember(request, JSONResponse(snapshot(), headers={"Access-Control-Allow-Origin": "*", "Cache-Control": "no-store"}))


@mcp.custom_route("/", methods=["GET"])
async def rooms_page(request: Request):
    return FileResponse(WEB_PAGE)


MEDIA_DIR = (HERE.parent / "web" / "media").resolve()


@mcp.custom_route("/media/{name}", methods=["GET"])
async def media(request: Request):
    """Promo reels and posters. Only plain files directly inside web/media are served."""
    name = request.path_params["name"]
    target = (MEDIA_DIR / name).resolve()
    if target.parent != MEDIA_DIR or not target.is_file() or target.suffix.lower() not in (".mp4", ".jpg", ".png", ".webm"):
        return PlainTextResponse("not found", status_code=404)
    return FileResponse(target, headers={"Cache-Control": "public, max-age=86400"})


APPS_DIR = (HERE.parent.parent / "apps").resolve()
APP_TYPES = {".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json",
             ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".svg": "image/svg+xml",
             ".webp": "image/webp", ".gif": "image/gif", ".mp3": "audio/mpeg", ".mp4": "video/mp4", ".md": "text/plain"}


@mcp.custom_route("/apps/{path:path}", methods=["GET"])
async def apps(request: Request):
    """The OS apps (Factory, Stud-Bot, Mission Control, launcher). Files under os/apps only; a folder serves its index."""
    if not _viewer_ok(request):
        return PlainTextResponse("view token required", status_code=401)
    target = (APPS_DIR / request.path_params["path"]).resolve()
    if target.is_dir():
        for name in ("index.html", "index.dc.html"):
            if (target / name).is_file():
                target = target / name
                break
    if APPS_DIR not in target.parents or not target.is_file():
        return PlainTextResponse("not found", status_code=404)
    kind = APP_TYPES.get(target.suffix.lower()) or ("text/html" if target.name.endswith(".dc.html") else None)
    if not kind:
        return PlainTextResponse("not found", status_code=404)
    # Behind a view key these are private: no shared cache may keep them and hand them to someone without the key.
    headers = {"Cache-Control": "private, no-cache", "Vary": "Cookie, Authorization"} if VIEW_TOKEN else None
    return _remember(request, FileResponse(target, media_type=kind, headers=headers))


@mcp.custom_route("/join.sh", methods=["GET"])
async def join_script(request: Request):
    """The join script, with this gateway's address filled in. It holds no secret: the token is passed by the joiner."""
    base = os.environ.get("STUDEX_PUBLIC_URL") or str(request.base_url).rstrip("/")
    return PlainTextResponse(JOIN_FILE.read_text().replace("__GATEWAY__", base), media_type="text/x-shellscript")


@mcp.custom_route("/relay.py", methods=["GET"])
async def relay_file(request: Request):
    return PlainTextResponse(RELAY_FILE.read_text(), media_type="text/x-python")


@mcp.custom_route("/healthz", methods=["GET"])
async def healthz(request: Request):
    return PlainTextResponse("ok")


@mcp.tool
def rooms_list() -> list[dict]:
    """Every company room with its computer (online or offline) and how many agents are working, blocked, idle or done."""
    s = snapshot()
    return [{"room": r["id"], "name": r["name"], "computer": r["computer"]["label"],
             "computer_online": r["computer"]["online"], "counts": r["counts"]} for r in s["rooms"]]


@mcp.tool
def room_get(room_id: str) -> dict:
    """One room in full: its computer and every agent in it with status, tool, workspace and since when."""
    s = snapshot()
    if room_id == "unassigned":
        return s["unassigned"]
    for r in s["rooms"]:
        if r["id"] == room_id:
            return r
    return {"error": f"no room '{room_id}'", "rooms": [r["id"] for r in s["rooms"]]}


@mcp.tool
def agent_find(name: str) -> list[dict]:
    """Find agents by name or tool across all rooms and computers."""
    s, q, hits = snapshot(), name.lower(), []
    for r in s["rooms"] + [{"id": "unassigned", **s["unassigned"]}]:
        for a in r["agents"]:
            if q in (a["name"] or "").lower() or q in (a["tool"] or "").lower():
                hits.append({"room": r["id"], **a})
    return hits


LOOPBACK = {"localhost", "127.0.0.1", "::1", "0.0.0.0", "ip6-localhost"}


def public_endpoint(url, host):
    """Swap a loopback host for the machine's advertised one, keeping scheme, port and path."""
    from urllib.parse import urlsplit, urlunsplit
    try:
        u = urlsplit(url)
    except ValueError:
        return url
    if not host or (u.hostname or "").lower() not in LOOPBACK and not (u.hostname or "").startswith("127."):
        return url
    h = f"[{host}]" if ":" in host and not host.startswith("[") else host
    return urlunsplit((u.scheme, f"{h}:{u.port}" if u.port else h, u.path, u.query, u.fragment))


@mcp.tool
def models_list(online_only: bool = True) -> list[dict]:
    """Every AI model served by a computer in the OS (Ollama, LM Studio or other OpenAI-compatible servers),
    with the computer, its address and whether it is online. Use it to pick a machine to run a model on."""
    out = []
    for c in snapshot()["computers"]:
        if online_only and not c["online"]:
            continue
        for srv in c.get("models") or []:
            for m in srv.get("models") or []:
                out.append({"computer": c["id"], "online": c["online"], "server": srv.get("server"),
                            "endpoint": public_endpoint(srv.get("endpoint") or "", c.get("advertise") or c.get("hostname")),
                            "model": m.get("name"), "size_gb": m.get("size_gb")})
    return out


import secrets_vault  # noqa: E402  (write-only API key store at /secrets)
secrets_vault.register(mcp)


class McpKey:
    """When STUDEX_VIEW_TOKEN is set, MCP clients must send it as a Bearer token, same as /rooms."""
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if VIEW_TOKEN and scope["type"] == "http" and scope["path"].startswith("/mcp"):
            auth = dict(scope.get("headers") or []).get(b"authorization", b"").decode()
            given = auth[7:].strip() if auth.lower().startswith("bearer ") else ""
            if not hmac.compare_digest(given, VIEW_TOKEN):
                await JSONResponse({"error": "Bearer view token required"}, status_code=401)(scope, receive, send)
                return
        await self.app(scope, receive, send)


if __name__ == "__main__":
    import sys
    if len(sys.argv) == 2 and sys.argv[1] == "admin":
        print(f"Admin key for /secrets: {secrets_vault.make_admin_key()}\n"
              f"(shown once; only its hash is saved in {secrets_vault.ADMIN_HASH_FILE}. Run again to replace it.)")
        raise SystemExit(0)
    if len(sys.argv) == 3 and sys.argv[1] == "mint":
        print(f"{sys.argv[2]}: {mint(sys.argv[2])}\n(shown once; it is saved in {TOKENS_FILE})")
        raise SystemExit(0)
    if not relay_tokens():
        raise SystemExit("No computers yet. Add one: python3 rooms_gateway.py mint meat-desk")
    import uvicorn
    uvicorn.run(McpKey(mcp.http_app(path="/mcp")), host=os.environ.get("HOST", "0.0.0.0"), port=int(os.environ.get("PORT", "8787")))
