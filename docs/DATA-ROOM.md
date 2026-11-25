# StudEx Data Room — the browsable knowledge base

**Live:** https://studex-library.vercel.app

A browsable, searchable, exportable view of everything the Hermes agent knows
and has done: memory, skills, session transcripts, and work artefacts.

---

## What is in it

| Section | Count | What it holds |
|---|---|---|
| **Memory** | durable facts, people, environment, tool quirks | the `MEMORY` store and `USER PROFILE` |
| **Skills** | 97 skill runbooks | every `SKILL.md` as a rendered page |
| **Sessions** | 289 transcripts | full conversation history, split by turn |
| **Work** | 208 artefacts | scripts, reports, generated files, runbooks |

Everything is also downloadable as raw Markdown from `/export/`.

---

## How it was built

```
/workspace/library-build/     inventory + scrape + index
        ↓
/workspace/dataroom-build/    extract.py → transcripts.json, skills.json, dataroom.json
        ↓  build_site.py
/workspace/dataroom-site/     601 static HTML pages, Black & Gold theme
        ↓  vercel CLI
https://studex-library.vercel.app
```

`build_site.py` renders every artefact into a page with:

- cross-links between related items
- a full-text search index
- per-section index pages
- an export bundle of the raw Markdown

Rebuild with:

```bash
cd /workspace/dataroom-build
python3 extract.py      # regenerate the JSON bundles
python3 build_site.py   # render the HTML
```

---

## Deploying it

The Vercel **REST API** cannot be used for this — the payload is 15MB raw /
17MB base64 and Vercel caps request bodies at 10MB. Use the CLI, which uploads
files individually:

```bash
cd /workspace/dataroom-site
export VERCEL_TOKEN='<token>'
npx vercel --prod --yes --scope stud-ex-s-projects --name studex-library
```

Or use the project directly:

```bash
npx vercel --prod --yes --scope stud-ex-s-projects
```

**Project:** `studex-library` (`prj_PueR7mKgJYzCEyoaYL3e9rxI86ze`)
**Note:** this is a separate project from `studex-hub`, which holds the live
Black & Gold dashboard and must not be overwritten.

---

## Secret hygiene

The Data Room contains transcripts of real work, so the extraction pipeline
redacts before anything is written to disk. Current redaction rules live in
`extract.py`:

| Pattern | Action |
|---|---|
| `-----BEGIN … PRIVATE KEY-----` blocks | replaced with a marker |
| `p=MII…` / `MII…` (ASN.1 public-key blobs, e.g. DKIM) | replaced with `***REDACTED_KEY_BLOB***` |
| API keys (`vcp_`, `sk_live_`, `sk-ant-`, `sk-proj-`, `xai-`, `gh*_`, `AIza`, `AKIA`) | replaced |
| JWTs (`eyJ….….…`) | replaced |
| Telegram bot tokens | replaced |

**Verified clean** at time of publish: zero live secrets across all 601 pages.
The only `eyJ…` blobs that survived are CLI telemetry JSON containing
`cli_version` and `node_version` — not credentials.

If you add a new secret format, add the rule to `extract.py` and re-run the
scan before deploying. A secret that reaches the public site is public.

---

## Related

- [`docs/AGENT-CALLING.md`](AGENT-CALLING.md) — calling the agents
- [`docs/TASK-SHEET-AGENT-CALLING.md`](TASK-SHEET-AGENT-CALLING.md) — tracked work
- [`docs/SMOKE-TEST-RESULTS.md`](SMOKE-TEST-RESULTS.md) — verified call results
