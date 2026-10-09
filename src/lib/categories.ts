export const APP_NAME = "اخبار الكرة العالمية";

// Same categories recovered from the original APK, upgraded to HTTPS.
export const categories = [
  { id: "latest", name: "آخر الأخبار", path: "football-news", group: "news" },
  { id: "europe", name: "الكرة الأوروبية", path: "football-news/europa-football-news", group: "news" },
  { id: "arab", name: "الكرة العربية", path: "football-news/arab-football-news", group: "news" },
  { id: "africa", name: "الكرة الأفريقية", path: "football-news/africa-football-news", group: "news" },
  { id: "asia", name: "الكرة الآسيوية", path: "football-news/afc-news", group: "news" },
  { id: "america", name: "الكرة اللاتينية", path: "football-news/soulth-america-football-news", group: "news" },
  { id: "world-cup", name: "كأس العالم", path: "football-news/world-cup-news", group: "news" },
  { id: "club-world-cup", name: "كأس العالم للأندية", path: "football-news/world-cup-news/clubs-world-cup_news", group: "news" },
  { id: "transfers", name: "سوق الانتقالات", path: "football-news/transfer-market-news", group: "news" },
  { id: "videos", name: "الفيديو", path: "video", group: "news" },
  { id: "photos", name: "الصور", path: "pictures", group: "news" },
  { id: "real-madrid", name: "ريال مدريد", path: "football-news/europa-football-news/spanish-football-news/real-madrid-news", group: "teams" },
  { id: "barcelona", name: "برشلونة", path: "football-news/europa-football-news/spanish-football-news/barcelona-news", group: "teams" },
  { id: "arsenal", name: "أرسنال", path: "football-news/europa-football-news/england-football-news/arsenal-news", group: "teams" },
  { id: "milan", name: "ميلان", path: "football-news/europa-football-news/italian-football-news/ac-milan-news", group: "teams" },
  { id: "chelsea", name: "تشيلسي", path: "football-news/europa-football-news/england-football-news/chelsea-news", group: "teams" },
  { id: "roma", name: "روما", path: "football-news/europa-football-news/italian-football-news/roma-news", group: "teams" },
  { id: "psg", name: "باريس سان جيرمان", path: "football-news/europa-football-news/france-football-news/paris-saint-germain-news", group: "teams" },
  { id: "inter", name: "إنتر ميلان", path: "football-news/europa-football-news/italian-football-news/inter-milan-news", group: "teams" },
  { id: "liverpool", name: "ليفربول", path: "football-news/europa-football-news/england-football-news/liverpool-news", group: "teams" },
  { id: "manchester-city", name: "مانشستر سيتي", path: "football-news/europa-football-news/england-football-news/manchester-city-news", group: "teams" },
  { id: "manchester-united", name: "مانشستر يونايتد", path: "football-news/europa-football-news/england-football-news/manchester-united-news", group: "teams" },
  { id: "juventus", name: "يوفنتوس", path: "football-news/europa-football-news/italian-football-news/juventus-news", group: "teams" },
  { id: "bayern-munich", name: "بايرن ميونيخ", path: "football-news/europa-football-news/germany-football-news/bayern-munchen-news", group: "teams" },
  { id: "dortmund", name: "بوروسيا دورتموند", path: "football-news/europa-football-news/germany-football-news/borussia-dortmund-news", group: "teams" },
] as const;

export type CategoryId = (typeof categories)[number]["id"];

export function isSourceUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password
      && (url.hostname === "hihi2.com" || url.hostname.endsWith(".hihi2.com"));
  } catch { return false; }
}
