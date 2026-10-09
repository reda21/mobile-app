import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseFeed, readHtml, getArticle, isArticle } from './news.ts';
import { categories } from './categories.ts';
import { getArticleId } from './article-link.ts';

test('native reader preserves Arabic paragraphs and ignores HTML scripts, style and unsafe images', () => {
  const body = readHtml('<p>أخبار &amp; كرة</p><script>bad()</script><style>.hidden{}</style><img src="javascript:bad()"/><img src="https://sc1.hihi2.com/photo.jpg" onerror="bad()"/><p>التفاصيل &#8230;</p>');
  assert.deepEqual(body.paragraphs, ['أخبار & كرة', 'التفاصيل …']);
  assert.equal(body.image, 'https://sc1.hihi2.com/photo.jpg');
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

test('25 categories include the 14 requested clubs and article links accept only source IDs', async () => {
  assert.equal(categories.length, 25);
  assert.equal(categories.filter(c => c.group === 'teams').length, 14);
  assert.equal(new Set(categories.map(c => c.id)).size, categories.length);
  assert.equal(getArticleId('https://hihi2.com/2026/10/09/p123.html'), '123');
  assert.equal(getArticleId('https://evil.example/p123.html'), null);
  assert.equal(await getArticle('../../outside'), null);
});

test('direct mobile deep links load a single-post RSS without a previous news screen', async (t) => {
  t.mock.method(globalThis, 'fetch', async (url: string) => {
    assert.equal(url, 'https://hihi2.com/?feed=rss2&p=556677&withoutcomments=1');
    return new Response('<rss><channel><item><title>خبر مباشر</title><link>https://hihi2.com/p556677.html</link><description>تفاصيل الخبر</description></item></channel></rss>');
  });
  assert.equal((await getArticle('556677'))?.title, 'خبر مباشر');
});
