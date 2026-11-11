#!/bin/bash
# Dark Factory boot sequence (launchd RunAtLoad): daemon + restore last-running rigs.
export PATH="$HOME/.local/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"
export OPENRIG_YOLO=1
export HOME="${HOME:-/Users/tumeloramaphosa}"
LOGDIR="$HOME/dark-factory-rig/logs"
mkdir -p "$LOGDIR"
{
  echo "=== boot $(date) ==="
  rig daemon start --no-kernel
  sleep 8
  rig start
  rig ps | head -5
} >> "$LOGDIR/boot.log" 2>&1
