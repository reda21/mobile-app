import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

export const NEWS_CHANNEL_ID = 'news';

let handlerSet = false;

/** À appeler une fois au démarrage (layout). Affiche les notifs même au premier plan. */
export function setupNotificationsHandler() {
  if (handlerSet) return;
  handlerSet = true;
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  } catch {
    // web / environnement sans support
  }
}

export async function ensureNewsChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    await Notifications.setNotificationChannelAsync(NEWS_CHANNEL_ID, {
      name: 'الأخبار الجديدة',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#176347',
      sound: undefined,
    });
  } catch {
    // ignore
  }
}

export async function getNotificationPermission(): Promise<'granted' | 'denied' | 'undetermined'> {
  try {
    const s = await Notifications.getPermissionsAsync();
    if (s.granted) return 'granted';
    const status = (s as { status?: string }).status;
    if (status === 'denied' || s.ios?.status === Notifications.IosAuthorizationStatus.DENIED) return 'denied';
    return 'undetermined';
  } catch {
    return 'undetermined';
  }
}

export async function requestNotificationPermission(): Promise<boolean> {
  try {
    if (!Device.isDevice && Platform.OS !== 'web') {
      // Sur émulateur Android ça marche quand même pour le local, on continue.
    }
    if (Platform.OS === 'android') await ensureNewsChannel();
    const { status } = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowBadge: true, allowSound: true },
    });
    return status === 'granted';
  } catch {
    return false;
  }
}

export interface NewNewsPayload {
  count: number;
  latestTitle: string;
  articleId?: string | null;
  category?: string;
}

/** Notification locale immédiate "nouvelle info arrivée". */
export async function sendNewNewsNotification(payload: NewNewsPayload): Promise<string | null> {
  try {
    if (Platform.OS === 'web') return null;
    const { count, latestTitle, articleId, category } = payload;
    const title = count === 1 ? 'خبر جديد 📰' : `${count} أخبار جديدة 📰`;
    return await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body: latestTitle.slice(0, 140),
        sound: undefined,
        priority: Notifications.AndroidNotificationPriority.HIGH,
        data: {
          kind: 'new-news',
          count,
          articleId: articleId ?? null,
          category: category ?? 'latest',
          url: articleId ? `/article/${articleId}` : '/',
        },
      },
      trigger: null,
    });
  } catch {
    return null;
  }
}

export function onNotificationTap(handler: (data: Record<string, unknown>) => void) {
  try {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = (response.notification.request.content.data ?? {}) as Record<string, unknown>;
      handler(data);
    });
    return () => sub.remove();
  } catch {
    return () => {};
  }
}
