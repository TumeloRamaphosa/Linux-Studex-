# VMs and the agent workplace

**Status:** the command plane runs. The virtual machines do not.

`scripts/orbit.sh --status` checks whether ports 3000–3003 are open. `--deploy` prints the plan and exits 2. It does not create a disk image. The farm (ten small workers) is marked not deployed.

The dashboard used to say “14 VMs Online” even when nothing was listening. It now says the deploy is a stub and counts the in-process agents the server actually started.

## Sell this

Sell a one-week workplace pilot. See [../OPENCLAW-PILOT.md](../OPENCLAW-PILOT.md).

## Build this later

After 31 December, one real machine image is the milestone. Not fourteen.
