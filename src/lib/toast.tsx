import { Pressable, StyleSheet, View } from 'react-native';
import { createCallable } from 'react-call';
import { ArabicText, fonts } from '../components/news-ui';
import { usePreferences } from './preferences';

export interface ToastProps {
  title: string;
  message?: string;
  actionLabel?: string;
  duration?: number;
}

export type ToastResult = 'action' | 'dismiss' | 'timeout';

const EXIT_DELAY = 220;

function ToastView({
  call,
  title,
  message,
  actionLabel,
}: ToastProps & { call: { end: (v: ToastResult) => void; ended: boolean } }) {
  const { colors } = usePreferences();
  return (
    <View
      style={[styles.wrap, { opacity: call.ended ? 0 : 1 }]}
      accessibilityLiveRegion="polite"
    >
      <View style={[styles.card, { backgroundColor: colors.ink, borderColor: colors.ink }]}>
        <View style={{ flex: 1 }}>
          <ArabicText style={[styles.title, { color: colors.paper }]} numberOfLines={2}>
            {title}
          </ArabicText>
          {message ? (
            <ArabicText style={[styles.message, { color: colors.paper }]} numberOfLines={2}>
              {message}
            </ArabicText>
          ) : null}
        </View>
        {actionLabel ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={actionLabel}
            onPress={() => call.end('action')}
            style={[styles.action, { backgroundColor: colors.paper }]}
          >
            <ArabicText style={[styles.actionText, { color: colors.ink }]}>{actionLabel}</ArabicText>
          </Pressable>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="إغلاق التنبيه"
          onPress={() => call.end('dismiss')}
          hitSlop={10}
          style={styles.close}
        >
          <ArabicText style={[styles.closeText, { color: colors.paper }]}>✕</ArabicText>
        </Pressable>
      </View>
    </View>
  );
}

export const AppToast = createCallable<ToastProps, ToastResult>(
  ToastView,
  EXIT_DELAY,
);
AppToast.displayName = 'AppToast';

function autoDismiss(promise: Promise<ToastResult>, duration: number) {
  setTimeout(() => {
    try {
      AppToast.end(promise, 'timeout');
    } catch {
      // already ended
    }
  }, duration);
}

/** Toast générique appelable depuis n'importe où (store, watcher, écran). */
export function showToast(props: ToastProps): Promise<ToastResult> {
  const promise = AppToast.call(props);
  autoDismiss(promise, props.duration ?? 3500);
  return promise;
}

/** Toast singleton "nouveautés" : met à jour l'instance au lieu d'empiler. */
export function showNewNewsToast(count: number, latestTitle: string, onView?: () => void): Promise<ToastResult> {
  const title = count === 1 ? 'خبر جديد وصل 📰' : `${count} أخبار جديدة 📰`;
  const promise = AppToast.upsert({
    title,
    message: latestTitle,
    actionLabel: 'عرض',
    duration: 6000,
  });
  autoDismiss(promise, 6000);
  void promise.then((res) => {
    if (res === 'action') onView?.();
  });
  return promise;
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    bottom: 92,
    left: 16,
    right: 16,
    alignItems: 'center',
    zIndex: 999,
    elevation: 999,
  },
  card: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    maxWidth: 560,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  title: { fontFamily: fonts.bold, fontSize: 13, lineHeight: 22 },
  message: { fontSize: 11, lineHeight: 20, opacity: 0.85, marginTop: 2 },
  action: { borderRadius: 6, paddingVertical: 8, paddingHorizontal: 14 },
  actionText: { fontFamily: fonts.bold, fontSize: 12 },
  close: { padding: 4 },
  closeText: { fontSize: 13, opacity: 0.8 },
});
