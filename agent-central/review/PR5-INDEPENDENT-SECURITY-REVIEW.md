# Independent security & test review — PR #5

| Field | Value |
|-------|--------|
| **Reviewer provenance** | Cursor cloud agent, branch `cursor/agent-central-foundation-7328`, 8 Nov 2026 |
| **Target PR** | [PR #5 — Open Agent Central on the command plane](https://github.com/TumeloRamaphosa/Linux-Studex-/pull/5) |
| **PR head SHA** | `fbd5481f56a8ac2ebe625345113bf5784c655973` |
| **PR base** | `skills-library` @ `418462d` (not `main`; stacks on unmerged PR #3 skills catalogue) |
| **Main SHA reviewed for contrast** | `37dc5b5d82c2ee086d4fd3b11b15c6d327792773` |

No retarget, rebase, merge, deploy, email, or messaging was performed in this review run.

## Summary verdict

| Area | Result |
|------|--------|
| Path traversal / data-room confinement | **Pass** for tested paths (see probes) |
| Dotfile listing in room index | **Pass** (`listMarkdown` skips `.*`) |
| `.git` static exposure | **Pass on PR head**; **Fail on `main`** today |
| Inbox `dropReport` validation | **Partial** — secrets/size/overwrite guarded; no auth; no email-pattern guard |
| Cashclaw no-trade / no-publish | **Pass** on PR diff |
| VM deploy honesty (`orbit.sh`) | **Pass** — stub exits 2, red messaging |
| Author “5 tests” claim | **Verified** — 5/5 pass (commands below) |
| Canonical Notion links (Sentinel) | **Missing in PR #5** markdown room; present in `foundation/data/index.json` (this branch) |
| Safe data classification in committed drops | **Fail** — PII email in `memory/grok-2026-11-08.md` |
| “Hourly review armed” vs live polling | **Documentation only** in PR #5 daily file — not an implemented in-app sync (do not treat as cron) |

## Reproducible tests (PR head)

```bash
git fetch origin pull/5/head:pr-5-review
git checkout pr-5-review
cd server && npm install && npm test
```

**Observed (this run):** `5` tests, `5` pass, `0` fail, duration ~55ms.

## HTTP probes (PR head, local)

Prerequisites: checkout `pr-5-review`, `cd server && npm install && node index.js` (port 4000).

```bash
# .git not served (PR head)
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:4000/.git/HEAD
# → 404

# Whitelisted dashboard
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:4000/dashboard.html
# → 200

# Markdown room read
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:4000/agent-central/README.md
# → 200

# API traversal rejected
curl -s -o /dev/null -w "%{http_code}\n" "http://127.0.0.1:4000/api/central/file?path=..%2F..%2Fserver%2Findex.js"
# → 400

# Clean drop
curl -s -X POST http://127.0.0.1:4000/api/central/drop \
  -H 'content-type: application/json' \
  -d '{"agent":"audit","title":"probe","body":"# ok\n\nsafe\n"}'
# → 201 {"path":"inbox/2026-11-08-audit-probe.md",...}
```

## Contrast probe (`main` @ `37dc5b5`)

```bash
cd server && npm install && PORT=4001 node index.js &
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:4001/.git/HEAD
# → 200  (entire repo root was statically served)
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:4001/auto-push.sh
# → 200
```

**Finding:** PR #5’s `PUBLIC_FILES` allowlist and removal of blanket `express.static('..')` is a **material security improvement** over `main`.

## Code review notes

### `server/lib/central-store.js`

- `resolveMarkdown`: rejects `..`, null bytes, non-`.md` paths; resolves under `CENTRAL_ROOT` — sound for normal inputs.
- `assertClean`: blocks common token shapes, Discord/Slack invites, IPv4 — **does not** block email addresses (see data issue below).
- `dropReport`: 100k cap, `wx` flag (no overwrite), `assertClean` on body + agent/title — good.
- **Gap:** `POST /api/central/drop` is unauthenticated; acceptable for local dev, not production without auth/rate limits.
- **Gap:** Symlink escape if an attacker could place a symlink inside `agent-central/` on disk (unlikely in git-only workflow).

### `server/index.js`

- `/agent-central/*` uses `resolveMarkdown` before `sendFile` — consistent with API.
- `PUBLIC_FILES` = `{dashboard.html, agent-central.html, hero-bg.png}` only — verified.

### `server/agents/cashclaw.js`

- Close/sell paths return “No order sent” / demo book messaging — verified.
- Publish path returns “Not sent… does not call FeedHive” — verified.

### `scripts/orbit.sh`

- Deploy stub prints failure state and `return 2`; `--deploy all` uses `|| true` then `exit 2` — does not claim VMs online.

### Freshness / owner / source labels

- `PROTOCOL.md` requires Agent, Date, Repo/branch in **manual** drop template — not enforced in code.
- `dropReport` filenames encode date + slugs only — no automatic owner/source metadata file.
- `AGENTS.md` is a dated human snapshot — good practice, not machine-validated.

### Canonical Notion (Sentinel)

PR #5 markdown room does **not** record:

- Projects `https://app.notion.com/p/e9a5ca9fbd6041c9920f4982bb64864d`
- Work Submissions `https://app.notion.com/p/1e6946f49232443f83819e66031089d3`
- Fleet Wiki `https://app.notion.com/p/3a03ef07399281a5b7e3f8cd77ba4d47`

Complementary addition: `agent-central/foundation/data/index.json` on this branch (includes Sentinel canons + Robusca business plan evidence index `4123ef073992811a9c3dc01e9222ca71` — pointer only, no Notion API sync).

### Classification / PII

`agent-central/memory/grok-2026-11-08.md` on PR head includes a **mailbox address** and cloud run URL. Room rules say “public repo” but `assertClean` does not scan committed files at rest — only API drops. **Recommend redaction on PR #5 before merge**, not replication here.

### PR scope collision

PR #5 diff includes the full `skills/` tree (same overlap as PR #2–#4). **Do not blind-merge** skills catalogue with Agent Central operational changes.

## Incomplete gates (human)

1. PR #5 base branch dependency (PR #3 / `skills-library`) unresolved.
2. Human approval on KPI / commercial claims (`KPI.md` still mostly “not on file”).
3. PII redaction in `memory/grok-2026-11-08.md`.
4. Production auth for `/api/central/drop`.
5. Merge strategy: land PR #5 command plane on `main` first, then fold `foundation/` JSON layer.
6. Parent weekday hourly routine (saved outside repo) ≠ implemented polling — do not wire without explicit design.

## Email / messaging

Author PR text references night reports; **this review run sent no email** and must not replicate messaging.
