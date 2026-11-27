# README — How to add a skill

**Studex Skills Library** — intake process for agent skills and MCP configs.

This library is a **catalogue only**. It does **not** install skills onto any machine. Linking into an Obsidian vault is fine; installing always needs the owner's explicit yes.

## Principles

1. **Propose** — anyone can suggest a skill (name, source repo, install command, category, purpose).
2. **Robusca screens** — Robusca (or the reviewing agent) checks the GitHub repo: exists?, stars, last push, license, and whether install scripts / postinstall hooks run arbitrary code.
3. **Add to the catalogue** — update `Studex Skills Library - Catalogue` (Sheet/CSV) and add an Obsidian note under `notes/`.
4. **Install only after the owner's yes** — never run `npx skills add`, `npm install`, or `git clone` into a live skills path without explicit owner approval for that specific skill.
5. **Never store keys in the library** — MCP configs use placeholders only (`YOUR_TOKEN`, `YOUR-API-KEY`). No Slack invite links, no real tokens, no IPs, no session cookies.

## Tiers

| Tier | Meaning |
| --- | --- |
| **Trusted** | Known-good publishers (vercel-labs, anthropics, remotion-dev, czlonkowski, Playwright, DeepWiki) or bot-native skills already shipped with this agent. |
| **Screen first** | Everything else — especially repos with install scripts, low stars, redirects, or broad "skill dump" collections. |
| **Missing** | GitHub API returned 404; do not install; re-check later or drop. |

## Intake checklist

- [ ] Skill name (stable slug)
- [ ] Source repo `owner/name` (or bot-native)
- [ ] Exact install command (or MCP JSON with placeholders)
- [ ] Category: Design / Frontend / n8n / Claude Code / Video / Security / MCP / Research
- [ ] One-line purpose
- [ ] Tier assigned after screen
- [ ] Stars / last push / license recorded (or blank if N/A)
- [ ] Notes: redirects, npm install hooks, security caveats
- [ ] Owner approval recorded before any install

## Obsidian

Open `/workspace/skills-library-obsidian/` (or the Drive zip / GitHub `skills/` tree) as a vault folder. Index: `Skills Library.md` with wikilinks. Each skill has YAML frontmatter for Dataview.

## Forbidden in this library

- Real API keys, Bearer tokens, cookies
- Slack / Discord invite URLs
- Private IPs or internal hostnames
- Instructions that auto-install without owner confirmation
