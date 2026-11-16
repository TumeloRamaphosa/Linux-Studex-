#!/usr/bin/env node
/**
 * assets.json  ->  the generated regions of the vault
 *
 * Asset notes are yours; this never touches them. What it writes is:
 *   vault/Lines/<Line>.md   the region below the BEGIN GENERATED marker
 *   vault/00 Index.md       the whole note — a dashboard, entirely derived
 *
 * Each generated table ships twice: a Dataview block for live querying inside
 * Obsidian, and a static Markdown table in a collapsed callout so the vault
 * still reads correctly in Logseq, Foam, plain VS Code or on GitHub, where
 * Dataview does not run.
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { DIRS, VAULT, STAGES, toFilename, readNote, spliceGenerated, cell } from "./lib/vault.mjs";

const FENCE = "```";
const manifest = JSON.parse(readFileSync("assets.json", "utf8"));
const allAssets = manifest.lines.flatMap((l) => l.assets.map((a) => ({ ...a, line: l })));
const stageCount = (stage) => allAssets.filter((a) => a.stage === stage).length;

const mark = (asset) =>
  `${asset.flagship ? "⭐ " : ""}${asset.restricted ? "🔒 " : ""}[[${toFilename(asset.name)}]]`;

const dataview = (query) => [`${FENCE}dataview`, query.trim(), FENCE].join("\n");

function portableTable(assets, { showLine = false } = {}) {
  const head = showLine
    ? "| Asset | Line | Stage | Type | Path |"
    : "| Asset | Stage | Type | Where | Path |";
  const rule = showLine ? "| --- | --- | --- | --- | --- |" : "| --- | --- | --- | --- | --- |";
  const rows = assets.map((a) =>
    showLine
      ? `| ${mark(a)} | ${cell(a.line.name)} | \`${a.stage}\` | ${cell(a.type)} | \`${cell(a.path)}\` |`
      : `| ${mark(a)} | \`${a.stage}\` | ${cell(a.type)} | ${cell(a.location)} | \`${cell(a.path)}\` |`
  );
  return [
    "> [!info]- Portable table — for Logseq, Foam, VS Code and GitHub, where Dataview does not run",
    ...[head, rule, ...rows].map((line) => `> ${line}`),
  ].join("\n");
}

/* --------------------------------------------------------------- line notes */

let linesWritten = 0;
for (const line of manifest.lines) {
  const file = join(DIRS.lines, `${toFilename(line.name)}.md`);
  if (!existsSync(file)) {
    console.warn(`warning: ${file} is missing — run npm run vault:scaffold`);
    continue;
  }
  const note = readNote(file);
  const counts = STAGES.filter((s) => line.assets.some((a) => a.stage === s))
    .map((s) => `${line.assets.filter((a) => a.stage === s).length} ${s}`)
    .join(" · ");

  const generated = [
    `## Assets`,
    ``,
    `**${line.assets.length} total** — ${counts}`,
    ``,
    dataview(`
TABLE WITHOUT ID file.link AS "Asset", stage AS "Stage", type AS "Type", location AS "Where", path AS "Path"
FROM #studex/line/${line.id}
SORT order ASC
    `),
    ``,
    portableTable(line.assets.map((a) => ({ ...a, line }))),
  ].join("\n");

  const next = spliceGenerated(note.body, generated);
  const raw = readFileSync(file, "utf8");
  const rebuilt = raw.replace(note.body, next);
  if (rebuilt !== raw) {
    writeFileSync(file, rebuilt);
    linesWritten++;
  }
}

/* ---------------------------------------------------------------- 00 Index  */

const ready = allAssets.filter((a) => a.stage === "ready");
const restricted = allAssets.filter((a) => a.restricted);
const flagship = allAssets.filter((a) => a.flagship);

const index = `---
tags:
  - studex/meta
---

# ${manifest.name}

> [!abstract] This note is generated
> \`scripts/build-vault.mjs\` rewrites this file on every sync. Put your own
> thinking in an asset note or a line note instead — those are preserved.

**${allAssets.length} assets** across **${manifest.lines.length} business lines** · updated ${manifest.updated} · v${manifest.version}

| Stage | Count | Meaning |
| --- | --- | --- |
${STAGES.map((s) => `| \`${s}\` | ${stageCount(s)} | ${cell(manifest.conventions.stage[s])} |`).join("\n")}

## Business lines

${manifest.lines
  .map((l) => `- [[${toFilename(l.name)}]] — ${l.tagline} _(${l.assets.length})_`)
  .join("\n")}

## Finished but not fired

${ready.length} assets are complete and cleared, and not yet live. This is the
group's real backlog — work already paid for, earning nothing.

${dataview(`
TABLE WITHOUT ID file.link AS "Asset", line AS "Line", type AS "Type", path AS "Path"
FROM #studex/asset
WHERE stage = "ready"
SORT line ASC, order ASC
`)}

${portableTable(ready, { showLine: true })}

## Flagship

${flagship.map((a) => `- ${mark(a)} — ${cell(a.note)}`).join("\n")}

## Restricted

${manifest.conventions.restricted}

${restricted.map((a) => `- ${mark(a)} — \`${cell(a.path)}\``).join("\n")}

## How this vault works

\`\`\`
vault/            ← you edit here. This is the source of truth.
  Assets/         one note per asset. Frontmatter is data, body is yours.
  Lines/          one per business line. Body above the marker is yours.
  Meta/Register   the register's own settings.
      ↓  npm run sync
assets.json       generated. Never edit by hand.
      ↓
WORKSPACE-INDEX.md · index.html
\`\`\`

Add an asset by creating a note in \`Assets/\` with the same frontmatter keys as
its neighbours, then run \`npm run sync\`. A bad stage, an unknown line or a
duplicate id will stop the sync and name the file, rather than quietly dropping
the asset out of the register.
`;

const indexFile = join(VAULT, "00 Index.md");
const previous = existsSync(indexFile) ? readFileSync(indexFile, "utf8") : "";
if (previous !== index) writeFileSync(indexFile, index);

console.log(
  `vault regenerated: ${linesWritten} line note(s) updated, index ${previous === index ? "unchanged" : "rewritten"}`
);
