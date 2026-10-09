import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router, type ErrorBoundaryProps } from 'expo-router';
import { captureException } from '../lib/sentry';
import { ArabicText, Ball, fonts, ui } from './news-ui';
import { usePreferences } from '../lib/preferences';

export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  const { colors } = usePreferences();

  useEffect(() => {
    captureException(error, { source: 'GlobalErrorBoundary' });
  }, [error]);

  return (
    <View style={[styles.container, { backgroundColor: colors.paper }]}>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
        <Ball size={54} />
        <ArabicText style={[styles.badge, { color: '#D9383A', backgroundColor: '#FDE8E8' }]}>
          تنبيه نظام
        </ArabicText>
        <ArabicText accessibilityRole="header" style={[styles.title, { color: colors.ink }]}>
          حدث خطأ غير متوقع
        </ArabicText>
        <ArabicText style={[styles.message, { color: colors.muted }]}>
          نعتذر عن هذا الخلل. تم تسجيل تفاصيل الخطأ تلقائيًا للعمل على حله.
        </ArabicText>
        {__DEV__ && (
          <View style={[styles.devBox, { borderColor: colors.line, backgroundColor: colors.paper }]}>
            <ArabicText style={[styles.devText, { color: '#D9383A' }]}>
              {error.message || String(error)}
            </ArabicText>
          </View>
        )}
        <View style={[ui.row, { gap: 10, marginTop: 14 }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="إعادة المحاولة"
            onPress={() => void retry()}
            style={[styles.btn, { backgroundColor: colors.green }]}
          >
            <ArabicText style={{ color: colors.paper, fontFamily: fonts.bold, fontSize: 13 }}>
              إعادة المحاولة
            </ArabicText>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="العودة إلى الرئيسية"
            onPress={() => router.replace('/')}
            style={[styles.btn, styles.outlineBtn, { borderColor: colors.line }]}
          >
            <ArabicText style={{ color: colors.ink, fontFamily: fonts.medium, fontSize: 13 }}>
              الرئيسية
            </ArabicText>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    borderWidth: 1,
    borderRadius: 8,
    padding: 24,
    alignItems: 'center',
    gap: 12,
  },
  badge: {
    fontSize: 10,
    fontFamily: fonts.bold,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    marginTop: 4,
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: 20,
    textAlign: 'center',
  },
  message: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 22,
  },
  devBox: {
    borderWidth: 1,
    borderRadius: 4,
    padding: 10,
    width: '100%',
  },
  devText: {
    fontSize: 10,
    fontFamily: fonts.body,
    textAlign: 'left',
  },
  btn: {
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 5,
    minWidth: 110,
    alignItems: 'center',
  },
  outlineBtn: {
    borderWidth: 1,
  },
});
