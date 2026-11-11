#!/bin/bash
# Dark Factory morning brief (launchd): writes a dated brief file.
export PATH="$HOME/.local/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"
export HOME="${HOME:-/Users/tumeloramaphosa}"
BRIEFDIR="$HOME/dark-factory-rig/out/briefs"
REPORTDIR="$HOME/Documents/Obsidian Vault/50-Marketing-Fleet/05-Reports"
mkdir -p "$BRIEFDIR" "$REPORTDIR"
"$HOME/dark-factory-rig/bin/fleet-status.sh" > "$BRIEFDIR/$(date +%F).md" 2>&1
cp "$BRIEFDIR/$(date +%F).md" "$REPORTDIR/$(date +%F)-fleet-report.md"
