import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { categories, type CategoryId } from './categories';
import { isArticle, type Article } from './news';

const palettes = {
  light: { paper: '#FAFBF8', surface: '#FFFFFF', ink: '#172923', muted: '#78847D', line: '#E3E8DF', green: '#176347', soft: '#EDF3E9', gold: '#B29A5C' },
  dark: { paper: '#111B16', surface: '#19261F', ink: '#E9EEE6', muted: '#A0ADA2', line: '#2E3E32', green: '#98BD91', soft: '#23342A', gold: '#C6B782' },
};
interface Profile { dark: boolean; category: CategoryId; saved: Article[] }
interface Settings extends Profile {
  ready: boolean; colors: typeof palettes.light; notice: string;
  selectCategory: (id: CategoryId) => void; toggleTheme: () => void; toggleSaved: (article: Article) => void;
}
const Context = createContext<Settings | null>(null);
const STORAGE_KEY = 'akhbar-al-kora-profile-v1';

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile>({ dark: false, category: 'latest', saved: [] });
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState('');
  const writes = useRef(Promise.resolve());
  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(STORAGE_KEY).then(raw => {
      if (!alive || !raw) return;
      const data = JSON.parse(raw);
      setProfile({ dark: data.dark === true, category: categories.some(c => c.id === data.category) ? data.category : 'latest', saved: Array.isArray(data.saved) ? data.saved.filter(isArticle).slice(0, 100) : [] });
    }).catch(() => { if (alive) setNotice('تعذر قراءة إعداداتك المحفوظة.'); }).finally(() => { if (alive) setReady(true); });
    return () => { alive = false; };
  }, []);
  useEffect(() => {
    if (!ready) return;
    // Serialize writes so rapid favorite changes cannot overwrite a newer profile.
    writes.current = writes.current.then(() => AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(profile))).catch(() => setNotice('تعذر الحفظ على الجهاز.'));
  }, [profile, ready]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(''), 3500);
    return () => clearTimeout(timer);
  }, [notice]);
  const toggleSaved = (article: Article) => {
    setProfile(previous => {
      const exists = previous.saved.some(a => a.url === article.url);
      return { ...previous, saved: exists ? previous.saved.filter(a => a.url !== article.url) : [article, ...previous.saved].slice(0, 100) };
    });
  };
  return <Context.Provider value={{ ...profile, ready, notice, colors: palettes[profile.dark ? 'dark' : 'light'], toggleSaved, toggleTheme: () => setProfile(p => ({ ...p, dark: !p.dark })), selectCategory: category => setProfile(p => ({ ...p, category })) }}>{children}</Context.Provider>;
}

export function usePreferences() {
  const settings = useContext(Context);
  if (!settings) throw new Error('Missing PreferencesProvider');
  return settings;
}
