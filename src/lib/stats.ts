import {
  FOOTBALL_API_BASE_URL,
  translateCompetition,
  translateTeam,
  type FootballCompetition,
  type FootballTeam,
} from './matches';
import { getStandings, type StandingsCompetitionCode } from './standings';
import { fetchFootballData, FOOTBALL_CACHE_TTLS } from './football-client';

export interface ScorerPlayer {
  id: number;
  name: string;
  nameAr: string;
  nationality: string;
}

export interface ScorerItem {
  rank: number;
  player: ScorerPlayer;
  team: FootballTeam;
  playedMatches: number;
  goals: number;
  assists: number | null;
  penalties: number | null;
}

export interface TeamStatItem {
  rank: number;
  team: FootballTeam;
  value: number;
}

export interface CompetitionStatsResult {
  competition: FootballCompetition;
  season: {
    currentMatchday: number;
  };
  scorers: ScorerItem[];
  totalGoals: number;
  totalMatchesPlayed: number;
  goalsPerMatch: string;
  bestAttacks: TeamStatItem[];
  bestDefenses: TeamStatItem[];
  mostWins: TeamStatItem[];
  lastUpdated: number;
  stale?: boolean | undefined;
  rateLimited?: boolean | undefined;
}

export const PLAYER_TRANSLATIONS_AR: Record<string, string> = {
  'Kylian Mbappé': 'كيليان مبابي',
  'Robert Lewandowski': 'روبرت ليفاندوفسكي',
  'Erling Haaland': 'إرلينغ هالاند',
  'Raphinha': 'رافينيا',
  'Vinicius Junior': 'فينيسيوس جونيور',
  'Vinícius Júnior': 'فينيسيوس جونيور',
  'Mohamed Salah': 'محمد صلاح',
  'Bukayo Saka': 'بوكايو ساكا',
  'Cole Palmer': 'كول بالمر',
  'Harry Kane': 'هاري كين',
  'Lamine Yamal': 'لامين يامال',
  'Jude Bellingham': 'جود بيلينغهام',
  'Rodri': 'رودري',
  'Phil Foden': 'فيل فودين',
  'Son Heung-min': 'سون هيونغ مين',
  'Lautaro Martínez': 'لاوتارو مارتينيز',
  'Marcus Rashford': 'ماركوس راشفورد',
  'Antoine Griezmann': 'أنطوان غريزمان',
  'Ousmane Dembélé': 'عثمان ديمبيلي',
  'Khvicha Kvaratskhelia': 'خفيتشا كفاراتسخيليا',
  'Dušan Vlahović': 'دوشان فلاهوفيتش',
  'Victor Osimhen': 'فيكتور أوسيمين',
  'Alexander Isak': 'ألكسندر إيزاك',
  'Ollie Watkins': 'أولي واتكينز',
  'João Pedro': 'جواو بيدرو',
  'Nicolas Jackson': 'نيكولاس جاكسون',
  'Florian Wirtz': 'فلوريان فيرتز',
  'Jamal Musiala': 'جمال موسيالا',
  'Michael Olise': 'مايكل أوليس',
  'Bradley Barcola': 'برادلي باركولا',
  'Mason Greenwood': 'مايسون غرينوود',
  'Sergio Camello': 'سيرجيو كاميلو',
  'Morgan Rogers': 'مورغان روجرز',
  'Luis Díaz': 'لويس دياز',
  'Kai Havertz': 'كاي هافيرتز',
  'Bryan Mbeumo': 'بريان مبيومو',
  'Chris Wood': 'كريس وود',
  'Mateo Retegui': 'ماتيو ريتيغي',
  'Marcus Thuram': 'ماركوس تورام',
  'Jonathan David': 'جوناثان ديفيد',
  'Omar Marmoush': 'عمر مرموش',
};

export function translatePlayer(name: string): string {
  if (name && PLAYER_TRANSLATIONS_AR[name]) {
    return PLAYER_TRANSLATIONS_AR[name];
  }
  return name || '';
}

function normalizeScorer(raw: any, index: number): ScorerItem {
  const p = raw.player ?? {};
  const t = raw.team ?? {};

  return {
    rank: index + 1,
    player: {
      id: Number(p.id) || 0,
      name: String(p.name || ''),
      nameAr: translatePlayer(String(p.name || '')),
      nationality: String(p.nationality || ''),
    },
    team: {
      id: Number(t.id) || 0,
      name: String(t.name || ''),
      shortName: String(t.shortName || t.name || ''),
      tla: String(t.tla || ''),
      crest: String(t.crest || ''),
      nameAr: translateTeam(String(t.name || ''), String(t.shortName || '')),
    },
    playedMatches: Number(raw.playedMatches) || 0,
    goals: Number(raw.goals) || 0,
    assists: typeof raw.assists === 'number' ? raw.assists : null,
    penalties: typeof raw.penalties === 'number' ? raw.penalties : null,
  };
}

export interface FetchStatsOptions {
  forceReload?: boolean;
  signal?: AbortSignal;
}

/**
 * Récupère les statistiques (buteurs + stats d'équipes) d'une compétition avec mise en cache optimisée.
 */
export async function getCompetitionStats(
  competitionCode: StandingsCompetitionCode,
  options: FetchStatsOptions = {},
): Promise<CompetitionStatsResult> {
  const { forceReload = false, signal } = options;
  const scorersUrl = `${FOOTBALL_API_BASE_URL}/competitions/${competitionCode}/scorers?limit=15`;

  const [scorersResponse, standingsData] = await Promise.all([
    fetchFootballData<any>(scorersUrl, {
      forceReload,
      ttl: FOOTBALL_CACHE_TTLS.STATS_SCORERS,
      ...(signal ? { signal } : {}),
    }),
    getStandings(competitionCode, {
      forceReload,
      ...(signal ? { signal } : {}),
    }).catch(() => null),
  ]);

  const scorersJson = scorersResponse.data ?? {};
  const comp = scorersJson.competition ?? {};
  const season = scorersJson.season ?? {};
  const rawScorers = Array.isArray(scorersJson.scorers) ? scorersJson.scorers : [];
  const normalizedScorers = rawScorers.map(normalizeScorer);

    // 2. Calcul des statistiques globales à partir du classement (tableau TOTAL)
    const table = standingsData?.standings.find(s => s.type === 'TOTAL')?.table ?? standingsData?.standings[0]?.table ?? [];

    let totalGoals = 0;
    let totalMatchesPlayed = 0;

    table.forEach(r => {
      totalGoals += r.goalsFor;
      totalMatchesPlayed += r.playedGames;
    });

    // Chaque match joué compte pour 2 équipes
    const uniqueMatchesPlayed = Math.round(totalMatchesPlayed / 2);
    const goalsPerMatch = uniqueMatchesPlayed > 0 ? (totalGoals / uniqueMatchesPlayed).toFixed(2) : '0.0';

    // Meilleures attaques (Top 4)
    const bestAttacks: TeamStatItem[] = [...table]
      .sort((a, b) => b.goalsFor - a.goalsFor)
      .slice(0, 4)
      .map((r, i) => ({
        rank: i + 1,
        team: r.team,
        value: r.goalsFor,
      }));

    // Meilleures défenses (Top 4)
    const bestDefenses: TeamStatItem[] = [...table]
      .sort((a, b) => a.goalsAgainst - b.goalsAgainst)
      .slice(0, 4)
      .map((r, i) => ({
        rank: i + 1,
        team: r.team,
        value: r.goalsAgainst,
      }));

    // Plus de victoires (Top 4)
    const mostWins: TeamStatItem[] = [...table]
      .sort((a, b) => b.won - a.won)
      .slice(0, 4)
      .map((r, i) => ({
        rank: i + 1,
        team: r.team,
        value: r.won,
      }));

    const result: CompetitionStatsResult = {
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
      },
      scorers: normalizedScorers,
      totalGoals,
      totalMatchesPlayed: uniqueMatchesPlayed,
      goalsPerMatch,
      bestAttacks,
      bestDefenses,
      mostWins,
      lastUpdated: Date.now(),
      stale: scorersResponse.stale,
      ...(scorersResponse.rateLimited ? { rateLimited: true } : {}),
    };

    return result;
  }
