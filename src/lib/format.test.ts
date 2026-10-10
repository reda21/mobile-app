import { test, assert } from 'vitest';
import { formatCount, formatDateAr } from './format.ts';

test('formatCount uses Latin digits', () => {
  assert.equal(formatCount(1234), '1,234');
});

test('formatDateAr handles missing and valid dates', () => {
  assert.equal(formatDateAr(null), '');
  assert.equal(formatDateAr('not-a-date'), '');
  assert.match(formatDateAr('2026-10-09T12:00:00.000Z'), /2026|أكتوبر|أكت/);
  assert.match(formatDateAr('2026-10-09T12:00:00.000Z', 'long'), /2026|أكتوبر|أكت/);
});
