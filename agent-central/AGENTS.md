# Who is busy

Snapshot **8 November 2026** — complementary branch `cursor/agent-central-foundation-7328` (PR #6). Not a live queue; Sentinel owns canonical Notion project queue separately.

| Agent / run | Status | Branch | Work |
|---|---|---|---|
| Agent Central foundation (PR #6) | active | `cursor/agent-central-foundation-7328` | Hardened drop auth, foundation JSON, UI, review docs |
| Agent Central command plane (PR #5) | open | `cursor/agent-central-1b1c` | Markdown room on other branch — **do not merge until auth/PII fixed** |

## Desk map (in-process demo only)

| Name in the OS | Job on paper | What is actually running |
|---|---|---|
| Cashclaw | Money and content queue | In-process demo. No brokerage. No FeedHive call. |
| Hermes | Orchestrator | In-process demo. VMs not verified. |
| OpenHuman | Platform | In-process demo. |
| Cursor | Development | In-process demo + cloud agents. |
| Farm | Workers | Not deployed. `orbit.sh --deploy` exits 2. |

## Drop intake

Disabled by default. When enabled, requires `CENTRAL_DROP_TOKEN` (≥32 chars) and bound identity — see `foundation/docs/DROP-AUTH.md`. No multi-agent impersonation.
