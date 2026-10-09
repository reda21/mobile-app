import { afterEach, expect, test, vi } from 'vitest';
import { clearNewsCache, flushCachePersist, getCacheStats, getNews, MAX_FEED_ARTICLES } from './news.ts';

function bigRSS(n: number): string {
  const items = Array.from({ length: n }, (_, i) => {
    const id = 5000 + i;
    return `<item><title>خبر ${id}</title><link>https://hihi2.com/p${id}.html</link><description>ملخص ${id}</description><pubDate>Mon, 01 Jan 2024 10:00:00 GMT</pubDate></item>`;
  }).join('');
  return `<rss version="2.0"><channel><title>t</title>${items}</channel></rss>`;
}

afterEach(() => {
  vi.restoreAllMocks();
});

test('getNews plafonne le flux à MAX_FEED_ARTICLES', async () => {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response(bigRSS(40)));
  await clearNewsCache();
  const feed = await getNews('latest', undefined, true);
  expect(feed.articles.length).toBe(MAX_FEED_ARTICLES);
  expect(feed.stale).toBe(false);
  await flushCachePersist();
  const stats = await getCacheStats();
  expect(stats.articleCount).toBe(MAX_FEED_ARTICLES);
});

test('second appel sans refresh réutilise le cache sans fetch', async () => {
  const ok = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response(bigRSS(40)));
  await clearNewsCache();
  await getNews('latest', undefined, true);
  ok.mockRestore();
  const failing = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
    throw new Error('offline');
  });
  const cached = await getNews('latest');
  expect(cached.articles.length).toBe(MAX_FEED_ARTICLES);
  expect(cached.stale).toBe(false);
  failing.mockRestore();
  await flushCachePersist();
});
