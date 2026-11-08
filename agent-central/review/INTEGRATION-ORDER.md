# Suggested integration order (no merges performed here)

**Provenance:** `cursor/agent-central-foundation-7328`, 8 Nov 2026.

## Constraints

- Do **not** retarget/rebase/merge PR #1–#5 from this agent.
- Preserve `skills/` catalogue work across PR #2–#4 separately from Agent Central ops.
- PR #5 targets `skills-library`, not `main`.

## Recommended sequence

1. **Human decision on skills stack** — resolve or defer PR #3 (`skills-library`) before taking PR #5’s base as-is.
2. **Security blockers on PR #5** — redact PII in `agent-central/memory/grok-2026-11-08.md`; confirm no other secrets in the 25-path diff.
3. **Merge PR #5 operational slice to `main`** (human action) — `central-store.js`, routes, `agent-central.html`, markdown room, Cashclaw/orbit honesty, static allowlist.
4. **Add complementary foundation layer** — merge `agent-central/foundation/**` and `agent-central/review/**` from this branch (JSON index, Notion canons, import manifest, governance docs). No duplicate Express routes.
5. **Optional:** Link `README.md` in markdown room → `foundation/data/index.json` for machine-readable index.
6. **CI:** require `cd server && npm test` on PRs touching `central-store.js`.
7. **Later (reviewed imports only):** entries in `foundation/manifest/import-manifest.json` — none auto-installed.

## What this branch intentionally omits

- No `server/lib/central-store.js` duplicate
- No `agent-central.html` parallel UI
- No skills catalogue imports from Nov 7 branch

## Next verifiable unit

After PR #5 merges to `main`: add one integration test that asserts `GET /.git/HEAD` returns 404 while `GET /dashboard.html` returns 200 — locks the static allowlist regression.
