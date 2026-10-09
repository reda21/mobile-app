import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { categories, type CategoryId } from './categories';
import { isNativeRuntime } from './runtime';
import { setAnalyticsConsent, track } from './analytics';
import { isArticle, isSavedArticle, toSavedArticle, MAX_SAVED, type Article, type SavedArticle, clearNewsCache, pruneExpiredArticles, getCacheStats } from './news';

export const palettes = {
  light: { paper: '#FAFBF8', surface: '#FFFFFF', ink: '#172923', muted: '#78847D', line: '#E3E8DF', green: '#176347', soft: '#EDF3E9', gold: '#B29A5C' },
  dark: { paper: '#111B16', surface: '#19261F', ink: '#E9EEE6', muted: '#A0ADA2', line: '#2E3E32', green: '#98BD91', soft: '#23342A', gold: '#C6B782' },
};

const STORAGE_KEY = 'akhbar-al-kora-profile-v1';

export interface AppState {
  dark: boolean;
  category: CategoryId;
  saved: SavedArticle[];
  fontSizeDelta: number;
  cacheRetentionDays: number;
  ready: boolean;
  notice: string;
  cacheStats: { feedCount: number; articleCount: number };
  notifyNewNews: boolean;
  autoCheckNewNews: boolean;
  dailyReminder: boolean;
  alertCategories: CategoryId[];
  analyticsEnabled: boolean;
  appVisits: number;
  setDailyReminder: (enabled: boolean) => void;
  toggleAlertCategory: (category: CategoryId) => void;
  setAnalyticsEnabled: (enabled: boolean) => void;

  // Actions
  init: () => Promise<void>;
  toggleTheme: () => void;
  selectCategory: (id: CategoryId) => void;
  toggleSaved: (article: Article | SavedArticle) => void;
  clearSaved: () => void;
  increaseFontSize: () => void;
  decreaseFontSize: () => void;
  resetFontSize: () => void;
  setCacheRetentionDays: (days: number) => Promise<void>;
  clearCachedArticles: () => Promise<void>;
  refreshCacheStats: () => Promise<void>;
  setNotice: (msg: string) => void;
  setNotifyNewNews: (v: boolean) => void;
  setAutoCheckNewNews: (v: boolean) => void;
}

const memoryStore = new Map<string, string>();
export const safeStorage = {
  async getItem(key: string): Promise<string | null> {
    try {
      if (!isNativeRuntime()) {
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
      if (!isNativeRuntime()) {
        return;
      }
      await AsyncStorage.setItem(key, value);
    } catch {}
  },
  async removeItem(key: string): Promise<void> {
    try {
      memoryStore.delete(key);
      if (!isNativeRuntime()) {
        return;
      }
      await AsyncStorage.removeItem(key);
    } catch {}
  }
};

let persistTimer: ReturnType<typeof setTimeout> | null = null;
let noticeTimer: ReturnType<typeof setTimeout> | null = null;
function schedulePersist(state: AppState) {
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    const payload = JSON.stringify({
      dark: state.dark,
      category: state.category,
      saved: state.saved,
      fontSizeDelta: state.fontSizeDelta,
      cacheRetentionDays: state.cacheRetentionDays,
      notifyNewNews: state.notifyNewNews,
      autoCheckNewNews: state.autoCheckNewNews,
      dailyReminder: state.dailyReminder,
      alertCategories: state.alertCategories,
      analyticsEnabled: state.analyticsEnabled,
    });
    safeStorage.setItem(STORAGE_KEY, payload);
  }, 100);
}

/** Migre les favoris persistés (anciens complets ou nouveaux légers) vers `SavedArticle`. */
function migrateSaved(raw: unknown): SavedArticle[] {
  if (!Array.isArray(raw)) return [];
  const out: SavedArticle[] = [];
  for (const item of raw) {
    if (isSavedArticle(item)) out.push(item);
    else if (isArticle(item)) out.push(toSavedArticle(item));
    if (out.length >= MAX_SAVED) break;
  }
  return out;
}

export const useAppStore = create<AppState>((set, get) => ({
  dark: false,
  category: 'latest',
  saved: [],
  fontSizeDelta: 0,
  cacheRetentionDays: 7,
  ready: false,
  notice: '',
  cacheStats: { feedCount: 0, articleCount: 0 },
  notifyNewNews: false,
  autoCheckNewNews: true,
  dailyReminder: false,
  alertCategories: ['transfers', 'europe'],
  analyticsEnabled: false,
  appVisits: 0,

  init: async () => {
    try {
      const raw = await safeStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        const retention = typeof data.cacheRetentionDays === 'number' ? data.cacheRetentionDays : 7;
        set({
          dark: data.dark === true,
          category: categories.some(c => c.id === data.category) ? data.category : 'latest',
          saved: migrateSaved(data.saved),
          fontSizeDelta: typeof data.fontSizeDelta === 'number' ? Math.max(-2, Math.min(8, data.fontSizeDelta)) : 0,
          cacheRetentionDays: retention,
          notifyNewNews: data.notifyNewNews === true,
          autoCheckNewNews: data.autoCheckNewNews !== false,
          dailyReminder: data.dailyReminder === true,
          alertCategories: Array.isArray(data.alertCategories) ? categories.filter(c => data.alertCategories.includes(c.id)).map(c => c.id) : ['transfers', 'europe'],
          analyticsEnabled: data.analyticsEnabled === true,
        });
        setAnalyticsConsent(data.analyticsEnabled === true);
        pruneExpiredArticles(retention).catch(() => {});
      }
    } catch {
      get().setNotice('تعذر قراءة إعداداتك المحفوظة.');
    } finally {
      const stats = await getCacheStats().catch(() => ({ feedCount: 0, articleCount: 0 }));
      set({ ready: true, cacheStats: stats });
    }
  },

  toggleTheme: () => {
    set(state => {
      const next = { ...state, dark: !state.dark };
      schedulePersist(next);
      return { dark: !state.dark };
    });
  },

  selectCategory: (category: CategoryId) => {
    set(state => {
      const next = { ...state, category };
      schedulePersist(next);
      return { category };
    });
  },

  toggleSaved: (article: Article | SavedArticle) => {
    set(state => {
      const exists = state.saved.some(a => a.url === article.url);
      const nextSaved = exists
        ? state.saved.filter(a => a.url !== article.url)
        : [toSavedArticle(article), ...state.saved].slice(0, MAX_SAVED);
      const next = { ...state, saved: nextSaved };
      if (!exists) void track('article_save', { article_id: article.url.match(/p(\d+)/)?.[1] ?? '' });
      schedulePersist(next);
      get().setNotice(exists ? 'تمت إزالة الخبر من المحفوظات' : 'تم حفظ الخبر في قائمتك');
      return { saved: nextSaved };
    });
  },

  clearSaved: () => {
    set(state => {
      const next = { ...state, saved: [] };
      schedulePersist(next);
      get().setNotice('تم مسح جميع الأخبار المحفوظة');
      return { saved: [] };
    });
  },

  increaseFontSize: () => {
    set(state => {
      const nextDelta = Math.min(8, state.fontSizeDelta + 2);
      const next = { ...state, fontSizeDelta: nextDelta };
      schedulePersist(next);
      return { fontSizeDelta: nextDelta };
    });
  },

  decreaseFontSize: () => {
    set(state => {
      const nextDelta = Math.max(-2, state.fontSizeDelta - 2);
      const next = { ...state, fontSizeDelta: nextDelta };
      schedulePersist(next);
      return { fontSizeDelta: nextDelta };
    });
  },

  resetFontSize: () => {
    set(state => {
      const next = { ...state, fontSizeDelta: 0 };
      schedulePersist(next);
      return { fontSizeDelta: 0 };
    });
  },

  setCacheRetentionDays: async (days: number) => {
    set(state => {
      const next = { ...state, cacheRetentionDays: days };
      schedulePersist(next);
      return { cacheRetentionDays: days };
    });
    await pruneExpiredArticles(days).catch(() => {});
    await get().refreshCacheStats();
    get().setNotice(`تم ضبط مدة الاحتفاظ إلى ${days} أيام`);
  },

  clearCachedArticles: async () => {
    await clearNewsCache().catch(() => {});
    const stats = await getCacheStats().catch(() => ({ feedCount: 0, articleCount: 0 }));
    set({ cacheStats: stats });
    get().setNotice('تم مسح جميع الأخبار والذاكرة المؤقتة بنجاح');
  },

  refreshCacheStats: async () => {
    const stats = await getCacheStats().catch(() => ({ feedCount: 0, articleCount: 0 }));
    set({ cacheStats: stats });
  },

  setNotice: (msg: string) => {
    if (noticeTimer) clearTimeout(noticeTimer);
    set({ notice: msg });
    if (!msg) {
      noticeTimer = null;
      return;
    }
    noticeTimer = setTimeout(() => {
      noticeTimer = null;
      if (get().notice === msg) set({ notice: '' });
    }, 3500);
  },

  setNotifyNewNews: (v: boolean) => {
    set(state => {
      const next = { ...state, notifyNewNews: v };
      schedulePersist(next);
      return { notifyNewNews: v };
    });
  },

  setAutoCheckNewNews: (v: boolean) => {
    set(state => {
      const next = { ...state, autoCheckNewNews: v };
      schedulePersist(next);
      return { autoCheckNewNews: v };
    });
  },
  setDailyReminder: (dailyReminder) => {
    set({ dailyReminder });
    schedulePersist(get());
  },
  toggleAlertCategory: (category) => {
    const current = get().alertCategories;
    set({ alertCategories: current.includes(category) ? current.filter(id => id !== category) : [...current, category] });
    schedulePersist(get());
  },
  setAnalyticsEnabled: (analyticsEnabled) => {
    setAnalyticsConsent(analyticsEnabled);
    set({ analyticsEnabled });
    schedulePersist(get());
  },
}));

let visitPromise: Promise<void> | undefined;
/** Count once per JS launch, including React Strict Mode's repeated mount. */
export function registerAppVisit(): Promise<void> {
  return visitPromise ??= (async () => {
    const previous = Number(await safeStorage.getItem('akhbar-visits-v1'));
    const appVisits = (Number.isFinite(previous) ? Math.max(0, previous) : 0) + 1;
    await safeStorage.setItem('akhbar-visits-v1', String(appVisits));
    useAppStore.setState({ appVisits });
  })();
}
