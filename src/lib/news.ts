import { XMLParser, XMLValidator } from 'fast-xml-parser';
import { Parser } from 'htmlparser2';
import { decode } from 'html-entities';
import { categories, isSourceUrl, type CategoryId } from './categories.ts';
import { getArticleId } from './article-link.ts';

export interface Article {
  id: string; title: string; url: string; published: string | null;
  summary: string; image: string | null; paragraphs: string[]; tags: string[];
}
export interface NewsFeed {
  category: CategoryId; articles: Article[]; fetchedAt: string; stale: boolean;
}

// Native Text renders plain text. No upstream HTML or scripts enter a WebView.
export function readHtml(html: string) {
  let value = '';
  let excluded = 0;
  let image: string | null = null;
  const blocks = new Set(['p', 'div', 'h1', 'h2', 'h3', 'li', 'blockquote', 'br']);
  const parser = new Parser({
    onopentag(name, attributes) {
      if (name === 'script' || name === 'style') excluded++;
      if (excluded) return;
      if (name === 'img' && !image && isSourceUrl(attributes.src)) image = attributes.src;
      if (blocks.has(name)) value += '\n';
    },
    ontext(part) { if (!excluded) value += part; },
    onclosetag(name) {
      if (name === 'script' || name === 'style') excluded = Math.max(0, excluded - 1);
      if (!excluded && blocks.has(name)) value += '\n';
    },
  }, { decodeEntities: true });
  parser.write(html); parser.end();
  return { image, paragraphs: value.split(/\n+/).map(p => p.trim()).filter(Boolean) };
}

const plainText = (value: unknown) => readHtml(typeof value === 'string' ? value : '').paragraphs.join(' ');

export function parseFeed(xml: string): Article[] {
  if (XMLValidator.validate(xml) !== true) throw new Error('Invalid RSS');
  const data = new XMLParser({ parseTagValue: false, htmlEntities: true }).parse(xml);
  if (!data?.rss?.channel) throw new Error('Missing RSS channel');
  const raw = data.rss.channel.item ?? [];
  const items = Array.isArray(raw) ? raw : [raw];
  const seen = new Set<string>();
  return items.flatMap((item): Article[] => {
    const title = plainText(item.title);
    const url = decode(String(item.link ?? ''));
    if (!title || !isSourceUrl(url) || !getArticleId(url) || seen.has(url)) return [];
    seen.add(url);
    const body = readHtml(String(item['content:encoded'] ?? item.description ?? ''));
    const date = new Date(String(item.pubDate ?? ''));
    return [{ id: url, url, title, ...body,
      published: Number.isNaN(date.getTime()) ? null : date.toISOString(),
      summary: plainText(item.description).replace(/\[\s*…\s*\]$/, '…'),
      tags: (Array.isArray(item.category) ? item.category : [item.category]).map(plainText).filter(Boolean),
    }];
  });
}

const cache = new Map<CategoryId, NewsFeed>();
const details = new Map<string, Article>();

async function readRSS(url: string, controller = new AbortController()) {
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(url, { headers: { Accept: 'application/rss+xml, application/xml' }, signal: controller.signal });
    if (!response.ok) throw new Error('تعذر الاتصال بمصدر الأخبار. حاول مرة أخرى.');
    const xml = await response.text();
    if (xml.length > 2_000_000) throw new Error('RSS too large');
    return parseFeed(xml);
  } finally { clearTimeout(timeout); }
}

export async function getNews(id: CategoryId, controller?: AbortController, refresh = false): Promise<NewsFeed> {
  const category = categories.find(c => c.id === id);
  if (!category) throw new Error('Unknown category');
  const previous = cache.get(id);
  if (!refresh && previous && Date.now() - Date.parse(previous.fetchedAt) < 120_000) return previous;
  try {
    const articles = await readRSS(`https://hihi2.com/category/${category.path}/feed`, controller);
    const feed: NewsFeed = { articles, category: id, fetchedAt: new Date().toISOString(), stale: false };
    cache.set(id, feed);
    return feed;
  } catch (error) {
    if (!controller?.signal.aborted && previous) return { ...previous, stale: true };
    throw error;
  }
}

export async function getArticle(id: string, controller?: AbortController): Promise<Article | null> {
  if (!/^[1-9]\d{0,11}$/.test(id)) return null;
  if (details.has(id)) return details.get(id)!;
  for (const feed of cache.values()) {
    const article = feed.articles.find(item => getArticleId(item.url) === id);
    if (article) return article;
  }
  const articles = await readRSS(`https://hihi2.com/?feed=rss2&p=${id}&withoutcomments=1`, controller);
  const article = articles.find(item => getArticleId(item.url) === id) ?? null;
  if (article) {
    if (details.size >= 100) details.delete(details.keys().next().value!);
    details.set(id, article);
  }
  return article;
}

export function isArticle(value: unknown): value is Article {
  if (!value || typeof value !== 'object') return false;
  const a = value as Article;
  return typeof a.id === 'string' && typeof a.title === 'string' && isSourceUrl(a.url) && !!getArticleId(a.url)
    && typeof a.summary === 'string' && (a.image === null || isSourceUrl(a.image))
    && (a.published === null || (typeof a.published === 'string' && !Number.isNaN(Date.parse(a.published))))
    && Array.isArray(a.paragraphs) && a.paragraphs.every(p => typeof p === 'string')
    && Array.isArray(a.tags) && a.tags.every(tag => typeof tag === 'string');
}
