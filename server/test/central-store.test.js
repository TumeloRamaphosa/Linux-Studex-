import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import os from 'os';

import {
  assertClean,
  CENTRAL_ROOT,
  centralDropPolicy,
  dropReport,
  listMarkdown,
  readMarkdown,
  resolveMarkdown,
  validateProvenance,
} from '../lib/central-store.js';

test('resolveMarkdown stays inside the data room', () => {
  const readme = resolveMarkdown('README.md');
  assert.equal(path.basename(readme.abs), 'README.md');
  assert.throws(() => resolveMarkdown('../server/index.js'), /not allowed/);
  assert.throws(() => resolveMarkdown('notes/secret.txt'), /markdown/);
});

test('resolveMarkdown rejects symlink escape', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ac-symlink-'));
  const outside = path.join(tmp, 'outside.md');
  fs.writeFileSync(outside, '# outside\n');
  const link = path.join(CENTRAL_ROOT, 'inbox', '_probe-symlink.md');
  try {
    fs.mkdirSync(path.dirname(link), { recursive: true });
    fs.symlinkSync(outside, link);
    assert.throws(() => resolveMarkdown('inbox/_probe-symlink.md'), /not allowed/);
  } finally {
    try {
      fs.unlinkSync(link);
    } catch {
      /* ignore */
    }
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('assertClean rejects tokens, invites, email, and IP addresses', () => {
  assert.doesNotThrow(() => assertClean('Meat gift box. Price not on file.'));
  assert.throws(() => assertClean('key ghp_abcdefghijklmnopqrstuvwxyz123456'), /Refused/);
  assert.throws(() => assertClean('join https://discord.gg/ab12cd'), /Refused/);
  assert.throws(() => assertClean('host 10.1.2.3'), /Refused/);
  assert.throws(() => assertClean('contact user at mailbox@example.org'), /Refused/);
});

test('validateProvenance requires agent owner source date', () => {
  const day = validateProvenance({
    agent: 'audit',
    owner: 'Sentinel',
    source: 'unit-test',
    date: '2026-11-08',
  });
  assert.equal(day, '2026-11-08');
  assert.throws(
    () => validateProvenance({ agent: 'audit', owner: 'ab', source: 'src', date: 'bad' }),
    /Date/
  );
});

test('centralDropPolicy is fail-closed by default', () => {
  const prev = process.env.CENTRAL_DROP_ENABLED;
  delete process.env.CENTRAL_DROP_ENABLED;
  const policy = centralDropPolicy();
  assert.equal(policy.enabled, false);
  assert.equal(policy.failClosed, true);
  if (prev !== undefined) process.env.CENTRAL_DROP_ENABLED = prev;
});

test('list and read the room', () => {
  const files = listMarkdown();
  assert.ok(files.some((f) => f.path === 'README.md'));
  const readme = readMarkdown('README.md');
  assert.match(readme.body, /Agent Central/);
});

test('dropReport writes inbox file with provenance header', () => {
  const prev = process.env.CENTRAL_DROP_ENABLED;
  process.env.CENTRAL_DROP_ENABLED = 'true';
  const title = `prov-${process.pid}-${Date.now()}`;
  const saved = dropReport({
    agent: 'test',
    owner: 'Sentinel',
    source: 'node-test',
    date: '2026-11-08',
    title,
    body: '# Test drop\n\nProvenance required.\n',
  });
  const abs = path.join(CENTRAL_ROOT, saved.path);
  assert.equal(fs.existsSync(abs), true);
  const text = fs.readFileSync(abs, 'utf8');
  assert.match(text, /^---\nagent: test\nowner: Sentinel\nsource: node-test\ndate: 2026-11-08\n---/);
  fs.unlinkSync(abs);
  if (prev === undefined) delete process.env.CENTRAL_DROP_ENABLED;
  else process.env.CENTRAL_DROP_ENABLED = prev;
});

test('dropReport refuses secret body in testcase', () => {
  assert.throws(
    () =>
      dropReport({
        agent: 'test',
        owner: 'Sentinel',
        source: 'node-test',
        date: '2026-11-08',
        title: 'nope',
        body: 'token sk-abcdefghijklmnopqrstuvwxyz',
      }),
    /Refused/
  );
});
