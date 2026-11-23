# Studex Company Rooms

Every company gets its own **room** and its own **computer**. Every CLI agent (Claude Code, Codex,
Hermes, Grok, OpenCode, Gemini…) running in herdr on any computer, cloud or local, shows up in
its company's room as working, blocked, idle, done or offline.

```
 meat-desk (cloud)      markets-desk (cloud)    factory-desk (cloud)    coffee-desk / MacBook (local)
 herdr + agents         herdr + agents          herdr + agents          herdr + agents
 studex_relay.py        studex_relay.py         studex_relay.py         studex_relay.py
        \___________________ │ ______________________│______________________/
                     HTTPS + one token per computer (offline → queued on disk)
                                      │
                       rooms_gateway.py  (FastMCP, on the GCP box)
                       ├─ GET /        web rooms page (phone + desktop)
                       ├─ GET /rooms   JSON → web page + Obsidian (obsidian-herdr fork)
                       └─ /mcp         rooms_list · room_get · agent_find  → any agent
```

## The plan

| Phase | What | Where |
|---|---|---|
| 1 · Rooms | Four rooms in `rooms.json`: Meat, Global Markets, Super Agents / Dark Factory, Coffee | done |
| 2 · Gateway | `gateway/rooms_gateway.py` on the GCP box behind HTTPS | GCP |
| 3 · Computers | One computer per room, each running herdr + `relay/studex_relay.py` | each desk |
| 4 · Web view | `web/index.html`, served by the gateway at `/` | any device |
| 5 · Obsidian view | Rooms view in the `obsidian-herdr` fork, reading `/rooms` | your vault |
| 6 · Merge into the OS | Fold these tools into the main Studex OS FastMCP gateway (same tokens, Postgres audit) | GCP |

### One computer per room

| Room | Computer id | Machine | Status |
|---|---|---|---|
| Studex Meat | `meat-desk` | Orgo Auto-Meat | assign |
| Studex Global Markets | `markets-desk` | Orgo Global Markets (2 CPU / 16 GB) | assign |
| Super Agents / Dark Factory | `factory-desk` | Orgo Super Agents Command | assign |
| Studex Coffee | `coffee-desk` | none yet | needs a machine |

Options for a room's computer, free first:
- **A machine you own** (MacBook, the Windows PC, a spare box): free, works offline, reports when it reconnects.
- **GCP e2-small / e2-medium**: roughly US$13–25 a month (check current pricing); the free tier e2-micro is too small for several agents.
- **Orgo cloud desktops**: what the desks above already use.
- **Hetzner CX22**: roughly €4–5 a month, usually the cheapest paid cloud option (check current pricing).

An agent lands in a room by, in order: its **herdr workspace name** (`meat`, `markets`, `coffee`, `factory`…),
then the **computer** it runs on, then its **agent name**. Anything unmatched shows under *Not in a room yet*.
Edit `rooms.json` to change any of it; the gateway rereads it on every request.

## Run the gateway (GCP box)

```bash
pip install -r gateway/requirements.txt
export STUDEX_RELAY_TOKENS="meat-desk:$(openssl rand -hex 24),markets-desk:$(openssl rand -hex 24),factory-desk:$(openssl rand -hex 24),coffee-desk:$(openssl rand -hex 24)"
export STUDEX_VIEW_TOKEN="$(openssl rand -hex 16)"     # optional: protects the page and /rooms
python3 gateway/rooms_gateway.py                         # listens on :8787
```

Put it behind HTTPS (Caddy, a Cloudflare Tunnel, or your existing gateway's proxy). Keep the tokens in a
secret store, not in this repo.

## Run a relay (each computer)

```bash
curl -O https://raw.githubusercontent.com/TumeloRamaphosa/Portable-agents/main/rooms/relay/studex_relay.py
export STUDEX_GATEWAY=https://<your-gateway>
export STUDEX_COMPUTER=meat-desk
export STUDEX_RELAY_TOKEN=<this computer's token>
python3 studex_relay.py            # add --dry-run first to see what it will send
```

Needs Python 3.8+ and herdr 0.8+. No other installs. To keep it running, use `relay/studex-relay.service`
(Linux) or `relay/com.studex.relay.plist` (macOS).

**Offline computers:** when the gateway can't be reached, reports queue in `~/.cache/studex-relay/spool.jsonl`
(up to about 5.5 hours) and replay in order when the connection is back. The room shows the computer as
offline with each agent's last known status until then.

## Promo reels

A room can carry a short promo video: add a `reel` to it in `rooms.json` (`src`, `poster`, `title`, `sound`,
`vertical`) and put the file in `web/media/`. It plays muted on a loop at the top of the room, with a sound
button when the clip has audio. Current reels: Coffee (tiger pour), Super Agents (StudBot presenter),
Global Markets (Business Ghosts hall). Keep files under ~2 MB: `ffmpeg -i in.mp4 -vf scale='min(1280,iw)':-2 -c:v libx264 -preset veryfast -crf 26 -movflags +faststart out.mp4`.

## Agents asking about rooms (MCP)

Point any MCP client at `https://<your-gateway>/mcp`:

- `rooms_list`: every room, its computer, counts by status
- `room_get(room_id)`: one room in full
- `agent_find(name)`: where an agent is and what it's doing

## What the relay sends

Agent name, tool, status, herdr workspace name, working folder and terminal title. No terminal contents,
no files, no keys. Each computer can only report as itself (its token is tied to its computer id).
