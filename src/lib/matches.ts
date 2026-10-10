import {
  FOOTBALL_API_BASE_URL,
  FOOTBALL_API_TOKEN,
  FOOTBALL_CACHE_TTLS,
  fetchFootballData,
  getRateLimitStatus,
} from './football-client';

export {
  FOOTBALL_API_BASE_URL,
  FOOTBALL_API_TOKEN,
  FOOTBALL_CACHE_TTLS,
  getRateLimitStatus,
};

export type MatchStatus =
  | 'SCHEDULED'
  | 'TIMED'
  | 'IN_PLAY'
  | 'PAUSED'
  | 'EXTRA_TIME'
  | 'PENALTY_SHOOTOUT'
  | 'FINISHED'
  | 'SUSPENDED'
  | 'POSTPONED'
  | 'CANCELLED'
  | 'AWARDED';

export interface FootballTeam {
  id: number;
  name: string;
  shortName: string;
  tla: string;
  crest: string;
  nameAr: string;
}

export interface FootballCompetition {
  id: number;
  name: string;
  code: string;
  type: string;
  emblem: string;
  nameAr: string;
}

export interface FootballArea {
  id: number;
  name: string;
  code: string;
  flag: string;
  nameAr: string;
}

export interface MatchScoreTime {
  home: number | null;
  away: number | null;
}

export interface MatchScore {
  winner: 'HOME_TEAM' | 'AWAY_TEAM' | 'DRAW' | null;
  duration: string;
  fullTime: MatchScoreTime;
  halfTime: MatchScoreTime;
}

export interface Match {
  id: number;
  utcDate: string;
  status: MatchStatus;
  matchday: number | null;
  stage: string;
  competition: FootballCompetition;
  area: FootballArea;
  homeTeam: FootballTeam;
  awayTeam: FootballTeam;
  score: MatchScore;
}

export interface MatchesResult {
  matches: Match[];
  count: number;
  lastUpdated: number;
  stale?: boolean | undefined;
  rateLimited?: boolean | undefined;
}

export const COMPETITION_NAMES_AR: Record<string, string> = {
  PL: 'الدوري الإنجليزي الممتاز',
  ELC: 'دوري البطولة الإنجليزية',
  PD: 'الدوري الإسباني',
  SA: 'الدوري الإيطالي',
  BL1: 'الدوري الألماني',
  FL1: 'الدوري الفرنسي',
  DED: 'الدوري الهولندي',
  PPL: 'الدوري البرتغالي',
  BSA: 'الدوري البرازيلي',
  CL: 'دوري أبطال أوروبا',
  EL: 'الدوري الأوروبي',
  ECL: 'دوري المؤتمر الأوروبي',
  EC: 'كأس أمم أوروبا',
  WC: 'كأس العالم',
  CLI: 'كوبا ليبرتادوريس',
};

export const COMPETITION_NAME_MAP: Record<string, string> = {
  'Premier League': 'الدوري الإنجليزي الممتاز',
  'Championship': 'دوري البطولة الإنجليزية',
  'Primera Division': 'الدوري الإسباني',
  'La Liga': 'الدوري الإسباني',
  'Serie A': 'الدوري الإيطالي',
  'Bundesliga': 'الدوري الألماني',
  'Ligue 1': 'الدوري الفرنسي',
  'UEFA Champions League': 'دوري أبطال أوروبا',
  'Champions League': 'دوري أبطال أوروبا',
  'UEFA Europa League': 'الدوري الأوروبي',
  'Europa League': 'الدوري الأوروبي',
  'Eredivisie': 'الدوري الهولندي',
  'Primeira Liga': 'الدوري البرتغالي',
  'Campeonato Brasileiro Série A': 'الدوري البرازيلي',
  'Copa Libertadores': 'كوبا ليبرتادوريس',
  'European Championship': 'كأس أمم أوروبا',
  'World Cup': 'كأس العالم',
  'FIFA World Cup': 'كأس العالم',
};

export const AREA_NAMES_AR: Record<string, string> = {
  England: 'إنجلترا',
  Spain: 'إسبانيا',
  Italy: 'إيطاليا',
  Germany: 'ألمانيا',
  France: 'فرنسا',
  Netherlands: 'هولندا',
  Portugal: 'البرتغال',
  Brazil: 'البرازيل',
  Europe: 'أوروبا',
  World: 'العالم',
};

export const TEAM_TRANSLATIONS_AR: Record<string, string> = {
  // Premier League
  'Arsenal FC': 'آرسنال',
  Arsenal: 'آرسنال',
  'Aston Villa FC': 'أستون فيلا',
  'Aston Villa': 'أستون فيلا',
  'AFC Bournemouth': 'بورنموث',
  Bournemouth: 'بورنموث',
  'Brentford FC': 'برينتفورد',
  Brentford: 'برينتفورد',
  'Brighton & Hove Albion FC': 'برايتون',
  Brighton: 'برايتون',
  'Chelsea FC': 'تشيلسي',
  Chelsea: 'تشيلسي',
  'Crystal Palace FC': 'كريستال بالاس',
  'Crystal Palace': 'كريستال بالاس',
  'Everton FC': 'إيفرتون',
  Everton: 'إيفرتون',
  'Fulham FC': 'فولهام',
  Fulham: 'فولهام',
  'Ipswich Town FC': 'إيبسويتش تاون',
  Ipswich: 'إيبسويتش تاون',
  'Leicester City FC': 'ليستر سيتي',
  Leicester: 'ليستر سيتي',
  'Liverpool FC': 'ليفربول',
  Liverpool: 'ليفربول',
  'Manchester City FC': 'مانشستر سيتي',
  'Man City': 'مانشستر سيتي',
  'Manchester United FC': 'مانشستر يونايتد',
  'Man United': 'مانشستر يونايتد',
  'Newcastle United FC': 'نيوكاسل يونايتد',
  Newcastle: 'نيوكاسل',
  'Nottingham Forest FC': 'نوتينغهام فورست',
  Nottingham: 'نوتينغهام فورست',
  'Southampton FC': 'ساوثهامبتون',
  Southampton: 'ساوثهامبتون',
  'Tottenham Hotspur FC': 'توتنهام',
  Tottenham: 'توتنهام',
  'West Ham United FC': 'وست هام',
  'West Ham': 'وست هام',
  'Wolverhampton Wanderers FC': 'ولفرهامبتون',
  Wolverhampton: 'ولفرهامبتون',

  // Championship
  'Swansea City AFC': 'سوانزي سيتي',
  Swansea: 'سوانزي',
  'Norwich City FC': 'نورويتش سيتي',
  Norwich: 'نورويتش',
  'Leeds United FC': 'ليدز يونايتد',
  Leeds: 'ليدز يونايتد',
  'Burnley FC': 'بيرنلي',
  Burnley: 'بيرنلي',
  'Sheffield United FC': 'شيفيلد يونايتد',
  'Sheffield Utd': 'شيفيلد يونايتد',
  'Sunderland AFC': 'سندرلاند',
  Sunderland: 'سندرلاند',
  'West Bromwich Albion FC': 'وست بروميتش',
  'West Brom': 'وست بروميتش',

  // La Liga
  'Real Madrid CF': 'ريال مدريد',
  'Real Madrid': 'ريال مدريد',
  'FC Barcelona': 'برشلونة',
  Barça: 'برشلونة',
  Barcelona: 'برشلونة',
  'Club Atlético de Madrid': 'أتلتيكو مدريد',
  'Atlético Madrid': 'أتلتيكو مدريد',
  Atlético: 'أتلتيكو مدريد',
  'Real Sociedad de Fútbol': 'ريال سوسيداد',
  'Real Sociedad': 'ريال سوسيداد',
  'Athletic Club': 'أتلتيك بيلباو',
  Athletic: 'أتلتيك بيلباو',
  'Villarreal CF': 'فياريال',
  Villarreal: 'فياريال',
  'Real Betis Balompié': 'ريال بيتيس',
  'Real Betis': 'ريال بيتيس',
  'Sevilla FC': 'إشبيلية',
  Sevilla: 'إشبيلية',
  'Girona FC': 'جيرونا',
  Girona: 'جيرونا',
  'Valencia CF': 'فالنسيا',
  Valencia: 'فالنسيا',
  'RC Celta de Vigo': 'سيلتا فيغو',
  Celta: 'سيلتا فيغو',
  'RCD Mallorca': 'مايوركا',
  Mallorca: 'مايوركا',
  'CA Osasuna': 'أوساسونا',
  Osasuna: 'أوساسونا',
  'Rayo Vallecano de Madrid': 'رايو فاليكانو',
  'Rayo Vallecano': 'رايو فاليكانو',
  'Getafe CF': 'خيتافي',
  Getafe: 'خيتافي',
  'UD Las Palmas': 'لاس بالماس',
  'Las Palmas': 'لاس بالماس',
  'Deportivo Alavés': 'ألافيس',
  Alavés: 'ألافيس',
  'RCD Espanyol de Barcelona': 'إسبانيول',
  Espanyol: 'إسبانيول',
  'Real Valladolid CF': 'بلد الوليد',
  Valladolid: 'بلد الوليد',
  'CD Leganés': 'ليغانيس',
  Leganés: 'ليغانيس',

  // Serie A
  'FC Internazionale Milano': 'إنتر ميلان',
  Inter: 'إنتر ميلان',
  'AC Milan': 'ميلان',
  Milan: 'ميلان',
  'Juventus FC': 'يوفنتوس',
  Juventus: 'يوفنتوس',
  'SSC Napoli': 'نابولي',
  Napoli: 'نابولي',
  'AS Roma': 'روما',
  Roma: 'روما',
  'SS Lazio': 'لاتسيو',
  Lazio: 'لاتسيو',
  'Atalanta BC': 'أتالانتا',
  Atalanta: 'أتالانتا',
  'ACF Fiorentina': 'فيورنتينا',
  Fiorentina: 'فيورنتينا',
  'Bologna FC 1909': 'بولونيا',
  Bologna: 'بولونيا',
  'Torino FC': 'تورينو',
  Torino: 'تورينو',

  // Bundesliga
  'FC Bayern München': 'بايرن ميونخ',
  Bayern: 'بايرن ميونخ',
  'Borussia Dortmund': 'بوروسيا دورتموند',
  Dortmund: 'بوروسيا دورتموند',
  'Bayer 04 Leverkusen': 'باير ليفركوزن',
  Leverkusen: 'باير ليفركوزن',
  'RB Leipzig': 'لايبزيغ',
  Leipzig: 'لايبزيغ',
  'Eintracht Frankfurt': 'آينتراخت فرانكفورت',
  Frankfurt: 'فرانكفورت',
  'VfB Stuttgart': 'شتوتغارت',
  Stuttgart: 'شتوتغارت',

  // Ligue 1
  'Paris Saint-Germain FC': 'باريس سان جيرمان',
  PSG: 'باريس سان جيرمان',
  'Olympique de Marseille': 'مارسيليا',
  Marseille: 'مارسيليا',
  'AS Monaco FC': 'موناكو',
  Monaco: 'موناكو',
  'Olympique Lyonnais': 'ليون',
  Lyon: 'ليون',
  'Lille OSC': 'ليل',
  Lille: 'ليل',
  'OGC Nice': 'نيس',
  Nice: 'نيس',
  'Stade Rennais FC 1904': 'رين',
  Rennes: 'رين',

  // Portugal & Netherlands
  'SL Benfica': 'بنفيكا',
  Benfica: 'بنفيكا',
  'FC Porto': 'بورتو',
  Porto: 'بورتو',
  'Sporting Clube de Portugal': 'سبورتينغ لشبونة',
  'Sporting CP': 'سبورتينغ لشبونة',
  Sporting: 'سبورتينغ لشبونة',
  'AFC Ajax': 'أياكس',
  Ajax: 'أياكس',
  PSV: 'آيندهوفن',
  'Feyenoord Rotterdam': 'فاينورد',
  Feyenoord: 'فاينورد',
};

export function translateTeam(name: string, shortName?: string): string {
  if (shortName && TEAM_TRANSLATIONS_AR[shortName]) return TEAM_TRANSLATIONS_AR[shortName];
  if (name && TEAM_TRANSLATIONS_AR[name]) return TEAM_TRANSLATIONS_AR[name];
  return shortName || name || '';
}

export function translateCompetition(code: string, name: string): string {
  if (code && COMPETITION_NAMES_AR[code]) return COMPETITION_NAMES_AR[code];
  if (name && COMPETITION_NAME_MAP[name]) return COMPETITION_NAME_MAP[name];
  return name || '';
}

export function translateArea(name: string): string {
  if (name && AREA_NAMES_AR[name]) return AREA_NAMES_AR[name];
  return name || '';
}

export interface MatchStatusDisplay {
  label: string;
  isLive: boolean;
  isFinished: boolean;
  isUpcoming: boolean;
  badgeBg: string;
  badgeTextColor: string;
}

export function formatMatchStatus(status: MatchStatus, utcDate: string): MatchStatusDisplay {
  switch (status) {
    case 'IN_PLAY':
      return {
        label: 'مباشر',
        isLive: true,
        isFinished: false,
        isUpcoming: false,
        badgeBg: '#FEE2E2',
        badgeTextColor: '#DC2626',
      };
    case 'PAUSED':
      return {
        label: 'استراحة',
        isLive: true,
        isFinished: false,
        isUpcoming: false,
        badgeBg: '#FEF3C7',
        badgeTextColor: '#D97706',
      };
    case 'FINISHED':
    case 'AWARDED':
      return {
        label: 'انتهت',
        isLive: false,
        isFinished: true,
        isUpcoming: false,
        badgeBg: '#E5E7EB',
        badgeTextColor: '#4B5563',
      };
    case 'TIMED':
    case 'SCHEDULED': {
      const timeStr = formatMatchTime(utcDate);
      return {
        label: timeStr || 'قريباً',
        isLive: false,
        isFinished: false,
        isUpcoming: true,
        badgeBg: '#ECFDF5',
        badgeTextColor: '#059669',
      };
    }
    case 'POSTPONED':
      return {
        label: 'تأجلت',
        isLive: false,
        isFinished: false,
        isUpcoming: false,
        badgeBg: '#FEF3C7',
        badgeTextColor: '#B45309',
      };
    case 'CANCELLED':
      return {
        label: 'ألغيت',
        isLive: false,
        isFinished: false,
        isUpcoming: false,
        badgeBg: '#FEE2E2',
        badgeTextColor: '#B91C1C',
      };
    case 'SUSPENDED':
      return {
        label: 'معلقة',
        isLive: false,
        isFinished: false,
        isUpcoming: false,
        badgeBg: '#FEF3C7',
        badgeTextColor: '#B45309',
      };
    default:
      return {
        label: status,
        isLive: false,
        isFinished: false,
        isUpcoming: false,
        badgeBg: '#F3F4F6',
        badgeTextColor: '#4B5563',
      };
  }
}

export function formatMatchTime(utcDate: string): string {
  try {
    const d = new Date(utcDate);
    if (Number.isNaN(d.getTime())) return '';
    return new Intl.DateTimeFormat('ar-EG-u-nu-latn', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(d);
  } catch {
    return '';
  }
}

export function formatMatchDateHeader(utcDate: string): string {
  try {
    const d = new Date(utcDate);
    if (Number.isNaN(d.getTime())) return '';
    return new Intl.DateTimeFormat('ar-EG-u-nu-latn', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }).format(d);
  } catch {
    return '';
  }
}

export function isMatchToday(utcDate: string): boolean {
  try {
    const d = new Date(utcDate);
    const now = new Date();
    return (
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
    );
  } catch {
    return false;
  }
}

/** Normalise un match brut de l'API avec les traductions arabes */
export function normalizeMatch(raw: any): Match {
  const home = raw.homeTeam ?? {};
  const away = raw.awayTeam ?? {};
  const comp = raw.competition ?? {};
  const area = raw.area ?? {};
  const score = raw.score ?? {};

  return {
    id: Number(raw.id) || 0,
    utcDate: String(raw.utcDate || ''),
    status: (raw.status || 'SCHEDULED') as MatchStatus,
    matchday: typeof raw.matchday === 'number' ? raw.matchday : null,
    stage: String(raw.stage || ''),
    competition: {
      id: Number(comp.id) || 0,
      name: String(comp.name || ''),
      code: String(comp.code || ''),
      type: String(comp.type || 'LEAGUE'),
      emblem: String(comp.emblem || ''),
      nameAr: translateCompetition(String(comp.code || ''), String(comp.name || '')),
    },
    area: {
      id: Number(area.id) || 0,
      name: String(area.name || ''),
      code: String(area.code || ''),
      flag: String(area.flag || ''),
      nameAr: translateArea(String(area.name || '')),
    },
    homeTeam: {
      id: Number(home.id) || 0,
      name: String(home.name || ''),
      shortName: String(home.shortName || home.name || ''),
      tla: String(home.tla || ''),
      crest: String(home.crest || ''),
      nameAr: translateTeam(String(home.name || ''), String(home.shortName || '')),
    },
    awayTeam: {
      id: Number(away.id) || 0,
      name: String(away.name || ''),
      shortName: String(away.shortName || away.name || ''),
      tla: String(away.tla || ''),
      crest: String(away.crest || ''),
      nameAr: translateTeam(String(away.name || ''), String(away.shortName || '')),
    },
    score: {
      winner: score.winner || null,
      duration: String(score.duration || 'REGULAR'),
      fullTime: {
        home: typeof score.fullTime?.home === 'number' ? score.fullTime.home : null,
        away: typeof score.fullTime?.away === 'number' ? score.fullTime.away : null,
      },
      halfTime: {
        home: typeof score.halfTime?.home === 'number' ? score.halfTime.home : null,
        away: typeof score.halfTime?.away === 'number' ? score.halfTime.away : null,
      },
    },
  };
}

export interface FetchMatchesOptions {
  forceReload?: boolean;
  dateFrom?: string;
  dateTo?: string;
  signal?: AbortSignal;
}

/**
 * Récupère les matchs depuis football-data.org v4 avec gestion de cache et limitation de débit (10 req/min).
 */
export async function getMatches(options: FetchMatchesOptions = {}): Promise<MatchesResult> {
  const { forceReload = false, dateFrom, dateTo, signal } = options;

  let url = `${FOOTBALL_API_BASE_URL}/matches`;
  const params = new URLSearchParams();
  if (dateFrom && dateTo) {
    params.set('dateFrom', dateFrom);
    params.set('dateTo', dateTo);
  }
  const queryString = params.toString();
  if (queryString) {
    url += `?${queryString}`;
  }

  const response = await fetchFootballData<{ matches?: any[] }>(url, {
    forceReload,
    ttl: FOOTBALL_CACHE_TTLS.TODAY_MATCHES,
    ...(signal ? { signal } : {}),
  });

  const rawMatches = Array.isArray(response.data.matches) ? response.data.matches : [];
  const normalizedMatches = rawMatches.map(normalizeMatch);

  return {
    matches: normalizedMatches,
    count: normalizedMatches.length,
    lastUpdated: Date.now(),
    stale: response.stale,
    ...(response.rateLimited ? { rateLimited: true } : {}),
  };
}
