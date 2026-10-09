import { test, assert, vi, expect } from 'vitest';
import { parseFeed, readHtml, getNews, getArticle, isArticle, clearNewsCache, flushCachePersist, getCacheStats, pruneExpiredArticles, type Article } from './news.ts';
import { categories, type CategoryId } from './categories.ts';
import { getArticleId, getArticleHref } from './article-link.ts';

test('native reader preserves Arabic paragraphs and ignores HTML scripts, style and unsafe images', () => {
  const body = readHtml('<p>أخبار &amp; كرة</p><script>bad()</script><style>.hidden{}</style><img src="javascript:bad()"/><img src="https://sc1.hihi2.com/photo.jpg" onerror="bad()"/><p>التفاصيل &#8230;</p>');
  assert.deepEqual(body.paragraphs, ['أخبار & كرة', 'التفاصيل …']);
  assert.equal(body.image, 'https://sc1.hihi2.com/photo.jpg');
});
test('native reader decodes diverse HTML entities and ignores external untrusted images', () => {
  const html = '<div>&quot;ريال مدريد&quot; &lt;يفوز&gt; &#x20AC;100m</div><img src="https://malicious.com/tracker.png" /><img src="https://sc2.hihi2.com/pic.png" />';
  const res = readHtml(html);
  assert.deepEqual(res.paragraphs, ['"ريال مدريد" <يفوز> €100m']);
  assert.equal(res.image, 'https://sc2.hihi2.com/pic.png');
});

test('RSS parsing rejects invalid articles and restores the complete article text', () => {
  const articles = parseFeed(`<rss xmlns:content="https://purl.org/rss/1.0/modules/content/"><channel>
    <item><title>خبر جديد</title><link>https://hihi2.com/2026/10/09/p123.html</link><description>الموجز</description><content:encoded><![CDATA[<p>التفاصيل كاملة.</p>]]></content:encoded></item>
    <item><title>خارج المصدر</title><link>https://evil.example/p1.html</link></item>
    </channel></rss>`);
  assert.equal(articles.length, 1);
  assert.deepEqual(articles[0].paragraphs, ['التفاصيل كاملة.']);
  assert.equal(isArticle(articles[0]), true);
  assert.equal(isArticle({ ...articles[0], url: 'javascript:bad()' }), false);
  assert.throws(() => parseFeed('<rss><channel>'));
});

test('RSS parsing handles duplicate items and falls back to description when content:encoded is missing', () => {
  const xml = `<rss><channel>
    <item><title>خبر أول</title><link>https://hihi2.com/p111.html</link><description>وصف الخبر 1</description></item>
    <item><title>خبر مكرر</title><link>https://hihi2.com/p111.html</link><description>وصف مكرر</description></item>
    <item><title>بدون رابط</title><description>يجب تجاهله</description></item>
    <item><title>خبر ثان</title><link>https://hihi2.com/p222.html</link><description>وصف الخبر 2</description><category>أوروبا</category></item>
  </channel></rss>`;
  const items = parseFeed(xml);
  assert.equal(items.length, 2);
  assert.equal(items[0].id, 'https://hihi2.com/p111.html');
  assert.deepEqual(items[0].paragraphs, ['وصف الخبر 1']);
  assert.deepEqual(items[1].tags, ['أوروبا']);
});

test('isArticle strictly validates article objects', () => {
  const valid: Article = {
    id: 'https://hihi2.com/p123.html',
    url: 'https://hihi2.com/p123.html',
    title: 'عنوان المقال',
    summary: 'الملخص',
    published: '2026-10-09T12:00:00.000Z',
    image: 'https://sc1.hihi2.com/img.jpg',
    paragraphs: ['فقرة 1'],
    tags: ['كرة قدم'],
  };
  assert.equal(isArticle(valid), true);

  // Missing or invalid fields
  assert.equal(isArticle(null), false);
  assert.equal(isArticle(undefined), false);
  assert.equal(isArticle({ ...valid, title: 123 }), false);
  assert.equal(isArticle({ ...valid, url: 'https://fake.com/p1' }), false);
  assert.equal(isArticle({ ...valid, image: 'https://bad.com/a.jpg' }), false);
  assert.equal(isArticle({ ...valid, published: 'invalid-date' }), false);
  assert.equal(isArticle({ ...valid, paragraphs: 'not-array' }), false);
  assert.equal(isArticle({ ...valid, tags: [123] }), false);
});

test('25 categories include the 14 requested clubs and article links accept only source IDs', async () => {
  assert.equal(categories.length, 25);
  assert.equal(categories.filter(c => c.group === 'teams').length, 14);
  assert.equal(new Set(categories.map(c => c.id)).size, categories.length);
  assert.equal(getArticleId('https://hihi2.com/2026/10/09/p123.html'), '123');
  assert.equal(getArticleId('https://evil.example/p123.html'), null);
  assert.equal(await getArticle('../../outside'), null);
});

test('direct mobile deep links load a single-post RSS without a previous news screen', async () => {
  const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url: string | URL | Request) => {
    assert.equal(url, 'https://hihi2.com/?feed=rss2&p=556677&withoutcomments=1');
    return new Response('<rss><channel><item><title>خبر مباشر</title><link>https://hihi2.com/p556677.html</link><description>تفاصيل الخبر</description></item></channel></rss>');
  });
  assert.equal((await getArticle('556677'))?.title, 'خبر مباشر');
  fetchSpy.mockRestore();
});

test('getNews throws on unknown category', async () => {
  await expect(getNews('unknown-cat' as unknown as CategoryId)).rejects.toThrow(/Unknown category/);
});

test('getNews falls back to cached feed with stale: true on network error', async () => {
  // First, simulate successful fetch
  const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
    return new Response('<rss><channel><item><title>خبر محفوظ</title><link>https://hihi2.com/p8888.html</link><description>موجز</description></item></channel></rss>');
  });
  const freshFeed = await getNews('latest', undefined, true);
  assert.equal(freshFeed.articles.length, 1);
  assert.equal(freshFeed.stale, false);

  // Second, simulate network failure
  fetchSpy.mockImplementation(async () => {
    throw new Error('Network offline');
  });
  const staleFeed = await getNews('latest', undefined, true);
  assert.equal(staleFeed.articles.length, 1);
  assert.equal(staleFeed.stale, true);
  fetchSpy.mockRestore();
});

test('getArticleHref generates correct singular Expo Router path', () => {
  assert.equal(getArticleHref('https://hihi2.com/p999.html'), '/article/999');
  assert.equal(getArticleHref('https://hihi2.com/p999.html', 'europe'), '/article/999?category=europe');
});

test('clearNewsCache empties cache and getCacheStats reports zeroes', async () => {
  await clearNewsCache();
  const stats = await getCacheStats();
  assert.equal(stats.feedCount, 0);
  assert.equal(stats.articleCount, 0);
});

test('pruneExpiredArticles executes without errors', async () => {
  await pruneExpiredArticles(1);
  await pruneExpiredArticles(7);
});

test('pruneExpiredArticles removes feeds older than the retention window', async () => {
  await clearNewsCache();
  const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response('<rss><channel><item><title>خبر قديم</title><link>https://hihi2.com/p9090.html</link><description>موجز</description></item></channel></rss>'));
  vi.useFakeTimers();
  try {
    vi.setSystemTime(new Date('2026-10-09T12:00:00.000Z'));
    await getNews('asia', undefined, true);
    await flushCachePersist();
    vi.setSystemTime(new Date('2026-10-17T12:00:00.000Z'));
    await pruneExpiredArticles(7);
    assert.equal((await getCacheStats()).feedCount, 0);
  } finally {
    vi.useRealTimers();
    fetchSpy.mockRestore();
    await clearNewsCache();
  }
});

test('getNews serves instant cache with stale: true when offline without calling fetch', async () => {
  const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
    return new Response('<rss><channel><item><title>خبر أوفلاين</title><link>https://hihi2.com/p7777.html</link><description>موجز</description></item></channel></rss>');
  });
  await getNews('arab', undefined, true);
  fetchSpy.mockClear();

  const { setOnlineChecker } = await import('./news.ts');
  setOnlineChecker(async () => false);
  try {
    const feed = await getNews('arab', undefined, true);
    assert.equal(feed.articles.length, 1);
    assert.equal(feed.articles[0].id, 'https://hihi2.com/p7777.html');
    assert.equal(feed.stale, true);
    assert.equal(fetchSpy.mock.calls.length, 0);
  } finally {
    setOnlineChecker(async () => true);
    fetchSpy.mockRestore();
  }
});
