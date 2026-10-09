import { test, assert } from 'vitest';
import { formatCount, formatDateAr } from './format.ts';

test('formatCount uses Arabic-Egyptian digits', () => {
  assert.equal(formatCount(1234), '١٬٢٣٤');
});

test('formatDateAr handles missing and valid dates', () => {
  assert.equal(formatDateAr(null), '');
  assert.equal(formatDateAr('not-a-date'), '');
  assert.match(formatDateAr('2026-10-09T12:00:00.000Z'), /٢٠٢٦|أكتوبر|أكت/);
  assert.match(formatDateAr('2026-10-09T12:00:00.000Z', 'long'), /٢٠٢٦|أكتوبر|أكت/);
});
