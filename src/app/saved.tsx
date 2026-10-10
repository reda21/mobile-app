import { useCallback, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { usePreferences } from '../lib/preferences';
import { groupIntoRows, type GridRow } from '../lib/feed-grid';
import { useResponsive } from '../hooks/use-responsive';
import { ArticleCard, ArabicText, EmptyState, Frame, Header, fonts, type CardArticle } from '../components/news-ui';

export default function SavedScreen() {
  const { saved, ready, colors } = usePreferences();
  const { feedColumns } = useResponsive();
  const multiColumn = feedColumns > 1;
  const rows = useMemo<GridRow<CardArticle>[]>(
    () => groupIntoRows(ready ? saved : [], feedColumns, article => article.id),
    [saved, ready, feedColumns],
  );
  const renderItem = useCallback(({ item }: { item: GridRow<CardArticle> }) => (
    <View style={multiColumn ? styles.gridRow : styles.gridRowSingle}>
      {item.items.map(article => <View key={article.id} style={styles.gridCell}><ArticleCard article={article} variant={multiColumn ? 'tile' : 'row'} /></View>)}
      {multiColumn && Array.from({ length: feedColumns - item.items.length }).map((_, i) => <View key={`spacer-${i}`} style={styles.gridCell} />)}
    </View>
  ), [feedColumns, multiColumn]);
  const keyExtractor = useCallback((row: GridRow<CardArticle>) => row.key, []);
  return <Frame bottom="saved"><Header/><FlashList key={`saved-${feedColumns}`} data={rows} keyExtractor={keyExtractor} renderItem={renderItem} drawDistance={400} contentContainerStyle={styles.list} ListHeaderComponent={<View style={{ marginBottom: 17 }}><ArabicText style={{ fontSize: 10, color: colors.green }}>—  على قائمتك</ArabicText><ArabicText accessibilityRole="header" style={{ fontFamily: fonts.heading, fontSize: 26, marginVertical: 10 }}>أخبارك المحفوظة</ArabicText><ArabicText style={{ color: colors.muted, fontSize: 12 }}>قصص اخترتها، تعود إليها وقتما تشاء.</ArabicText></View>} ListEmptyComponent={<EmptyState loading={!ready} title={ready ? 'لكل خبر يستحق العودة' : 'جار تحميل المحفوظات'} message="اضغط علامة الحفظ بجانب أي خبر ليظهر هنا."/>}/></Frame>;
}
const styles = StyleSheet.create({
  list: { padding: 20, paddingBottom: 35 },
  gridRow: { flexDirection: 'row-reverse', alignItems: 'flex-start', gap: 16, marginBottom: 18 },
  gridRowSingle: {},
  gridCell: { flex: 1 },
});
