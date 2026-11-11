#!/bin/bash
# Dark Factory fleet status — one page for the morning brief.
set -uo pipefail
echo "=== DARK FACTORY STATUS $(date '+%Y-%m-%d %H:%M %Z') ==="
echo
echo "--- Mac rig (StudEx-7) ---"
rig ps 2>&1 | head -6
echo
echo "--- VM rig (factory) ---"
timeout 30 gcloud compute ssh studex-dev-rome --zone=us-central1-a --project=gen-lang-client-0728429584 --command="rig ps 2>&1 | head -6" 2>&1 | tail -6 || echo "VM unreachable"
echo
echo "--- Latest content output ---"
latest=$(ls -d "$HOME"/dark-factory-rig/out/*/ 2>/dev/null | tail -1)
if [ -n "$latest" ]; then echo "$latest"; ls "$latest"; else echo "no content runs yet"; fi
echo
echo "--- Money (CashClaw ledger) ---"
if [ -s "$HOME/.cashclaw/earnings.jsonl" ]; then
  python3 -c '
import json,sys
total={}
for line in open("'"$HOME"'/.cashclaw/earnings.jsonl"):
    try: e=json.loads(line)
    except: continue
    if e.get("event")=="payment_received":
        cur=e.get("currency","usd"); total[cur]=total.get(cur,0)+float(e.get("amount",0))
print("earnings total:", total if total else "none recorded")
'
  tail -3 "$HOME/.cashclaw/earnings.jsonl"
else
  echo "no earnings recorded yet"
fi
echo
echo "--- Recent ledger events ---"
tail -4 "$HOME/.cashclaw/ledger.jsonl" 2>/dev/null || echo "no ledger"
