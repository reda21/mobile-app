import { useEffect, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { usePreferences } from '../lib/preferences';
import { ArabicText, Frame, Header, Icon, fonts, ui } from '../components/news-ui';

export default function SettingsScreen() {
  const {
    colors, dark, toggleTheme,
    fontSizeDelta, increaseFontSize, decreaseFontSize, resetFontSize,
    cacheRetentionDays, setCacheRetentionDays,
    clearCachedArticles, clearSaved,
    cacheStats, refreshCacheStats, saved
  } = usePreferences();

  const [clearingCache, setClearingCache] = useState(false);
  const [clearingSaved, setClearingSaved] = useState(false);

  useEffect(() => {
    refreshCacheStats();
  }, [refreshCacheStats]);

  const retentionOptions = [
    { label: 'يوم واحد', days: 1 },
    { label: '3 أيام', days: 3 },
    { label: '7 أيام', days: 7 },
    { label: '30 يومًا', days: 30 },
  ];

  const handleClearCache = () => {
    const confirmAction = async () => {
      setClearingCache(true);
      try {
        await clearCachedArticles();
      } finally {
        setClearingCache(false);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('هل أنت متأكد من رغبتك في مسح جميع الأخبار والذاكرة المؤقتة؟')) {
        confirmAction();
      }
    } else {
      Alert.alert(
        'مسح الأخبار المخزنة',
        'سيتم حذف جميع الأخبار المحفوظة في الذاكرة المؤقتة. هل تريد المتابعة؟',
        [
          { text: 'إلغاء', style: 'cancel' },
          { text: 'مسح الآن', style: 'destructive', onPress: confirmAction },
        ]
      );
    }
  };

  const handleClearSaved = () => {
    if (!saved.length) return;
    const confirmAction = () => {
      setClearingSaved(true);
      try {
        clearSaved();
      } finally {
        setClearingSaved(false);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('هل أنت متأكد من مسح جميع الأخبار المحفوظة في قائمتك؟')) {
        confirmAction();
      }
    } else {
      Alert.alert(
        'مسح المحفوظات',
        `هل تريد مسح جميع الأخبار المحفوظة (${saved.length} خبر)؟`,
        [
          { text: 'إلغاء', style: 'cancel' },
          { text: 'مسح الكل', style: 'destructive', onPress: confirmAction },
        ]
      );
    }
  };

  return (
    <Frame bottom="settings">
      <Header back />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={{ marginBottom: 20 }}>
          <ArabicText style={{ fontSize: 10, color: colors.green }}>—  تخصيص النظام</ArabicText>
          <ArabicText accessibilityRole="header" style={styles.pageTitle}>الإعدادات</ArabicText>
          <ArabicText style={{ color: colors.muted, fontSize: 12 }}>
            تحكم في مدة التخزين، مساحة الذاكرة، وخيارات القراءة.
          </ArabicText>
        </View>

        {/* Section 1: Storage & Retention */}
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <View style={[ui.row, styles.sectionHeader]}>
            <Icon name="clock" size={20} color={colors.green} />
            <ArabicText style={[styles.sectionTitle, { color: colors.ink }]}>إدارة التخزين والذاكرة المؤقتة</ArabicText>
          </View>

          <ArabicText style={{ fontSize: 12, color: colors.muted, marginBottom: 12 }}>
            مدة الاحتفاظ بالأخبار للقراءة بدون إنترنت:
          </ArabicText>

          <View style={[ui.row, styles.retentionRow]}>
            {retentionOptions.map(option => {
              const active = cacheRetentionDays === option.days;
              return (
                <Pressable
                  key={option.days}
                  accessibilityRole="button"
                  accessibilityLabel={`مدة الاحتفاظ ${option.label}`}
                  onPress={() => setCacheRetentionDays(option.days)}
                  style={[
                    styles.retentionChip,
                    {
                      backgroundColor: active ? colors.soft : colors.paper,
                      borderColor: active ? colors.green : colors.line,
                    }
                  ]}
                >
                  <ArabicText style={{
                    fontFamily: active ? fonts.bold : fonts.medium,
                    fontSize: 11,
                    color: active ? colors.green : colors.muted
                  }}>
                    {option.label}
                  </ArabicText>
                </Pressable>
              );
            })}
          </View>

          <View style={[ui.row, styles.statRow, { borderTopColor: colors.line, borderBottomColor: colors.line }]}>
            <ArabicText style={{ fontSize: 12, color: colors.muted }}>الأخبار في الذاكرة المؤقتة:</ArabicText>
            <ArabicText style={{ fontSize: 13, fontFamily: fonts.bold, color: colors.green }}>
              {cacheStats.articleCount.toLocaleString('ar')} خبر
            </ArabicText>
          </View>

          {/* Clear Cache Action */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="مسح الأخبار المخزنة مؤقتًا"
            onPress={handleClearCache}
            disabled={clearingCache}
            style={[ui.row, styles.actionButton, { backgroundColor: colors.paper, borderColor: colors.line }]}
          >
            <View style={[ui.row, { gap: 8 }]}>
              <Icon name="trash" size={17} color="#D9383A" />
              <ArabicText style={{ fontFamily: fonts.medium, fontSize: 12, color: '#D9383A' }}>
                {clearingCache ? 'جار المسح...' : 'مسح الأخبار المخزنة مؤقتًا'}
              </ArabicText>
            </View>
            <ArabicText style={{ fontSize: 10, color: colors.muted }}>تفريغ الذاكرة</ArabicText>
          </Pressable>

          {/* Clear Saved Action */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="مسح جميع الأخبار المحفوظة"
            onPress={handleClearSaved}
            disabled={clearingSaved || !saved.length}
            style={[ui.row, styles.actionButton, { backgroundColor: colors.paper, borderColor: colors.line, opacity: saved.length ? 1 : 0.45, marginTop: 8 }]}
          >
            <View style={[ui.row, { gap: 8 }]}>
              <Icon name="bookmark" size={17} color={colors.muted} />
              <ArabicText style={{ fontFamily: fonts.medium, fontSize: 12, color: colors.ink }}>
                مسح قائمة المحفوظات
              </ArabicText>
            </View>
            <ArabicText style={{ fontSize: 10, color: colors.muted }}>
              {saved.length.toLocaleString('ar')} محفوظ
            </ArabicText>
          </Pressable>
        </View>

        {/* Section 2: Appearance & Reading */}
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <View style={[ui.row, styles.sectionHeader]}>
            <Icon name="sun" size={20} color={colors.green} />
            <ArabicText style={[styles.sectionTitle, { color: colors.ink }]}>المظهر والقراءة</ArabicText>
          </View>

          {/* Dark Mode Switch */}
          <View style={[ui.row, styles.settingRow]}>
            <View>
              <ArabicText style={{ fontFamily: fonts.medium, fontSize: 13 }}>الوضع الليلي</ArabicText>
              <ArabicText style={{ fontSize: 11, color: colors.muted }}>تبديل المظهر بين الفاتح والداكن</ArabicText>
            </View>
            <Switch
              value={dark}
              onValueChange={toggleTheme}
              trackColor={{ false: colors.line, true: colors.green }}
              thumbColor={colors.paper}
            />
          </View>

          {/* Font Size Preference */}
          <View style={[ui.row, styles.settingRow, { borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 14 }]}>
            <View>
              <ArabicText style={{ fontFamily: fonts.medium, fontSize: 13 }}>حجم الخط الافتراضي</ArabicText>
              <ArabicText style={{ fontSize: 11, color: colors.muted }}>
                {fontSizeDelta === 0 ? 'الحجم العادي' : fontSizeDelta > 0 ? `تكبير (+${fontSizeDelta})` : `تصغير (${fontSizeDelta})`}
              </ArabicText>
            </View>
            <View style={[ui.row, { gap: 8 }]}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="تصغير الخط"
                onPress={decreaseFontSize}
                disabled={fontSizeDelta <= -2}
                style={[styles.smallBtn, { borderColor: colors.line, opacity: fontSizeDelta <= -2 ? 0.35 : 1 }]}
              >
                <ArabicText style={{ fontFamily: fonts.bold, fontSize: 12 }}>أ-</ArabicText>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="إعادة تعيين الخط"
                onPress={resetFontSize}
                style={[styles.smallBtn, { borderColor: colors.line, minWidth: 44 }]}
              >
                <ArabicText style={{ fontSize: 10, color: colors.muted }}>افتراضي</ArabicText>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="تكبير الخط"
                onPress={increaseFontSize}
                disabled={fontSizeDelta >= 8}
                style={[styles.smallBtn, { borderColor: colors.line, opacity: fontSizeDelta >= 8 ? 0.35 : 1 }]}
              >
                <ArabicText style={{ fontFamily: fonts.bold, fontSize: 14 }}>أ+</ArabicText>
              </Pressable>
            </View>
          </View>
        </View>

        {/* Section 3: App info */}
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.line, alignItems: 'center', paddingVertical: 18 }]}>
          <ArabicText style={{ fontFamily: fonts.bold, fontSize: 13, marginBottom: 4 }}>أخبار الكرة العالمية</ArabicText>
          <ArabicText style={{ fontSize: 11, color: colors.muted }}>الإصدار 1.0.0 • متوافق مع نظام Pinia/Zustand</ArabicText>
          <ArabicText style={{ fontSize: 10, color: colors.green, marginTop: 6 }}>المصدر الإخباري: هاي كورة (hihi2.com)</ArabicText>
        </View>
      </ScrollView>
    </Frame>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingTop: 24, paddingBottom: 50 },
  pageTitle: { fontFamily: fonts.heading, fontSize: 26, marginVertical: 6 },
  section: { borderWidth: 1, borderRadius: 8, padding: 16, marginBottom: 18 },
  sectionHeader: { gap: 8, marginBottom: 14 },
  sectionTitle: { fontFamily: fonts.heading, fontSize: 15 },
  retentionRow: { gap: 8, marginBottom: 14 },
  retentionChip: { flex: 1, borderWidth: 1, borderRadius: 5, paddingVertical: 9, alignItems: 'center', justifyContent: 'center' },
  statRow: { borderTopWidth: 1, borderBottomWidth: 1, paddingVertical: 11, justifyContent: 'space-between', marginBottom: 12 },
  actionButton: { borderWidth: 1, borderRadius: 6, paddingVertical: 11, paddingHorizontal: 13, justifyContent: 'space-between', alignItems: 'center' },
  settingRow: { justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  smallBtn: { height: 32, minWidth: 32, borderWidth: 1, borderRadius: 4, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
});
