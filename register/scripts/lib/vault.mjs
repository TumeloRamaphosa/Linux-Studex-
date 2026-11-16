/**
 * Shared helpers for the Obsidian vault at vault/.
 *
 * The vault is the source of truth. assets.json is generated from it.
 * Everything here is deliberately tolerant of hand-editing: notes are parsed
 * with a real YAML parser, unknown frontmatter keys are preserved on write,
 * and free-form note bodies are never touched by the generators.
 */

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from "node:fs";
import { join, basename, dirname } from "node:path";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";

export const VAULT = "vault";
export const DIRS = {
  assets: join(VAULT, "Assets"),
  lines: join(VAULT, "Lines"),
  meta: join(VAULT, "Meta"),
};

export const STAGES = ["live", "ready", "draft", "research"];
export const LOCATIONS = ["workspace", "repo"];

/** Region of a generated note body that build-vault.mjs owns. Anything a
 *  human writes above BEGIN is preserved across rebuilds. */
export const GEN_BEGIN = "<!-- BEGIN GENERATED — build-vault.mjs owns everything below this line -->";
export const GEN_END = "<!-- END GENERATED -->";

/** Characters Obsidian and the major filesystems reject in a note title. */
export function toFilename(name) {
  return name
    .replace(/[\\/:*?"<>|#^[\]]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

export function readNote(file) {
  const raw = readFileSync(file, "utf8");
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) {
    return { data: {}, body: raw, title: basename(file, ".md"), file };
  }
  let data;
  try {
    data = parseYaml(match[1]) ?? {};
  } catch (err) {
    throw new Error(`${file}: frontmatter is not valid YAML — ${err.message}`);
  }
  if (typeof data !== "object" || Array.isArray(data)) {
    throw new Error(`${file}: frontmatter must be a mapping of keys to values`);
  }
  return { data, body: match[2], title: basename(file, ".md"), file };
}

export function writeNote(file, data, body) {
  mkdirSync(dirname(file), { recursive: true });
  const yaml = stringifyYaml(data, { lineWidth: 0 }).trimEnd();
  writeFileSync(file, `---\n${yaml}\n---\n\n${body.replace(/^\n+/, "").trimEnd()}\n`);
}

export function listNotes(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .sort()
    .map((f) => join(dir, f));
}

/** Replaces the generated region of an existing body, keeping the human part. */
export function spliceGenerated(body, generated) {
  const block = `${GEN_BEGIN}\n\n${generated.trim()}\n\n${GEN_END}`;
  const start = body.indexOf(GEN_BEGIN);
  if (start === -1) return `${body.trimEnd()}\n\n${block}\n`;
  const end = body.indexOf(GEN_END, start);
  const preserved = body.slice(0, start).trimEnd();
  const trailing = end === -1 ? "" : body.slice(end + GEN_END.length).trimEnd();
  return `${preserved}\n\n${block}${trailing ? `\n\n${trailing}` : ""}\n`;
}

/** Obsidian wikilinks break on these, so asset and line titles must avoid them. */
export function assertLinkSafe(title, file) {
  if (/[[\]|#^]/.test(title)) {
    throw new Error(`${file}: title "${title}" contains characters that break wikilinks ([ ] | # ^)`);
  }
}

export const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Markdown table cells cannot contain a raw pipe. */
export const cell = (s) => String(s ?? "").replace(/\|/g, "\\|");
