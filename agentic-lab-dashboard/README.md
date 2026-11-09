# Agentic Lab Control Room

Dashboard for the Agentic Lab Lead Engine (Studex Group): lead pipeline, stack health and
Guard spend in one view. Built with Next.js 14 and Tailwind (both free and open source).

## What it shows

- KPIs against the 90-day PRD targets (leads, cost per lead, reply rate, deals, human hours)
- Pipeline funnel across the 10 stages (Sourced to Closed Won / Lost)
- Top leads ranked by the scoring matrix in the PRD
- Stack health for DenchClaw, Paperclip, Picoclaw, MCPJungle, MiroFish and Ollama
- CashClaw Guard daily spend, caps, killed loops and blocked tools

## Run it

```bash
npm install
cp .env.example .env.local
npm run dev        # http://localhost:3300
```

Needs Node 18.17+ (Node 22 recommended). It starts on **sample data** so it works on day one.

## Go live

Set `DATA_SOURCE` in `.env.local`:

| Value | Reads from |
| --- | --- |
| `sample` | Built-in demo data (default) |
| `denchclaw` | `DENCHCLAW_URL/api/leads` (adjust the adapter in `lib/data.ts` to DenchClaw's real endpoint) |
| `sheets-csv` | A Google Sheet published to the web as CSV (`SHEETS_CSV_URL`) |

If a live source fails, the page falls back to sample data and says so at the top.

## Notes

- Health checks run server-side, so run this on the same network as your services (the Mac Mini).
  A cloud deploy such as Vercel cannot reach `localhost` or `192.168.x.x`.
- Never commit `.env.local`. Keys belong in environment variables only.
- Port 3300 is used so it does not collide with Paperclip (3100) or DenchClaw (3200).

## Roadmap

- Google Maps density layer by area
- MiroFish prediction panel
- Weekly export to Google Sheets
