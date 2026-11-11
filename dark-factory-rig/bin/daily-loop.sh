#!/bin/bash
# Dark Factory daily content loop trigger (launchd).
export PATH="$HOME/.local/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"
export OPENRIG_YOLO=1
export HOME="${HOME:-/Users/tumeloramaphosa}"
RIG="$HOME/.local/bin/rig"
LOGDIR="$HOME/dark-factory-rig/logs"
mkdir -p "$LOGDIR"
{
  echo "=== daily-loop $(date) ==="
  if ! "$RIG" ps >/dev/null 2>&1; then "$RIG" start; sleep 10; fi
  if ! "$RIG" ps 2>/dev/null | grep -q "studex7.*running"; then
    "$RIG" up "$HOME/dark-factory-rig/rig.yaml"
    sleep 60
  fi
  "$RIG" send studex7-director@studex7 "Daily run (launchd): execute today's content loop per guidance/director.md — scout -> analyst -> writer -> visual+video -> publisher -> memory. Output folder: $HOME/dark-factory-rig/out/$(date +%F)/. Report status in pipeline-status.md."
} >> "$LOGDIR/daily-loop.log" 2>&1
