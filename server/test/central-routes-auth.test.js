import test from 'node:test';
import assert from 'node:assert/strict';
import { assertDropAuthorized } from '../lib/central-store.js';

test('assertDropAuthorized fails closed when drop disabled', () => {
  const prev = process.env.CENTRAL_DROP_ENABLED;
  delete process.env.CENTRAL_DROP_ENABLED;
  assert.throws(() => assertDropAuthorized({ headers: {} }), /disabled/);
  if (prev !== undefined) process.env.CENTRAL_DROP_ENABLED = prev;
});

test('assertDropAuthorized requires token when configured', () => {
  const prevE = process.env.CENTRAL_DROP_ENABLED;
  const prevT = process.env.CENTRAL_DROP_TOKEN;
  process.env.CENTRAL_DROP_ENABLED = 'true';
  process.env.CENTRAL_DROP_TOKEN = 'test-token-value';
  assert.throws(() => assertDropAuthorized({ headers: {} }), /Unauthorized/);
  assert.doesNotThrow(() =>
    assertDropAuthorized({ headers: { 'x-central-token': 'test-token-value' } })
  );
  if (prevE === undefined) delete process.env.CENTRAL_DROP_ENABLED;
  else process.env.CENTRAL_DROP_ENABLED = prevE;
  if (prevT === undefined) delete process.env.CENTRAL_DROP_TOKEN;
  else process.env.CENTRAL_DROP_TOKEN = prevT;
});
