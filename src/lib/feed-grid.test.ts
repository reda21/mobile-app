import { test, assert } from 'vitest';
import { groupIntoRows } from './feed-grid.ts';

const keyOf = (n: number) => String(n);

test('groupIntoRows with one column keeps each item on its own row', () => {
  const rows = groupIntoRows([1, 2, 3], 1, keyOf);
  assert.deepEqual(rows.map(r => r.items), [[1], [2], [3]]);
  assert.deepEqual(rows.map(r => r.key), ['1', '2', '3']);
});

test('groupIntoRows packs items into rows of the requested width', () => {
  const rows = groupIntoRows([1, 2, 3, 4, 5], 2, keyOf);
  assert.deepEqual(rows.map(r => r.items), [[1, 2], [3, 4], [5]]);
  assert.deepEqual(rows.map(r => r.key), ['1', '3', '5']);
});

test('groupIntoRows handles empty input and clamps invalid widths', () => {
  assert.deepEqual(groupIntoRows([], 2, keyOf), []);
  assert.deepEqual(groupIntoRows([1, 2], 0, keyOf).map(r => r.items), [[1], [2]]);
  assert.deepEqual(groupIntoRows([1, 2], -3, keyOf).map(r => r.items), [[1], [2]]);
});
