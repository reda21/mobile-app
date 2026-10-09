import { FlatList, View } from 'react-native';
import { usePreferences } from '../lib/preferences';
import { ArabicText, ArticleCard, EmptyState, Frame, Header, fonts } from '../components/news-ui';

export default function SavedScreen() {
  const { saved, ready, colors } = usePreferences();
  return <Frame bottom="saved"><Header/><FlatList data={ready ? saved : []} keyExtractor={item => item.id} contentContainerStyle={{ padding: 20, paddingBottom: 35 }} ListHeaderComponent={<View style={{ marginBottom: 17 }}><ArabicText style={{ fontSize: 10, color: colors.green }}>—  على قائمتك</ArabicText><ArabicText accessibilityRole="header" style={{ fontFamily: fonts.heading, fontSize: 26, marginVertical: 10 }}>أخبارك المحفوظة</ArabicText><ArabicText style={{ color: colors.muted, fontSize: 12 }}>قصص اخترتها، تعود إليها وقتما تشاء.</ArabicText></View>} renderItem={({ item }) => <ArticleCard article={item}/>} ListEmptyComponent={<EmptyState loading={!ready} title={ready ? 'لكل خبر يستحق العودة' : 'جار تحميل المحفوظات'} message="اضغط علامة الحفظ بجانب أي خبر ليظهر هنا."/>}/></Frame>;
}
