import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const CENTRAL_ROOT = path.resolve(__dirname, '..', '..', 'agent-central');

const SECRET_PATTERNS = [
  /ghp_[A-Za-z0-9]{20,}/,
  /github_pat_[A-Za-z0-9_]{20,}/,
  /sk-[A-Za-z0-9]{20,}/,
  /xox[baprs]-[A-Za-z0-9-]{10,}/,
  /AKIA[0-9A-Z]{16}/,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /discord\.gg\/[A-Za-z0-9]+/i,
  /slack\.com\/invite/i,
  /\b(?:\d{1,3}\.){3}\d{1,3}\b/,
];

export function assertClean(text) {
  const hit = SECRET_PATTERNS.find((re) => re.test(text));
  if (hit) {
    const err = new Error('Refused: text looks like a token, invite link, or IP address');
    err.status = 400;
    throw err;
  }
}

export function resolveMarkdown(rel) {
  const cleaned = String(rel || '').replace(/\\/g, '/').replace(/^\/+/, '');
  if (!cleaned || cleaned.includes('..') || cleaned.includes('\0')) {
    const err = new Error('Path is not allowed');
    err.status = 400;
    throw err;
  }
  if (!cleaned.endsWith('.md')) {
    const err = new Error('Only markdown files are stored here');
    err.status = 400;
    throw err;
  }
  const abs = path.resolve(CENTRAL_ROOT, cleaned);
  const rootWithSep = CENTRAL_ROOT.endsWith(path.sep) ? CENTRAL_ROOT : CENTRAL_ROOT + path.sep;
  if (abs !== CENTRAL_ROOT && !abs.startsWith(rootWithSep)) {
    const err = new Error('Path is not allowed');
    err.status = 400;
    throw err;
  }
  return { rel: cleaned, abs };
}

export function listMarkdown(dir = CENTRAL_ROOT, prefix = '') {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listMarkdown(abs, rel));
    else if (entry.isFile() && entry.name.endsWith('.md')) {
      const stat = fs.statSync(abs);
      out.push({ path: rel, bytes: stat.size, updated: stat.mtime.toISOString() });
    }
  }
  return out.sort((a, b) => a.path.localeCompare(b.path));
}

export function readMarkdown(rel) {
  const { abs, rel: safe } = resolveMarkdown(rel);
  if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) {
    const err = new Error('Not found');
    err.status = 404;
    throw err;
  }
  return { path: safe, body: fs.readFileSync(abs, 'utf8') };
}

function slug(value, fallback) {
  const s = String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return s || fallback;
}

export function dropReport({ agent, title, body }) {
  const text = String(body || '');
  if (!text.trim()) {
    const err = new Error('Body is required');
    err.status = 400;
    throw err;
  }
  if (text.length > 100_000) {
    const err = new Error('Body is too large');
    err.status = 400;
    throw err;
  }
  assertClean(text);
  assertClean(`${agent || ''} ${title || ''}`);

  const day = new Date().toISOString().slice(0, 10);
  const name = `${day}-${slug(agent, 'agent')}-${slug(title, 'note')}.md`;
  const { abs, rel } = resolveMarkdown(`inbox/${name}`);
  if (path.basename(abs) === 'README.md') {
    const err = new Error('Refused');
    err.status = 400;
    throw err;
  }
  if (fs.existsSync(abs)) {
    const err = new Error('A drop with that name already exists');
    err.status = 409;
    throw err;
  }
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, text.endsWith('\n') ? text : `${text}\n`, { encoding: 'utf8', flag: 'wx' });
  return { path: rel, bytes: Buffer.byteLength(text) };
}
