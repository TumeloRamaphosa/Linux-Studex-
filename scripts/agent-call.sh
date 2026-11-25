#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# agent-call.sh — call StudEx agents from anywhere (cron, CI, another repo)
#
#   agent-call.sh agent     "<message>" [agent-name]
#   agent-call.sh task      "<task description>"
#   agent-call.sh send      '{"from":"hermes","to":"cursor","message":"..."}'
#   agent-call.sh broadcast "<message>"
#   agent-call.sh fact set  "<key>" "<value>" [source]
#   agent-call.sh fact get  "<key>"
#   agent-call.sh status    [agent-name]
#   agent-call.sh log
#
# Host comes from STUDEX_HOST (default http://localhost:4000).
# Exits non-zero on any HTTP error so cron jobs notice.
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

HOST="${STUDEX_HOST:-http://localhost:4000}"
TIMEOUT="${STUDEX_TIMEOUT:-30}"

die() { printf 'agent-call: %s\n' "$1" >&2; exit 2; }

# jq is used to build safe JSON. Fall back to python3 if jq is absent.
if command -v jq >/dev/null 2>&1; then
  jstr() { jq -Rn --arg v "$1" '$v'; }
elif command -v python3 >/dev/null 2>&1; then
  jstr() { python3 -c 'import json,sys; print(json.dumps(sys.argv[1]))' "$1"; }
else
  die "need jq or python3 to build JSON safely"
fi

post() { # post <path> <json-body>
  local path="$1" body="$2" tmp
  tmp="$(mktemp)"
  code="$(curl -sS --max-time "$TIMEOUT" -X POST "$HOST/api$path" \
      -H 'Content-Type: application/json' \
      -d "$body" -o "$tmp" -w '%{http_code}')" || {
        rm -f "$tmp"; die "cannot reach $HOST"; }
  cat "$tmp"; echo
  rm -f "$tmp"
  case "$code" in
    2*) return 0 ;;
    *) printf 'agent-call: HTTP %s from %s/api%s\n' "$code" "$HOST" "$path" >&2
       exit 1 ;;
  esac
}

get() { # get <path>
  local path="$1" tmp code
  tmp="$(mktemp)"
  code="$(curl -sS --max-time "$TIMEOUT" "$HOST/api$path" -o "$tmp" -w '%{http_code}')" || {
        rm -f "$tmp"; die "cannot reach $HOST"; }
  cat "$tmp"; echo
  rm -f "$tmp"
  case "$code" in
    2*) return 0 ;;
    *) printf 'agent-call: HTTP %s from %s/api%s\n' "$code" "$HOST" "$path" >&2
       exit 1 ;;
  esac
}

[ $# -ge 1 ] || die "usage: agent-call.sh <command> [args]  (see header for help)"

CMD="$1"; shift

case "$CMD" in
  agent)
    [ $# -ge 2 ] || die "agent needs a message"
    MSG="$1"; AGENT="${2:-hermes}"
    post "/agents/$AGENT/chat" "{\"message\":$(jstr "$MSG")}"
    ;;

  task)
    [ $# -ge 1 ] || die "task needs a description"
    post "/orchestrate/task" "{\"from\":\"cli\",\"task\":$(jstr "$1")}"
    ;;

  send)
    [ $# -ge 1 ] || die "send needs a JSON payload"
    post "/orchestrate/send" "$1"
    ;;

  broadcast)
    [ $# -ge 1 ] || die "broadcast needs a message"
    post "/orchestrate/broadcast" "{\"from\":\"cli\",\"message\":$(jstr "$1")}"
    ;;

  fact)
    ACTION="${1:-}"; shift || true
    case "$ACTION" in
      set)
        [ $# -ge 2 ] || die "fact set needs key and value"
        KEY="$1"; VAL="$2"; SRC="${3:-cli}"
        post "/orchestrate/blackboard" \
          "{\"key\":$(jstr "$KEY"),\"value\":$(jstr "$VAL"),\"source\":$(jstr "$SRC")}"
        ;;
      get)
        [ $# -ge 1 ] || die "fact get needs a key"
        get "/orchestrate/blackboard/$1"
        ;;
      all)
        get "/orchestrate/blackboard"
        ;;
      *) die "fact needs set|get|all" ;;
    esac
    ;;

  status)
    if [ $# -ge 1 ]; then get "/agents/$1"; else get "/status"; fi
    ;;

  agents)
    get "/agents"
    ;;

  log)
    get "/orchestrate/log"
    ;;

  health)
    get "/health"
    ;;

  -h|--help|help)
    sed -n '2,16p' "$0" | sed 's/^# \{0,1\}//'
    ;;

  *)
    die "unknown command '$CMD' (try --help)"
    ;;
esac
