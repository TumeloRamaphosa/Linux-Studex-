import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';

import {
  assertClean,
  CENTRAL_ROOT,
  dropReport,
  listMarkdown,
  readMarkdown,
  resolveMarkdown,
} from '../lib/central-store.js';

test('resolveMarkdown stays inside the data room', () => {
  const readme = resolveMarkdown('README.md');
  assert.equal(path.basename(readme.abs), 'README.md');
  assert.throws(() => resolveMarkdown('../server/index.js'), /not allowed/);
  assert.throws(() => resolveMarkdown('notes/secret.txt'), /markdown/);
});

test('assertClean rejects tokens, invites, and IP addresses', () => {
  assert.doesNotThrow(() => assertClean('Meat gift box. Price not on file.'));
  assert.throws(() => assertClean('key ghp_abcdefghijklmnopqrstuvwxyz123456'), /Refused/);
  assert.throws(() => assertClean('join https://discord.gg/ab12cd'), /Refused/);
  assert.throws(() => assertClean('host 10.1.2.3'), /Refused/);
});

test('list and read the room', () => {
  const files = listMarkdown();
  assert.ok(files.some((f) => f.path === 'README.md'));
  const readme = readMarkdown('README.md');
  assert.match(readme.body, /Agent Central/);
});

test('dropReport writes a new inbox file and will not overwrite it', () => {
  const title = `test-${process.pid}-${Date.now()}`;
  const saved = dropReport({
    agent: 'test',
    title,
    body: '# Test drop\n\n- Agent: test\n- Done: unit test\n',
  });
  const abs = path.join(CENTRAL_ROOT, saved.path);
  assert.equal(fs.existsSync(abs), true);
  assert.throws(() => dropReport({
    agent: 'test',
    title,
    body: '# Test drop\n\nagain\n',
  }), /already exists/);
  fs.unlinkSync(abs);
});

test('dropReport refuses a secret body', () => {
  assert.throws(() => dropReport({
    agent: 'test',
    title: 'nope',
    body: 'token sk-abcdefghijklmnopqrstuvwxyz',
  }), /Refused/);
});
