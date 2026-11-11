#!/bin/bash
# Dark Factory money loop — append events to the CashClaw ledger.
# Usage:
#   ledger.sh mission <mission_id> <service> <client> <amount> <currency>
#   ledger.sh delivered <mission_id> <service> <amount> <currency>
#   ledger.sh payment <mission_id> <service> <amount> <currency> <source>
#   ledger.sh spend <amount> <currency> <what>
set -euo pipefail
LEDGER="$HOME/.cashclaw/ledger.jsonl"
EARNINGS="$HOME/.cashclaw/earnings.jsonl"
TS=$(date +%Y-%m-%dT%H:%M:%S%z)
event="${1:?usage: ledger.sh mission|delivered|payment|spend ...}"

json_line() { python3 -c 'import json,sys; print(json.dumps(dict(pairs for pairs in zip(sys.argv[1::2], sys.argv[2::2]))))' "$@"; }

case "$event" in
  mission)
    mid="${2:?}"; svc="${3:?}"; client="${4:?}"; amount="${5:?}"; cur="${6:-usd}"
    json_line ts "$TS" event mission_created mission_id "$mid" service "$svc" client "$client" amount "$amount" currency "$cur" >> "$LEDGER"
    ;;
  delivered)
    mid="${2:?}"; svc="${3:?}"; amount="${4:?}"; cur="${5:-usd}"
    json_line ts "$TS" event mission_delivered mission_id "$mid" service "$svc" amount "$amount" currency "$cur" >> "$LEDGER"
    ;;
  payment)
    mid="${2:?}"; svc="${3:?}"; amount="${4:?}"; cur="${5:-usd}"; source="${6:-unknown}"
    line=$(json_line ts "$TS" event payment_received mission_id "$mid" service "$svc" amount "$amount" currency "$cur" source "$source")
    echo "$line" >> "$LEDGER"
    echo "$line" >> "$EARNINGS"
    ;;
  spend)
    amount="${2:?}"; cur="${3:-usd}"; what="${4:?}"
    json_line ts "$TS" event spend_recorded amount "$amount" currency "$cur" what "$what" >> "$LEDGER"
    ;;
  *) echo "unknown event: $event" >&2; exit 1 ;;
esac
echo "ledger: $event recorded"
