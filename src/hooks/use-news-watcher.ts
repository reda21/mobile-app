import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import type { CategoryId } from '../lib/categories';
import type { Article } from '../lib/news';
import { checkForNewNews, shouldNotifyNow, stampNotified } from '../lib/news-watcher';
import { showNewNewsToast } from '../lib/toast';
import { getNotificationPermission, sendNewNewsNotification } from '../lib/local-notifications';
import { useAppStore } from '../lib/store';

const POLL_MS = 3 * 60 * 1000;

export function useNewsWatcher(opts: {
  category: CategoryId;
  enabled?: boolean;
  onNew?: (fresh: Article[]) => void;
}) {
  const { category, enabled = true, onNew } = opts;
  const ready = useAppStore((s) => s.ready);
  const notifyEnabled = useAppStore((s) => s.notifyNewNews);
  const autoCheck = useAppStore((s) => s.autoCheckNewNews);
  const [fresh, setFresh] = useState<Article[]>([]);
  const [checking, setChecking] = useState(false);
  const [lastCheckAt, setLastCheckAt] = useState<string | null>(null);
  const onNewRef = useRef(onNew);
  useEffect(() => {
    onNewRef.current = onNew;
  }, [onNew]);
  const checkingRef = useRef(false);

  const checkNow = useCallback(async () => {
    if (!ready || checkingRef.current) return { count: 0, fresh: [] as Article[] };
    checkingRef.current = true;
    setChecking(true);
    try {
      const controller = new AbortController();
      const res = await checkForNewNews(category, controller);
      setLastCheckAt(res.fetchedAt);
      if (!res.isFirstRun && res.count > 0) {
        setFresh(res.fresh);
        const latest = res.fresh[0]!;
        // 1) Toast in-app (react-call, singleton)
        showNewNewsToast(res.count, latest.title, () => onNewRef.current?.(res.fresh)).catch(() => {});
        // 2) Notification système (si activée + permission + anti-spam)
        if (notifyEnabled && (await shouldNotifyNow())) {
          const perm = await getNotificationPermission();
          if (perm === 'granted') {
            await sendNewNewsNotification({
              count: res.count,
              latestTitle: latest.title,
              articleId: latest.url.match(/\/p(\d+)\.html$/)?.[1] ?? latest.url.match(/[?&]p=(\d+)/)?.[1] ?? null,
              category,
            });
            await stampNotified();
          }
        }
        onNewRef.current?.(res.fresh);
      } else if (!res.isFirstRun && res.count === 0) {
        setFresh([]);
      }
      return { count: res.count, fresh: res.fresh };
    } catch {
      return { count: 0, fresh: [] as Article[] };
    } finally {
      checkingRef.current = false;
      setChecking(false);
    }
  }, [category, ready, notifyEnabled]);

  useEffect(() => {
    if (!ready || !enabled || !autoCheck) return;
    // Premier check différé pour laisser le feed initial se charger.
    const t1 = setTimeout(() => void checkNow(), 20_000);
    const iv = setInterval(() => {
      if (AppState.currentState === 'active') void checkNow();
    }, POLL_MS);
    return () => {
      clearTimeout(t1);
      clearInterval(iv);
    };
  }, [ready, enabled, autoCheck, checkNow]);

  const clearFresh = useCallback(() => setFresh([]), []);

  return { freshCount: fresh.length, fresh, checking, lastCheckAt, checkNow, clearFresh };
}
