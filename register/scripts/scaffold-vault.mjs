#!/usr/bin/env node
/**
 * Creates vault notes that do not exist yet, from assets.json.
 *
 * Used once to bootstrap the vault, and afterwards only to fill gaps — if an
 * entry reaches assets.json by some other route, this gives it a note. It is
 * strictly additive: an existing note is never rewritten or deleted, so it
 * cannot destroy hand-edited work. Regenerating the parts of the vault that
 * ARE generated is build-vault.mjs's job.
 */

import { readFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { DIRS, toFilename, writeNote, assertLinkSafe } from "./lib/vault.mjs";

const manifest = JSON.parse(readFileSync("assets.json", "utf8"));
for (const dir of Object.values(DIRS)) mkdirSync(dir, { recursive: true });

const created = [];
const skipped = [];

/* ------------------------------------------------------------ register meta */

const registerNote = join(DIRS.meta, "Register.md");
if (existsSync(registerNote)) {
  skipped.push(registerNote);
} else {
  writeNote(
    registerNote,
    {
      register: manifest.name,
      description: manifest.description,
      version: manifest.version,
      visibility: manifest.visibility,
      stages: manifest.conventions.stage,
      locations: manifest.conventions.location,
      restricted_policy: manifest.conventions.restricted,
      tags: ["studex/meta"],
    },
    `# Register settings

This note holds the register's own metadata. \`scripts/vault-to-manifest.mjs\` reads
the frontmatter above to build the top of \`assets.json\` — the stage and location
definitions, the version and the visibility marker all come from here.

Edit the frontmatter, run \`npm run sync\`, and the change flows out to
\`WORKSPACE-INDEX.md\`, \`index.html\` and the platform's \`/workspace\` route.

\`updated\` is not stored here. Every sync stamps it with the day it ran.`
  );
  created.push(registerNote);
}

/* -------------------------------------------------------------------- lines */

manifest.lines.forEach((line, order) => {
  const title = toFilename(line.name);
  assertLinkSafe(title, `line ${line.id}`);
  const file = join(DIRS.lines, `${title}.md`);
  if (existsSync(file)) {
    skipped.push(file);
    return;
  }
  const data = {
    id: line.id,
    order: order + 1,
    tagline: line.tagline,
    accent: line.accent,
    tags: ["studex/line", `studex/line/${line.id}`],
  };
  if (title !== line.name) data.name = line.name;

  writeNote(
    file,
    data,
    `# ${line.name}

> ${line.tagline}

Write anything you like here. Everything above the generated marker is preserved
when the vault is rebuilt; everything below it is regenerated from the asset notes.`
  );
  created.push(file);
});

/* ------------------------------------------------------------------- assets */

for (const line of manifest.lines) {
  line.assets.forEach((asset, order) => {
    const title = toFilename(asset.name);
    assertLinkSafe(title, `asset ${asset.id}`);
    const file = join(DIRS.assets, `${title}.md`);
    if (existsSync(file)) {
      skipped.push(file);
      return;
    }

    const data = {
      id: asset.id,
      line: line.id,
      order: order + 1,
      stage: asset.stage,
      type: asset.type,
      location: asset.location,
      path: asset.path,
      summary: asset.note,
      tags: [
        "studex/asset",
        `studex/line/${line.id}`,
        `studex/stage/${asset.stage}`,
        `studex/type/${asset.type}`,
      ],
    };
    if (title !== asset.name) data.name = asset.name;
    if (asset.restricted) {
      data.restricted = true;
      data.tags.push("studex/restricted");
    }
    if (asset.flagship) {
      data.flagship = true;
      data.tags.push("studex/flagship");
    }

    const lineTitle = toFilename(line.name);
    const warning = asset.restricted
      ? `\n> [!danger] Restricted\n> ${manifest.conventions.restricted}\n> Do not paste this asset's contents into this note, a session transcript, or any public repository.\n`
      : "";

    writeNote(
      file,
      data,
      `# ${asset.name}
${warning}
**Line** [[${lineTitle}]]${asset.flagship ? " · ⭐ flagship" : ""}

${asset.note}

## Notes

_Working notes live here. This section is yours — no generator touches it._`
    );
    created.push(file);
  });
}

console.log(`scaffold: ${created.length} note(s) created, ${skipped.length} left untouched`);
for (const f of created) console.log(`  + ${f}`);
