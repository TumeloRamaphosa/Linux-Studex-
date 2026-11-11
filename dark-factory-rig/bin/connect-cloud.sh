#!/bin/bash
# Connect cloud seats: provision the existing OpenRouter key (from CashClaw config)
# onto the VM for Claude Code. The key is piped, never printed.
set -euo pipefail
python3 -c "import json; k=json.load(open('$HOME/.cashclaw/cashclaw.json'))['llm']['apiKey']; assert k, 'no key'; print(k)" | \
gcloud compute ssh studex-dev-rome --zone=us-central1-a --project=gen-lang-client-0728429584 --command='
python3 -c "
import json,os,sys
key=sys.stdin.read().strip()
assert key, \"empty key received\"
p=os.path.expanduser(\"~/.claude/settings.json\")
d=json.load(open(p)) if os.path.exists(p) else {}
d.setdefault(\"env\",{}).update({
  \"ANTHROPIC_AUTH_TOKEN\": key,
  \"ANTHROPIC_BASE_URL\": \"https://openrouter.ai/api/v1\",
  \"ANTHROPIC_MODEL\": \"anthropic/claude-sonnet-4.5\"
})
json.dump(d,open(p,\"w\"),indent=2)
print(\"VM claude settings provisioned (key hidden)\")
"'
echo "Next: bounce the factory rig — rig down factory + rig up on the VM (I can do this)."
