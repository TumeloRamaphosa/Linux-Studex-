#!/usr/bin/env node
/**
 * Local pattern scan — not a substitute for Aikido when unavailable.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const PATTERNS = [
  { name: 'ghp_token', re: /ghp_[A-Za-z0-9]{20,}/ },
  { name: 'openai_sk', re: /sk-[A-Za-z0-9]{20,}/ },
  { name: 'github_pat', re: /github_pat_[A-Za-z0-9_]{20,}/ },
  { name: 'aws_key', re: /AKIA[0-9A-Z]{16}/ },
  { name: 'private_key', re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
  { name: 'email', re: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i },
];

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    if (name === 'node_modules' || name === '.git') continue;
    const abs = path.join(dir, name);
    const st = fs.statSync(abs);
    if (st.isDirectory()) walk(abs, out);
    else out.push(abs);
  }
  return out;
}

const hits = [];
for (const file of walk(ROOT)) {
  if (!/\.(json|md|js|mjs|html|sh)$/.test(file)) continue;
  const text = fs.readFileSync(file, 'utf8');
  for (const p of PATTERNS) {
    if (p.re.test(text)) hits.push({ file: path.relative(ROOT, file), pattern: p.name });
  }
}

if (hits.length) {
  console.error(JSON.stringify({ ok: false, scanner: 'local-pattern-only', hits }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({ ok: true, scanner: 'local-pattern-only', note: 'Aikido not run' }));
