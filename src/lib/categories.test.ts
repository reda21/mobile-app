import { test, assert } from 'vitest';
import { APP_NAME, categories, isSourceUrl } from './categories.ts';

test('APP_NAME is defined and in Arabic', () => {
  assert.equal(typeof APP_NAME, 'string');
  assert.equal(APP_NAME.length > 0, true);
  assert.match(APP_NAME, /[\u0600-\u06FF]/);
});

test('categories list is properly structured with unique ids and valid groups', () => {
  assert.equal(categories.length, 25);
  const ids = new Set<string>();
  const paths = new Set<string>();

  for (const cat of categories) {
    assert.equal(typeof cat.id, 'string');
    assert.equal(typeof cat.name, 'string');
    assert.equal(typeof cat.path, 'string');
    assert.match(cat.group, /^(news|teams)$/);

    assert.equal(ids.has(cat.id), false, `Duplicate category id: ${cat.id}`);
    ids.add(cat.id);

    assert.equal(paths.has(cat.path), false, `Duplicate category path: ${cat.path}`);
    paths.add(cat.path);
  }

  const teams = categories.filter(c => c.group === 'teams');
  assert.equal(teams.length, 14);
  const news = categories.filter(c => c.group === 'news');
  assert.equal(news.length, 11);
});

test('isSourceUrl strictly validates trusted hihi2.com domains over HTTPS', () => {
  assert.equal(isSourceUrl('https://hihi2.com/2026/10/p123.html'), true);
  assert.equal(isSourceUrl('https://sc1.hihi2.com/photo.jpg'), true);
  assert.equal(isSourceUrl('https://sub.sub2.hihi2.com/path'), true);

  // Insecure or wrong protocol
  assert.equal(isSourceUrl('http://hihi2.com/article'), false);
  assert.equal(isSourceUrl('ftp://hihi2.com/file'), false);
  assert.equal(isSourceUrl('javascript:alert(1)'), false);

  // Phishing or spoofing attempts
  assert.equal(isSourceUrl('https://evil-hihi2.com/hack'), false);
  assert.equal(isSourceUrl('https://hihi2.com.evil.com/'), false);
  assert.equal(isSourceUrl('https://user:pass@hihi2.com/path'), false);
  assert.equal(isSourceUrl('https://google.com'), false);

  // Non-strings or invalid URLs
  assert.equal(isSourceUrl(null), false);
  assert.equal(isSourceUrl(undefined), false);
  assert.equal(isSourceUrl(12345), false);
  assert.equal(isSourceUrl({}), false);
  assert.equal(isSourceUrl('not a url'), false);
});
