#!/usr/bin/env node
/**
 * vault/  ->  assets.json
 *
 * The vault is the source of truth. This reads every note's frontmatter and
 * rebuilds the manifest that build-index.mjs turns into the Markdown register,
 * the HTML page and the platform's /workspace route.
 *
 * It validates rather than guesses: a bad stage, an unknown line, a duplicate
 * id or a missing required field fails the sync with the offending file named,
 * so a typo can never silently drop an asset out of the register.
 */

import { writeFileSync, readFileSync, existsSync } from "node:fs";
import { basename } from "node:path";
import { DIRS, STAGES, LOCATIONS, listNotes, readNote } from "./lib/vault.mjs";

const errors = [];
const fail = (file, message) => errors.push(`${file}: ${message}`);

/* ------------------------------------------------------------ register meta */

const metaFile = `${DIRS.meta}/Register.md`;
let meta = { data: {} };
try {
  meta = readNote(metaFile);
} catch (err) {
  fail(metaFile, err.message.replace(`${metaFile}: `, ""));
}

for (const key of ["register", "description", "version", "visibility", "stages", "locations", "restricted_policy"]) {
  if (meta.data[key] === undefined) fail(metaFile, `missing required key "${key}"`);
}

/* -------------------------------------------------------------------- lines */

const lines = [];
for (const file of listNotes(DIRS.lines)) {
  let note;
  try {
    note = readNote(file);
  } catch (err) {
    fail(file, err.message.replace(`${file}: `, ""));
    continue;
  }
  const { data } = note;
  if (!data.id) {
    fail(file, 'missing required key "id"');
    continue;
  }
  if (!data.tagline) fail(file, 'missing required key "tagline"');
  if (!data.accent) fail(file, 'missing required key "accent"');
  if (data.accent && !/^#[0-9a-fA-F]{6}$/.test(String(data.accent))) {
    fail(file, `accent "${data.accent}" must be a six-digit hex colour like #ff6b00`);
  }
  if (typeof data.order !== "number") fail(file, '"order" must be a number');

  lines.push({
    id: String(data.id),
    name: data.name ?? note.title,
    tagline: String(data.tagline ?? ""),
    accent: String(data.accent ?? ""),
    order: data.order ?? Number.MAX_SAFE_INTEGER,
    file,
    assets: [],
  });
}

if (lines.length === 0) fail(DIRS.lines, "no line notes found — has the vault been scaffolded?");

const byLineId = new Map();
for (const line of lines) {
  if (byLineId.has(line.id)) {
    fail(line.file, `duplicate line id "${line.id}", already used by ${byLineId.get(line.id).file}`);
    continue;
  }
  byLineId.set(line.id, line);
}

const seenOrder = new Map();
for (const line of lines) {
  if (seenOrder.has(line.order)) {
    fail(line.file, `order ${line.order} is already used by ${seenOrder.get(line.order)}`);
  } else {
    seenOrder.set(line.order, basename(line.file));
  }
}

/* ------------------------------------------------------------------- assets */

const byAssetId = new Map();
for (const file of listNotes(DIRS.assets)) {
  let note;
  try {
    note = readNote(file);
  } catch (err) {
    fail(file, err.message.replace(`${file}: `, ""));
    continue;
  }
  const { data } = note;

  for (const key of ["id", "line", "stage", "type", "location", "path", "summary"]) {
    if (data[key] === undefined || data[key] === null || data[key] === "") {
      fail(file, `missing required key "${key}"`);
    }
  }
  if (data.stage && !STAGES.includes(data.stage)) {
    fail(file, `stage "${data.stage}" is not one of ${STAGES.join(", ")}`);
  }
  if (data.location && !LOCATIONS.includes(data.location)) {
    fail(file, `location "${data.location}" is not one of ${LOCATIONS.join(", ")}`);
  }
  if (data.order !== undefined && typeof data.order !== "number") {
    fail(file, '"order" must be a number when present');
  }
  if (!data.id) continue;

  if (byAssetId.has(data.id)) {
    fail(file, `duplicate asset id "${data.id}", already used by ${byAssetId.get(data.id)}`);
    continue;
  }
  byAssetId.set(data.id, file);

  const line = byLineId.get(data.line);
  if (!line) {
    fail(file, `line "${data.line}" has no note in ${DIRS.lines}`);
    continue;
  }

  const asset = {
    id: String(data.id),
    name: data.name ?? note.title,
    path: String(data.path ?? ""),
    type: String(data.type ?? ""),
    stage: String(data.stage ?? ""),
    location: String(data.location ?? ""),
    note: String(data.summary ?? ""),
  };
  if (data.restricted) asset.restricted = true;
  if (data.flagship) asset.flagship = true;

  line.assets.push({ asset, order: data.order ?? Number.MAX_SAFE_INTEGER, file });
}

for (const line of lines) {
  if (line.assets.length === 0) {
    console.warn(`warning: ${line.file} has no assets pointing at line "${line.id}"`);
  }
}

if (errors.length > 0) {
  console.error(`sync aborted — ${errors.length} problem(s) in the vault:\n`);
  for (const e of errors) console.error(`  ✗ ${e}`);
  console.error("\nassets.json was not written. Fix the notes above and run npm run sync again.");
  process.exit(1);
}

/* -------------------------------------------------------------------- write */

lines.sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));

const manifest = {
  name: meta.data.register,
  description: meta.data.description,
  version: String(meta.data.version),
  updated: new Date().toISOString().slice(0, 10),
  visibility: meta.data.visibility,
  source: "vault/ — this file is generated by scripts/vault-to-manifest.mjs, do not edit by hand",
  conventions: {
    location: meta.data.locations,
    stage: meta.data.stages,
    restricted: meta.data.restricted_policy,
  },
  lines: lines.map((line) => ({
    id: line.id,
    name: line.name,
    tagline: line.tagline,
    accent: line.accent,
    assets: line.assets
      .sort((a, b) => a.order - b.order || a.asset.name.localeCompare(b.asset.name))
      .map((entry) => entry.asset),
  })),
};

// `updated` means "when the register last changed", not "when the script last
// ran" — otherwise every sync would dirty the tree and break the CI drift check
// on any day after the last real edit.
if (existsSync("assets.json")) {
  const previous = JSON.parse(readFileSync("assets.json", "utf8"));
  const sansDate = (o) => JSON.stringify({ ...o, updated: null });
  if (sansDate(previous) === sansDate(manifest)) manifest.updated = previous.updated;
}

writeFileSync("assets.json", JSON.stringify(manifest, null, 2) + "\n");

const total = manifest.lines.reduce((n, l) => n + l.assets.length, 0);
console.log(`vault -> assets.json: ${total} assets across ${manifest.lines.length} lines`);
