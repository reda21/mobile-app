import { Platform } from 'react-native';
import * as Device from 'expo-device';
import type * as NotificationsType from 'expo-notifications';
import { useAppStore } from './store';

export const NEWS_CHANNEL_ID = 'news';

function getNotificationsModule(): typeof NotificationsType | null {
  if (Platform.OS === 'web') return null;
  try {
    // Local notifications remain supported in Expo Go; remote push requires a development build.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-notifications');
  } catch {
    return null;
  }
}

const Notifications = getNotificationsModule();

let handlerSet = false;

/** À appeler une fois au démarrage (layout). Affiche les notifs même au premier plan. */
export function setupNotificationsHandler() {
  if (handlerSet || !Notifications) return;
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
  if (Platform.OS !== 'android' || !Notifications) return;
  try {
    await Notifications.setNotificationChannelAsync(NEWS_CHANNEL_ID, {
      name: 'الأخبار الجديدة',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#176347',
    });
  } catch {
    // ignore
  }
}

export async function getNotificationPermission(): Promise<'granted' | 'denied' | 'undetermined'> {
  if (!Notifications) return 'undetermined';
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
  if (!Notifications) return false;
  if ((await getNotificationPermission()) === 'granted') return true;
  if (useAppStore.getState().appVisits < 2) return false;
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

export const DAILY_REMINDER_ID = 'akhbar-daily-top-five';

/** Daily local reminder at 19:00 device time; no background RSS fetch is implied. */
export async function setDailyNewsReminder(enabled: boolean): Promise<boolean> {
  if (!Notifications) return false;
  if (!enabled) {
    await Notifications.cancelScheduledNotificationAsync(DAILY_REMINDER_ID);
    return true;
  }
  if (await getNotificationPermission() !== 'granted') return false;
  await ensureNewsChannel();
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  if (scheduled.some(notification => notification.identifier === DAILY_REMINDER_ID)) return true;
  await Notifications.scheduleNotificationAsync({
    identifier: DAILY_REMINDER_ID,
    content: { title: 'أهم 5 أخبار اليوم ⚽', body: 'افتح التطبيق للاطلاع على أحدث أخبار الكرة.', data: { kind: 'daily-news' } },
    trigger: Platform.OS === 'android'
      ? { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: 19, minute: 0, channelId: NEWS_CHANNEL_ID }
      : { type: Notifications.SchedulableTriggerInputTypes.CALENDAR, hour: 19, minute: 0, repeats: true },
  });
  return true;
}

export interface NewNewsPayload {
  count: number;
  latestTitle: string;
  articleId?: string | null;
  category?: string;
}

/** Notification locale immédiate "nouvelle info arrivée". */
export async function sendNewNewsNotification(payload: NewNewsPayload): Promise<string | null> {
  if (Platform.OS === 'web' || !Notifications) return null;
  try {
    const { count, latestTitle, articleId, category } = payload;
    const title = count === 1 ? 'خبر جديد 📰' : `${count} أخبار جديدة 📰`;
    return await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body: latestTitle.slice(0, 140),
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
  if (!Notifications) return () => {};
  try {
    const handleResponse = (response: NotificationsType.NotificationResponse) => {
      const data = (response.notification.request.content.data ?? {}) as Record<string, unknown>;
      handler(data);
      Notifications.clearLastNotificationResponse();
    };
    const sub = Notifications.addNotificationResponseReceivedListener(handleResponse);
    const previous = Notifications.getLastNotificationResponse();
    if (previous) handleResponse(previous);
    return () => sub.remove();
  } catch {
    return () => {};
  }
}
