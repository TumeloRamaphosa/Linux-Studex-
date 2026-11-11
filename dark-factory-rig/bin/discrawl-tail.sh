#!/bin/bash
# Discrawl live tail — keeps the Discord archive warm (launchd, KeepAlive).
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"
export DISCORD_BOT_TOKEN=$(python3 -c "import json;print(json.load(open('$HOME/.openclaw/openclaw.json'))['channels']['discord']['token'])")
exec discrawl tail
