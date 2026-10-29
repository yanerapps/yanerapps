import assert from 'node:assert/strict';
import { test } from 'node:test';
import { providerJunctions } from './provider-layout.ts';

test('places junctions between the source, providers, and target in both layouts', () => {
  const source = { x: 0, y: 0, width: 100, height: 80 };
  const providers = [
    { x: 200, y: 200, width: 100, height: 80 },
    { x: 200, y: 300, width: 100, height: 80 },
  ];
  const target = { x: 400, y: 500, width: 100, height: 80 };
  assert.deepEqual(providerJunctions(source, target, providers, false), {
    fork: { x: 125, y: 40 },
    merge: { x: 375, y: 540 },
  });
  assert.deepEqual(providerJunctions(source, target, providers, true), {
    fork: { x: 50, y: 110 },
    merge: { x: 450, y: 470 },
  });
});
