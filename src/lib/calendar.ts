import {
  FOOTBALL_API_BASE_URL,
  normalizeMatch,
  translateCompetition,
  type FootballCompetition,
  type Match,
} from './matches';
import { fetchFootballData, FOOTBALL_CACHE_TTLS } from './football-client';

export interface CalendarDayItem {
  iso: string; // YYYY-MM-DD
  dayNameAr: string; // السبت, الأحد...
  dayNumber: number; // 1, 2, 10...
  monthNameAr: string; // أكتوبر, نوفمبر...
  isToday: boolean;
  date: Date;
}

export interface MatchdayCalendarResult {
  competition: FootballCompetition;
  season: {
    currentMatchday: number;
  };
  matchday: number;
  matches: Match[];
  lastUpdated: number;
  stale?: boolean | undefined;
  rateLimited?: boolean | undefined;
}

export const COMPETITION_TOTAL_MATCHDAYS: Record<string, number> = {
  PL: 38,
  PD: 38,
  SA: 38,
  BL1: 34,
  FL1: 34,
  DED: 34,
  PPL: 34,
  BSA: 38,
  CL: 8,
};

export function formatDateToIso(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getNextDayIso(iso: string): string {
  const parts = iso.split('-').map(Number);
  const y = parts[0] ?? 2026;
  const m = parts[1] ?? 1;
  const d = parts[2] ?? 1;
  const next = new Date(y, m - 1, d + 1);
  return formatDateToIso(next);
}

export function generateCalendarDays(startOffset = -5, count = 15): CalendarDayItem[] {
  const today = new Date();
  const todayIso = formatDateToIso(today);
  const days: CalendarDayItem[] = [];

  const dayNameFmt = new Intl.DateTimeFormat('ar-EG-u-nu-latn', { weekday: 'short' });
  const monthNameFmt = new Intl.DateTimeFormat('ar-EG-u-nu-latn', { month: 'short' });

  for (let i = startOffset; i < startOffset + count; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const iso = formatDateToIso(d);

    days.push({
      iso,
      dayNameAr: dayNameFmt.format(d),
      dayNumber: d.getDate(),
      monthNameAr: monthNameFmt.format(d),
      isToday: iso === todayIso,
      date: d,
    });
  }

  return days;
}

export interface FetchCalendarOptions {
  forceReload?: boolean;
  signal?: AbortSignal;
}

/**
 * Récupère les rencontres pour une date précise (format YYYY-MM-DD) avec TTL intelligent :
 * - Passé : 24 heures (résultats définitifs)
 * - Futur : 4 heures (calendrier stable)
 * - Aujourd'hui : 3 minutes (équilibre scores / limite de 10 req/min)
 */
export async function getMatchesForDate(
  dateIso: string,
  options: FetchCalendarOptions = {},
): Promise<Match[]> {
  const { forceReload = false, signal } = options;

  const todayIso = formatDateToIso(new Date());
  let ttl: number;
  if (dateIso < todayIso) {
    ttl = FOOTBALL_CACHE_TTLS.PAST_MATCHES;
  } else if (dateIso > todayIso) {
    ttl = FOOTBALL_CACHE_TTLS.FUTURE_MATCHES;
  } else {
    ttl = FOOTBALL_CACHE_TTLS.TODAY_MATCHES;
  }

  const dateFrom = dateIso;
  const dateTo = getNextDayIso(dateIso);
  const url = `${FOOTBALL_API_BASE_URL}/matches?dateFrom=${dateFrom}&dateTo=${dateTo}`;

  const response = await fetchFootballData<{ matches?: any[] }>(url, {
    forceReload,
    ttl,
    ...(signal ? { signal } : {}),
  });

  const rawMatches = Array.isArray(response.data.matches) ? response.data.matches : [];
  return rawMatches.map(normalizeMatch);
}

/**
 * Récupère le calendrier complet d'une journée spécifique pour un championnat donné avec mise en cache.
 */
export async function getMatchesForMatchday(
  competitionCode: string,
  matchday: number,
  options: FetchCalendarOptions = {},
): Promise<MatchdayCalendarResult> {
  const { forceReload = false, signal } = options;
  const url = `${FOOTBALL_API_BASE_URL}/competitions/${competitionCode}/matches?matchday=${matchday}`;

  const response = await fetchFootballData<any>(url, {
    forceReload,
    ttl: FOOTBALL_CACHE_TTLS.ACTIVE_MATCHDAY,
    ...(signal ? { signal } : {}),
  });

  const comp = response.data.competition ?? {};
  const season = response.data.season ?? {};
  const rawMatches = Array.isArray(response.data.matches) ? response.data.matches : [];
  const normalizedMatches = rawMatches.map(normalizeMatch);

  return {
    competition: {
      id: Number(comp.id) || 0,
      name: String(comp.name || ''),
      code: String(comp.code || ''),
      type: String(comp.type || 'LEAGUE'),
      emblem: String(comp.emblem || ''),
      nameAr: translateCompetition(String(comp.code || ''), String(comp.name || '')),
    },
    season: {
      currentMatchday: Number(season.currentMatchday) || matchday,
    },
    matchday,
    matches: normalizedMatches,
    lastUpdated: Date.now(),
    stale: response.stale,
    ...(response.rateLimited ? { rateLimited: true } : {}),
  };
}
