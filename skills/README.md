# Studex Skills Library (`skills/`)

Catalogue of agent skills for Studex. **Catalogue only — nothing here installs automatically.**

- `catalogue.csv` — master spreadsheet export
- `Skills Library.md` — Obsidian index
- `notes/` — one markdown note per skill (YAML frontmatter)
- `README - How to add a skill.md` — intake process

Updated `2026-11-22` on branch `skills-update-2026-11-22`. Open a PR; do not merge without Agent Chief Lord approval.

Never store keys, tokens, invite links, or IPs in this tree.

## Update 2026-11-07

Daily sync added **20** catalogue entries (7 Anthropic Trusted, 3 Cloudflare Trusted, 6 HyperFrames Screen first, 4 Matt Pocock Screen first). Catalogue only — no installs. See `catalogue.csv` and `notes/`.

## Update 2026-11-08

Daily sync added **16** catalogue entries (4 Figma Trusted, 1 shadcn/ui Screen first, 11 Matt Pocock Screen first). Catalogue only — no installs. See `catalogue.csv`, `NEW-2026-11-08.csv` and `notes/`.

## Update 2026-11-22

Daily sync added **5** catalogue entries (supabase, playwright-cli, neon-postgres, security-and-hardening, gsap-core). Catalogue only — no installs. All five are **not yet screened** (no commit SHA pinned). See `catalogue.csv`, `NEW-2026-11-22.csv` and `notes/`. Robusca review required before any install; playwright-cli is Trusted tier in catalogue but still needs screen confirmation that install does not pull browsers/binaries.

## Update 2026-11-21

Daily sync added **9** catalogue entries (security-audit, modern-web-guidance, three `google/agents-cli` skills, Supabase, emilkowalski, taste-skill, impeccable). Five are carry-overs from the 2026-11-20 scout. Catalogue only — no installs. See `catalogue.csv`, `NEW-2026-11-21.csv` and `notes/`.

## Screen result 2026-11-21

Robusca security screen on the nine new rows. Install commands are pinned to the screened commit SHA (`@<sha>` on the GitHub URL). Nothing is installed without Agent Chief Lord's typed yes.

| Skill | Screened SHA | Verdict | Conditions |
| --- | --- | --- | --- |
| security-audit | c1c8a8c | OK | VM only |
| supabase-postgres-best-practices | c9be0e9 | OK | VM only |
| emil-design-eng | 64eb3de | OK | VM only |
| modern-web-guidance | 64a6d70 | OK with conditions | Pin npm `modern-web-guidance@1.0.1`; `DISABLE_TELEMETRY=1` |
| google-agents-cli-adk-code | 2fa159a | OK with conditions | `AGENTS_CLI_TELEMETRY=0`; VM only |
| google-agents-cli-eval | 2fa159a | OK with conditions | `AGENTS_CLI_TELEMETRY=0`; no client data in eval datasets |
| google-agents-cli-deploy | 2fa159a | HOLD | Do not install |
| design-taste-frontend | f6b7657 | throwaway VM only | Unverified author; 1,631 files; Stop hook `node gate.mjs` — review or disable |
| impeccable | b49177d | REJECTED for now | Binary download; default telemetry; vendor API uploads; agent hooks; extension `all_urls` |

If `google-agents-cli-deploy` is ever allowed: VM only, sandbox GCP project, no production credentials, owner's typed yes for every deploy, and no `terraform apply` or IAM change without yes.
