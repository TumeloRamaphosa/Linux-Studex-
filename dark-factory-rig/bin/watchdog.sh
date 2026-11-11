#!/bin/bash
# Dark Factory watchdog (launchd): restart stopped rigs on Mac + VM.
export PATH="$HOME/.local/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"
export OPENRIG_YOLO=1
export HOME="${HOME:-/Users/tumeloramaphosa}"
RIG="$HOME/.local/bin/rig"
LOGDIR="$HOME/dark-factory-rig/logs"
mkdir -p "$LOGDIR"
{
  echo "=== watchdog $(date) ==="
  if ! "$RIG" ps >/dev/null 2>&1; then echo "daemon down -> rig start"; "$RIG" start; sleep 10; fi
  if ! "$RIG" ps 2>/dev/null | grep -q "studex7.*running"; then
    echo "studex7 not running -> rig up"
    "$RIG" up "$HOME/dark-factory-rig/rig.yaml"
  fi
  timeout 45 gcloud compute ssh studex-dev-rome --zone=us-central1-a --project=gen-lang-client-0728429584 --command='
    export PATH="$HOME/.local/bin:/usr/local/bin:/usr/bin:/bin"
    if ! rig ps >/dev/null 2>&1; then rig daemon start --no-kernel; sleep 8; fi
    if ! rig ps 2>/dev/null | grep -q "factory.*running"; then
      rig up "$HOME/dark-factory-rig/factory/rig.yaml"
    fi
    rig ps | head -4
  ' || echo "VM unreachable"
} >> "$LOGDIR/watchdog.log" 2>&1
