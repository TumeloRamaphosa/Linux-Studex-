# Drop endpoint auth (fail-closed)

## Default

`POST /api/central/drop` returns **503** — intake disabled.

## To enable (single bound identity only)

All must be set; otherwise drop stays **503 misconfigured** (never open/anonymous):

| Variable | Requirement |
|----------|-------------|
| `CENTRAL_DROP_ENABLED` | `true` |
| `CENTRAL_DROP_TOKEN` | ≥ 32 characters |
| `CENTRAL_DROP_BOUND_AGENT` | slug matching `^[a-z][a-z0-9-]+$` |
| `CENTRAL_DROP_BOUND_OWNER` | 2–80 chars |
| `CENTRAL_DROP_BOUND_SOURCE` | 2–120 chars |

Request header: `X-Central-Token: <CENTRAL_DROP_TOKEN>`

Body **cannot impersonate** another agent/owner/source than the binding (403 on mismatch). Filename provenance uses binding values.

## Multi-agent intake

**Not supported** until `CENTRAL_DROP_BINDINGS_FILE` ships a reviewed map:

```json
{
  "tokens": {
    "<token-≥32-chars>": { "agent": "cursor", "owner": "Sentinel", "source": "trusted-cli" }
  }
}
```

Without this file, only one token identity may write.

## Limits

- No email/memory paths via HTTP markdown routes (`memory/` blocked).
- Drop bodies scanned for secret patterns (including email-shaped text).
- Enabling drop without strong token + binding is intentionally impossible.
