# Sync contract (v1)

Bounded, manual, one-way alignment between repo Agent Central and external systems.

## Principles

1. **Repo is the tested source** for this vertical slice (`agent-central/data/**`).
2. **Notion canons** (Sentinel-owned) are **link targets**, not live mirrors:
   - [Projects](https://app.notion.com/p/e9a5ca9fbd6041c9920f4982bb64864d)
   - [Work Submissions](https://app.notion.com/p/1e6946f49232443f83819e66031089d3)
   - [Fleet Wiki](https://app.notion.com/p/3a03ef07399281a5b7e3f8cd77ba4d47)
   - [Business plan evidence index](https://app.notion.com/p/4123ef073992811a9c3dc01e9222ca71) (Robusca — pointer only)
3. **No bulk import**, no scheduled sync jobs, no new vendor installs from reference manifest without human review.

## Stable IDs & dedupe

| Entity | ID pattern | Dedupe rule |
|--------|------------|-------------|
| Agent | `^[a-z][a-z0-9-]{1,62}$` | Unique in `index.json` |
| Work submission | `ws-<slug>` | Unique in `work-submissions.json` |
| Data room link | `<agent-id>-<slug>` | Unique per agent detail file |
| Evidence item | `ev-<slug>` | Unique per work submission |

Updates **replace by ID**; do not fork duplicate IDs across files.

## Direction of truth

```
Human-reviewed PR  →  agent-central/data/*.json  →  GET /api/agent-central/*
                              ↓ (future, reviewed)
                     Notion Work Submissions (manual export/import only)
```

## Status vocabulary

All records use one of: `historical`, `unverified`, `blocked`, `tested`.

- `tested`: covered by reproducible check in repo (e.g. `npm test`).
- `unverified`: claimed path or integration not validated in CI.
- `blocked`: known dependency or approval missing.
- `historical`: describes past/simulated demo data, not live ops.
