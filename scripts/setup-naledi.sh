#!/bin/bash
# =============================================================================
# Naledi Content Agent — FeedHive Setup
# =============================================================================
# Studex Group, Johannesburg SA
# Usage: bash setup-naledi.sh YOUR_FEEDHIVE_API_KEY
# =============================================================================

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
GOLD='\033[0;33m'
NC='\033[0m'

echo -e "${GOLD}"
echo "  ╔═══════════════════════════════════════════╗"
echo "  ║     Naledi · FeedHive Setup               ║"
echo "  ║     Studex Content Agent                  ║"
echo "  ╚═══════════════════════════════════════════╝"
echo -e "${NC}"

# Check API key
if [ $# -lt 1 ]; then
  echo -e "${RED}Usage: bash setup-naledi.sh YOUR_FEEDHIVE_API_KEY${NC}"
  exit 1
fi

FEEDHIVE_API_KEY="$1"

echo -e "${GREEN}[1/4]${NC} Installing FeedHive skill for OpenClaw..."
npx @feedhive/setup-openclaw "$FEEDHIVE_API_KEY"

echo -e "${GREEN}[2/4]${NC} Configuring Naledi content agent..."
curl -s -X POST http://localhost:3000/message \
  -H "Content-Type: application/json" \
  -d '{
    "message": "You are Naledi, the Studex content agent. Post daily about: founder building AI agents in SA, 10 years blockchain experience, product demos, Harari philosophy applied to AI business. Tone: confident, visionary, authentic. Always include stud.exchange link."
  }' || echo -e "${RED}Warning: Could not reach OpenClaw on port 3000${NC}"

echo -e "${GREEN}[3/4]${NC} Setting up cron for daily posting..."
(crontab -l 2>/dev/null; echo "# Naledi morning post @ 08:00 SAST"; echo "0 6 * * * curl -s http://localhost:3000/message -H 'Content-Type: application/json' -d '{\"message\":\"Naledi post daily content\"}' >> /tmp/naledi-post.log 2>&1"; echo "# Naledi afternoon post @ 15:00 SAST"; echo "0 13 * * * curl -s http://localhost:3000/message -H 'Content-Type: application/json' -d '{\"message\":\"Naledi post afternoon content\"}' >> /tmp/naledi-post.log 2>&1") | crontab -

echo -e "${GREEN}[4/4]${NC} Setup complete!"
echo ""
echo -e "${GOLD}Naledi is now active:${NC}"
echo "  • Posts daily at 08:00 and 15:00 SAST"
echo "  • Platforms: Twitter/X, LinkedIn, Instagram, Facebook"
echo "  • Content: AI in SA, blockchain, Harari philosophy"
echo "  • Link: stud.exchange"
echo ""
echo -e "${GOLD}To test:${NC}"
echo "  curl http://localhost:3000/message -H 'Content-Type: application/json'"
echo "  -d '{\"message\":\"Naledi, post today\\'s content\"}'"
