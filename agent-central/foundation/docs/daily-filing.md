# Daily filing

How per-agent work is filed for human–agent KPI review without importing sensitive content.

## In-repo (this OS)

| Pattern | Content | Classification |
|---------|---------|----------------|
| `server/logs/<agent>/YYYY-MM-DD.md` | Demo-style activity logs | `historical` — do not bulk-export to Agent Central bodies |
| `agent-central/data/agents/<id>.json` | Data-room **index** (paths/links only) | `public-internal-summary` |

## Documented off-repo (unverified in CI)

| Pattern | Status |
|---------|--------|
| Obsidian `Agent-Logs/{agent-name}/YYYY-MM-DD.md` (per root README) | `unverified` — path convention only |
| Linear issue links | `unverified` — not wired in v1 |

Agent Central lists **pointers**, not log bodies. Evidence for submissions references test output, schemas, or PR paths — never raw chat transcripts.
