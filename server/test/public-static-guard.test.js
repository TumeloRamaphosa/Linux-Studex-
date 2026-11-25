import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  PUBLIC_FILES,
  isPublicStaticRequest,
  resolvePublicStaticPath,
} from '../lib/public-static-guard.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

test('PUBLIC_FILES allowlist blocks .git and nested paths', () => {
  assert.ok(PUBLIC_FILES.has('dashboard.html'));
  assert.ok(PUBLIC_FILES.has('agent-central.html'));
  assert.ok(!PUBLIC_FILES.has('.git'));
  assert.equal(isPublicStaticRequest('GET', '/.git/HEAD'), false);
  assert.equal(isPublicStaticRequest('GET', '/dashboard.html'), true);
  assert.equal(isPublicStaticRequest('GET', '/auto-push.sh'), false);
  assert.equal(isPublicStaticRequest('GET', '/../.git/HEAD'), false);
});

test('resolvePublicStaticPath only returns allowlisted files', () => {
  const dash = resolvePublicStaticPath(repoRoot, '/dashboard.html');
  assert.ok(dash.endsWith('dashboard.html'));
  assert.throws(() => resolvePublicStaticPath(repoRoot, '/.git/HEAD'), /Not found/);
});
