import AsyncStorage from '@react-native-async-storage/async-storage';
import { getNews, type Article } from './news';
import type { CategoryId } from './categories';

const LAST_SEEN_KEY = 'akhbar-last-seen-v1';
const LAST_NOTIFY_KEY = 'akhbar-last-notify-at-v1';

type LastSeenMap = Record<string, { id: string; at: string }>;

const memory = new Map<string, string>();

async function safeGet(key: string): Promise<string | null> {
  try {
    if (typeof window === 'undefined' && typeof navigator === 'undefined' && !(globalThis as any).nativeEventEmitter) {
      return memory.get(key) ?? null;
    }
    return await AsyncStorage.getItem(key);
  } catch {
    return memory.get(key) ?? null;
  }
}

async function safeSet(key: string, value: string): Promise<void> {
  try {
    memory.set(key, value);
    if (typeof window === 'undefined' && typeof navigator === 'undefined' && !(globalThis as any).nativeEventEmitter) return;
    await AsyncStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

export async function loadLastSeen(): Promise<LastSeenMap> {
  try {
    const raw = await safeGet(LAST_SEEN_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as LastSeenMap;
    return typeof parsed === 'object' && parsed ? parsed : {};
  } catch {
    return {};
  }
}

export function getLastSeenId(seen: LastSeenMap, category: CategoryId): string | null {
  return seen[category]?.id ?? null;
}

export async function markCategorySeen(category: CategoryId, headId: string): Promise<LastSeenMap> {
  const seen = await loadLastSeen();
  const next = { ...seen, [category]: { id: headId, at: new Date().toISOString() } };
  await safeSet(LAST_SEEN_KEY, JSON.stringify(next));
  return next;
}

/** Retourne les articles plus récents que `knownId` (le head connu). */
export function diffFreshArticles(articles: Article[], knownId: string | null): Article[] {
  if (!articles.length) return [];
  if (!knownId) return [];
  const idx = articles.findIndex((a) => a.id === knownId || a.url === knownId);
  if (idx === -1) {
    // Head inconnu (cache vidé / retention) : on ne notifie que le tout premier pour éviter le spam.
    return articles.slice(0, 1);
  }
  return articles.slice(0, idx);
}

export interface CheckResult {
  fresh: Article[];
  count: number;
  isFirstRun: boolean;
  fetchedAt: string;
}

/**
 * Vérifie les nouveautés d'une catégorie en forçant un refresh RSS.
 * - 1er run : mémorise le head sans notifier.
 * - runs suivants : retourne les articles vraiment nouveaux.
 */
export async function checkForNewNews(
  category: CategoryId,
  controller?: AbortController,
): Promise<CheckResult> {
  const seen = await loadLastSeen();
  const knownId = getLastSeenId(seen, category);
  const feed = await getNews(category, controller, true);
  const fetchedAt = new Date().toISOString();

  if (!feed.articles.length) return { fresh: [], count: 0, isFirstRun: !knownId, fetchedAt };
  const headId = feed.articles[0]!.id;

  if (!knownId) {
    await markCategorySeen(category, headId);
    return { fresh: [], count: 0, isFirstRun: true, fetchedAt };
  }
  const fresh = diffFreshArticles(feed.articles, knownId);
  if (fresh.length) await markCategorySeen(category, headId);
  return { fresh, count: fresh.length, isFirstRun: false, fetchedAt };
}

/** Anti-spam : évite 2 notifs système en < 60s. */
export async function shouldNotifyNow(minGapMs = 60_000): Promise<boolean> {
  try {
    const raw = await safeGet(LAST_NOTIFY_KEY);
    if (!raw) return true;
    return Date.now() - Date.parse(raw) > minGapMs;
  } catch {
    return true;
  }
}

export async function stampNotified(): Promise<void> {
  await safeSet(LAST_NOTIFY_KEY, new Date().toISOString());
}
