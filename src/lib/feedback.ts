import { Alert, Platform, Share } from 'react-native';

/** Opens the system share sheet; the reader chooses the recipient and submits the report. */
export async function reportProblem() {
  const message = 'أخبار الكرة العالمية — الإبلاغ عن مشكلة\nما المشكلة؟\nخطوات تكرار المشكلة:\nالنتيجة المتوقعة:\n';
  if (Platform.OS === 'web' && !navigator.share && navigator.clipboard) {
    await navigator.clipboard.writeText(message);
    Alert.alert('تم نسخ نموذج البلاغ', 'أكمل النموذج وأرسله إلى جهة الدعم التي تختارها.');
    return;
  }
  await Share.share({
    title: 'الإبلاغ عن مشكلة — أخبار الكرة العالمية',
    message,
  });
}
