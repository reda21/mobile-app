import { useCallback } from 'react';
import { View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { usePreferences } from '../lib/preferences';
import { ArabicText, EmptyState, Frame, Header, NewsRow, fonts, type CardArticle } from '../components/news-ui';

export default function SavedScreen() {
  const { saved, ready, colors } = usePreferences();
  const renderItem = useCallback(({ item }: { item: CardArticle; index: number }) => (
    <NewsRow article={item} hero={false} showMoreHeading={false} />
  ), []);
  const keyExtractor = useCallback((item: CardArticle) => item.id, []);
  return <Frame bottom="saved"><Header/><FlashList data={ready ? saved : []} keyExtractor={keyExtractor} renderItem={renderItem} drawDistance={400} contentContainerStyle={{ padding: 20, paddingBottom: 35 }} ListHeaderComponent={<View style={{ marginBottom: 17 }}><ArabicText style={{ fontSize: 10, color: colors.green }}>—  على قائمتك</ArabicText><ArabicText accessibilityRole="header" style={{ fontFamily: fonts.heading, fontSize: 26, marginVertical: 10 }}>أخبارك المحفوظة</ArabicText><ArabicText style={{ color: colors.muted, fontSize: 12 }}>قصص اخترتها، تعود إليها وقتما تشاء.</ArabicText></View>} ListEmptyComponent={<EmptyState loading={!ready} title={ready ? 'لكل خبر يستحق العودة' : 'جار تحميل المحفوظات'} message="اضغط علامة الحفظ بجانب أي خبر ليظهر هنا."/>}/></Frame>;
}
