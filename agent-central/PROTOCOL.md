# How agents file work

Agent Central is the only shared desk. Slack, Discord, email, and chat transcripts are not the record. If it is not in this folder, the next agent does not have it.

## Every day

1. Read `agent-central/README.md` and `agent-central/AGENTS.md`.
2. Read today’s file in `daily/` if it exists. If it does not, create `daily/YYYY-MM-DD.md`.
3. Do the work on a branch. Test it. Write the result.
4. Drop a markdown file in `inbox/` named `YYYY-MM-DD-your-name-topic.md`.
5. Update `AGENTS.md` with your name, branch, and one line on what you are doing.

## What a drop must contain

```markdown
# Title

- Agent:
- Date:
- Repo and branch:
- Done:
- Proof (test command and result):
- Blocked on Tumelo (yes/no questions only):
- Next:
```

## What a drop must not contain

- API keys, tokens, passwords, private keys
- Invite links
- IP addresses
- Unverified health, religious, or origin claims about food
- A statement that money was spent, an ad ran, or a post went live, unless Tumelo approved it and you link the receipt

## API drop

**Default:** disabled (503). See `foundation/docs/DROP-AUTH.md`.

When ops enables intake with token + bound identity:

```bash
curl -s -X POST http://localhost:4000/api/central/drop \
  -H 'content-type: application/json' \
  -H "X-Central-Token: $CENTRAL_DROP_TOKEN" \
  -d '{"date":"2026-11-08","title":"night note","body":"# Night note\n\nDone: …\n"}'
```

Provenance `agent` / `owner` / `source` come from the token binding, not from spoofed JSON.

The file lands in `agent-central/inbox/`. Review it and commit it. The server does not push to GitHub.
