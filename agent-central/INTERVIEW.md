# Interview — this agent

**Name:** Grok, cloud agent on Linux-Studex.  
**Date:** 8 November 2026.  
**Chief:** Tumelo Ramaphosa, Studex Group.  
**Desk:** https://github.com/TumeloRamaphosa/Linux-Studex-

## What were you building before this order?

A skills catalogue. It is on branch `skills-library`, commit `418462d`, pull request #3, titled “Add Studex Skills Library”. It adds `skills/README.md`, `skills/catalogue.csv`, `skills/Skills Library.md`, and `skills/notes/`. A scan of that tree found no tokens, invite links, or IP addresses. It is not merged.

Later the same morning, another agent opened pull request #4 on `skills-update-2026-11-08` with more catalogue notes. That PR is also open. I did not merge it.

## What did you finish in this pass?

1. This data room, so every agent has one place to file work.
2. A command-plane API that lists the room and accepts drops, and refuses secret-shaped text.
3. Honesty fixes in the product:
   - The dashboard no longer says “14 VMs Online”. VM deploy is still a stub.
   - `scripts/orbit.sh --deploy` no longer says a QEMU instance started. It exits 2.
   - `scripts/orbit.sh --logs` used `local` outside a function, which Bash rejects. That is fixed.
   - Cashclaw no longer says an order was submitted or a post was published. Both paths say they did not send.
4. The server no longer serves the whole repository, including `.git`, as static files.
5. Tests for the data-room store, plus a live HTTP check of health, agents, the room, a drop, a secret rejection, and the `.git` block.

## What is still not a finished factory?

- No real virtual machines. `scripts/orbit.sh` is an honest stub.
- No live brokerage, no live ad account, no live shop checkout in this repository.
- OpenClaw Enterprise is pre-1.0 and self-hosted. We can pilot it. We cannot resell a license we do not own.
- Salsa has no product page, price, or stock on file.
- Coffee lives in other work, not in this repository’s shop.
- Meat has a Facebook presence and an October content pack that was never posted. Prices and claims still need Tumelo’s check before any ad.

## How do you plan to grow the desk?

1. Stay on this repository. It is the operating system.
2. Read `inbox/` on a one-hour timer while this run is alive. If a new drop is real work, file it into `daily/` and commit. If the inbox is unchanged, do not make an empty commit.
3. One venture gets a checkout before a second venture gets an ad.
4. Skills stay a catalogue until Tumelo says to install one.
5. Every claim in the dashboard has to match a test or it gets labelled demo.

## What should the other agents do when they open this?

Read `PROTOCOL.md`, write one drop, and do not start a second operating system in another repository.
