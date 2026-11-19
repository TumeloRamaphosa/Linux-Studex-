# Studex design portfolio — file map

How the uploaded **`.dc.html` prototypes**, plans, and assets fit **Gamer**, **Stud-Bot Gaming Hub** (`agents/gamer/arcade/`), and the **online gaming business**.

## Visual systems (three lanes — do not mix blindly)

| Lane | Reference | Tokens / mood | Best for |
|------|-----------|---------------|----------|
| **Obsidian gold (canonical)** | `Studex App v2.dc.html`, `Dark_Factory.dc.html`, `Agents.dc.html`, Station renders | `#050505` / `#0A0A0A`, `#C9A84C`, `#E8DDBA`, `#FFB000`, room accents in `SPRITE-BRIEF.md` | Agent OS, Dark Factory, corporate + programme ops |
| **Arcade Cup (product)** | `Arcade_Cup_Site.dc.html` | Geist, gold on charcoal, editorial (no pixel) | Public cup registration, safeguarding, lanes |
| **Retro hub (play)** | `agents/gamer/arcade/` in Linux-StudEx | Press Start + gold/purple CRT | Local browser games, filters All/Retro/New |
| **Cyber D#VOP$** | Magenta glitch bull creative | Neon magenta, wireframe city | DevOps / launch campaigns — **not** schools safeguarding UI |

**Gamer room accent (factory):** `#F08A4B` — see `SPRITE-BRIEF.md` Arcade stripe.

---

## File-by-file

| File | Role |
|------|------|
| **Agentic Rise Portal.dc.html** | Programme portal shell; ties training → placement narrative with Agentic Rise cohort. |
| **Agents.dc.html** | Agent orchestrator UI; **Gamer** = Head of Studex Arcade, programme group, cup ops. |
| **Arcade_Cup_Site.dc.html** | **Studex Arcade Cup** — seven lanes, calendar, guardian consent register, safeguarding copy (draft banner). |
| **Dark_Factory.dc.html** | Isometric **THE DARK FACTORY** floor; room **ARCADE + PROGRAMME** (`gamer`, `forge`, `dronie`, `ledger`); Forge OS tree for cup build. |
| **Decision_Dashboard.dc.html** | Open decisions (pupil scale, food in school lanes, Thailand semi) owned by Gamer track. |
| **Programme Briefing Deck.dc.html** | Stakeholder deck (use with `deck-stage.js`). |
| **Studex App v2.dc.html** | Mobile PWA spec: **Arcade** tab lists same lanes as cup; links to factory. |
| **Studex App.dc.html** | Earlier app prototype. |
| **Studex Station.dc.html** | Gold station render; **Gamer** in Council room; chat stubs. |
| **support.js** | Shared runtime for `.dc.html` interactive templates. |
| **deck-stage.js** | Deck presenter (keyboard nav, speaker notes, print PDF). |
| **SPRITE-BRIEF.md** | Dark Factory **pixel workers** — `gamer` agent id, Arcade colour `#F08A4B`. |
| **PLAN.md** | SvelteKit build plan for **Studex Global Markets** PWA (`Stud-Bot-Launch-` repo). |
| **PLAN-rwanda-world.md** | Rwanda financing memo × StudEx World; pipeline 10k→1k→100, Agentic Rise Jan 2027. |
| **github.md** | Sync log: Station, Dark Factory, palettes, reference repos. |
| **CLAUDE.md** | Handoff for Global Markets PWA (not Linux-StudEx server). |

---

## Gamer agent — single storyline

```text
Linux StudEx (dashboard) ──► agents/gamer/arcade/     local retro/new game hub
Studex App v2 "Arcade" tab ─► lanes + calendar meta
Arcade_Cup_Site.dc.html   ─► registration + safeguarding
Dark Factory ARCADE room  ─► ops: rules, Kigali run of show, consent layer
Agents.dc / Station       ─► GAMER persona + chat
GAMING-ECOSYSTEM.md       ─► regional leagues + monetization research
```

**Cup lanes (from App v2 / Cup site):** Corporate CS2, Schools FC / Rocket League, hackathon, schools coding, drone sim, drone enterprise, Agentic Rise cohort — each with age/safeguarding gates.

---

## What Linux-StudEx should own vs Stud-Bot-Launch

| Stay in **Linux-Studex-** | Stay in **Stud-Bot-Launch-** (per CLAUDE.md / PLAN.md) |
|---------------------------|--------------------------------------------------------|
| `agents/gamer/arcade/` hub + catalog | Studex App v2, billing, KYC, markets |
| `dashboard.html` link to arcade | Dark Factory / Station as product pages |
| Gamer research markdown | `.dc.html` production prototypes |

**Bridge (recommended):** From arcade hub header, link “Programme” to Cup site when hosted; from dashboard, mention **Gamer** agent same as Agents.dc.

---

## Brand alignment next step

1. Restyle `agents/gamer/arcade/style.css` toward **SPRITE-BRIEF** (obsidian + gold + `#F08A4B` arcade accent) while keeping retro **game library** UX.
2. Do **not** put Cup draft dates/prizes on the static hub without the Cup site draft banner.
3. Export one **Gamer** sprite when pixel sheet exists → favicon/mark beside Stud-Bot mark.

---

*Upload originals live in the agent session uploads folder; this map is the repo-local index.*