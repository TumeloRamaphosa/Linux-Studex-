# CRM and calling integration into Linux StudEx

The existing OS dashboard now embeds a scoped CRM/calling workspace. See [server/coms/README.md](server/coms/README.md) for the source-backed controls, security changes, tests and remaining adapter gates.

Run the dependency-free OS review host with `npm run preview:coms` from `server/`. Onboarding/tasks/mock calls are local review staging; StudBud remains authoritative and linked. HERMES/Jarvis are fixed scoped server adapters, blocked without verified contracts and secure credentials. No real calls or canonical record writes are enabled.

The separate [browser Talk module](apps/darkdesk-talk/README.md) remains a consent/media demo, not PSTN or a live voice connection. This review changes the dashboard, server entrypoint and sandbox boundary proportionately; it starts no fleet, wallet, broad model scan, public deployment or auto-push routine. Review branch only; do not merge or release without the intended review.
