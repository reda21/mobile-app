import { memo, useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type TextProps, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Link, router } from 'expo-router';
import Svg, { Circle, Path } from 'react-native-svg';
import { APP_NAME } from '../lib/categories';
import { getArticleId } from '../lib/article-link';
import { formatCount, formatDateAr } from '../lib/format';
import { t } from '../lib/i18n';
import { reportProblem } from '../lib/feedback';
import { usePreferences } from '../lib/preferences';
import { useResponsive } from '../hooks/use-responsive';
import type { Article, SavedArticle } from '../lib/news';

/** Article complet (flux) ou léger (favori persisté). Les cartes n'utilisent jamais `paragraphs`. */
export type CardArticle = Article | SavedArticle;

/** Onglets persistants de la coque applicative. */
export type BottomTab = 'news' | 'categories' | 'saved' | 'settings';

/** Disposition d'une carte d'article : bandeau, ligne compacte, ou tuile de grille. */
export type CardVariant = 'hero' | 'row' | 'tile';

export const fonts = { body: 'NotoSansArabic_400Regular', medium: 'NotoSansArabic_600SemiBold', bold: 'NotoSansArabic_700Bold', heading: 'NotoKufiArabic_700Bold' };
export type IconName =
  | 'home'
  | 'grid'
  | 'bookmark'
  | 'arrow'
  | 'arrowLeft'
  | 'arrowRight'
  | 'chevronRight'
  | 'chevronLeft'
  | 'search'
  | 'moon'
  | 'sun'
  | 'refresh'
  | 'external'
  | 'speaker'
  | 'stop'
  | 'settings'
  | 'trash'
  | 'clock';

const iconDefs: Record<IconName, (props: { stroke: string; fill: string }) => ReactNode> = {
  home: () => (
    <>
      <Path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <Path d="M9 22V12h6v10" />
    </>
  ),
  grid: () => (
    <>
      <Path d="M3 3h7v7H3z" />
      <Path d="M14 3h7v7h-7z" />
      <Path d="M14 14h7v7h-7z" />
      <Path d="M3 14h7v7H3z" />
    </>
  ),
  bookmark: ({ fill }) => (
    <Path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" fill={fill} />
  ),
  arrow: () => (
    <Path d="M5 12h14m-7-7 7 7-7 7" />
  ),
  arrowRight: () => (
    <Path d="M5 12h14m-7-7 7 7-7 7" />
  ),
  arrowLeft: () => (
    <Path d="M19 12H5m7 7-7-7 7-7" />
  ),
  chevronRight: () => (
    <Path d="m9 18 6-6-6-6" />
  ),
  chevronLeft: () => (
    <Path d="m15 18-6-6 6-6" />
  ),
  search: () => (
    <>
      <Circle cx={11} cy={11} r={8} />
      <Path d="m21 21-4.3-4.3" />
    </>
  ),
  moon: () => (
    <Path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
  ),
  sun: () => (
    <>
      <Circle cx={12} cy={12} r={4} />
      <Path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M6.34 17.66l-1.41 1.41m14.14-14.14-1.41 1.41" />
    </>
  ),
  refresh: () => (
    <>
      <Path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <Path d="M21 3v5h-5" />
      <Path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <Path d="M3 21v-5h5" />
    </>
  ),
  external: () => (
    <>
      <Path d="M15 3h6v6" />
      <Path d="M10 14 21 3" />
      <Path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    </>
  ),
  speaker: () => (
    <>
      <Path d="M11 5 6 9H2v6h4l5 4V5z" />
      <Path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <Path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </>
  ),
  stop: () => (
    <Path d="M6 6h12v12H6z" />
  ),
  settings: () => (
    <>
      <Circle cx={12} cy={12} r={3} />
      <Path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </>
  ),
  trash: () => (
    <>
      <Path d="M3 6h18" />
      <Path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <Path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
      <Path d="M10 11v6" />
      <Path d="M14 11v6" />
    </>
  ),
  clock: () => (
    <>
      <Circle cx={12} cy={12} r={10} />
      <Path d="M12 6v6l4 2" />
    </>
  ),
};

const navTabs = [
  { id: 'news', label: 'الأخبار', icon: 'home', href: '/' },
  { id: 'categories', label: 'الأقسام', icon: 'grid', href: '/categories' },
  { id: 'saved', label: 'المحفوظات', icon: 'bookmark', href: '/saved' },
  { id: 'settings', label: 'الإعدادات', icon: 'settings', href: '/settings' },
] as const;

export const Icon = memo(function Icon({ name, color, size = 21, filled = false }: { name: IconName; color?: string; size?: number; filled?: boolean }) {
  const { colors } = usePreferences();
  const strokeColor = color ?? colors.ink;
  const fillColor = filled ? (color ?? colors.green) : 'none';
  const render = iconDefs[name];

  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={strokeColor}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {render ? render({ stroke: strokeColor, fill: fillColor }) : null}
    </Svg>
  );
});
export const Ball = memo(function Ball({ size = 42 }: { size?: number }) {
  const { colors } = usePreferences();
  return <Svg width={size} height={size} viewBox="0 0 48 48"><Circle cx={24} cy={24} r={22} fill={colors.green}/><Circle cx={24} cy={24} r={14} fill="none" stroke={colors.paper} strokeWidth={1.4}/><Path d="m24 17 7 5-3 8h-8l-3-8ZM24 17v-7m7 12 7-3m-10 11 5 6m-13-6-5 6m2-14-7-3" stroke={colors.paper} strokeWidth={1.4} fill="none"/></Svg>;
});
export const ArabicText = memo(function ArabicText({ style, ...props }: TextProps) {
  const { colors } = usePreferences();
  return <Text {...props} allowFontScaling={props.allowFontScaling ?? true} maxFontSizeMultiplier={props.maxFontSizeMultiplier ?? 1.3} style={[ui.text, { color: colors.ink }, style]}/>;
});
export function Frame({ children, bottom }: { children: ReactNode; bottom?: BottomTab }) {
  const { colors, notice } = usePreferences();
  const { showSideNav, contentMaxWidth } = useResponsive();
  const hasNav = bottom !== undefined;
  const showBottomNav = hasNav && !showSideNav;
  return (
    <View style={[ui.root, { backgroundColor: colors.paper, direction: 'rtl' }]}>
      <SafeAreaView edges={showSideNav ? ['top', 'left', 'right', 'bottom'] : ['top', 'left', 'right']} style={[ui.safe, { backgroundColor: colors.paper }]}>
        <View style={ui.shell}>
          {showSideNav && hasNav && <SideNav active={bottom} />}
          <View style={ui.contentWrap}>
            <View style={[ui.contentColumn, { maxWidth: contentMaxWidth }]}>
              {children}
              {showBottomNav && <BottomNav active={bottom} />}
            </View>
          </View>
        </View>
      </SafeAreaView>
      {!!notice && <View style={[ui.notice, { backgroundColor: colors.ink, bottom: showBottomNav ? 100 : 28 }]} accessibilityLiveRegion="polite"><ArabicText style={{ color: colors.paper, fontSize: 12 }}>{notice}</ArabicText></View>}
    </View>
  );
}
export const Header = memo(function Header({ back = false }: { back?: boolean }) {
  const { colors, dark, toggleTheme } = usePreferences();
  return <View style={[ui.header, ui.row, { borderBottomColor: colors.line }]}>
    <View style={[ui.row, { flex: 1, gap: 10 }]}><Ball/><View><ArabicText style={{ fontFamily: fonts.heading, fontSize: 14 }}>{APP_NAME}</ArabicText><ArabicText style={{ fontSize: 10, color: colors.muted }}>{t('appTagline')}</ArabicText></View></View>
    {back && <Pressable accessibilityRole="button" accessibilityLabel="العودة" hitSlop={8} style={({ pressed }) => [ui.iconButton, pressed && { opacity: 0.6 }]} onPress={() => router.canGoBack() ? router.back() : router.replace('/')}><Icon name="arrow"/></Pressable>}
    <Pressable accessibilityRole="button" accessibilityLabel="الإعدادات" hitSlop={8} style={({ pressed }) => [ui.iconButton, pressed && { opacity: 0.6 }]} onPress={() => router.push('/settings')}><Icon name="settings"/></Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel={dark ? 'تفعيل الوضع النهاري' : 'تفعيل الوضع الليلي'} hitSlop={8} style={({ pressed }) => [ui.iconButton, pressed && { opacity: 0.6 }]} onPress={toggleTheme}><Icon name={dark ? 'sun' : 'moon'}/></Pressable>
  </View>;
});
function SideNav({ active }: { active: BottomTab }) {
  const { colors, saved } = usePreferences();
  return <View style={[ui.sideNav, { borderLeftColor: colors.line, backgroundColor: colors.surface }]}>
    <View style={[ui.row, { gap: 10, paddingHorizontal: 16, paddingVertical: 20 }]}><Ball size={34}/><View style={{ flex: 1 }}><ArabicText style={{ fontFamily: fonts.heading, fontSize: 13 }}>{APP_NAME}</ArabicText><ArabicText style={{ fontSize: 9, color: colors.muted }}>{t('appTagline')}</ArabicText></View></View>
    {navTabs.map(tab => {
      const selected = active === tab.id;
      return <Pressable key={tab.id} accessibilityRole="button" accessibilityLabel={tab.label} accessibilityHint="اضغط للانتقال إلى هذا القسم" accessibilityState={{ selected }} onPress={() => router.replace(tab.href)} style={[ui.sideTab, ui.row, selected && { backgroundColor: colors.soft }]}><Icon name={tab.icon} color={selected ? colors.green : colors.muted}/><ArabicText style={{ fontFamily: selected ? fonts.bold : fonts.medium, fontSize: 13, color: selected ? colors.green : colors.muted }}>{tab.label}{tab.id === 'saved' && saved.length ? ` (${formatCount(saved.length)})` : ''}</ArabicText></Pressable>;
    })}
  </View>;
}
function BottomNav({ active }: { active: BottomTab }) {
  const { colors, saved } = usePreferences();
  return <SafeAreaView edges={['bottom']} style={{ backgroundColor: colors.surface }}><View style={[ui.bottom, ui.row, { borderTopColor: colors.line }]}>{navTabs.map(tab => <Pressable key={tab.id} accessibilityRole="button" accessibilityLabel={tab.label} accessibilityHint="اضغط للانتقال إلى هذا القسم" accessibilityState={{ selected: active === tab.id }} onPress={() => router.replace(tab.href)} style={ui.tab}><View style={[ui.tabIcon, active === tab.id && { backgroundColor: colors.soft }]}><Icon name={tab.icon} color={active === tab.id ? colors.green : colors.muted}/></View><ArabicText style={{ fontFamily: fonts.medium, fontSize: 10, color: active === tab.id ? colors.green : colors.muted }}>{tab.label}{tab.id === 'saved' && saved.length ? ` (${formatCount(saved.length)})` : ''}</ArabicText></Pressable>)}</View></SafeAreaView>;
}
const BLURHASH = 'LEHV6nWB2yk8pyo0adR*.7kCMdnj';
export const Photo = memo(function Photo({ article, style, hero = false }: { article: CardArticle; style?: ViewStyle; hero?: boolean }) {
  const { colors } = usePreferences();
  const [failed, setFailed] = useState(false);
  return <View style={[ui.photo, { backgroundColor: colors.soft }, style]}>{article.image && !failed ? <Image source={{ uri: article.image }} placeholder={BLURHASH} placeholderContentFit="cover" priority={hero ? 'high' : 'low'} recyclingKey={article.id} allowDownscaling contentFit="cover" transition={120} cachePolicy="memory-disk" style={StyleSheet.absoluteFill} onError={() => setFailed(true)} accessibilityLabel={`صورة: ${article.title}`}/> : <View style={ui.placeholder}><Ball size={46}/></View>}</View>;
});
export const Bookmark = memo(function Bookmark({ article }: { article: CardArticle }) {
  const { saved, toggleSaved, colors } = usePreferences();
  const selected = saved.some(a => a.url === article.url);
  return <Pressable accessibilityRole="button" accessibilityLabel={selected ? 'إزالة من المحفوظات' : 'حفظ الخبر'} accessibilityState={{ selected }} onPress={() => toggleSaved(article)} hitSlop={8} style={[ui.iconButton, { backgroundColor: colors.surface }]}><Icon name="bookmark" size={18} color={colors.green} filled={selected}/></Pressable>;
});
export const ArticleCard = memo(function ArticleCard({ article, variant = 'row' }: { article: CardArticle; variant?: CardVariant }) {
  const { colors } = usePreferences();
  const { heroAspectRatio } = useResponsive();
  const target = { pathname: '/article/[id]', params: { id: getArticleId(article.url) ?? 'unknown' } } as const;
  const date = formatDateAr(article.published) || t('sourceName');
  const meta = <View style={[ui.row, { gap: 7 }]}><ArabicText numberOfLines={1} style={{ color: colors.green, fontSize: 10, fontFamily: fonts.medium, flexShrink: 1 }}>{article.tags[0] || t('football')}</ArabicText><ArabicText style={{ color: colors.muted, fontSize: 10 }}>• {date}</ArabicText></View>;
  if (variant === 'hero') {
    return <View style={{ paddingBottom: 23 }}><View><Link href={target} asChild><Pressable accessibilityLabel={`قراءة: ${article.title}`} accessibilityHint="اضغط لفتح الخبر" accessibilityRole="button"><Photo article={article} hero style={{ aspectRatio: heroAspectRatio }}/></Pressable></Link><View style={{ position: 'absolute', top: 12, left: 12 }}><Bookmark article={article}/></View><View style={[ui.imageLabel, { backgroundColor: colors.surface }]}><ArabicText style={{ fontSize: 10, fontFamily: fonts.bold, color: colors.green }}>في الواجهة</ArabicText></View></View><View style={{ marginTop: 14 }}>{meta}</View><Link href={target} asChild><Pressable accessibilityRole="button" accessibilityLabel={article.title} accessibilityHint="اضغط لفتح الخبر"><ArabicText style={[ui.heroTitle, { fontFamily: fonts.heading }]}>{article.title}</ArabicText></Pressable></Link><ArabicText numberOfLines={2} style={{ color: colors.muted, fontSize: 12, lineHeight: 24 }}>{article.summary}</ArabicText><Link href={target} asChild><Pressable accessibilityRole="button" accessibilityLabel="اقرأ القصة كاملة" accessibilityHint="اضغط لقراءة النص الكامل" style={StyleSheet.flatten([ui.row, { alignSelf: 'flex-end', gap: 10, marginTop: 12 }])}><ArabicText style={{ color: colors.green, fontFamily: fonts.bold, fontSize: 12 }}>اقرأ القصة كاملة</ArabicText><Icon name="arrowLeft" size={16} color={colors.green}/></Pressable></Link></View>;
  }
  if (variant === 'tile') {
    return <View style={[ui.tileCard, { borderColor: colors.line, backgroundColor: colors.surface }]}><Link href={target} asChild><Pressable accessibilityRole="button" accessibilityLabel={`قراءة: ${article.title}`} accessibilityHint="اضغط لفتح الخبر"><Photo article={article} style={{ aspectRatio: 1.75, borderRadius: 0 }}/></Pressable></Link><View style={{ padding: 12, gap: 8 }}>{meta}<Link href={target} asChild><Pressable accessibilityRole="button" accessibilityLabel={article.title} accessibilityHint="اضغط لفتح الخبر"><ArabicText numberOfLines={3} style={{ fontFamily: fonts.bold, fontSize: 14, lineHeight: 25 }}>{article.title}</ArabicText></Pressable></Link><View style={[ui.row, { justifyContent: 'space-between' }]}><ArabicText style={{ fontSize: 9, color: colors.muted }}>{t('sourceName')}</ArabicText><Bookmark article={article}/></View></View></View>;
  }
  return <View style={[ui.compactCard, ui.row, { borderBottomColor: colors.line }]}><Link href={target} asChild><Pressable accessibilityRole="button" accessibilityLabel={`قراءة: ${article.title}`} accessibilityHint="اضغط لفتح الخبر"><Photo article={article} style={{ width: 94, height: 96, aspectRatio: undefined }}/></Pressable></Link><View style={{ flex: 1, gap: 7 }}>{meta}<Link href={target} asChild><Pressable accessibilityRole="button" accessibilityLabel={article.title} accessibilityHint="اضغط لفتح الخبر"><ArabicText numberOfLines={3} style={{ fontFamily: fonts.bold, fontSize: 14, lineHeight: 26 }}>{article.title}</ArabicText></Pressable></Link><View style={[ui.row, { justifyContent: 'space-between' }]}><ArabicText style={{ fontSize: 9, color: colors.muted }}>{t('sourceName')}</ArabicText><Bookmark article={article}/></View></View></View>;
});
export const NewsRow = memo(function NewsRow({ article, variant = 'row', showMoreHeading }: { article: CardArticle; variant?: CardVariant; showMoreHeading: boolean }) {
  const { colors } = usePreferences();
  return (
    <View>
      {showMoreHeading && <ArabicText accessibilityRole="header" style={[ui.moreHeading, { borderBottomColor: colors.line }]}>المزيد من الأخبار</ArabicText>}
      <ArticleCard article={article} variant={variant} />
    </View>
  );
});
export const EmptyState = memo(function EmptyState({ title, message, retry, loading = false }: { title: string; message?: string | undefined; retry?: (() => void) | undefined; loading?: boolean }) {
  const { colors } = usePreferences();
  return <View style={ui.empty}>{loading ? <ActivityIndicator color={colors.green} size="large"/> : <Ball size={45}/>}<ArabicText style={{ fontFamily: fonts.bold, fontSize: 18, textAlign: 'center' }}>{title}</ArabicText>{message && <ArabicText style={{ color: colors.muted, fontSize: 12, textAlign: 'center', lineHeight: 24 }}>{message}</ArabicText>}{retry && <Pressable accessibilityRole="button" style={[ui.primaryButton, { backgroundColor: colors.green }]} onPress={retry}><ArabicText style={{ color: colors.paper, fontFamily: fonts.bold }}>حاول مرة أخرى</ArabicText></Pressable>}{retry && !loading && <Pressable accessibilityRole="button" onPress={() => { void reportProblem().catch(() => {}); }}><ArabicText style={{ color: colors.green }}>الإبلاغ عن مشكلة</ArabicText></Pressable>}</View>;
});
export const ui = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  shell: { flex: 1, width: '100%', maxWidth: 1360, alignSelf: 'center', flexDirection: 'row-reverse', alignItems: 'stretch' },
  contentWrap: { flex: 1, alignItems: 'center' },
  contentColumn: { flex: 1, width: '100%' },
  sideNav: { width: 236, borderLeftWidth: 1, paddingTop: 4, paddingBottom: 20 },
  sideTab: { marginHorizontal: 12, marginVertical: 3, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 8, gap: 12 },
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
  tileCard: { borderWidth: 1, borderRadius: 8, overflow: 'hidden' },
  moreHeading: { fontFamily: fonts.heading, fontSize: 18, marginTop: 8, borderBottomWidth: 1, paddingBottom: 17 },
  empty: { padding: 32, paddingVertical: 60, gap: 20, alignItems: 'center' },
  primaryButton: { paddingVertical: 12, paddingHorizontal: 24, borderRadius: 4 },
  notice: { position: 'absolute', bottom: 100, left: 20, right: 20, borderRadius: 6, padding: 15 },
});
