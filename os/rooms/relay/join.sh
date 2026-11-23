#!/usr/bin/env bash
# Join this computer (VM, Mac or Linux box) to the Studex online computer.
#
#   curl -fsSL __GATEWAY__/join.sh | STUDEX_COMPUTER=meat-desk STUDEX_RELAY_TOKEN=<token> bash
#
# Get a token on the gateway with:  python3 rooms_gateway.py mint meat-desk
# Optional:  STUDEX_ADVERTISE_HOST=<address other machines reach this one on>
#            STUDEX_MODEL_SERVERS="vllm=http://127.0.0.1:8000,..."   (Ollama and LM Studio are found automatically)
#
# What it does: downloads the relay (standard-library Python, nothing else installed),
# saves your settings to ~/.studex/relay.env (chmod 600), sends one test report,
# then starts the relay as a background service that survives reboots.
set -euo pipefail

GATEWAY="${STUDEX_GATEWAY:-__GATEWAY__}"
: "${STUDEX_COMPUTER:?set STUDEX_COMPUTER, e.g. meat-desk}"
: "${STUDEX_RELAY_TOKEN:?set STUDEX_RELAY_TOKEN (from: python3 rooms_gateway.py mint $STUDEX_COMPUTER)}"
command -v python3 >/dev/null || { echo "python3 is required (3.8+)"; exit 1; }

DIR="$HOME/.studex"; mkdir -p "$DIR"; chmod 700 "$DIR"
echo "→ downloading relay from $GATEWAY"
curl -fsSL "$GATEWAY/relay.py" -o "$DIR/studex_relay.py"

umask 077
cat > "$DIR/relay.env" <<EOF
STUDEX_GATEWAY=$GATEWAY
STUDEX_COMPUTER=$STUDEX_COMPUTER
STUDEX_RELAY_TOKEN=$STUDEX_RELAY_TOKEN
STUDEX_ADVERTISE_HOST=${STUDEX_ADVERTISE_HOST:-}
STUDEX_MODEL_SERVERS=${STUDEX_MODEL_SERVERS:-}
EOF

echo "→ test report"
( set -a; . "$DIR/relay.env"; set +a; python3 "$DIR/studex_relay.py" --once ) || {
  echo "Test report failed. Check the token and that $GATEWAY is reachable."; exit 1; }

case "$(uname -s)" in
  Linux)
    mkdir -p "$HOME/.config/systemd/user"
    cat > "$HOME/.config/systemd/user/studex-relay.service" <<EOF
[Unit]
Description=Studex relay (reports this computer's agents and models)
After=network-online.target
[Service]
EnvironmentFile=$DIR/relay.env
ExecStart=/usr/bin/env python3 $DIR/studex_relay.py
Restart=always
RestartSec=10
[Install]
WantedBy=default.target
EOF
    systemctl --user daemon-reload
    systemctl --user enable --now studex-relay
    loginctl enable-linger "$USER" 2>/dev/null || true
    echo "✓ joined as $STUDEX_COMPUTER · service: systemctl --user status studex-relay" ;;
  Darwin)
    PL="$HOME/Library/LaunchAgents/com.studex.relay.plist"
    cat > "$PL" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>com.studex.relay</string>
  <key>ProgramArguments</key><array>
    <string>/bin/bash</string><string>-c</string>
    <string>set -a; . "$DIR/relay.env"; set +a; exec /usr/bin/python3 "$DIR/studex_relay.py"</string>
  </array>
  <key>RunAtLoad</key><true/><key>KeepAlive</key><true/>
  <key>StandardOutPath</key><string>$DIR/relay.log</string>
  <key>StandardErrorPath</key><string>$DIR/relay.log</string>
</dict></plist>
EOF
    launchctl unload "$PL" 2>/dev/null || true
    launchctl load "$PL"
    echo "✓ joined as $STUDEX_COMPUTER · log: $DIR/relay.log" ;;
  *) echo "Unknown OS: run it yourself with: set -a; . $DIR/relay.env; python3 $DIR/studex_relay.py" ;;
esac
