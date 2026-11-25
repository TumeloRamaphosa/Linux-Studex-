import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assertDropAuthorized,
  assertProvenanceMatchesBinding,
  resolveDropAuthConfig,
} from '../lib/central-drop-auth.js';

const LONG_TOKEN = 'x'.repeat(32);

function saveEnv() {
  return {
    E: process.env.CENTRAL_DROP_ENABLED,
    T: process.env.CENTRAL_DROP_TOKEN,
    A: process.env.CENTRAL_DROP_BOUND_AGENT,
    O: process.env.CENTRAL_DROP_BOUND_OWNER,
    S: process.env.CENTRAL_DROP_BOUND_SOURCE,
  };
}

function restoreEnv(s) {
  for (const [k, v] of [
    ['CENTRAL_DROP_ENABLED', s.E],
    ['CENTRAL_DROP_TOKEN', s.T],
    ['CENTRAL_DROP_BOUND_AGENT', s.A],
    ['CENTRAL_DROP_BOUND_OWNER', s.O],
    ['CENTRAL_DROP_BOUND_SOURCE', s.S],
  ]) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
}

test('enabled without token is misconfigured (not open)', () => {
  const s = saveEnv();
  process.env.CENTRAL_DROP_ENABLED = 'true';
  delete process.env.CENTRAL_DROP_TOKEN;
  const cfg = resolveDropAuthConfig();
  assert.equal(cfg.mode, 'misconfigured');
  assert.throws(() => assertDropAuthorized({ headers: {} }), /misconfigured|TOKEN/);
  restoreEnv(s);
});

test('enabled with short token is misconfigured', () => {
  const s = saveEnv();
  process.env.CENTRAL_DROP_ENABLED = 'true';
  process.env.CENTRAL_DROP_TOKEN = 'short';
  const cfg = resolveDropAuthConfig();
  assert.equal(cfg.mode, 'misconfigured');
  restoreEnv(s);
});

test('enabled with token but no binding is misconfigured', () => {
  const s = saveEnv();
  process.env.CENTRAL_DROP_ENABLED = 'true';
  process.env.CENTRAL_DROP_TOKEN = LONG_TOKEN;
  delete process.env.CENTRAL_DROP_BOUND_AGENT;
  delete process.env.CENTRAL_DROP_BOUND_OWNER;
  delete process.env.CENTRAL_DROP_BOUND_SOURCE;
  const cfg = resolveDropAuthConfig();
  assert.equal(cfg.mode, 'misconfigured');
  assert.throws(() => assertDropAuthorized({ headers: { 'x-central-token': LONG_TOKEN } }), /misconfigured|bound/);
  restoreEnv(s);
});

test('enabled+binding: missing header 401, wrong token 401, valid passes', () => {
  const s = saveEnv();
  process.env.CENTRAL_DROP_ENABLED = 'true';
  process.env.CENTRAL_DROP_TOKEN = LONG_TOKEN;
  process.env.CENTRAL_DROP_BOUND_AGENT = 'audit';
  process.env.CENTRAL_DROP_BOUND_OWNER = 'Sentinel';
  process.env.CENTRAL_DROP_BOUND_SOURCE = 'node-test';
  assert.throws(() => assertDropAuthorized({ headers: {} }), /Unauthorized/);
  assert.throws(
    () => assertDropAuthorized({ headers: { 'x-central-token': 'y'.repeat(32) } }),
    /Unauthorized/
  );
  const binding = assertDropAuthorized({ headers: { 'x-central-token': LONG_TOKEN } });
  assert.deepEqual(binding, {
    agent: 'audit',
    owner: 'Sentinel',
    source: 'node-test',
  });
  restoreEnv(s);
});

test('provenance impersonation is rejected', () => {
  const binding = { agent: 'audit', owner: 'Sentinel', source: 'node-test' };
  assert.throws(
    () => assertProvenanceMatchesBinding({ agent: 'hermes', owner: 'Sentinel', source: 'node-test' }, binding),
    /does not match/
  );
  assert.doesNotThrow(() =>
    assertProvenanceMatchesBinding({ agent: 'audit', title: 'ok' }, binding)
  );
});
