import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  normalizeMatch,
  translateTeam,
  translateCompetition,
  formatMatchStatus,
  formatMatchTime,
  getMatches,
  FOOTBALL_API_TOKEN,
} from './matches';
import { resetFootballClientState } from './football-client';

describe('matches service', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    resetFootballClientState();
  });

  it('translates team names to Arabic when in dictionary', () => {
    expect(translateTeam('Real Madrid CF', 'Real Madrid')).toBe('ريال مدريد');
    expect(translateTeam('FC Barcelona', 'Barça')).toBe('برشلونة');
    expect(translateTeam('Liverpool FC', 'Liverpool')).toBe('ليفربول');
    expect(translateTeam('Paris Saint-Germain FC', 'PSG')).toBe('باريس سان جيرمان');
    expect(translateTeam('Arsenal FC', 'Arsenal')).toBe('آرسنال');
    expect(translateTeam('FC Internazionale Milano', 'Inter')).toBe('إنتر ميلان');
  });

  it('falls back to shortName or name for unknown teams', () => {
    expect(translateTeam('Unknown FC', 'Unknown')).toBe('Unknown');
    expect(translateTeam('Custom Team', '')).toBe('Custom Team');
  });

  it('translates competitions to Arabic', () => {
    expect(translateCompetition('PL', 'Premier League')).toBe('الدوري الإنجليزي الممتاز');
    expect(translateCompetition('PD', 'Primera Division')).toBe('الدوري الإسباني');
    expect(translateCompetition('SA', 'Serie A')).toBe('الدوري الإيطالي');
    expect(translateCompetition('BL1', 'Bundesliga')).toBe('الدوري الألماني');
    expect(translateCompetition('FL1', 'Ligue 1')).toBe('الدوري الفرنسي');
    expect(translateCompetition('CL', 'UEFA Champions League')).toBe('دوري أبطال أوروبا');
  });

  it('formats match status correctly for Live, Finished, and Scheduled', () => {
    const live = formatMatchStatus('IN_PLAY', '2026-10-10T20:00:00Z');
    expect(live.isLive).toBe(true);
    expect(live.label).toBe('مباشر');

    const paused = formatMatchStatus('PAUSED', '2026-10-10T20:00:00Z');
    expect(paused.isLive).toBe(true);
    expect(paused.label).toBe('استراحة');

    const finished = formatMatchStatus('FINISHED', '2026-10-10T18:00:00Z');
    expect(finished.isFinished).toBe(true);
    expect(finished.label).toBe('انتهت');

    const scheduled = formatMatchStatus('TIMED', '2026-10-10T21:00:00Z');
    expect(scheduled.isUpcoming).toBe(true);
    expect(scheduled.label).toBeTruthy();

    const timeFormatted = formatMatchTime('2026-10-10T21:00:00Z');
    expect(timeFormatted).toBeTruthy();
  });

  it('normalizes raw API match payload accurately', () => {
    const raw = {
      id: 561860,
      utcDate: '2026-10-10T11:30:00Z',
      status: 'FINISHED',
      matchday: 9,
      stage: 'REGULAR_SEASON',
      competition: {
        id: 2016,
        name: 'Championship',
        code: 'ELC',
        type: 'LEAGUE',
        emblem: 'https://crests.football-data.org/ELC.png',
      },
      area: {
        id: 2072,
        name: 'England',
        code: 'ENG',
        flag: 'https://crests.football-data.org/770.svg',
      },
      homeTeam: {
        id: 72,
        name: 'Swansea City AFC',
        shortName: 'Swansea',
        tla: 'SWA',
        crest: 'https://crests.football-data.org/72.png',
      },
      awayTeam: {
        id: 68,
        name: 'Norwich City FC',
        shortName: 'Norwich',
        tla: 'NOR',
        crest: 'https://crests.football-data.org/68.png',
      },
      score: {
        winner: 'HOME_TEAM',
        duration: 'REGULAR',
        fullTime: { home: 2, away: 1 },
        halfTime: { home: 0, away: 1 },
      },
    };

    const match = normalizeMatch(raw);
    expect(match.id).toBe(561860);
    expect(match.competition.nameAr).toBe('دوري البطولة الإنجليزية');
    expect(match.homeTeam.nameAr).toBe('سوانزي');
    expect(match.awayTeam.nameAr).toBe('نورويتش');
    expect(match.score.fullTime.home).toBe(2);
    expect(match.score.fullTime.away).toBe(1);
    expect(match.status).toBe('FINISHED');
  });

  it('fetches matches with auth token and returns normalized array', async () => {
    const mockPayload = {
      matches: [
        {
          id: 101,
          utcDate: '2026-10-10T19:00:00Z',
          status: 'IN_PLAY',
          competition: { code: 'PL', name: 'Premier League' },
          homeTeam: { name: 'Arsenal FC', shortName: 'Arsenal' },
          awayTeam: { name: 'Chelsea FC', shortName: 'Chelsea' },
          score: { fullTime: { home: 1, away: 0 } },
        },
      ],
    };

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockPayload,
    } as any);

    const res = await getMatches({ forceReload: true });
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('/matches'),
      expect.objectContaining({
        headers: expect.objectContaining({
          'X-Auth-Token': FOOTBALL_API_TOKEN,
        }),
      }),
    );
    expect(res.matches.length).toBe(1);
    expect(res.matches[0].homeTeam.nameAr).toBe('آرسنال');
    expect(res.matches[0].awayTeam.nameAr).toBe('تشيلسي');
    expect(res.matches[0].status).toBe('IN_PLAY');
  });
});
