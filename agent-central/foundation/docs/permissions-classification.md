# Permissions & classification

Agent Central stores **safe, non-sensitive project summaries** only.

## Classification levels

| Level | Meaning | In this repo |
|-------|---------|--------------|
| `public-internal-summary` | OK for repo + PR review; no secrets | Default for `agent-central/data/**` |
| `reference-only` | External links or vendor names for later evaluation | `manifest/import-manifest.json` |
| `restricted-not-in-repo` | Must never be committed | Credentials, KYC, customer data, raw transcripts, memory dumps, internal IPs |

## Access expectations

- **Read**: anyone with repo access may read Agent Central JSON and APIs.
- **Write**: humans via reviewed PR only; no agent auto-write to production Notion or external systems in this slice.
- **API**: read-only routes under `/api/agent-central/*`; no POST that mutates canonical data in v1.

## Agent / human KPI data

- KPI **field names** are documented in `kpi-fields.md`.
- **Verified** metrics must cite evidence items on work submissions (`acceptanceEvidence`).
- **Target** values may be listed only when explicitly labeled `target-unverified` in review notes — never as live telemetry.
