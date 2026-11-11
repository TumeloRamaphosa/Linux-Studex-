# Integration order (security-first)

**Provenance:** `cursor/agent-central-foundation-7328`. **No merges performed.**

## Base divergence

| Branch | Base | Implication |
|--------|------|-------------|
| PR #5 | `skills-library` | Includes large `skills/` delta; not safe to merge to `main` without skills decision |
| PR #6 (this work) | `main` | Hardened server + `foundation/`; no skills import |

**Compatible approach:** cherry-pick or manual merge of **markdown room + honesty copy** from PR #5 onto `main` **after** security fixes; replace PR #5 server modules with **this branch’s** hardened `central-store`, `public-static-guard`, and `index.js` static policy.

## Sequence (do not merge PR #5 before step 3)

1. **Redact PR #5 committed PII** — see `REDACTION-MIGRATION-PR5.md` (human on PR #5 branch).
2. **Land security patch on `main`** — from this branch: fail-closed drop, provenance fields, symlink/traversal tests, static allowlist (PR #6).
3. **Selectively port PR #5 non-server assets** — `agent-central.html`, ventures, PROTOCOL, KPI (review for claims), Cashclaw/orbit honesty — **without** PR #5’s unauthenticated drop or open static root.
4. **Merge `agent-central/foundation/**`** — JSON index, Notion pointers (including Robusca business plan index audited URL).
5. **Skills PRs #1–#4** — separate track; never bundle with Agent Central security release.
6. **Production gate** — enable drops only with `CENTRAL_DROP_ENABLED=true` + token; document in runbook.

## Explicit non-goals

- Merging PR #5 as-is before auth/PII/static fixes
- Treating unit tests as VM/runtime health
- Aikido “full pass” without authenticated scan

## Next verifiable unit after this PR

Human: redact PR #5 memory file → re-run local `secret-scan-local.mjs` + `npm test` on integrated `main`.
