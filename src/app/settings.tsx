import { useEffect, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { usePreferences } from '../lib/preferences';
import { ensureNewsChannel, getNotificationPermission, requestNotificationPermission, sendNewNewsNotification, setDailyNewsReminder } from '../lib/local-notifications';
import { categories } from '../lib/categories';
import { reportProblem } from '../lib/feedback';
import { router } from 'expo-router';
import { checkForNewNews } from '../lib/news-watcher';
import { showToast } from '../lib/toast';
import { useAppUpdates, type UpdateStatus } from '../hooks/use-app-updates';
import { useResponsive } from '../hooks/use-responsive';
import Constants from 'expo-constants';
import { ArabicText, Frame, Header, Icon, fonts, ui } from '../components/news-ui';

const updateStatusLabel: Record<UpdateStatus, string> = {
  disabled: 'التحديثات تعمل في نسخة الإنتاج فقط',
  idle: 'اضغط للتحقق من وجود تحديث',
  checking: 'جارٍ التحقق...',
  downloading: 'جارٍ تنزيل التحديث...',
  ready: 'التحديث جاهز — أعد التشغيل للتطبيق',
  'up-to-date': 'تطبيقك محدّث ✅',
  error: 'تعذر التحقق',
};

export default function SettingsScreen() {
  const {
    colors, dark, toggleTheme,
    fontSizeDelta, increaseFontSize, decreaseFontSize, resetFontSize,
    cacheRetentionDays, setCacheRetentionDays,
    clearCachedArticles, clearSaved,
    cacheStats, refreshCacheStats, saved,
    notifyNewNews, setNotifyNewNews, autoCheckNewNews, setAutoCheckNewNews, category,
    dailyReminder, setDailyReminder, alertCategories, toggleAlertCategory,
    analyticsEnabled, setAnalyticsEnabled, appVisits,
  } = usePreferences();

  const [clearingCache, setClearingCache] = useState(false);
  const [clearingSaved, setClearingSaved] = useState(false);
  const [perm, setPerm] = useState<'granted' | 'denied' | 'undetermined'>('undetermined');
  const [checkingNews, setCheckingNews] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [testingNotif, setTestingNotif] = useState(false);
  const [testNotifMessage, setTestNotifMessage] = useState<string | null>(null);
  const { readingMaxWidth } = useResponsive();
  const appUpdates = useAppUpdates();
  const appVersion = Constants.expoConfig?.version ?? '1.0.0';

  useEffect(() => {
    refreshCacheStats();
    getNotificationPermission().then(setPerm).catch(() => {});
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

  const handleTestSystemNotification = async () => {
    if (testingNotif) return;
    setTestingNotif(true);
    setTestNotifMessage(null);
    try {
      if (Platform.OS === 'web') {
        const count = cacheStats.articleCount;
        setTestNotifMessage(`الويب لا يدعم إشعارات النظام — المقالات المخزنة: ${count}. جرّب على Android.`);
        await showToast({ title: 'اختبار الإشعارات', message: `عدد المقالات المخزنة: ${count}` }).catch(() => {});
        return;
      }
      let permission = perm;
      if (permission !== 'granted') {
        const ok = await requestNotificationPermission().catch(() => false);
        permission = await getNotificationPermission().catch(() => 'undetermined' as const);
        setPerm(permission);
        if (!ok || permission !== 'granted') {
          setTestNotifMessage('الإذن مرفوض — فعّل الإشعارات من إعدادات الهاتف ثم أعد المحاولة.');
          await showToast({ title: 'تعذر إرسال إشعار تجريبي', message: 'اسمح بالإشعارات من إعدادات الهاتف.' }).catch(() => {});
          return;
        }
      }
      if (Platform.OS === 'android') await ensureNewsChannel();
      const count = Math.max(1, cacheStats.articleCount);
      const id = await sendNewNewsNotification({
        count,
        latestTitle: `هذا إشعار تجريبي — لديك ${count} مقال كرة مخزّن في التطبيق ⚽`,
        category,
      });
      if (id) {
        setTestNotifMessage(`تم إرسال إشعار النظام ✅ — عدد المقالات المخزنة: ${count} (id: ${id})`);
        await showToast({ title: `إشعار تجريبي مرسل (${count} مقالات) 🔔`, message: 'تحقق من شريط إشعارات Android.' }).catch(() => {});
      } else {
        setTestNotifMessage('تعذر إرسال الإشعار — الوحدة غير متاحة على هذا الجهاز.');
      }
    } catch {
      setTestNotifMessage('تعذر إرسال الإشعار التجريبي. حاول مرة أخرى.');
    } finally {
      setTestingNotif(false);
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
      <ScrollView contentContainerStyle={[styles.content, { maxWidth: readingMaxWidth }]}>
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

        {/* Section notifications : react-call toast + notifs système + vérificateur */}
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <View style={[ui.row, styles.sectionHeader]}>
            <Icon name="clock" size={20} color={colors.green} />
            <ArabicText style={[styles.sectionTitle, { color: colors.ink }]}>التنبيهات والأخبار الجديدة</ArabicText>
          </View>

          <View style={[ui.row, styles.settingRow]}>
            <View style={{ flex: 1 }}>
              <ArabicText style={{ fontFamily: fonts.medium, fontSize: 13 }}>فحص تلقائي كل 3 دقائق</ArabicText>
              <ArabicText style={{ fontSize: 11, color: colors.muted }}>يتحقق من الأقسام المختارة أثناء استخدام التطبيق</ArabicText>
            </View>
            <Switch
              value={autoCheckNewNews}
              onValueChange={setAutoCheckNewNews}
              trackColor={{ false: colors.line, true: colors.green }}
              thumbColor={colors.paper}
            />
          </View>

          <View style={[ui.row, styles.settingRow, { borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 14 }]}>
            <View style={{ flex: 1 }}>
              <ArabicText style={{ fontFamily: fonts.medium, fontSize: 13 }}>إشعار عند خبر جديد</ArabicText>
              <ArabicText style={{ fontSize: 11, color: colors.muted }}>
                {perm === 'granted' ? 'Toast داخل التطبيق + إشعار نظام' : perm === 'denied' ? 'الإذن مرفوض — فعّله من إعدادات الهاتف' : 'Toast + طلب إذن الإشعارات'}
              </ArabicText>
            </View>
            <Switch
              value={notifyNewNews && perm === 'granted'}
              onValueChange={async (v) => {
                if (v) {
                  if (appVisits < 2 && perm !== 'granted') {
                    void showToast({ title: 'جرّب التطبيق أولًا', message: 'يمكن تفعيل التنبيهات بدءًا من الزيارة الثانية.' });
                    return;
                  }
                  const ok = await requestNotificationPermission().catch(() => false);
                  setPerm(await getNotificationPermission().catch(() => 'undetermined' as const));
                  if (!ok) {
                    showToast({ title: 'تعذر تفعيل الإشعارات', message: 'اسمح بالإشعارات من إعدادات الهاتف.' }).catch(() => {});
                    return;
                  }
                }
                setNotifyNewNews(v);
              }}
              trackColor={{ false: colors.line, true: colors.green }}
              thumbColor={colors.paper}
            />
          </View>

          <ArabicText style={{ fontSize: 12, color: colors.muted, marginTop: 12 }}>الأقسام التي تريد تنبيهاتها:</ArabicText>
          <View style={[ui.row, { flexWrap: 'wrap', gap: 8, marginVertical: 12 }]}>
            {categories.map(item => <Pressable key={item.id} accessibilityRole="checkbox" accessibilityLabel={item.name} accessibilityState={{ checked: alertCategories.includes(item.id) }} onPress={() => toggleAlertCategory(item.id)} style={{ padding: 8, borderRadius: 5, backgroundColor: alertCategories.includes(item.id) ? colors.soft : colors.paper }}><ArabicText style={{ fontSize: 11 }}>{item.name}</ArabicText></Pressable>)}
          </View>
          <View style={[ui.row, styles.settingRow]}>
            <View style={{ flex: 1 }}><ArabicText style={{ fontSize: 13, fontFamily: fonts.medium }}>تذكير يومي بأهم الأخبار</ArabicText><ArabicText style={{ fontSize: 11, color: colors.muted }}>الساعة ١٩:٠٠ حسب وقت هاتفك</ArabicText></View>
            <Switch accessibilityLabel="تذكير يومي" value={dailyReminder} disabled={scheduling || Platform.OS === 'web'} onValueChange={async enabled => {
              setScheduling(true);
              try {
                if (enabled && !await requestNotificationPermission()) {
                  void showToast({ title: appVisits < 2 ? 'متاح بدءًا من الزيارة الثانية' : 'اسمح بالإشعارات من إعدادات الهاتف' });
                  return;
                }
                if (await setDailyNewsReminder(enabled)) setDailyReminder(enabled);
                setPerm(await getNotificationPermission());
              } catch { void showToast({ title: 'تعذر ضبط التذكير. حاول مرة أخرى.' }); }
              finally { setScheduling(false); }
            }} trackColor={{ false: colors.line, true: colors.green }} thumbColor={colors.paper}/>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="فحص الأخبار الجديدة الآن"
            disabled={checkingNews}
            onPress={async () => {
              setCheckingNews(true);
              try {
                const res = await checkForNewNews(category);
                if (res.isFirstRun) {
                  showToast({ title: 'تم تفعيل المراقبة ✅', message: 'سننبهك عند وصول أخبار جديدة.' }).catch(() => {});
                } else if (res.count > 0) {
                  showToast({ title: `${res.count} أخبار جديدة 📰`, message: res.fresh[0]?.title ?? '', actionLabel: 'عرض' }).catch(() => {});
                } else {
                  showToast({ title: 'لا جديد حاليًا', message: 'أنت مطّلع على آخر الأخبار.' }).catch(() => {});
                }
              } catch {
                showToast({ title: 'تعذر الفحص', message: 'تحقق من اتصالك وحاول مرة أخرى.' }).catch(() => {});
              } finally {
                setCheckingNews(false);
              }
            }}
            style={[ui.row, styles.actionButton, { backgroundColor: colors.paper, borderColor: colors.line, marginTop: 12 }]}
          >
            <View style={[ui.row, { gap: 8 }]}>
              <Icon name="refresh" size={17} color={colors.green} />
              <ArabicText style={{ fontFamily: fonts.medium, fontSize: 12, color: colors.ink }}>
                {checkingNews ? 'جارٍ الفحص...' : 'فحص الأخبار الجديدة الآن'}
              </ArabicText>
            </View>
            <ArabicText style={{ fontSize: 10, color: colors.muted }}>آخر الأخبار</ArabicText>
          </Pressable>

          {/* Test notification système Android + nombre d'articles stockés */}
          <View style={{ marginTop: 12, borderWidth: 1, borderColor: colors.line, borderRadius: 6, padding: 12, backgroundColor: colors.paper }}>
            <ArabicText style={{ fontFamily: fonts.medium, fontSize: 13, color: colors.ink }}>
              اختبار إشعار النظام (Android)
            </ArabicText>
            <ArabicText style={{ fontSize: 11, color: colors.muted, marginTop: 4 }}>
              يرسل إشعارًا حقيقيًا في شريط نظام Android يعرض عدد مقالات الكرة المخزنة.
            </ArabicText>

            <View style={[ui.row, styles.statRow, { borderTopColor: colors.line, borderBottomColor: colors.line, marginTop: 10 }]}>
              <ArabicText style={{ fontSize: 12, color: colors.muted }}>عدد مقالات الكرة المخزنة:</ArabicText>
              <ArabicText style={{ fontSize: 13, fontFamily: fonts.bold, color: colors.green }}>
                {cacheStats.articleCount.toLocaleString('ar')} مقال
              </ArabicText>
            </View>

            <View style={[ui.row, styles.statRow, { borderTopColor: colors.line, borderBottomColor: colors.line }]}>
              <ArabicText style={{ fontSize: 12, color: colors.muted }}>حالة الإذن / القناة:</ArabicText>
              <ArabicText style={{ fontSize: 11, fontFamily: fonts.bold, color: colors.ink }}>
                {perm === 'granted' ? 'مفعّل ✅' : perm === 'denied' ? 'مرفوض ❌' : 'غير محدد'} • news
              </ArabicText>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="إرسال إشعار تجريبي في نظام Android"
              disabled={testingNotif}
              onPress={handleTestSystemNotification}
              style={[ui.row, styles.actionButton, { backgroundColor: colors.green, borderColor: colors.green, opacity: testingNotif ? 0.6 : 1 }]}
            >
              <View style={[ui.row, { gap: 8 }]}>
                <Icon name="clock" size={17} color="#fff" />
                <ArabicText style={{ fontFamily: fonts.medium, fontSize: 12, color: '#fff' }}>
                  {testingNotif ? 'جارٍ الإرسال...' : `إرسال إشعار تجريبي (${cacheStats.articleCount} مقال)`}
                </ArabicText>
              </View>
              <ArabicText style={{ fontSize: 10, color: '#fff' }}>Android 🔔</ArabicText>
            </Pressable>

            {testNotifMessage ? (
              <ArabicText style={{ fontSize: 11, color: colors.muted, marginTop: 8 }}>
                {testNotifMessage}
              </ArabicText>
            ) : null}
            {Platform.OS === 'web' ? (
              <ArabicText style={{ fontSize: 10, color: colors.muted, marginTop: 4 }}>
                ملاحظة: الويب لا يدعم إشعارات النظام — يظهر Toast فقط. جرّب على جهاز Android.
              </ArabicText>
            ) : null}
          </View>
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

        {/* Section mises à jour OTA (EAS Update) */}
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <View style={[ui.row, styles.sectionHeader]}>
            <Icon name="refresh" size={20} color={colors.green} />
            <ArabicText style={[styles.sectionTitle, { color: colors.ink }]}>تحديثات التطبيق</ArabicText>
          </View>

          <View style={[ui.row, styles.statRow, { borderTopColor: colors.line, borderBottomColor: colors.line }]}>
            <ArabicText style={{ fontSize: 12, color: colors.muted }}>الإصدار والقناة:</ArabicText>
            <ArabicText style={{ fontSize: 12, fontFamily: fonts.bold, color: colors.ink }}>
              {appVersion}{appUpdates.channel ? ` • ${appUpdates.channel}` : ''}
            </ArabicText>
          </View>

          <ArabicText style={{ fontSize: 12, color: colors.muted, marginBottom: 12 }}>
            {updateStatusLabel[appUpdates.status]}
            {appUpdates.status === 'error' && appUpdates.error ? ` — ${appUpdates.error}` : ''}
          </ArabicText>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="التحقق من تحديثات التطبيق"
            onPress={() => { void appUpdates.checkNow(); }}
            disabled={!appUpdates.supported || appUpdates.status === 'checking' || appUpdates.status === 'downloading'}
            style={[ui.row, styles.actionButton, { backgroundColor: colors.paper, borderColor: colors.line, opacity: appUpdates.supported ? 1 : 0.45 }]}
          >
            <View style={[ui.row, { gap: 8 }]}>
              <Icon name="refresh" size={17} color={colors.green} />
              <ArabicText style={{ fontFamily: fonts.medium, fontSize: 12, color: colors.ink }}>
                {appUpdates.status === 'checking' || appUpdates.status === 'downloading' ? 'جارٍ العمل...' : 'التحقق من التحديثات'}
              </ArabicText>
            </View>
            <ArabicText style={{ fontSize: 10, color: colors.muted }}>EAS Update</ArabicText>
          </Pressable>
        </View>

        {/* Section 3: App info */}
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <ArabicText accessibilityRole="header" style={styles.sectionTitle}>الخصوصية والمساعدة</ArabicText>
          <View style={[ui.row, styles.settingRow]}>
            <View style={{ flex: 1 }}><ArabicText style={{ fontSize: 13 }}>المساعدة في تحسين التطبيق</ArabicText><ArabicText style={{ fontSize: 11, color: colors.muted }}>مقاييس استخدام اختيارية دون نص البحث أو محتوى الأخبار</ArabicText></View>
            <Switch accessibilityLabel="مقاييس الاستخدام الاختيارية" value={analyticsEnabled} onValueChange={setAnalyticsEnabled} trackColor={{ false: colors.line, true: colors.green }} thumbColor={colors.paper}/>
          </View>
          <Pressable accessibilityRole="button" onPress={() => router.push('/privacy')} style={[styles.actionButton, { borderColor: colors.line, marginTop: 10 }]}><ArabicText>سياسة الخصوصية</ArabicText></Pressable>
          <Pressable accessibilityRole="button" onPress={() => { void reportProblem().catch(() => { void showToast({ title: 'تعذر فتح المشاركة' }); }); }} style={[styles.actionButton, { borderColor: colors.line, marginTop: 10 }]}><ArabicText>الإبلاغ عن مشكلة</ArabicText></Pressable>
        </View>
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.line, alignItems: 'center', paddingVertical: 18 }]}>
          <ArabicText style={{ fontFamily: fonts.bold, fontSize: 13, marginBottom: 4 }}>أخبار الكرة العالمية</ArabicText>
          <ArabicText style={{ fontSize: 11, color: colors.muted }}>الإصدار {appVersion}</ArabicText>
          <ArabicText style={{ fontSize: 10, color: colors.green, marginTop: 6 }}>المصدر الإخباري: هاي كورة (hihi2.com)</ArabicText>
        </View>
      </ScrollView>
    </Frame>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingTop: 24, paddingBottom: 50, width: '100%', alignSelf: 'center' },
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
