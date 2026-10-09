import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { ArabicText, Frame, Header, Ball, fonts, ui } from '../components/news-ui';
import { usePreferences } from '../lib/preferences';

export default function NotFoundScreen() {
  const { colors } = usePreferences();

  return (
    <Frame>
      <Header back />
      <View style={styles.container}>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <Ball size={54} />
          <ArabicText accessibilityRole="header" style={styles.title}>
            الصفحة غير موجودة
          </ArabicText>
          <ArabicText style={[styles.message, { color: colors.muted }]}>
            عذرًا، الرابط الذي تحاول الوصول إليه غير متاح أو تم نقله.
          </ArabicText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="العودة إلى الأخبار"
            onPress={() => router.replace('/')}
            style={[ui.row, styles.btn, { backgroundColor: colors.green }]}
          >
            <ArabicText style={{ color: colors.paper, fontFamily: fonts.bold, fontSize: 13 }}>
              العودة إلى الأخبار
            </ArabicText>
          </Pressable>
        </View>
      </View>
    </Frame>
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
    maxWidth: 400,
    borderWidth: 1,
    borderRadius: 8,
    padding: 24,
    alignItems: 'center',
    gap: 14,
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: 22,
    textAlign: 'center',
  },
  message: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 22,
  },
  btn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 4,
    marginTop: 8,
  },
});
