import { useEffect } from 'react';
import { I18nManager, Platform, View } from 'react-native';
import { Stack, router } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PreferencesProvider, usePreferences } from '../lib/preferences';
import { AppToast } from '../lib/toast';
import { ensureNewsChannel, onNotificationTap, setupNotificationsHandler, setDailyNewsReminder } from '../lib/local-notifications';
import { initSentry, Sentry } from '../lib/sentry';
import { isOnline } from '../lib/network';
import { setOnlineChecker } from '../lib/news';

export { ErrorBoundary } from '../components/error-boundary';

I18nManager.allowRTL(true);
I18nManager.forceRTL(true);
const sentryInitialized = initSentry();
setOnlineChecker(isOnline);
SplashScreen.preventAutoHideAsync().catch(() => {});
setupNotificationsHandler();

function useNotificationNavigation() {
  useEffect(() => {
    if (Platform.OS === 'web') return;
    return onNotificationTap((data) => {
      const articleId = typeof data.articleId === 'string' ? data.articleId : null;
      if (articleId && /^[1-9]\d{0,11}$/.test(articleId)) {
        router.push({ pathname: '/article/[id]', params: { id: articleId } });
      } else {
        router.push('/');
      }
    });
  }, []);
}

function Navigation() {
  const { dark, colors } = usePreferences();
  const { ready, dailyReminder } = usePreferences();
  useEffect(() => {
    if (ready) void setDailyNewsReminder(dailyReminder).catch(() => {});
  }, [ready, dailyReminder]);
  useNotificationNavigation();
  useEffect(() => {
    ensureNewsChannel().catch(() => {});
  }, []);
  return (
    <View style={{ flex: 1 }}>
      <StatusBar style={dark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.paper } }}>
        <Stack.Screen name="index" options={{ title: 'أخبار الكرة العالمية — آخر الأخبار' }} />
        <Stack.Screen name="categories" options={{ title: 'أخبار الكرة العالمية — الأقسام' }} />
        <Stack.Screen name="saved" options={{ title: 'أخبار الكرة العالمية — المحفوظات' }} />
        <Stack.Screen name="settings" options={{ title: 'أخبار الكرة العالمية — الإعدادات' }} />
        <Stack.Screen name="article/[id]" options={{ title: 'أخبار الكرة العالمية' }} />
      </Stack>
      <AppToast />
    </View>
  );
}

function RootLayout() {
  const [loaded, error] = useFonts({
    NotoSansArabic_400Regular: require('@expo-google-fonts/noto-sans-arabic/400Regular/NotoSansArabic_400Regular.ttf'),
    NotoSansArabic_600SemiBold: require('@expo-google-fonts/noto-sans-arabic/600SemiBold/NotoSansArabic_600SemiBold.ttf'),
    NotoSansArabic_700Bold: require('@expo-google-fonts/noto-sans-arabic/700Bold/NotoSansArabic_700Bold.ttf'),
    NotoKufiArabic_700Bold: require('@expo-google-fonts/noto-kufi-arabic/700Bold/NotoKufiArabic_700Bold.ttf'),
  });
  useEffect(() => { if (loaded || error) SplashScreen.hideAsync().catch(() => {}); }, [loaded, error]);
  if (!loaded && !error) return null;
  return <SafeAreaProvider><PreferencesProvider><Navigation/></PreferencesProvider></SafeAreaProvider>;
}

export default sentryInitialized ? Sentry.wrap(RootLayout) : RootLayout;
