import { useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { getArticle, type Article } from '../../lib/news';
import { getArticleId } from '../../lib/article-link';
import { usePreferences } from '../../lib/preferences';
import { ArabicText, Bookmark, EmptyState, Frame, Header, Icon, Photo, fonts, ui } from '../../components/news-ui';

export default function ArticleScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = typeof params.id === 'string' ? params.id : '';
  const { colors, saved, ready } = usePreferences();
  const stored = saved.find(a => getArticleId(a.url) === id);
  const [result, setResult] = useState<{ key: string; article: Article | null; error?: string } | null>(null);
  const [actionError, setActionError] = useState('');
  const [retry, setRetry] = useState(0);
  const key = `${id}:${retry}`;
  const article = stored ?? (result?.key === key ? result.article : null);
  const loading = !ready || (!stored && result?.key !== key);
  const error = actionError || (result?.key === key ? result.error ?? '' : '');
  useEffect(() => {
    if (!ready || stored) return;
    const controller = new AbortController();
    getArticle(id, controller).then(article => { if (!controller.signal.aborted) setResult({ key, article }); }).catch(() => { if (!controller.signal.aborted) setResult({ key, article: null, error: 'تعذر تحميل الخبر. تحقق من اتصالك وحاول مرة أخرى.' }); });
    return () => controller.abort();
  }, [id, ready, stored, key]);
  async function share() {
    if (!article) return;
    try { await Share.share({ title: article.title, message: `${article.title}\n${article.url}` }); } catch { setActionError('تعذرت مشاركة الخبر.'); }
  }
  return <Frame><Header back/><ScrollView contentContainerStyle={styles.content}>{loading ? <EmptyState loading title="جار تحميل الخبر"/> : !article ? <EmptyState title={error ? 'الأخبار ستعود قريبًا' : 'هذا الخبر غير موجود'} message={error || 'قد يكون الرابط غير صحيح أو لم يعد الخبر متاحًا.'} retry={error ? () => setRetry(r => r + 1) : undefined}/> : <View><View style={[ui.row, { justifyContent: 'space-between', marginBottom: 13 }]}><ArabicText style={{ color: colors.green, fontFamily: fonts.medium, fontSize: 11 }}>{article.tags[0] || 'كرة القدم'} • هاي كورة</ArabicText><View style={ui.row}><Bookmark article={article}/><Pressable accessibilityRole="button" accessibilityLabel="مشاركة الخبر" onPress={share} style={ui.iconButton}><Icon name="external" size={18} color={colors.green}/></Pressable></View></View><ArabicText accessibilityRole="header" style={styles.title}>{article.title}</ArabicText>{article.published && <ArabicText style={{ color: colors.muted, fontSize: 10, marginBottom: 22 }}>{new Intl.DateTimeFormat('ar', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(article.published))}</ArabicText>}{article.image && <Photo article={article} style={{ marginBottom: 22 }}/>}{(article.paragraphs.length ? article.paragraphs : [article.summary]).map((paragraph, index) => <ArabicText key={index} selectable style={styles.paragraph}>{paragraph}</ArabicText>)}<Pressable accessibilityRole="link" accessibilityLabel="اقرأ الخبر على هاي كورة" onPress={() => Linking.openURL(article.url).catch(() => setActionError('تعذر فتح المصدر.'))} style={[ui.row, { gap: 10, alignSelf: 'flex-end', marginTop: 15 }]}><ArabicText style={{ color: colors.green, fontFamily: fonts.bold, fontSize: 12 }}>اقرأ الخبر على هاي كورة</ArabicText><Icon name="external" size={15} color={colors.green}/></Pressable>{!!error && <ArabicText accessibilityLiveRegion="polite" style={{ color: colors.muted, fontSize: 12, marginTop: 15 }}>{error}</ArabicText>}</View>}</ScrollView></Frame>;
}
const styles = StyleSheet.create({ content: { padding: 20, paddingTop: 25, paddingBottom: 50 }, title: { fontFamily: fonts.heading, fontSize: 23, lineHeight: 43, marginBottom: 15 }, paragraph: { fontSize: 16, lineHeight: 33, marginBottom: 17 } });
