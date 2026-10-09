import { test, assert } from 'vitest';
import { getArticleId, getArticleHref } from './article-link.ts';

test('getArticleId extracts numerical article ID from path pattern', () => {
  assert.equal(getArticleId('https://hihi2.com/2026/10/09/p12345.html'), '12345');
  assert.equal(getArticleId('https://hihi2.com/p9999.html'), '9999');
  assert.equal(getArticleId('https://sc1.hihi2.com/news/p7.html'), '7');
});

test('getArticleId extracts numerical article ID from query parameters', () => {
  assert.equal(getArticleId('https://hihi2.com/?p=445566'), '445566');
  assert.equal(getArticleId('https://hihi2.com/?feed=rss2&p=778899&withoutcomments=1'), '778899');
});

test('getArticleId rejects invalid or malicious URLs and non-numeric IDs', () => {
  assert.equal(getArticleId('https://evil.example/p123.html'), null);
  assert.equal(getArticleId('https://hihi2.com/p0.html'), null);
  assert.equal(getArticleId('https://hihi2.com/p-10.html'), null);
  assert.equal(getArticleId('https://hihi2.com/pabc.html'), null);
  assert.equal(getArticleId('https://hihi2.com/?p=0'), null);
  assert.equal(getArticleId('https://hihi2.com/?p=-5'), null);
  assert.equal(getArticleId('https://hihi2.com/?p=sql_injection'), null);
  assert.equal(getArticleId('invalid-string'), null);
});

test('getArticleHref generates valid Expo Router paths', () => {
  assert.equal(getArticleHref('https://hihi2.com/p123.html'), '/article/123');
  assert.equal(getArticleHref('https://hihi2.com/p123.html', 'latest'), '/article/123');
  assert.equal(getArticleHref('https://hihi2.com/p123.html', 'europe'), '/article/123?category=europe');
  assert.equal(getArticleHref('https://hihi2.com/p123.html', 'real-madrid'), '/article/123?category=real-madrid');
  assert.equal(getArticleHref('https://evil.com/test'), '/article/unknown');
});
