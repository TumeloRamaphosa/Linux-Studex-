---
tags:
  - studex/meta
---

# StudEx Group — Workspace Index

> [!abstract] This note is generated
> `scripts/build-vault.mjs` rewrites this file on every sync. Put your own
> thinking in an asset note or a line note instead — those are preserved.

**40 assets** across **7 business lines** · updated 2026-09-25 · v1.0.0

| Stage | Count | Meaning |
| --- | --- | --- |
| `live` | 11 | Shipped and reachable today. |
| `ready` | 22 | Complete and cleared to send or deploy; not yet fired. |
| `draft` | 5 | Substantially built, needs a pass before it leaves the building. |
| `research` | 2 | Intelligence and source material. Feeds other assets; not a deliverable itself. |

## Business lines

- [[Coffee]] — Rwanda origin into China and South African enterprise. _(10)_
- [[Meat — Wagyu Biltong]] — Wagyu biltong and the subscription box around it. _(6)_
- [[StudBot Super Agents]] — The agentic operating system. This is the product the rest of the group runs on. _(6)_
- [[Operations]] — War rooms and dashboards. Where the machine is watched. _(4)_
- [[Agent OS]] — What any agent reads on the way in. Treat as the constitution. _(6)_
- [[Capital & Pitch]] — What goes in front of investors and partners. _(3)_
- [[Content & Brand]] — The media library behind every campaign. _(5)_

## Finished but not fired

22 assets are complete and cleared, and not yet live. This is the
group's real backlog — work already paid for, earning nothing.

```dataview
TABLE WITHOUT ID file.link AS "Asset", line AS "Line", type AS "Type", path AS "Path"
FROM #studex/asset
WHERE stage = "ready"
SORT line ASC, order ASC
```

> [!info]- Portable table — for Logseq, Foam, VS Code and GitHub, where Dataview does not run
> | Asset | Line | Stage | Type | Path |
> | --- | --- | --- | --- | --- |
> | [[CIIE Coffee Landing]] | Coffee | `ready` | landing | `/workspace/ciie-coffee-landing/` |
> | [[Coffee Noir Landing]] | Coffee | `ready` | landing | `/workspace/coffee-noir-landing/` |
> | [[SA B2B Coffee Landing]] | Coffee | `ready` | landing | `/workspace/sa-b2b-coffee-landing/` |
> | [[StudEx Coffee — Pipeline Landing]] | Coffee | `ready` | landing | `/workspace/studex-coffee/` |
> | [[China Coffee Lead Capture]] | Coffee | `ready` | landing | `/workspace/china-coffee-lead-capture/` |
> | [[China Outreach Script]] | Coffee | `ready` | doc | `/workspace/china-coffee-outreach.md` |
> | 🔒 [[SA B2B Prospect List]] | Coffee | `ready` | doc | `/workspace/sa-b2b-coffee-prospects.md` |
> | [[StudEx Biltong Product Page]] | Meat — Wagyu Biltong | `ready` | landing | `/workspace/studex-biltong/dist/index.html` |
> | [[Biltong Email Sequence]] | Meat — Wagyu Biltong | `ready` | doc | `/workspace/biltong-email-sequence.md` |
> | [[StudEx Meat Pitch Deck]] | Meat — Wagyu Biltong | `ready` | deck | `/workspace/studex-pitch/Studex-Meat-Pitch-Deck.pdf` |
> | ⭐ [[StudBot Super Agents — Product Spec]] | StudBot Super Agents | `ready` | skill | `/workspace/skills/studbot-super-agents/SKILL.md` |
> | [[Platform Explainer Suite]] | StudBot Super Agents | `ready` | media | `/workspace/studex-platform-explainer/` |
> | [[Ghost Brain Explorer]] | StudBot Super Agents | `ready` | landing | `/workspace/studex-ghost-brain-explorer.html` |
> | [[Client Proposal Landing]] | StudBot Super Agents | `ready` | landing | `/workspace/studex-client-proposal/` |
> | ⭐ [[StudEx Onboarding Pack]] | Agent OS | `ready` | doc | `/workspace/studex-onboarding-pack.md` |
> | 🔒 [[Rwanda Coffee Investor Brief]] | Capital & Pitch | `ready` | doc | `/workspace/rwanda-coffee/INVESTOR-BRIEF-2026-08-17.md` |
> | [[CIIE Export Bundle Pitch]] | Capital & Pitch | `ready` | doc | `/workspace/ciie-bundle-pitch.md` |
> | [[Platform Podcast — 10 Episodes]] | Content & Brand | `ready` | media | `/workspace/studex-platform-explainer/podcast_s01e01_seg01-10.mp3` |
> | [[Platform Videos — 4 Cuts]] | Content & Brand | `ready` | media | `/workspace/studex-platform-explainer/vid1-4.mp4` |
> | [[Study Videos & Slideshows]] | Content & Brand | `ready` | media | `/workspace/content/` |
> | [[Women's Month Campaign]] | Content & Brand | `ready` | media | `/workspace/womens-month/` |
> | [[Product Image Library]] | Content & Brand | `ready` | media | `/workspace/imgs/` |

## Flagship

- ⭐ [[StudBot Super Agents — Product Spec]] — Primary selling document. Product spec, tiers and differentiators.
- ⭐ [[StudEx Onboarding Pack]] — Full briefing pack. First read for any agent joining the fleet.

## Restricted

Each is listed so it is accounted for; contents are deliberately not indexed and must never be committed to a public repository.

- 🔒 [[SA B2B Prospect List]] — `/workspace/sa-b2b-coffee-prospects.md`
- 🔒 [[TOOLS.md — Credential Vault]] — `/workspace/TOOLS.md`
- 🔒 [[Rwanda Coffee Investor Brief]] — `/workspace/rwanda-coffee/INVESTOR-BRIEF-2026-08-17.md`

## How this vault works

```
vault/            ← you edit here. This is the source of truth.
  Assets/         one note per asset. Frontmatter is data, body is yours.
  Lines/          one per business line. Body above the marker is yours.
  Meta/Register   the register's own settings.
      ↓  npm run sync
assets.json       generated. Never edit by hand.
      ↓
WORKSPACE-INDEX.md · index.html
```

Add an asset by creating a note in `Assets/` with the same frontmatter keys as
its neighbours, then run `npm run sync`. A bad stage, an unknown line or a
duplicate id will stop the sync and name the file, rather than quietly dropping
the asset out of the register.
