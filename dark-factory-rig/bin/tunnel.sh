#!/bin/bash
# Dark Factory remote access tunnel (launchd, KeepAlive).
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"
exec cloudflared tunnel --url http://127.0.0.1:7433 --no-autoupdate
