import AsyncStorage from '@react-native-async-storage/async-storage';
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

const memoryStore = new Map<string, string>();
const safeStorage = {
  async getItem(key: string): Promise<string | null> {
    try {
      if (typeof window === 'undefined' && typeof navigator === 'undefined' && !(globalThis as any).nativeEventEmitter) {
        return memoryStore.get(key) ?? null;
      }
      return await AsyncStorage.getItem(key);
    } catch {
      return memoryStore.get(key) ?? null;
    }
  },
  async setItem(key: string, value: string): Promise<void> {
    try {
      memoryStore.set(key, value);
      if (typeof window === 'undefined' && typeof navigator === 'undefined' && !(globalThis as any).nativeEventEmitter) {
        return;
      }
      await AsyncStorage.setItem(key, value);
    } catch {}
  },
  async removeItem(key: string): Promise<void> {
    try {
      memoryStore.delete(key);
      if (typeof window === 'undefined' && typeof navigator === 'undefined' && !(globalThis as any).nativeEventEmitter) {
        return;
      }
      await AsyncStorage.removeItem(key);
    } catch {}
  }
};

const FEEDS_STORAGE_KEY = 'akhbar-news-feeds-cache-v1';
const DETAILS_STORAGE_KEY = 'akhbar-news-details-cache-v1';

const cache = new Map<CategoryId, NewsFeed>();
const details = new Map<string, Article>();

let persistenceLoaded = false;
async function ensurePersistenceLoaded() {
  if (persistenceLoaded) return;
  persistenceLoaded = true;
  try {
    const rawFeeds = await safeStorage.getItem(FEEDS_STORAGE_KEY);
    if (rawFeeds) {
      const parsed = JSON.parse(rawFeeds) as Record<CategoryId, NewsFeed>;
      for (const [key, feed] of Object.entries(parsed)) {
        if (!cache.has(key as CategoryId)) {
          cache.set(key as CategoryId, { ...feed, stale: true });
        }
      }
    }
    const rawDetails = await safeStorage.getItem(DETAILS_STORAGE_KEY);
    if (rawDetails) {
      const parsed = JSON.parse(rawDetails) as Record<string, Article>;
      for (const [key, article] of Object.entries(parsed)) {
        if (!details.has(key)) details.set(key, article);
      }
    }
  } catch {}
}

async function persistFeeds() {
  try {
    const obj: Record<string, NewsFeed> = {};
    for (const [k, v] of cache.entries()) obj[k] = v;
    await safeStorage.setItem(FEEDS_STORAGE_KEY, JSON.stringify(obj));
  } catch {}
}

async function persistDetails() {
  try {
    const obj: Record<string, Article> = {};
    for (const [k, v] of details.entries()) obj[k] = v;
    await safeStorage.setItem(DETAILS_STORAGE_KEY, JSON.stringify(obj));
  } catch {}
}

export async function getCacheStats() {
  await ensurePersistenceLoaded();
  let totalArticles = details.size;
  for (const feed of cache.values()) {
    totalArticles += feed.articles.length;
  }
  return {
    feedCount: cache.size,
    articleCount: totalArticles,
  };
}

export async function pruneExpiredArticles(retentionDays: number) {
  if (retentionDays <= 0) return;
  await ensurePersistenceLoaded();
  const maxAgeMs = retentionDays * 24 * 60 * 60 * 1000;
  const now = Date.now();
  let changed = false;

  for (const [key, feed] of cache.entries()) {
    const feedAge = now - Date.parse(feed.fetchedAt);
    if (feedAge > maxAgeMs) {
      cache.delete(key);
      changed = true;
    }
  }

  for (const [id, article] of details.entries()) {
    if (article.published) {
      const pubAge = now - Date.parse(article.published);
      if (pubAge > maxAgeMs) {
        details.delete(id);
        changed = true;
      }
    }
  }

  if (changed) {
    await Promise.all([persistFeeds(), persistDetails()]);
  }
}

export async function clearNewsCache() {
  cache.clear();
  details.clear();
  persistenceLoaded = true;
  await Promise.all([
    safeStorage.removeItem(FEEDS_STORAGE_KEY),
    safeStorage.removeItem(DETAILS_STORAGE_KEY),
  ]);
}

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
  await ensurePersistenceLoaded();
  const previous = cache.get(id);
  if (!refresh && previous && !previous.stale && Date.now() - Date.parse(previous.fetchedAt) < 120_000) return previous;
  try {
    const articles = await readRSS(`https://hihi2.com/category/${category.path}/feed`, controller);
    const feed: NewsFeed = { articles, category: id, fetchedAt: new Date().toISOString(), stale: false };
    cache.set(id, feed);
    persistFeeds();
    return feed;
  } catch (error) {
    if (previous) return { ...previous, stale: true };
    throw error;
  }
}

export async function getArticle(id: string, controller?: AbortController): Promise<Article | null> {
  if (!/^[1-9]\d{0,11}$/.test(id)) return null;
  await ensurePersistenceLoaded();
  if (details.has(id)) return details.get(id)!;
  for (const feed of cache.values()) {
    const article = feed.articles.find(item => getArticleId(item.url) === id);
    if (article) return article;
  }
  try {
    const articles = await readRSS(`https://hihi2.com/?feed=rss2&p=${id}&withoutcomments=1`, controller);
    const article = articles.find(item => getArticleId(item.url) === id) ?? null;
    if (article) {
      if (details.size >= 100) details.delete(details.keys().next().value!);
      details.set(id, article);
      persistDetails();
    }
    return article;
  } catch (error) {
    if (details.has(id)) return details.get(id)!;
    for (const feed of cache.values()) {
      const article = feed.articles.find(item => getArticleId(item.url) === id);
      if (article) return article;
    }
    throw error;
  }
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
