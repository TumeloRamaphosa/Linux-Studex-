# Redaction & migration recommendations (PR #5)

**Provenance:** complementary review branch — no changes applied to PR #5 head.

## PII in committed markdown (PR #5)

- **File:** `agent-central/memory/grok-2026-11-08.md` (on PR #5 only)
- **Issue:** Contains a personal mailbox address and cloud-run URL in committed history.
- **Action:** Human-authored follow-up on PR #5 branch: redact mailbox to `[redacted]`, keep policy text, do **not** rewrite unrelated history without authorization.
- **Prevention:** Use hardened `assertClean` (includes email pattern) for API drops; add local/CI secret scan on `agent-central/**`.

## Auth / drop endpoint (PR #5 vs this branch)

- PR #5: open `POST /api/central/drop` without env gate.
- This branch: fail-closed unless `CENTRAL_DROP_ENABLED=true`; optional `CENTRAL_DROP_TOKEN` + `X-Central-Token`.
- **Migration:** When integrating, prefer **this branch’s** `server/lib/central-store.js`, `server/routes/central.js`, and `server/lib/public-static-guard.js` over PR #5 server files; keep PR #5 markdown room content after redaction.

## Static hosting

- `main` @ pre-patch: `express.static` exposed `.git/HEAD` (verified 200 in prior run).
- Prefer allowlist middleware from this branch before any production exposure.

## Do not

- Delete another agent’s inbox drops without owner approval.
- Rebase or retarget PR #5 from this agent.
- Copy internal memory files into the repo.
