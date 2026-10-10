import { ScrollView } from 'react-native';
import { useResponsive } from '../hooks/use-responsive';
import { ArabicText, Frame, Header, fonts } from '../components/news-ui';

const sections = [
  ['البيانات المحلية', 'تُحفظ إعدادات القراءة والأقسام والتنبيهات والمحفوظات وعدد زيارات التطبيق على جهازك. يمكنك مسح الأخبار المخزنة والمحفوظات من الإعدادات، وحذف جميع البيانات بإزالة التطبيق.'],
  ['مصدر الأخبار', 'يتصل التطبيق بموقع hihi2.com لجلب الأخبار والصور. يتلقى المصدر عنوان الشبكة ومعلومات الطلب. تُفتح روابط المصدر في المتصفح، وتخضع لخدماته وسياساته.'],
  ['التنبيهات', 'التنبيهات محلية واختيارية. لا نطلب الإذن قبل الزيارة الثانية. يتحقق التطبيق من الأخبار أثناء استخدامه، والتذكير اليومي يفتح التطبيق ولا يجلب الأخبار في الخلفية. يمكنك تعطيل التنبيهات من الإعدادات أو إعدادات الهاتف.'],
  ['مقاييس الاستخدام', 'مقاييس PostHog معطلة افتراضيًا وتعمل فقط بعد موافقتك وعند إعداد الخدمة. تشمل القسم وعدد الأخبار ومدة التحميل وفتح خبر وحفظه وطول عبارة البحث. لا نرسل نص البحث أو نصوص الأخبار. يُستخدم معرّف مؤقت للجلسة، وقد تتلقى الخدمة عنوان الشبكة عند الاتصال. يمكنك إيقاف الإرسال من الإعدادات.'],
  ['الأخطاء والمشاركة', 'عند إعداد Sentry، قد تُرسل تقارير الأخطاء وأداء التطبيق وبيانات تقنية عن الجهاز. مشاركة خبر أو تقرير مشكلة تتطلب اختيارك للمستلم وإرسال التقرير بنفسك. لا يوجد حساب مستخدم أو خدمة إرسال تقارير خاصة بالتطبيق.'],
];

export default function PrivacyScreen() {
  const { readingMaxWidth } = useResponsive();
  return <Frame><Header back/><ScrollView contentContainerStyle={{ padding: 24, gap: 16, width: '100%', maxWidth: readingMaxWidth, alignSelf: 'center' }}><ArabicText accessibilityRole="header" style={{ fontFamily: fonts.heading, fontSize: 24 }}>سياسة الخصوصية</ArabicText><ArabicText>آخر تحديث: 9 أكتوبر 2026</ArabicText>{sections.map(([title, body]) => <ArabicText key={title} selectable style={{ lineHeight: 30 }}>{title}{'\n'}{body}</ArabicText>)}</ScrollView></Frame>;
}
