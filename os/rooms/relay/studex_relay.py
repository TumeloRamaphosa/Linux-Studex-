#!/usr/bin/env python3
"""
Studex room relay. Run one on every computer that hosts CLI agents.

It reads the agents in this computer's herdr sessions (Claude Code, Codex,
Hermes, ...) and reports them to the Studex gateway, which places them in the
right company room. Standard library only: copy this file to any machine with
Python 3.8+ and run it.

Online:  reports go to the gateway every --interval seconds.
Offline: reports are kept in a local spool file and sent, oldest first, as soon
         as the gateway can be reached again. Nothing is lost while a machine
         has no network.

  python3 studex_relay.py --gateway https://gateway.example --computer meat-desk
  STUDEX_RELAY_TOKEN=... is read from the environment (never pass it as an argument).
"""
import argparse
import json
import os
import shutil
import socket
import subprocess
import sys
import time
import urllib.error
import urllib.request

VERSION = "0.2.0"
SPOOL_MAX = 2000  # reports kept while offline (about 5.5 hours at 10s)


def log(msg):
    print(time.strftime("%H:%M:%S"), msg, flush=True)


# ---------------------------------------------------------------- herdr ----

def find_herdr(configured=None):
    if configured:
        return configured if os.access(configured, os.X_OK) else None
    found = shutil.which("herdr")
    if found:
        return found
    home = os.path.expanduser("~")
    for d in (".local/bin", ".cargo/bin", "bin"):
        p = os.path.join(home, d, "herdr")
        if os.access(p, os.X_OK):
            return p
    for p in ("/opt/homebrew/bin/herdr", "/usr/local/bin/herdr", "/usr/bin/herdr"):
        if os.access(p, os.X_OK):
            return p
    return None


def herdr_sessions(herdr_bin):
    """Named herdr sessions with their socket paths, via `herdr session list --json`."""
    try:
        out = subprocess.run([herdr_bin, "session", "list", "--json"],
                             capture_output=True, text=True, timeout=5)
        data = json.loads(out.stdout or "{}")
    except (OSError, ValueError, subprocess.SubprocessError):
        data = {}
    sessions = []
    for s in data.get("sessions") or []:
        sock = s.get("socket_path") or s.get("socket")
        if s.get("name") and sock:
            running = s.get("running")
            sessions.append({"name": s["name"], "socket": sock,
                             "running": bool(running) if running is not None else s.get("status") == "running"})
    if sessions:
        return sessions
    # Older CLIs: fall back to the default server's socket.
    try:
        out = subprocess.run([herdr_bin, "status", "--json"], capture_output=True, text=True, timeout=5)
        server = (json.loads(out.stdout or "{}").get("server") or {})
        if server.get("socket"):
            return [{"name": server.get("session") or "default", "socket": server["socket"],
                     "running": bool(server.get("running"))}]
    except (OSError, ValueError, subprocess.SubprocessError):
        pass
    return []


def herdr_rpc(sock_path, method, params=None, timeout=4.0):
    """One newline-delimited JSON request on herdr's local socket."""
    req_id = f"relay_{int(time.time() * 1000)}"
    payload = json.dumps({"id": req_id, "method": method, "params": params or {}}) + "\n"
    with socket.socket(socket.AF_UNIX, socket.SOCK_STREAM) as s:
        s.settimeout(timeout)
        s.connect(sock_path)
        s.sendall(payload.encode())
        buf = b""
        while True:
            chunk = s.recv(65536)
            if not chunk:
                raise ConnectionError(f"herdr closed the socket before answering {method}")
            buf += chunk
            while b"\n" in buf:
                line, buf = buf.split(b"\n", 1)
                if not line.strip():
                    continue
                msg = json.loads(line)
                if msg.get("id") != req_id:
                    continue
                if msg.get("error"):
                    raise RuntimeError(msg["error"].get("message") or f"herdr rejected {method}")
                return msg.get("result") or {}


def read_session(sess):
    """Workspaces and agents for one herdr session. Never raises."""
    out = {"name": sess["name"], "running": sess["running"], "workspaces": [], "agents": [], "error": None}
    if not sess["running"] and not os.path.exists(sess["socket"]):
        return out
    try:
        ws = herdr_rpc(sess["socket"], "workspace.list").get("workspaces") or []
        labels = {w.get("workspace_id"): w.get("label") or "" for w in ws}
        out["workspaces"] = [{"id": w.get("workspace_id"), "label": w.get("label") or "",
                              "status": w.get("agent_status") or "unknown"} for w in ws]
        for a in herdr_rpc(sess["socket"], "agent.list").get("agents") or []:
            out["agents"].append({
                "pane": a.get("pane_id"),
                "name": a.get("name") or a.get("display_agent") or a.get("agent") or "agent",
                "tool": a.get("display_agent") or a.get("agent") or "",
                "status": a.get("agent_status") or "unknown",
                "workspace": labels.get(a.get("workspace_id"), ""),
                "cwd": a.get("foreground_cwd") or a.get("cwd") or "",
                "title": a.get("terminal_title_stripped") or "",
            })
        out["running"] = True
    except (OSError, ValueError, RuntimeError, ConnectionError) as e:
        out["error"] = str(e)[:200]
    return out


# --------------------------------------------------------------- models ----

DEFAULT_MODEL_SERVERS = [
    ("ollama", "http://127.0.0.1:11434"),
    ("lmstudio", "http://127.0.0.1:1234"),
]


def _get_json(url, timeout=2.0):
    with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": f"studex-relay/{VERSION}"}),
                                timeout=timeout) as r:
        return json.loads(r.read() or b"{}")


def local_models(extra):
    """Models this computer can serve. Ollama via /api/tags; anything OpenAI-compatible via /v1/models.
    Extra servers come from STUDEX_MODEL_SERVERS="name=http://host:port,name2=http://…". Never raises."""
    servers = list(DEFAULT_MODEL_SERVERS)
    for part in (extra or "").split(","):
        if "=" in part:
            name, url = part.split("=", 1)
            servers.append((name.strip(), url.strip().rstrip("/")))
    out = []
    for name, base in servers:
        try:
            if name == "ollama":
                tags = _get_json(base + "/api/tags").get("models") or []
                models = [{"name": m.get("name"), "size_gb": round((m.get("size") or 0) / 1e9, 1),
                           "family": (m.get("details") or {}).get("family")} for m in tags]
            else:
                models = [{"name": m.get("id")} for m in _get_json(base + "/v1/models").get("data") or []]
            out.append({"server": name, "endpoint": base, "ok": True, "models": models})
        except (OSError, ValueError, urllib.error.URLError):
            if (name, base) not in DEFAULT_MODEL_SERVERS:
                out.append({"server": name, "endpoint": base, "ok": False, "models": []})
    return out


def build_report(args):
    herdr_bin = find_herdr(args.herdr_bin)
    sessions = []
    if args.socket:
        sessions = [{"name": os.path.basename(p), "socket": p, "running": True} for p in args.socket]
    elif herdr_bin:
        sessions = herdr_sessions(herdr_bin)
    return {
        "computer": args.computer,
        "hostname": socket.gethostname(),
        "advertise": os.environ.get("STUDEX_ADVERTISE_HOST") or None,
        "ts": time.time(),
        "relay": VERSION,
        "herdr": {"found": bool(herdr_bin or args.socket),
                  "sessions": [read_session(s) for s in sessions]},
        "models": local_models(os.environ.get("STUDEX_MODEL_SERVERS")),
    }


# ---------------------------------------------------------- spool + send ----

def spool_read(path):
    try:
        with open(path) as f:
            return [json.loads(l) for l in f if l.strip()]
    except (OSError, ValueError):
        return []


def spool_write(path, reports):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    tmp = path + ".tmp"
    with open(tmp, "w") as f:
        for r in reports[-SPOOL_MAX:]:
            f.write(json.dumps(r) + "\n")
    os.replace(tmp, path)
    try:
        os.chmod(path, 0o600)
    except OSError:
        pass


def post(gateway, token, reports, timeout=10):
    body = json.dumps({"reports": reports}).encode()
    req = urllib.request.Request(gateway.rstrip("/") + "/relay/report", data=body, method="POST",
                                 headers={"Content-Type": "application/json",
                                          "Authorization": f"Bearer {token}",
                                          "User-Agent": f"studex-relay/{VERSION}"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read() or b"{}")


def tick(args, token):
    report = build_report(args)
    pending = spool_read(args.spool) + [report]
    n_agents = sum(len(s["agents"]) for s in report["herdr"]["sessions"])
    if args.dry_run:
        print(json.dumps(report, indent=2))
        return True
    try:
        # Send in batches of 200 so a long offline spell replays cleanly.
        for i in range(0, len(pending), 200):
            post(args.gateway, token, pending[i:i + 200])
        if len(pending) > 1:
            log(f"back online: replayed {len(pending) - 1} queued report(s)")
        if os.path.exists(args.spool):
            os.remove(args.spool)
        log(f"reported {n_agents} agent(s) to {args.gateway}")
        return True
    except urllib.error.HTTPError as e:
        if e.code in (401, 403):
            log(f"gateway refused the token for computer '{args.computer}' (HTTP {e.code}); not queuing")
            return False
        spool_write(args.spool, pending)
        log(f"gateway error HTTP {e.code}; queued ({len(pending)} waiting)")
    except (urllib.error.URLError, OSError, TimeoutError) as e:
        spool_write(args.spool, pending)
        log(f"offline ({getattr(e, 'reason', e)}); queued ({len(pending)} waiting)")
    return True


def main():
    p = argparse.ArgumentParser(description="Report this computer's herdr agents to the Studex gateway.")
    p.add_argument("--gateway", default=os.environ.get("STUDEX_GATEWAY", "http://127.0.0.1:8787"))
    p.add_argument("--computer", default=os.environ.get("STUDEX_COMPUTER") or socket.gethostname(),
                   help="this computer's id in rooms.json, e.g. meat-desk")
    p.add_argument("--interval", type=float, default=float(os.environ.get("STUDEX_INTERVAL", "10")))
    p.add_argument("--spool", default=os.path.expanduser("~/.cache/studex-relay/spool.jsonl"))
    p.add_argument("--herdr-bin", default=os.environ.get("HERDR_BIN"))
    p.add_argument("--socket", action="append", help="read this herdr socket directly (repeatable)")
    p.add_argument("--once", action="store_true", help="send one report and exit")
    p.add_argument("--dry-run", action="store_true", help="print the report instead of sending it")
    args = p.parse_args()

    token = os.environ.get("STUDEX_RELAY_TOKEN", "")
    if not token and not args.dry_run:
        sys.exit("Set STUDEX_RELAY_TOKEN to this computer's token from the gateway.")

    log(f"studex relay {VERSION} · computer={args.computer} · gateway={args.gateway}")
    while True:
        ok = tick(args, token)
        if args.once or not ok:
            sys.exit(0 if ok else 1)
        time.sleep(max(2.0, args.interval))


if __name__ == "__main__":
    main()
