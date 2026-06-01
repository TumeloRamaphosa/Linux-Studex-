#!/bin/bash
# =============================================================================
# Orbit — Linux StudEx VM Deployer & Orchestrator
# =============================================================================
# Usage:
#   ./orbit --status          Show all VM statuses
#   ./orbit --deploy <vm>     Deploy a specific VM (cashclaw|hermes|openhuman|cursor|all)
#   ./orbit --stop <vm>       Stop a VM
#   ./orbit --ssh <vm>        SSH into a VM
#   ./orbit --logs <vm>       Tail VM logs
# =============================================================================

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
GOLD='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# VM configurations
declare -A VM_PORTS=(
  ["cashclaw"]=3000
  ["hermes"]=3001
  ["openhuman"]=3002
  ["cursor"]=3003
)
declare -A VM_SIZES=(
  ["cashclaw"]="20GB"
  ["hermes"]="20GB"
  ["openhuman"]="20GB"
  ["cursor"]="20GB"
)

show_status() {
  echo -e "${GOLD}╔═══════════════════════════════════════════╗${NC}"
  echo -e "${GOLD}║  Linux StudEx — Agent VM Status           ║${NC}"
  echo -e "${GOLD}╚═══════════════════════════════════════════╝${NC}"
  echo ""

  for vm in cashclaw hermes openhuman cursor; do
    port=${VM_PORTS[$vm]}
    size=${VM_SIZES[$vm]}
    if lsof -i :$port >/dev/null 2>&1; then
      echo -e "  ${GREEN}●${NC} RVS_${vm^^}  Online    ${size}    :${port}"
    else
      echo -e "  ${RED}○${NC} RVS_${vm^^}  Offline   ${size}    :${port}"
    fi
  done

  echo ""
  echo -e "  ${BLUE}◌${NC} RVS05-14  Agent Farm 5GB×10   (not yet deployed)"
  echo ""
}

deploy_vm() {
  local vm=$1
  local port=${VM_PORTS[$vm]:-3000}
  local size=${VM_SIZES[$vm]:-"5GB"}

  echo -e "${GOLD}Deploying RVS_${vm^^} (${size}) on port ${port}...${NC}"

  # TODO: Implement actual QEMU/UTM deployment
  # Next milestone: replace these stubs with real:
  #   - qemu-img create -f qcow2 ./images/${vm}.qcow2 ${size}
  #   - qemu-system-x86_64 -m 4G -hda ./images/${vm}.qcow2 ...
  #   - UTM CLI: utmctl create --name ${vm} --arch arm64 --memory 4096 ...
  #   - OrbStack: orb create --name ${vm} --cpus 2 --memory 4GB
  echo -e "${GREEN}  ✓${NC} VM image created (stub)"
  echo -e "${GREEN}  ✓${NC} QEMU instance started on port ${port} (stub)"
  echo -e "${GREEN}  ✓${NC} OpenClaw gateway configured (stub)"
  echo -e "${GREEN}  ✓${NC} Ollama model loaded (stub)"
  echo -e "${GREEN}  ✓${NC} n8n workflows synced (stub)"
  echo -e "${GREEN}  ✓${NC} Obsidian logging enabled (stub)"
  echo ""
  echo -e "${GOLD}RVS_${vm^^} is online! (stub)${NC}"
}

ssh_vm() {
  local vm=$1
  local port=${VM_PORTS[$vm]:-3000}
  echo "SSH into RVS_${vm^^}..."
  ssh -p "$port" "agent@localhost"
}

case "${1:-}" in
  --status|-s)
    show_status
    ;;
  --deploy|-d)
    if [ -z "${2:-}" ]; then
      echo "Usage: $0 --deploy <vm>"
      echo "VMs: cashclaw, hermes, openhuman, cursor, all"
      exit 1
    fi
    if [ "$2" = "all" ]; then
      for vm in cashclaw hermes openhuman cursor; do
        deploy_vm "$vm"
      done
    else
      deploy_vm "$2"
    fi
    ;;
  --ssh)
    ssh_vm "${2:-}"
    ;;
  --logs|-l)
    local vm="${2:-}"
    if [ -n "$vm" ]; then
      tail -f "/var/log/studex/$vm.log" 2>/dev/null || echo "No logs for $vm yet"
    else
      tail -f /var/log/studex/*.log 2>/dev/null || echo "No logs yet"
    fi
    ;;
  --help|-h)
    echo "Orbit — Linux StudEx VM Orchestrator"
    echo ""
    echo "Commands:"
    echo "  --status          Show all VM statuses"
    echo "  --deploy <vm>     Deploy a VM (cashclaw|hermes|openhuman|cursor|all)"
    echo "  --stop <vm>       Stop a VM"
    echo "  --ssh <vm>        SSH into a VM"
    echo "  --logs [vm]       Tail VM logs"
    ;;
  *)
    show_status
    ;;
esac
