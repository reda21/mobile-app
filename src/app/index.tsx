import { useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, TextInput, View } from 'react-native';
import { categories, type CategoryId } from '../lib/categories';
import { getNews, type NewsFeed } from '../lib/news';
import { usePreferences } from '../lib/preferences';
import { ArabicText, ArticleCard, EmptyState, Frame, Header, Icon, fonts, ui } from '../components/news-ui';

export default function NewsScreen() {
  const { category, selectCategory, colors, ready } = usePreferences();
  const [result, setResult] = useState<{ key: string; feed?: NewsFeed; error?: string } | null>(null);
  const [query, setQuery] = useState('');
  const [reload, setReload] = useState(0);
  const key = `${category}:${reload}`;
  const feed = result?.feed;
  const loading = !ready || result?.key !== key;
  const error = result?.key === key ? result.error ?? '' : '';
  useEffect(() => {
    if (!ready) return;
    const controller = new AbortController();
    getNews(category, controller, reload > 0).then(feed => { if (!controller.signal.aborted) setResult({ key, feed }); }).catch(() => { if (!controller.signal.aborted) setResult({ key, error: 'تعذر تحميل الأخبار. تحقق من اتصالك وحاول مرة أخرى.' }); });
    return () => controller.abort();
  }, [category, reload, ready, key]);
  const normalize = (text: string) => text.replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').toLowerCase();
  const articles = feed?.category === category ? feed.articles.filter(a => normalize(`${a.title} ${a.summary}`).includes(normalize(query.trim()))) : [];
  const section = categories.find(c => c.id === category)!;
  const tabs: CategoryId[] = ['latest', 'europe', 'arab', 'transfers'];
  return <Frame bottom="news"><View style={[styles.topline, ui.row]}><ArabicText style={styles.live}>●  تغطية مستمرة</ArabicText><ArabicText style={styles.live}>شغف واحد. عالم كامل.</ArabicText></View><Header/>
    <View style={[styles.tabs, ui.row, { borderBottomColor: colors.line }]}>{tabs.map(id => <Pressable key={id} accessibilityRole="button" accessibilityLabel={categories.find(c => c.id === id)!.name} accessibilityState={{ selected: category === id }} onPress={() => { setQuery(''); selectCategory(id); }} style={[styles.tab, { borderBottomColor: category === id ? colors.green : 'transparent' }]}><ArabicText style={{ fontFamily: fonts.medium, fontSize: 10, color: category === id ? colors.green : colors.muted }}>{categories.find(c => c.id === id)!.name}</ArabicText></Pressable>)}</View>
    <FlatList data={!loading && !error ? articles : []} keyExtractor={item => item.id} initialNumToRender={6} contentContainerStyle={styles.list} refreshControl={<RefreshControl refreshing={loading && !!feed} onRefresh={() => setReload(r => r + 1)} tintColor={colors.green} colors={[colors.green]}/>} ListHeaderComponent={<View><ArabicText style={{ color: colors.green, fontSize: 10, marginBottom: 5 }}>—  نبض الكرة</ArabicText><ArabicText accessibilityRole="header" style={{ fontFamily: fonts.heading, fontSize: 27, marginBottom: 6 }}>{section.name}<ArabicText style={{ color: colors.gold, fontSize: 27 }}>.</ArabicText></ArabicText><ArabicText style={{ color: colors.muted, fontSize: 11, lineHeight: 23 }}>أهم القصص، وأحدث التفاصيل. كل ما يهمك في عالم الكرة.</ArabicText><View style={[styles.search, ui.row, { borderColor: colors.line, backgroundColor: colors.surface }]}><Icon name="search" size={17} color={colors.muted}/><TextInput accessibilityLabel="ابحث في أخبار هذا القسم" placeholder="ابحث في أخبار هذا القسم..." placeholderTextColor={colors.muted} value={query} onChangeText={setQuery} style={[styles.input, { color: colors.ink }]} returnKeyType="search"/></View><View style={[styles.status, ui.row, { borderTopColor: colors.line }]}><ArabicText style={{ fontSize: 10, color: colors.muted }}>{loading ? 'نجمع لك أحدث الأخبار...' : `${articles.length.toLocaleString('ar')} خبر • المصدر: هاي كورة`}</ArabicText><Pressable accessibilityRole="button" accessibilityLabel="تحديث الأخبار" onPress={() => setReload(r => r + 1)} style={ui.iconButton}><Icon name="refresh" size={17} color={colors.green}/></Pressable></View>{feed?.stale && <ArabicText style={{ color: colors.muted, fontSize: 11, marginBottom: 15 }}>تُعرض آخر نسخة محفوظة. تعذر الاتصال بالمصدر الآن.</ArabicText>}</View>}
      renderItem={({ item, index }) => <View>{index === 1 && <ArabicText accessibilityRole="header" style={[styles.moreHeading, { borderBottomColor: colors.line }]}>المزيد من الأخبار</ArabicText>}<ArticleCard article={item} hero={index === 0}/></View>}
      ListEmptyComponent={<EmptyState loading={loading} title={loading ? 'أحدث الأخبار في الطريق' : error ? 'الأخبار ستعود قريبًا' : query ? 'لم نجد خبرًا بهذا العنوان' : 'لا توجد أخبار الآن'} message={error || (query ? 'جرّب كلمة أخرى للبحث.' : undefined)} retry={error ? () => setReload(r => r + 1) : undefined}/>}/>
  </Frame>;
}
const styles = StyleSheet.create({
  topline: { backgroundColor: '#173C2C', paddingHorizontal: 20, paddingVertical: 8, justifyContent: 'space-between' },
  live: { color: '#E9EFE5', fontSize: 9 },
  tabs: { borderBottomWidth: 1, paddingHorizontal: 12, gap: 3 },
  tab: { flex: 1, alignItems: 'center', borderBottomWidth: 2, paddingVertical: 16 },
  list: { paddingHorizontal: 20, paddingTop: 25, paddingBottom: 24 },
  search: { marginTop: 20, borderWidth: 1, borderRadius: 5, paddingHorizontal: 13, gap: 10 },
  input: { flex: 1, height: 46, fontFamily: fonts.body, textAlign: 'right', writingDirection: 'rtl', fontSize: 12 },
  status: { borderTopWidth: 1, marginTop: 21, marginBottom: 12, paddingTop: 8, justifyContent: 'space-between' },
  moreHeading: { fontFamily: fonts.heading, fontSize: 18, marginTop: 8, borderBottomWidth: 1, paddingBottom: 17 },
});
