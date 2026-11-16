---
register: StudEx Group — Workspace Index
description: "Canonical register of StudEx Group operating assets, organised by business line. Single source of truth: WORKSPACE-INDEX.md, index.html and the /workspace route are all generated from this file."
version: 1.0.0
visibility: public-sanitised
stages:
  live: Shipped and reachable today.
  ready: Complete and cleared to send or deploy; not yet fired.
  draft: Substantially built, needs a pass before it leaves the building.
  research: Intelligence and source material. Feeds other assets; not a deliverable itself.
locations:
  workspace: Lives on the operator workstation under /workspace — not in this repository.
  repo: Lives in this repository and is version-controlled here.
restricted_policy: Each is listed so it is accounted for; contents are deliberately not indexed and must never be committed to a public repository.
tags:
  - studex/meta
---

# Register settings

This note holds the register's own metadata. `scripts/vault-to-manifest.mjs` reads
the frontmatter above to build the top of `assets.json` — the stage and location
definitions, the version and the visibility marker all come from here.

Edit the frontmatter, run `npm run sync`, and the change flows out to
`WORKSPACE-INDEX.md`, `index.html` and the platform's `/workspace` route.

`updated` is not stored here. Every sync stamps it with the day it ran.
