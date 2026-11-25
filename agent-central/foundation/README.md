# Agent Central — foundation layer (complementary)

**Provenance:** Cursor cloud agent run `cursor/agent-central-foundation-7328`, 8 Nov 2026.  
**Scope:** JSON schema, Notion canon pointers, work-submission records, import manifest, and governance docs.  
**Does not replace:** [PR #5](https://github.com/TumeloRamaphosa/Linux-Studex-/pull/5) (`fbd5481`) markdown data room + `/api/central` command plane on branch `cursor/agent-central-1b1c`.

## Layout

| Path | Purpose |
|------|---------|
| `schema/agent-central-v1.schema.json` | Machine-readable contract for index, lanes, submissions |
| `data/index.json` | Agent index, business lanes, Sentinel Notion canon URLs |
| `data/work-submissions.json` | Acceptance evidence + approval gates (no live numbers) |
| `data/overviews/` | Sanitized executive overviews |
| `docs/` | Permissions, sync contract, daily filing, KPI field stubs |
| `manifest/import-manifest.json` | Future vendor imports — reference only |

## Relationship to PR #5

This branch also ships **hardened** `server/lib/central-store.js` (fail-closed drop, provenance, symlink guard) and `public-static-guard.js`. PR #5 markdown assets may port after redaction; **do not merge PR #5 before** auth/PII/static fixes (`review/INTEGRATION-ORDER.md`).

PR #5 owns **markdown room + honesty copy** on its branch (`agent-central.html`, ventures, PROTOCOL). Port that content only after redaction; use **this branch’s hardened server** instead of PR #5’s unauthenticated drop/static behavior.

This folder is governance/index JSON — integrate with hardened server on `main` per `review/INTEGRATION-ORDER.md`.

Independent review: `../review/PR5-INDEPENDENT-SECURITY-REVIEW.md`.
