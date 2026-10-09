import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PreferencesProvider, usePreferences } from '../lib/preferences';

SplashScreen.preventAutoHideAsync().catch(() => {});

function Navigation() {
  const { dark, colors } = usePreferences();
  return <><StatusBar style={dark ? 'light' : 'dark'}/><Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.paper } }}/></>;
}

export default function RootLayout() {
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
