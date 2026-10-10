import {
  FOOTBALL_API_BASE_URL,
  translateCompetition,
  translateTeam,
  type FootballCompetition,
  type FootballTeam,
} from './matches';
import { fetchFootballData, FOOTBALL_CACHE_TTLS } from './football-client';

export interface StandingsTableRow {
  position: number;
  team: FootballTeam;
  playedGames: number;
  won: number;
  draw: number;
  lost: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  form: string | null;
}

export interface StandingsGroup {
  stage: string;
  type: string;
  group: string | null;
  table: StandingsTableRow[];
}

export interface CompetitionStandingsResult {
  competition: FootballCompetition;
  season: {
    currentMatchday: number;
    startDate: string;
    endDate: string;
  };
  standings: StandingsGroup[];
  lastUpdated: number;
  stale?: boolean | undefined;
  rateLimited?: boolean | undefined;
}

export const AVAILABLE_STANDINGS_COMPETITIONS = [
  { code: 'PD', nameAr: 'الدوري الإسباني' },
  { code: 'PL', nameAr: 'الدوري الإنجليزي' },
  { code: 'SA', nameAr: 'الدوري الإيطالي' },
  { code: 'BL1', nameAr: 'الدوري الألماني' },
  { code: 'FL1', nameAr: 'الدوري الفرنسي' },
  { code: 'CL', nameAr: 'دوري أبطال أوروبا' },
  { code: 'DED', nameAr: 'الدوري الهولندي' },
  { code: 'PPL', nameAr: 'الدوري البرتغالي' },
] as const;

export type StandingsCompetitionCode =
  | 'PL'
  | 'PD'
  | 'SA'
  | 'BL1'
  | 'FL1'
  | 'CL'
  | 'DED'
  | 'PPL'
  | string;

function normalizeTableRow(raw: any): StandingsTableRow {
  const team = raw.team ?? {};
  return {
    position: Number(raw.position) || 0,
    team: {
      id: Number(team.id) || 0,
      name: String(team.name || ''),
      shortName: String(team.shortName || team.name || ''),
      tla: String(team.tla || ''),
      crest: String(team.crest || ''),
      nameAr: translateTeam(String(team.name || ''), String(team.shortName || '')),
    },
    playedGames: Number(raw.playedGames) || 0,
    won: Number(raw.won) || 0,
    draw: Number(raw.draw) || 0,
    lost: Number(raw.lost) || 0,
    points: Number(raw.points) || 0,
    goalsFor: Number(raw.goalsFor) || 0,
    goalsAgainst: Number(raw.goalsAgainst) || 0,
    goalDifference: Number(raw.goalDifference) || 0,
    form: raw.form ? String(raw.form) : null,
  };
}

export function normalizeStandingsResponse(data: any): CompetitionStandingsResult {
  const comp = data.competition ?? {};
  const season = data.season ?? {};
  const rawStandings = Array.isArray(data.standings) ? data.standings : [];

  const standingsGroups: StandingsGroup[] = rawStandings.map((group: any) => ({
    stage: String(group.stage || 'REGULAR_SEASON'),
    type: String(group.type || 'TOTAL'),
    group: group.group ? String(group.group) : null,
    table: Array.isArray(group.table) ? group.table.map(normalizeTableRow) : [],
  }));

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
      currentMatchday: Number(season.currentMatchday) || 1,
      startDate: String(season.startDate || ''),
      endDate: String(season.endDate || ''),
    },
    standings: standingsGroups,
    lastUpdated: Date.now(),
    stale: false,
  };
}

export interface FetchStandingsOptions {
  forceReload?: boolean;
  signal?: AbortSignal;
}

/**
 * Récupère le classement d'une compétition depuis l'API football-data.org avec mise en cache optimisée.
 */
export async function getStandings(
  competitionCode: StandingsCompetitionCode,
  options: FetchStandingsOptions = {},
): Promise<CompetitionStandingsResult> {
  const { forceReload = false, signal } = options;
  const url = `${FOOTBALL_API_BASE_URL}/competitions/${competitionCode}/standings`;

  const response = await fetchFootballData<any>(url, {
    forceReload,
    ttl: FOOTBALL_CACHE_TTLS.STANDINGS,
    ...(signal ? { signal } : {}),
  });

  const result = normalizeStandingsResponse(response.data);
  result.stale = response.stale;
  if (response.rateLimited) {
    result.rateLimited = true;
  }
  return result;
}
