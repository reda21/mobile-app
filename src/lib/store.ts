import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { categories, type CategoryId } from './categories';
import { isArticle, type Article, clearNewsCache, pruneExpiredArticles, getCacheStats } from './news';

export const palettes = {
  light: { paper: '#FAFBF8', surface: '#FFFFFF', ink: '#172923', muted: '#78847D', line: '#E3E8DF', green: '#176347', soft: '#EDF3E9', gold: '#B29A5C' },
  dark: { paper: '#111B16', surface: '#19261F', ink: '#E9EEE6', muted: '#A0ADA2', line: '#2E3E32', green: '#98BD91', soft: '#23342A', gold: '#C6B782' },
};

const STORAGE_KEY = 'akhbar-al-kora-profile-v1';

export interface AppState {
  dark: boolean;
  category: CategoryId;
  saved: Article[];
  fontSizeDelta: number;
  cacheRetentionDays: number;
  ready: boolean;
  notice: string;
  cacheStats: { feedCount: number; articleCount: number };

  // Actions
  init: () => Promise<void>;
  toggleTheme: () => void;
  selectCategory: (id: CategoryId) => void;
  toggleSaved: (article: Article) => void;
  clearSaved: () => void;
  increaseFontSize: () => void;
  decreaseFontSize: () => void;
  resetFontSize: () => void;
  setCacheRetentionDays: (days: number) => Promise<void>;
  clearCachedArticles: () => Promise<void>;
  refreshCacheStats: () => Promise<void>;
  setNotice: (msg: string) => void;
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
  }
};

let persistTimer: ReturnType<typeof setTimeout> | null = null;
function schedulePersist(state: AppState) {
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    const payload = JSON.stringify({
      dark: state.dark,
      category: state.category,
      saved: state.saved,
      fontSizeDelta: state.fontSizeDelta,
      cacheRetentionDays: state.cacheRetentionDays,
    });
    safeStorage.setItem(STORAGE_KEY, payload);
  }, 100);
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

  init: async () => {
    try {
      const raw = await safeStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        const retention = typeof data.cacheRetentionDays === 'number' ? data.cacheRetentionDays : 7;
        set({
          dark: data.dark === true,
          category: categories.some(c => c.id === data.category) ? data.category : 'latest',
          saved: Array.isArray(data.saved) ? data.saved.filter(isArticle).slice(0, 100) : [],
          fontSizeDelta: typeof data.fontSizeDelta === 'number' ? Math.max(-2, Math.min(8, data.fontSizeDelta)) : 0,
          cacheRetentionDays: retention,
        });
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

  toggleSaved: (article: Article) => {
    set(state => {
      const exists = state.saved.some(a => a.url === article.url);
      const nextSaved = exists
        ? state.saved.filter(a => a.url !== article.url)
        : [article, ...state.saved].slice(0, 100);
      const next = { ...state, saved: nextSaved };
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
    set({ notice: msg });
    setTimeout(() => {
      if (get().notice === msg) set({ notice: '' });
    }, 3500);
  },
}));
