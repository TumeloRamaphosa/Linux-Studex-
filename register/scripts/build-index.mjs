#!/usr/bin/env node
/**
 * Regenerates every derived view of the workspace index from assets.json.
 *
 *   assets.json  ->  WORKSPACE-INDEX.md   (read by humans and agents)
 *                ->  index.html         (browsable, self-contained)
 *
 * Never edit the generated files by hand; edit assets.json and run `npm run build:index`.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(readFileSync(join(root, "assets.json"), "utf8"));

const GENERATED = "DO NOT EDIT BY HAND — generated from assets.json by scripts/build-index.mjs";

const STAGE_ORDER = ["live", "ready", "draft", "research"];
const allAssets = manifest.lines.flatMap((line) => line.assets.map((a) => ({ ...a, line: line.id })));

const countBy = (key) =>
  allAssets.reduce((acc, a) => ((acc[a[key]] = (acc[a[key]] ?? 0) + 1), acc), {});

const stageCounts = countBy("stage");
const restrictedCount = allAssets.filter((a) => a.restricted).length;

/* ---------------------------------------------------------------- markdown */

function buildMarkdown() {
  const out = [];
  const push = (...lines) => out.push(...lines);

  push(`<!-- ${GENERATED} -->`, "");
  push(`# ${manifest.name}`, "");
  push(manifest.description.split(" Single source of truth")[0].trim(), "");
  push(
    `**Updated** ${manifest.updated} · **Version** ${manifest.version} · ` +
      `**${allAssets.length} assets** across **${manifest.lines.length} business lines**`,
    ""
  );

  push("| Stage | Count | Meaning |", "| --- | --- | --- |");
  for (const stage of STAGE_ORDER) {
    push(`| \`${stage}\` | ${stageCounts[stage] ?? 0} | ${manifest.conventions.stage[stage]} |`);
  }
  push("");

  push("## Reading this register", "");
  push(
    `Most of what follows lives on the operator workstation under \`/workspace\`, not in this repository. ` +
      `The \`Where\` column tells you which: \`repo\` is version-controlled here, \`workspace\` is not.`,
    ""
  );
  push(
    `${restrictedCount} entries are marked 🔒 **restricted**. ${manifest.conventions.restricted}`,
    ""
  );

  push("## Contents", "");
  for (const line of manifest.lines) {
    // Mirrors GitHub's slug rule: lowercase, drop punctuation, then map each
    // remaining space to one hyphen. Runs of spaces are NOT collapsed, so
    // "Meat — Wagyu Biltong" resolves to #meat--wagyu-biltong.
    const anchor = line.name.toLowerCase().replace(/[^\w\- ]/g, "").trim().replace(/ /g, "-");
    push(`- [${line.name}](#${anchor}) — ${line.tagline} _(${line.assets.length})_`);
  }
  push("");

  for (const line of manifest.lines) {
    push(`## ${line.name}`, "");
    push(`_${line.tagline}_`, "");
    push("| Asset | Stage | Type | Where | Path | Notes |", "| --- | --- | --- | --- | --- | --- |");
    for (const a of line.assets) {
      const name = a.flagship ? `⭐ **${a.name}**` : a.name;
      const lock = a.restricted ? "🔒 " : "";
      push(
        `| ${lock}${name} | \`${a.stage}\` | ${a.type} | ${a.location} | \`${a.path}\` | ${a.note} |`
      );
    }
    push("");
  }

  push("## Maintaining this file", "");
  push(
    "The Obsidian vault at `vault/` is the source of truth. Edit the note, not this file.",
    ""
  );
  push("```bash", "# 1. edit the asset's note in vault/Assets/", "# 2. regenerate everything downstream:", "npm run sync", "```", "");
  push(
    "```",
    "vault/  ->  assets.json  ->  WORKSPACE-INDEX.md",
    "                         ->  index.html",
    "```",
    ""
  );
  push(
    `\`assets.json\`, this file, \`index.html\` and the platform route are all generated. ` +
      `Editing any of them directly will be overwritten on the next sync.`,
    ""
  );

  return out.join("\n");
}

/* -------------------------------------------------------------------- html */

const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function buildHtml() {
  const lineNav = manifest.lines
    .map(
      (l) =>
        `<button class="chip" data-filter="line" data-value="${esc(l.id)}" style="--accent:${esc(
          l.accent
        )}">${esc(l.name)} <span class="chip-count">${l.assets.length}</span></button>`
    )
    .join("\n        ");

  const stageNav = STAGE_ORDER.map(
    (s) =>
      `<button class="chip chip-stage" data-filter="stage" data-value="${s}">${s} <span class="chip-count">${
        stageCounts[s] ?? 0
      }</span></button>`
  ).join("\n        ");

  const sections = manifest.lines
    .map((line) => {
      const cards = line.assets
        .map(
          (a) => `          <article class="card" data-line="${esc(line.id)}" data-stage="${esc(
            a.stage
          )}" data-search="${esc([a.name, a.path, a.note, a.type].join(" ").toLowerCase())}">
            <header class="card-head">
              <h3>${a.flagship ? '<span class="star" aria-label="flagship">★</span> ' : ""}${
            a.restricted ? '<span class="lock" aria-label="restricted">🔒</span> ' : ""
          }${esc(a.name)}</h3>
              <span class="stage stage-${esc(a.stage)}">${esc(a.stage)}</span>
            </header>
            <p class="note">${esc(a.note)}</p>
            <footer class="card-foot">
              <code>${esc(a.path)}</code>
              <span class="meta">${esc(a.type)} · ${esc(a.location)}</span>
            </footer>
          </article>`
        )
        .join("\n");

      return `      <section class="line" data-line="${esc(line.id)}" style="--accent:${esc(line.accent)}">
        <div class="line-head">
          <h2>${esc(line.name)}</h2>
          <p>${esc(line.tagline)}</p>
        </div>
        <div class="grid">
${cards}
        </div>
      </section>`;
    })
    .join("\n");

  return `<!DOCTYPE html>
<!-- ${GENERATED} -->
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>StudEx Group — Workspace Index</title>
<meta name="description" content="${esc(manifest.description.split(" Single source of truth")[0].trim())}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@600;800&family=JetBrains+Mono:wght@300;400;500&display=swap" rel="stylesheet">
<style>
  :root {
    --black: #0a0a0a; --dark: #111; --line: #222;
    --cyan: #00f0ff; --dim: #8a8a8a; --text: #f2f2f2;
    --live: #00ff88; --ready: #00f0ff; --draft: #ffd700; --research: #8b5cf6;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    background: var(--black); color: var(--text);
    font-family: "JetBrains Mono", ui-monospace, monospace;
    font-size: 15px; line-height: 1.6;
    background-image:
      linear-gradient(rgba(0,240,255,.025) 1px, transparent 1px),
      linear-gradient(90deg, rgba(0,240,255,.025) 1px, transparent 1px);
    background-size: 50px 50px;
    -webkit-font-smoothing: antialiased;
  }
  .wrap { max-width: 1180px; margin: 0 auto; padding: 0 16px 96px; }
  header.top { padding: 64px 0 32px; border-bottom: 1px solid var(--line); }
  h1 { font-family: Orbitron, sans-serif; font-weight: 800; font-size: clamp(28px, 5vw, 46px);
       letter-spacing: -.02em; text-shadow: 0 0 28px rgba(0,240,255,.35); }
  .sub { color: var(--dim); margin-top: 10px; max-width: 62ch; }
  .stats { display: flex; flex-wrap: wrap; gap: 8px 22px; margin-top: 22px;
           font-size: 13px; color: var(--dim); }
  .stats b { color: var(--cyan); font-weight: 500; }
  .controls { position: sticky; top: 0; z-index: 10; padding: 16px 0;
              background: rgba(10,10,10,.93); backdrop-filter: blur(8px);
              border-bottom: 1px solid var(--line); }
  #search { width: 100%; padding: 11px 14px; background: var(--dark); color: var(--text);
            border: 1px solid var(--line); border-radius: 6px; font: inherit; font-size: 14px; }
  #search:focus { outline: none; border-color: var(--cyan); box-shadow: 0 0 0 3px rgba(0,240,255,.12); }
  .chips { display: flex; flex-wrap: wrap; gap: 7px; margin-top: 12px; }
  .chip { --accent: var(--cyan); cursor: pointer; font: inherit; font-size: 12px;
          padding: 5px 11px; border-radius: 999px; color: var(--dim);
          background: transparent; border: 1px solid var(--line); transition: .15s; }
  .chip:hover { color: var(--text); border-color: var(--accent); }
  .chip[aria-pressed="true"] { color: var(--black); background: var(--accent);
                               border-color: var(--accent); font-weight: 500; }
  .chip-count { opacity: .55; margin-left: 3px; }
  .line { padding-top: 52px; scroll-margin-top: 130px; }
  .line-head { border-left: 3px solid var(--accent); padding-left: 14px; margin-bottom: 20px; }
  .line-head h2 { font-family: Orbitron, sans-serif; font-size: 20px; font-weight: 600;
                  color: var(--accent); letter-spacing: .01em; }
  .line-head p { color: var(--dim); font-size: 13px; margin-top: 4px; }
  .grid { display: grid; gap: 14px; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); }
  .card { background: var(--dark); border: 1px solid var(--line); border-radius: 8px;
          padding: 16px; display: flex; flex-direction: column; gap: 10px; transition: .15s; }
  .card:hover { border-color: var(--accent); transform: translateY(-2px); }
  .card-head { display: flex; justify-content: space-between; align-items: start; gap: 10px; }
  .card-head h3 { font-size: 14px; font-weight: 500; line-height: 1.4; }
  .star { color: #ffd700; }
  .stage { font-size: 10px; text-transform: uppercase; letter-spacing: .09em;
           padding: 2px 8px; border-radius: 999px; white-space: nowrap; flex-shrink: 0;
           border: 1px solid currentColor; }
  .stage-live { color: var(--live); } .stage-ready { color: var(--ready); }
  .stage-draft { color: var(--draft); } .stage-research { color: var(--research); }
  .note { font-size: 13px; color: var(--dim); flex: 1; }
  .card-foot { display: flex; flex-direction: column; gap: 5px;
               border-top: 1px solid var(--line); padding-top: 10px; }
  .card-foot code { font-size: 11px; color: #6f6f6f; word-break: break-all; }
  .meta { font-size: 11px; color: #5a5a5a; text-transform: uppercase; letter-spacing: .06em; }
  .empty { display: none; padding: 60px 0; text-align: center; color: var(--dim); }
  body.is-empty .empty { display: block; }
  footer.foot { margin-top: 64px; padding-top: 22px; border-top: 1px solid var(--line);
                color: #5a5a5a; font-size: 12px; }
  .hidden { display: none !important; }
  @media (prefers-reduced-motion: reduce) { * { transition: none !important; } .card:hover { transform: none; } }
</style>
</head>
<body>
<div class="wrap">
  <header class="top">
    <h1>StudEx Group — Workspace Index</h1>
    <p class="sub">${esc(manifest.description.split(" Single source of truth")[0].trim())}</p>
    <div class="stats">
      <span><b>${allAssets.length}</b> assets</span>
      <span><b>${manifest.lines.length}</b> business lines</span>
      <span><b>${stageCounts.live ?? 0}</b> live</span>
      <span><b>${stageCounts.ready ?? 0}</b> ready to fire</span>
      <span>updated <b>${esc(manifest.updated)}</b></span>
    </div>
  </header>

  <div class="controls">
    <input id="search" type="search" placeholder="Search assets, paths, notes…" aria-label="Search assets">
    <div class="chips" id="chips">
        ${lineNav}
        ${stageNav}
    </div>
  </div>

${sections}

  <p class="empty">Nothing matches that filter.</p>

  <footer class="foot">
    Generated from <code>assets.json</code> · ${esc(manifest.visibility)} ·
    restricted entries are listed for accounting only, contents are never indexed here.
  </footer>
</div>
<script>
  const cards = [...document.querySelectorAll(".card")];
  const sections = [...document.querySelectorAll(".line")];
  const search = document.getElementById("search");
  const active = { line: null, stage: null };

  function apply() {
    const q = search.value.trim().toLowerCase();
    let shown = 0;
    for (const card of cards) {
      const ok =
        (!active.line || card.dataset.line === active.line) &&
        (!active.stage || card.dataset.stage === active.stage) &&
        (!q || card.dataset.search.includes(q));
      card.classList.toggle("hidden", !ok);
      if (ok) shown++;
    }
    for (const section of sections) {
      const any = [...section.querySelectorAll(".card")].some((c) => !c.classList.contains("hidden"));
      section.classList.toggle("hidden", !any);
    }
    document.body.classList.toggle("is-empty", shown === 0);
  }

  document.getElementById("chips").addEventListener("click", (e) => {
    const chip = e.target.closest(".chip");
    if (!chip) return;
    const { filter, value } = chip.dataset;
    const next = active[filter] === value ? null : value;
    active[filter] = next;
    for (const c of document.querySelectorAll('.chip[data-filter="' + filter + '"]')) {
      c.setAttribute("aria-pressed", String(c.dataset.value === next));
    }
    apply();
  });

  search.addEventListener("input", apply);
  for (const c of document.querySelectorAll(".chip")) c.setAttribute("aria-pressed", "false");
</script>
</body>
</html>
`;
}

/* ------------------------------------------------------------------- write */

writeFileSync(join(root, "WORKSPACE-INDEX.md"), buildMarkdown());
writeFileSync(join(root, "index.html"), buildHtml());

console.log(
  `built ${allAssets.length} assets / ${manifest.lines.length} lines -> ` +
    "WORKSPACE-INDEX.md, index.html"
);
