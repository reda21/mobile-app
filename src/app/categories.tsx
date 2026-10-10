import { Pressable, ScrollView, StyleSheet, View, type DimensionValue } from 'react-native';
import { router } from 'expo-router';
import { categories } from '../lib/categories';
import { usePreferences } from '../lib/preferences';
import { useResponsive } from '../hooks/use-responsive';
import { ArabicText, Ball, Frame, Header, Icon, fonts, ui } from '../components/news-ui';

export default function CategoriesScreen() {
  const { colors, category, selectCategory } = usePreferences();
  const { tileColumns } = useResponsive();
  // Largeur d'une tuile : on retire un peu de marge pour laisser respirer l'espacement (`gap`).
  const tileWidth = `${100 / tileColumns - 3}%` as DimensionValue;
  return <Frame bottom="categories"><Header/><ScrollView contentContainerStyle={styles.content}><ArabicText style={{ color: colors.green, fontSize: 10 }}>—  عالم الكرة بين يديك</ArabicText><ArabicText accessibilityRole="header" style={styles.title}>كل الأقسام والأندية</ArabicText><ArabicText style={{ color: colors.muted, fontSize: 12, marginBottom: 27 }}>اختر ما تحب. واترك الباقي لنا.</ArabicText>{(['teams', 'news'] as const).map(group => <View key={group} style={{ marginBottom: 28 }}><ArabicText accessibilityRole="header" style={styles.heading}>{group === 'teams' ? 'ناديك، أولًا.' : 'أقسام الأخبار'}</ArabicText><View style={[styles.grid, ui.row]}>{categories.filter(c => c.group === group).map(item => <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={item.name} accessibilityState={{ selected: category === item.id }} onPress={() => { selectCategory(item.id); router.replace('/'); }} style={[styles.tile, { width: tileWidth, backgroundColor: category === item.id ? colors.soft : colors.surface, borderColor: category === item.id ? colors.green : colors.line }]}>{group === 'teams' ? <Ball size={31}/> : <Icon name="grid" size={25} color={colors.green}/>}<ArabicText style={{ fontFamily: fonts.medium, fontSize: 12, textAlign: 'center' }}>{item.name}</ArabicText></Pressable>)}</View></View>)}</ScrollView></Frame>;
}
const styles = StyleSheet.create({ content: { padding: 20, paddingTop: 28 }, title: { fontFamily: fonts.heading, fontSize: 25, marginTop: 8, marginBottom: 9 }, heading: { fontFamily: fonts.heading, fontSize: 18, marginBottom: 16 }, grid: { flexWrap: 'wrap', gap: 12 }, tile: { minHeight: 106, borderWidth: 1, borderRadius: 6, alignItems: 'center', justifyContent: 'center', padding: 13, gap: 12 } });
