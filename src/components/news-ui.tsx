import { useState, type ReactNode } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View, type TextProps, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Link, router } from 'expo-router';
import Svg, { Circle, Path } from 'react-native-svg';
import { APP_NAME } from '../lib/categories';
import { getArticleId } from '../lib/article-link';
import { usePreferences } from '../lib/preferences';
import type { Article } from '../lib/news';

export const fonts = { body: 'NotoSansArabic_400Regular', medium: 'NotoSansArabic_600SemiBold', bold: 'NotoSansArabic_700Bold', heading: 'NotoKufiArabic_700Bold' };
const paths = {
  home: 'm3 10 9-7 9 7v11h-7v-7h-4v7H3Z',
  grid: 'M3 3h7v7H3Zm11 0h7v7h-7ZM3 14h7v7H3Zm11 0h7v7h-7Z',
  bookmark: 'M6 4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v17l-6-4-6 4Z',
  arrow: 'M4 12h16m-6-6 6 6-6 6',
  search: 'm21 21-4.4-4.4M19 10.5a8.5 8.5 0 1 1-17 0 8.5 8.5 0 0 1 17 0',
  moon: 'M20.9 13.1A9 9 0 1 1 10.9 3.1a7 7 0 0 0 10 10Z',
  sun: 'M12 1v2m0 18v2M1 12h2m18 0h2M17 12a5 5 0 1 1-10 0 5 5 0 0 1 10 0',
  refresh: 'M20 7v5h-5M4 17v-5h5M5 8a8 8 0 0 1 13-3l2 3M4 16l2 3a8 8 0 0 0 13-3',
  external: 'M14 3h7v7m0-7L10 14M10 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5',
  speaker: 'M11 5 6 9H2v6h4l5 4V5Zm4.5 3.5a5 5 0 0 1 0 7m2.5-9.5a8.5 8.5 0 0 1 0 12',
  stop: 'M6 6h12v12H6z',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.4 1.4-1 .6a8.5 8.5 0 0 1-.8 1.4l.4 1.1a1 1 0 0 1-.3 1.2l-1.4 1.4a1 1 0 0 1-1.2.3l-1.1-.4a8.5 8.5 0 0 1-1.4.8l-.6 1a1 1 0 0 1-1.1.5h-2a1 1 0 0 1-1.1-.5l-.6-1a8.5 8.5 0 0 1-1.4-.8l-1.1.4a1 1 0 0 1-1.2-.3L3.1 19.5a1 1 0 0 1-.3-1.2l.4-1.1a8.5 8.5 0 0 1-.8-1.4l-1-.6a1 1 0 0 1-.5-1.1v-2a1 1 0 0 1 .5-1.1l1-.6a8.5 8.5 0 0 1 .8-1.4l-.4-1.1a1 1 0 0 1 .3-1.2l1.4-1.4a1 1 0 0 1 1.2-.3l1.1.4a8.5 8.5 0 0 1 1.4-.8l.6-1a1 1 0 0 1 1.1-.5h2a1 1 0 0 1 1.1.5l.6 1a8.5 8.5 0 0 1 1.4.8l1.1-.4a1 1 0 0 1 1.2.3l1.4 1.4a1 1 0 0 1 .3 1.2l-.4 1.1a8.5 8.5 0 0 1 .8 1.4l1 .6a1 1 0 0 1 .5 1.1v2a1 1 0 0 1-.5 1.1Z',
  trash: 'M3 6h18m-2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2',
  clock: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Zm0-15v5l3 3',
};
export function Icon({ name, color, size = 21, filled = false }: { name: keyof typeof paths; color?: string; size?: number; filled?: boolean }) {
  const { colors } = usePreferences();
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? color ?? colors.green : 'none'} stroke={color ?? colors.ink} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round"><Path d={paths[name]}/></Svg>;
}
export function Ball({ size = 42 }: { size?: number }) {
  const { colors } = usePreferences();
  return <Svg width={size} height={size} viewBox="0 0 48 48"><Circle cx={24} cy={24} r={22} fill={colors.green}/><Circle cx={24} cy={24} r={14} fill="none" stroke={colors.paper} strokeWidth={1.4}/><Path d="m24 17 7 5-3 8h-8l-3-8ZM24 17v-7m7 12 7-3m-10 11 5 6m-13-6-5 6m2-14-7-3" stroke={colors.paper} strokeWidth={1.4} fill="none"/></Svg>;
}
export function ArabicText({ style, ...props }: TextProps) {
  const { colors } = usePreferences();
  return <Text {...props} style={[ui.text, { color: colors.ink }, style]}/>;
}
export function Frame({ children, bottom }: { children: ReactNode; bottom?: 'news' | 'categories' | 'saved' | 'settings' }) {
  const { colors, notice } = usePreferences();
  return <View style={[{ flex: 1, backgroundColor: colors.paper }, Platform.OS !== 'web' && { direction: 'ltr' }]}><SafeAreaView edges={['top', 'left', 'right']} style={[ui.frame, { backgroundColor: colors.paper }]}>{children}{bottom && <BottomNav active={bottom}/>}{!!notice && <View style={[ui.notice, { backgroundColor: colors.ink }]} accessibilityLiveRegion="polite"><ArabicText style={{ color: colors.paper, fontSize: 12 }}>{notice}</ArabicText></View>}</SafeAreaView></View>;
}
export function Header({ back = false }: { back?: boolean }) {
  const { colors, dark, toggleTheme } = usePreferences();
  return <View style={[ui.header, ui.row, { borderBottomColor: colors.line }]}>
    <View style={[ui.row, { flex: 1, gap: 10 }]}><Ball/><View><ArabicText style={{ fontFamily: fonts.heading, fontSize: 14 }}>{APP_NAME}</ArabicText><ArabicText style={{ fontSize: 10, color: colors.muted }}>العالم يتكلم كرة</ArabicText></View></View>
    {back && <Pressable accessibilityRole="button" accessibilityLabel="العودة" hitSlop={8} style={ui.iconButton} onPress={() => router.canGoBack() ? router.back() : router.replace('/')}><Icon name="arrow"/></Pressable>}
    <Pressable accessibilityRole="button" accessibilityLabel="الإعدادات" hitSlop={8} style={ui.iconButton} onPress={() => router.push('/settings')}><Icon name="settings"/></Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel={dark ? 'تفعيل الوضع النهاري' : 'تفعيل الوضع الليلي'} hitSlop={8} style={ui.iconButton} onPress={toggleTheme}><Icon name={dark ? 'sun' : 'moon'}/></Pressable>
  </View>;
}
function BottomNav({ active }: { active: 'news' | 'categories' | 'saved' | 'settings' }) {
  const { colors, saved } = usePreferences();
  const tabs = [
    { id: 'news', label: 'الأخبار', icon: 'home', href: '/' },
    { id: 'categories', label: 'الأقسام', icon: 'grid', href: '/categories' },
    { id: 'saved', label: 'المحفوظات', icon: 'bookmark', href: '/saved' },
    { id: 'settings', label: 'الإعدادات', icon: 'settings', href: '/settings' },
  ] as const;
  return <SafeAreaView edges={['bottom']} style={{ backgroundColor: colors.surface }}><View style={[ui.bottom, ui.row, { borderTopColor: colors.line }]}>{tabs.map(tab => <Pressable key={tab.id} accessibilityRole="button" accessibilityLabel={tab.label} accessibilityState={{ selected: active === tab.id }} onPress={() => router.replace(tab.href)} style={ui.tab}><View style={[ui.tabIcon, active === tab.id && { backgroundColor: colors.soft }]}><Icon name={tab.icon} color={active === tab.id ? colors.green : colors.muted}/></View><ArabicText style={{ fontFamily: fonts.medium, fontSize: 10, color: active === tab.id ? colors.green : colors.muted }}>{tab.label}{tab.id === 'saved' && saved.length ? ` (${saved.length.toLocaleString('ar')})` : ''}</ArabicText></Pressable>)}</View></SafeAreaView>;
}
export function Photo({ article, style }: { article: Article; style?: ViewStyle }) {
  const { colors } = usePreferences();
  const [failed, setFailed] = useState(false);
  return <View style={[ui.photo, { backgroundColor: colors.soft }, style]}>{article.image && !failed ? <Image source={{ uri: article.image }} contentFit="cover" transition={120} cachePolicy="memory-disk" style={StyleSheet.absoluteFill} onError={() => setFailed(true)} accessibilityLabel="صورة الخبر"/> : <View style={ui.placeholder}><Ball size={46}/></View>}</View>;
}
export function Bookmark({ article }: { article: Article }) {
  const { saved, toggleSaved, colors } = usePreferences();
  const selected = saved.some(a => a.url === article.url);
  return <Pressable accessibilityRole="button" accessibilityLabel={selected ? 'إزالة من المحفوظات' : 'حفظ الخبر'} accessibilityState={{ selected }} onPress={() => toggleSaved(article)} hitSlop={8} style={[ui.iconButton, { backgroundColor: colors.surface }]}><Icon name="bookmark" size={18} color={colors.green} filled={selected}/></Pressable>;
}
export function ArticleCard({ article, hero = false }: { article: Article; hero?: boolean }) {
  const { colors } = usePreferences();
  const target = { pathname: '/article/[id]', params: { id: getArticleId(article.url) ?? 'unknown' } } as const;
  const date = article.published ? new Intl.DateTimeFormat('ar', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }).format(new Date(article.published)) : 'هاي كورة';
  const meta = <View style={[ui.row, { gap: 7 }]}><ArabicText numberOfLines={1} style={{ color: colors.green, fontSize: 10, fontFamily: fonts.medium, flexShrink: 1 }}>{article.tags[0] || 'كرة القدم'}</ArabicText><ArabicText style={{ color: colors.muted, fontSize: 10 }}>• {date}</ArabicText></View>;
  return hero ? <View style={{ paddingBottom: 23 }}><View><Link href={target} asChild><Pressable accessibilityLabel={`قراءة: ${article.title}`} accessibilityRole="button"><Photo article={article} style={{ aspectRatio: 1.55 }}/></Pressable></Link><View style={{ position: 'absolute', top: 12, left: 12 }}><Bookmark article={article}/></View><View style={[ui.imageLabel, { backgroundColor: colors.surface }]}><ArabicText style={{ fontSize: 10, fontFamily: fonts.bold, color: colors.green }}>في الواجهة</ArabicText></View></View><View style={{ marginTop: 14 }}>{meta}</View><Link href={target} asChild><Pressable accessibilityRole="button" accessibilityLabel={article.title}><ArabicText style={[ui.heroTitle, { fontFamily: fonts.heading }]}>{article.title}</ArabicText></Pressable></Link><ArabicText numberOfLines={2} style={{ color: colors.muted, fontSize: 12, lineHeight: 24 }}>{article.summary}</ArabicText><Link href={target} asChild><Pressable accessibilityRole="button" accessibilityLabel="اقرأ القصة كاملة" style={StyleSheet.flatten([ui.row, { alignSelf: 'flex-end', gap: 10, marginTop: 12 }])}><ArabicText style={{ color: colors.green, fontFamily: fonts.bold, fontSize: 12 }}>اقرأ القصة كاملة</ArabicText><Icon name="arrow" size={16} color={colors.green}/></Pressable></Link></View>
    : <View style={[ui.compactCard, ui.row, { borderBottomColor: colors.line }]}><Link href={target} asChild><Pressable accessibilityRole="button" accessibilityLabel={`قراءة: ${article.title}`}><Photo article={article} style={{ width: 94, height: 96, aspectRatio: undefined }}/></Pressable></Link><View style={{ flex: 1, gap: 7 }}>{meta}<Link href={target} asChild><Pressable accessibilityRole="button" accessibilityLabel={article.title}><ArabicText numberOfLines={3} style={{ fontFamily: fonts.bold, fontSize: 14, lineHeight: 26 }}>{article.title}</ArabicText></Pressable></Link><View style={[ui.row, { justifyContent: 'space-between' }]}><ArabicText style={{ fontSize: 9, color: colors.muted }}>هاي كورة</ArabicText><Bookmark article={article}/></View></View></View>;
}
export function EmptyState({ title, message, retry, loading = false }: { title: string; message?: string; retry?: () => void; loading?: boolean }) {
  const { colors } = usePreferences();
  return <View style={ui.empty}>{loading ? <ActivityIndicator color={colors.green} size="large"/> : <Ball size={45}/>}<ArabicText style={{ fontFamily: fonts.bold, fontSize: 18, textAlign: 'center' }}>{title}</ArabicText>{message && <ArabicText style={{ color: colors.muted, fontSize: 12, textAlign: 'center', lineHeight: 24 }}>{message}</ArabicText>}{retry && <Pressable accessibilityRole="button" style={[ui.primaryButton, { backgroundColor: colors.green }]} onPress={retry}><ArabicText style={{ color: colors.paper, fontFamily: fonts.bold }}>حاول مرة أخرى</ArabicText></Pressable>}</View>;
}
export const ui = StyleSheet.create({
  frame: { flex: 1, width: '100%', maxWidth: 600, alignSelf: 'center' },
  text: { fontFamily: fonts.body, writingDirection: 'rtl', textAlign: 'right', includeFontPadding: false },
  row: { flexDirection: 'row-reverse', alignItems: 'center' },
  header: { paddingHorizontal: 20, paddingVertical: 17, borderBottomWidth: 1, gap: 6 },
  iconButton: { width: 38, height: 38, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  bottom: { borderTopWidth: 1, paddingTop: 8, paddingBottom: 9 },
  tab: { flex: 1, minHeight: 52, alignItems: 'center', gap: 3 },
  tabIcon: { paddingVertical: 5, paddingHorizontal: 16, borderRadius: 15 },
  photo: { width: '100%', aspectRatio: 1.6, borderRadius: 6, overflow: 'hidden' },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center', opacity: 0.45 },
  imageLabel: { position: 'absolute', right: 13, bottom: 13, paddingVertical: 5, paddingHorizontal: 12, borderRadius: 3 },
  heroTitle: { fontSize: 20, lineHeight: 38, marginTop: 10, marginBottom: 8 },
  compactCard: { gap: 15, borderBottomWidth: 1, paddingVertical: 17, alignItems: 'flex-start' },
  empty: { padding: 32, paddingVertical: 60, gap: 20, alignItems: 'center' },
  primaryButton: { paddingVertical: 12, paddingHorizontal: 24, borderRadius: 4 },
  notice: { position: 'absolute', bottom: 100, left: 20, right: 20, borderRadius: 6, padding: 15 },
});
