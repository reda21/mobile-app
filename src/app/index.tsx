import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, RefreshControl, StyleSheet, TextInput, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { categories, type CategoryId } from '../lib/categories';
import { getNews, type Article, type NewsFeed } from '../lib/news';
import { filterArticles } from '../lib/search';
import { formatCount } from '../lib/format';
import { t } from '../lib/i18n';
import { track } from '../lib/analytics';
import { markCategorySeen } from '../lib/news-watcher';
import { groupIntoRows, type GridRow } from '../lib/feed-grid';
import { useDebouncedValue } from '../hooks/use-debounced-value';
import { useNewsWatcher } from '../hooks/use-news-watcher';
import { useResponsive } from '../hooks/use-responsive';
import { usePreferences } from '../lib/preferences';
import { useNetworkStatus } from '../lib/network';
import { ArticleCard, ArabicText, EmptyState, Frame, Header, Icon, fonts, ui } from '../components/news-ui';
import { TodayMatchesPreview } from '../components/today-matches-preview';

const PAGE_SIZE = 12;

export default function NewsScreen() {
  const { category, selectCategory, colors, ready } = usePreferences();
  const { isOffline } = useNetworkStatus();
  const { feedColumns } = useResponsive();
  const [result, setResult] = useState<{ key: string; feed?: NewsFeed; error?: string } | null>(null);
  const [query, setQuery] = useState('');
  const [reload, setReload] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pageState, setPageState] = useState({ cat: category, count: PAGE_SIZE });
  // Reset pagination quand la catégorie change (ajustement au rendu, pas d'effet).
  if (pageState.cat !== category) setPageState({ cat: category, count: PAGE_SIZE });
  const visibleCount = pageState.count;
  const key = `${category}:${reload}`;
  const feed = result?.feed;
  const loading = !ready || result?.key !== key;
  const error = result?.key === key ? result.error ?? '' : '';
  useEffect(() => {
    if (!ready) return;
    const key = `${category}:${reload}`;
    const controller = new AbortController();
    const started = Date.now();
    getNews(category, controller, reload > 0)
      .then(feed => {
        if (!controller.signal.aborted) {
          setResult({ key, feed });
          setIsRefreshing(false);
          void track('feed_view', { category, count: feed.articles.length, stale: feed.stale, duration_ms: Date.now() - started });
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setResult({ key, error: 'تعذر تحميل الأخبار. تحقق من اتصالك وحاول مرة أخرى.' });
          void track('feed_error', { category, duration_ms: Date.now() - started });
          setIsRefreshing(false);
        }
      });
    return () => controller.abort();
  }, [category, reload, ready]);
  const trimmedQuery = query.trim();
  const debouncedQuery = useDebouncedValue(trimmedQuery, 250);
  const isSearching = trimmedQuery !== debouncedQuery;
  useEffect(() => {
    if (debouncedQuery) void track('search', { category, query_length: debouncedQuery.length });
  }, [debouncedQuery, category]);
  const articles = useMemo(
    () => (feed?.category === category ? filterArticles(feed.articles, debouncedQuery) : []),
    [feed, category, debouncedQuery],
  );
  const listData = useMemo(() => (!loading && !error ? articles : []), [loading, error, articles]);
  const visibleArticles = useMemo(() => listData.slice(0, visibleCount), [listData, visibleCount]);
  const heroArticle = visibleArticles[0];
  const gridArticles = useMemo(() => visibleArticles.slice(1), [visibleArticles]);
  const remaining = listData.length - visibleArticles.length;
  const showMore = useCallback(() => {
    setPageState((s) => (s.count >= listData.length ? s : { ...s, count: Math.min(s.count + PAGE_SIZE, listData.length) }));
  }, [listData.length]);
  const section = categories.find(c => c.id === category)!;
  const tabs: CategoryId[] = ['latest', 'europe', 'arab', 'transfers'];
  const watcher = useNewsWatcher({
    category,
    onNew: () => setReload((r) => r + 1),
  });
  useEffect(() => {
    if (feed?.articles.length) {
      markCategorySeen(category, feed.articles[0]!.id).catch(() => {});
      if (watcher.freshCount > 0) watcher.clearFresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feed?.articles[0]?.id]);
  // Regroupe les cartes en lignes pour afficher 1 ou 2 colonnes selon la largeur d'écran.
  const rows = useMemo<GridRow<Article>[]>(
    () => groupIntoRows(gridArticles, feedColumns, article => article.id),
    [gridArticles, feedColumns],
  );
  const multiColumn = feedColumns > 1;
  const renderItem = useCallback(({ item }: { item: GridRow<Article> }) => (
    <View style={multiColumn ? styles.gridRow : styles.gridRowSingle}>
      {item.items.map(article => <View key={article.id} style={styles.gridCell}><ArticleCard article={article} variant={multiColumn ? 'tile' : 'row'} /></View>)}
      {multiColumn && Array.from({ length: feedColumns - item.items.length }).map((_, i) => <View key={`spacer-${i}`} style={styles.gridCell} />)}
    </View>
  ), [feedColumns, multiColumn]);
  const keyExtractor = useCallback((row: GridRow<Article>) => row.key, []);
  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    setReload(r => r + 1);
  }, []);
  return <Frame bottom="news"><View style={[styles.topline, ui.row]}><ArabicText style={styles.live}>●  تغطية مستمرة</ArabicText><ArabicText style={styles.live}>شغف واحد. عالم كامل.</ArabicText></View><Header/>
    {isOffline && (
      <View style={[styles.offlineBanner, ui.row]}>
        <ArabicText style={styles.offlineBannerText}>
          📡 وضع عدم الاتصال — يتم تصفح الأخبار المحفوظة محليًا
        </ArabicText>
      </View>
    )}
    <View style={[styles.tabs, ui.row, { borderBottomColor: colors.line }]}>{tabs.map(id => <Pressable key={id} accessibilityRole="button" accessibilityLabel={categories.find(c => c.id === id)!.name} accessibilityState={{ selected: category === id }} onPress={() => { setQuery(''); selectCategory(id); watcher.clearFresh(); }} style={[styles.tab, { borderBottomColor: category === id ? colors.green : 'transparent' }]}><ArabicText style={{ fontFamily: fonts.medium, fontSize: 10, color: category === id ? colors.green : colors.muted }}>{categories.find(c => c.id === id)!.name}</ArabicText></Pressable>)}</View>
    {watcher.freshCount > 0 && (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${watcher.freshCount} أخبار جديدة، اضغط للتحديث`}
        onPress={() => setReload((r) => r + 1)}
        style={[styles.newBanner, { backgroundColor: colors.green }]}
      >
        <ArabicText style={styles.newBannerText}>
          {watcher.freshCount === 1 ? 'خبر جديد وصل — اضغط للعرض 📰' : `${watcher.freshCount} أخبار جديدة — اضغط للعرض 📰`}
        </ArabicText>
      </Pressable>
    )}
    <FlashList key={`feed-${feedColumns}`} data={rows} keyExtractor={keyExtractor} renderItem={renderItem} drawDistance={600} onEndReached={showMore} onEndReachedThreshold={0.5} contentContainerStyle={styles.list} refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={colors.green} colors={[colors.green]}/>} ListHeaderComponent={<View><ArabicText style={{ color: colors.green, fontSize: 10, marginBottom: 5 }}>—  نبض الكرة</ArabicText><ArabicText accessibilityRole="header" style={{ fontFamily: fonts.heading, fontSize: 27, marginBottom: 6 }}>{section.name}<ArabicText style={{ color: colors.gold, fontSize: 27 }}>.</ArabicText></ArabicText><ArabicText style={{ color: colors.muted, fontSize: 11, lineHeight: 23 }}>أهم القصص، وأحدث التفاصيل. كل ما يهمك في عالم الكرة.</ArabicText><View style={[styles.search, ui.row, { borderColor: colors.line, backgroundColor: colors.surface }]}><Icon name="search" size={17} color={colors.muted}/><TextInput accessibilityLabel="ابحث في أخبار هذا القسم" accessibilityHint="اكتب كلمة للبحث في أخبار القسم" placeholder="ابحث في أخبار هذا القسم..." placeholderTextColor={colors.muted} value={query} onChangeText={setQuery} style={[styles.input, { color: colors.ink }]} returnKeyType="search"/></View><View style={[styles.status, ui.row, { borderTopColor: colors.line }]}><ArabicText style={{ fontSize: 10, color: colors.muted }}>{loading ? 'نجمع لك أحدث الأخبار...' : isSearching ? 'جارٍ البحث…' : `${formatCount(articles.length)} خبر • ${t('sourceName')}`}</ArabicText><Pressable accessibilityRole="button" accessibilityLabel="تحديث الأخبار" accessibilityHint="اضغط لإعادة تحميل الأخبار" onPress={handleRefresh} style={ui.iconButton}><Icon name="refresh" size={17} color={colors.green}/></Pressable></View><TodayMatchesPreview />{feed?.stale && <ArabicText style={{ color: colors.muted, fontSize: 11, marginBottom: 15 }}>تُعرض آخر نسخة محفوظة. تعذر الاتصال بالمصدر الآن.</ArabicText>}{heroArticle && <ArticleCard article={heroArticle} variant="hero" />}{gridArticles.length > 0 && <ArabicText accessibilityRole="header" style={[ui.moreHeading, { borderBottomColor: colors.line }]}>المزيد من الأخبار</ArabicText>}</View>}
      ListEmptyComponent={<EmptyState loading={loading} title={loading ? 'أحدث الأخبار في الطريق' : error ? 'الأخبار ستعود قريبًا' : query ? 'لم نجد خبرًا بهذا العنوان' : 'لا توجد أخبار الآن'} message={error || (query ? 'جرّب كلمة أخرى للبحث.' : undefined)} retry={error ? handleRefresh : undefined}/>}
      ListFooterComponent={remaining > 0 ? <Pressable accessibilityRole="button" accessibilityLabel={`عرض ${remaining} أخبار إضافية`} accessibilityHint="اضغط لتحميل المزيد من الأخبار" onPress={showMore} style={[styles.moreButton, { borderColor: colors.line, backgroundColor: colors.surface }]}><ArabicText style={[styles.moreButtonText, { color: colors.green }]}>عرض المزيد ({formatCount(remaining)})</ArabicText></Pressable> : undefined}/>
  </Frame>;
}
const styles = StyleSheet.create({
  topline: { backgroundColor: '#173C2C', paddingHorizontal: 20, paddingVertical: 8, justifyContent: 'space-between' },
  live: { color: '#E9EFE5', fontSize: 9 },
  tabs: { borderBottomWidth: 1, paddingHorizontal: 12, gap: 3 },
  tab: { flex: 1, alignItems: 'center', borderBottomWidth: 2, paddingVertical: 16 },
  list: { paddingHorizontal: 20, paddingTop: 25, paddingBottom: 24 },
  gridRow: { flexDirection: 'row-reverse', alignItems: 'flex-start', gap: 16, marginBottom: 18 },
  gridRowSingle: {},
  gridCell: { flex: 1 },
  search: { marginTop: 20, borderWidth: 1, borderRadius: 5, paddingHorizontal: 13, gap: 10 },
  input: { flex: 1, height: 46, fontFamily: fonts.body, textAlign: 'right', writingDirection: 'rtl', fontSize: 12 },
  status: { borderTopWidth: 1, marginTop: 21, marginBottom: 12, paddingTop: 8, justifyContent: 'space-between' },
  newBanner: { marginHorizontal: 20, marginTop: 12, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 14, alignItems: 'center' },
  newBannerText: { color: '#fff', fontFamily: fonts.bold, fontSize: 12 },
  offlineBanner: { backgroundColor: '#4A5568', paddingVertical: 8, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  offlineBannerText: { color: '#FAFBF8', fontSize: 11, fontFamily: fonts.medium },
  moreButton: { marginTop: 16, marginBottom: 8, borderWidth: 1, borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  moreButtonText: { fontFamily: fonts.bold, fontSize: 12 },
});
