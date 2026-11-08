# Proposed human–agent KPI fields (v1)

Use on work submissions and per-agent `kpiReview` stubs. **Do not invent live numbers.**

## Human review

| Field | Type | Notes |
|-------|------|-------|
| `humanReviewRequired` | boolean | true until approval gate satisfied |
| `humanReviewerRole` | string | e.g. `Sentinel`, `founder` |
| `approvalGate.state` | enum | `pending` \| `approved` \| `rejected` \| `not-applicable` |

## Agent / run metrics (verified vs target)

| Field | Verified when | Target-only label |
|-------|---------------|-------------------|
| `tasks_completed_count` | Linked `acceptanceEvidence` with `kind: test-run` or `manual-review` | `target-unverified` in notes |
| `submissions_passing_acceptance` | Count of submissions with `approvalGate.state: approved` | — |
| `evidence_items_tested` | Count of evidence with `status: tested` | — |
| `blocked_items_count` | Count of `status: blocked` on lane or agent | — |
| `repo_test_pass_rate` | From CI log artifact path in evidence | Not stored as a number without artifact |

## Business lanes (meat, coffee, Stud-Bot, gaming)

| Field | Purpose |
|-------|---------|
| `lane.priorityNote` | Qualitative priority; no revenue figures without evidence |
| `lane.status` | `unverified` until external sales telemetry is reviewed and imported via manifest |

No fabricated agents, revenue, or live telemetry in this foundation slice.
