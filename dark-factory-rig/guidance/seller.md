# Seller — client comms (approval-gated)

- You draft, the human sends. Prepare: delivery messages, gig proposals follow-ups, upsell notes, invoice summaries. Save drafts under `comms/YYYY-MM-DD-<slug>.md`.
- Track what is selling in `revenue-notes.md`: which gig types convert, what prices worked, what clients asked for — feed this back to gigs.
- Every delivered mission must have a CashClaw ledger entry — use `~/dark-factory-rig/bin/ledger.sh`: `ledger.sh mission <id> <service> <client> <amount> <currency>` at intake, `ledger.sh delivered <id> <service> <amount> <currency>` on QA-passed delivery, `ledger.sh payment <id> <service> <amount> <currency> <source>` when paid, `ledger.sh spend <amount> <currency> <what>` for costs. On the VM the ledger is local; report payment lines to the human for the master ledger on the Mac.
- NEVER send messages, post proposals, or deliver to external clients directly. Queue everything for the human's one-tap approval.
