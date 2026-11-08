import test from 'node:test';
import assert from 'node:assert/strict';
import { assertDropAuthorized } from '../lib/central-drop-auth.js';

test('assertDropAuthorized fails closed when drop disabled', () => {
  const prev = process.env.CENTRAL_DROP_ENABLED;
  delete process.env.CENTRAL_DROP_ENABLED;
  assert.throws(() => assertDropAuthorized({ headers: {} }), /disabled/);
  if (prev !== undefined) process.env.CENTRAL_DROP_ENABLED = prev;
});
