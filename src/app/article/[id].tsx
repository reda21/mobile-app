import { useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import * as Speech from 'expo-speech';
import { getArticle, type Article } from '../../lib/news';
import { getArticleId } from '../../lib/article-link';
import { formatDateAr } from '../../lib/format';
import { t } from '../../lib/i18n';
import { track } from '../../lib/analytics';
import { usePreferences } from '../../lib/preferences';
import { useResponsive } from '../../hooks/use-responsive';
import { ArabicText, Bookmark, EmptyState, Frame, Header, Icon, Photo, fonts, ui } from '../../components/news-ui';

export default function ArticleScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = typeof params.id === 'string' ? params.id : '';
  useEffect(() => {
    if (/^[1-9]\d{0,11}$/.test(id)) void track('article_open', { article_id: id });
  }, [id]);
  const { colors, saved, ready, fontSizeDelta, increaseFontSize, decreaseFontSize } = usePreferences();
  const { readingMaxWidth } = useResponsive();
  const stored = saved.find(a => getArticleId(a.url) === id);
  const [result, setResult] = useState<{ key: string; article: Article | null; error?: string } | null>(null);
  const [actionError, setActionError] = useState('');
  const [retry, setRetry] = useState(0);
  const [speaking, setSpeaking] = useState(false);
  const key = `${id}:${retry}`;
  const fetched = result?.key === key ? result.article : null;
  // Favori léger affiché instantanément, corps complet rechargé via getArticle.
  const article = fetched ?? stored ?? null;
  const loading = !ready || (!article && result?.key !== key);
  const error = actionError || (!stored && result?.key === key ? result.error ?? '' : '');

  useEffect(() => {
    return () => {
      Speech.stop();
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    const key = `${id}:${retry}`;
    const controller = new AbortController();
    getArticle(id, controller).then(article => { if (!controller.signal.aborted) setResult({ key, article }); }).catch(() => { if (!controller.signal.aborted) setResult({ key, article: null, error: 'تعذر تحميل الخبر. تحقق من اتصالك وحاول مرة أخرى.' }); });
    return () => controller.abort();
  }, [id, ready, retry]);

  const paragraphs = article ? ('paragraphs' in article && article.paragraphs.length ? article.paragraphs : [article.summary].filter(Boolean)) : [];

  async function share() {
    if (!article) return;
    const deepLink = `akhbarkora://article/${id}`;
    try { await Share.share({ title: article.title, message: `${article.title}\n${article.url}\nافتح في التطبيق: ${deepLink}` }); } catch { setActionError('تعذرت مشاركة الخبر.'); }
  }

  function toggleSpeech() {
    if (speaking) {
      Speech.stop();
      setSpeaking(false);
    } else if (article) {
      const textToSpeak = [article.title, ...paragraphs].join('. ');
      setSpeaking(true);
      Speech.speak(textToSpeak, {
        language: 'ar',
        rate: 0.95,
        pitch: 1.0,
        onDone: () => setSpeaking(false),
        onStopped: () => setSpeaking(false),
        onError: () => setSpeaking(false),
      });
    }
  }

  return <Frame><Header back/><ScrollView contentContainerStyle={[styles.content, { maxWidth: readingMaxWidth }]}>{loading ? <EmptyState loading title="جار تحميل الخبر"/> : !article ? <EmptyState title={error ? 'الأخبار ستعود قريبًا' : 'هذا الخبر غير موجود'} message={error || 'قد يكون الرابط غير صحيح أو لم يعد الخبر متاحًا.'} retry={error ? () => setRetry(r => r + 1) : undefined}/> : <View>
    <View style={[ui.row, { justifyContent: 'space-between', marginBottom: 13 }]}><ArabicText style={{ color: colors.green, fontFamily: fonts.medium, fontSize: 11 }}>{article.tags[0] || t('football')} • {t('sourceName')}</ArabicText><View style={ui.row}><Bookmark article={article}/><Pressable accessibilityRole="button" accessibilityLabel="مشاركة الخبر" accessibilityHint="اضغط لمشاركة الخبر" onPress={share} style={ui.iconButton}><Icon name="external" size={18} color={colors.green}/></Pressable></View></View>
    
    <View style={[styles.toolbar, ui.row, { borderColor: colors.line, backgroundColor: colors.surface }]}>
      <Pressable accessibilityRole="button" accessibilityLabel={speaking ? 'إيقاف القراءة الصوتية' : 'استمع إلى الخبر'} onPress={toggleSpeech} style={[ui.row, styles.audioButton, { backgroundColor: speaking ? colors.soft : 'transparent' }]}>
        <Icon name={speaking ? 'stop' : 'speaker'} size={17} color={colors.green}/>
        <ArabicText style={{ color: colors.green, fontFamily: fonts.medium, fontSize: 11 }}>{speaking ? 'إيقاف الاستماع' : 'استمع للخبر'}</ArabicText>
      </Pressable>
      <View style={[ui.row, { gap: 6 }]}>
        <ArabicText style={{ color: colors.muted, fontSize: 10, marginLeft: 4 }}>حجم الخط:</ArabicText>
        <Pressable accessibilityRole="button" accessibilityLabel="تصغير الخط" onPress={decreaseFontSize} disabled={fontSizeDelta <= -2} style={[styles.fontButton, { borderColor: colors.line, opacity: fontSizeDelta <= -2 ? 0.35 : 1 }]}>
          <ArabicText style={{ fontFamily: fonts.bold, fontSize: 11 }}>أ-</ArabicText>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="تكبير الخط" onPress={increaseFontSize} disabled={fontSizeDelta >= 8} style={[styles.fontButton, { borderColor: colors.line, opacity: fontSizeDelta >= 8 ? 0.35 : 1 }]}>
          <ArabicText style={{ fontFamily: fonts.bold, fontSize: 14 }}>أ+</ArabicText>
        </Pressable>
      </View>
    </View>

    <ArabicText accessible accessibilityRole="header" accessibilityHint="عنوان الخبر" maxFontSizeMultiplier={1.3} style={[styles.title, { fontSize: 23 + fontSizeDelta, lineHeight: 43 + fontSizeDelta * 1.5 }]}>{article.title}</ArabicText>
    {article.published && <ArabicText style={{ color: colors.muted, fontSize: 10, marginBottom: 22 }}>{formatDateAr(article.published, 'long')}</ArabicText>}
    {article.image && <Photo article={article} style={{ marginBottom: 22 }}/>}
    {(paragraphs.length ? paragraphs : ['نص الخبر الكامل متوفر بعد الاتصال بالإنترنت.']).map((paragraph, index) => <ArabicText key={index} selectable style={[styles.paragraph, { fontSize: 16 + fontSizeDelta, lineHeight: 33 + fontSizeDelta * 1.5 }]}>{paragraph}</ArabicText>)}
    <Pressable accessibilityRole="link" accessibilityLabel="اقرأ الخبر على هاي كورة" onPress={() => Linking.openURL(article.url).catch(() => setActionError('تعذر فتح المصدر.'))} style={[ui.row, { gap: 10, alignSelf: 'flex-end', marginTop: 15 }]}><ArabicText style={{ color: colors.green, fontFamily: fonts.bold, fontSize: 12 }}>اقرأ الخبر على هاي كورة</ArabicText><Icon name="external" size={15} color={colors.green}/></Pressable>
    {!!error && <ArabicText accessibilityLiveRegion="polite" style={{ color: colors.muted, fontSize: 12, marginTop: 15 }}>{error}</ArabicText>}
  </View>}</ScrollView></Frame>;
}
const styles = StyleSheet.create({
  content: { padding: 20, paddingTop: 25, paddingBottom: 50, width: '100%', alignSelf: 'center' },
  title: { fontFamily: fonts.heading, marginBottom: 15 },
  paragraph: { marginBottom: 17 },
  toolbar: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 8, justifyContent: 'space-between', marginBottom: 18 },
  audioButton: { gap: 7, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 4 },
  fontButton: { width: 32, height: 32, borderWidth: 1, borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
});
