import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  normalizeStandingsResponse,
  getStandings,
  AVAILABLE_STANDINGS_COMPETITIONS,
} from './standings';
import { FOOTBALL_API_TOKEN } from './matches';
import { resetFootballClientState } from './football-client';

describe('standings service', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    resetFootballClientState();
  });

  it('provides available top European and world competitions', () => {
    expect(AVAILABLE_STANDINGS_COMPETITIONS.length).toBeGreaterThan(4);
    expect(AVAILABLE_STANDINGS_COMPETITIONS.some(c => c.code === 'PL')).toBe(true);
    expect(AVAILABLE_STANDINGS_COMPETITIONS.some(c => c.code === 'PD')).toBe(true);
  });

  it('normalizes raw standings payload and translates team names', () => {
    const raw = {
      competition: { id: 2021, name: 'Premier League', code: 'PL', emblem: 'https://crests.football-data.org/PL.png' },
      season: { currentMatchday: 6, startDate: '2026-08-21', endDate: '2027-05-30' },
      standings: [
        {
          stage: 'REGULAR_SEASON',
          type: 'TOTAL',
          table: [
            {
              position: 1,
              team: { id: 65, name: 'Manchester City FC', shortName: 'Man City', crest: 'https://crests.football-data.org/65.png' },
              playedGames: 5,
              won: 5,
              draw: 0,
              lost: 0,
              points: 15,
              goalsFor: 13,
              goalsAgainst: 5,
              goalDifference: 8,
            },
            {
              position: 2,
              team: { id: 57, name: 'Arsenal FC', shortName: 'Arsenal', crest: 'https://crests.football-data.org/57.png' },
              playedGames: 6,
              won: 5,
              draw: 0,
              lost: 1,
              points: 15,
              goalsFor: 10,
              goalsAgainst: 5,
              goalDifference: 5,
            },
          ],
        },
      ],
    };

    const result = normalizeStandingsResponse(raw);
    expect(result.competition.nameAr).toBe('الدوري الإنجليزي الممتاز');
    expect(result.standings[0].table[0].team.nameAr).toBe('مانشستر سيتي');
    expect(result.standings[0].table[0].position).toBe(1);
    expect(result.standings[0].table[0].points).toBe(15);
    expect(result.standings[0].table[1].team.nameAr).toBe('آرسنال');
    expect(result.standings[0].table[1].position).toBe(2);
  });

  it('fetches standings with auth token', async () => {
    const mockPayload = {
      competition: { id: 2014, name: 'Primera Division', code: 'PD' },
      season: { currentMatchday: 8 },
      standings: [
        {
          type: 'TOTAL',
          table: [
            {
              position: 1,
              team: { name: 'FC Barcelona', shortName: 'Barça' },
              points: 24,
              playedGames: 8,
            },
          ],
        },
      ],
    };

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockPayload,
    } as any);

    const res = await getStandings('PD', { forceReload: true });
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('/competitions/PD/standings'),
      expect.objectContaining({
        headers: expect.objectContaining({
          'X-Auth-Token': FOOTBALL_API_TOKEN,
        }),
      }),
    );
    expect(res.standings[0].table[0].team.nameAr).toBe('برشلونة');
    expect(res.standings[0].table[0].points).toBe(24);
  });
});
