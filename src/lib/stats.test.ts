import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  translatePlayer,
  getCompetitionStats,
} from './stats';
import { FOOTBALL_API_TOKEN } from './matches';
import { resetFootballClientState } from './football-client';

describe('stats service', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    resetFootballClientState();
  });

  it('translates famous football player names to Arabic', () => {
    expect(translatePlayer('Erling Haaland')).toBe('إرلينغ هالاند');
    expect(translatePlayer('Kylian Mbappé')).toBe('كيليان مبابي');
    expect(translatePlayer('Robert Lewandowski')).toBe('روبرت ليفاندوفسكي');
    expect(translatePlayer('Raphinha')).toBe('رافينيا');
    expect(translatePlayer('Mohamed Salah')).toBe('محمد صلاح');
  });

  it('falls back to original name for unknown player', () => {
    expect(translatePlayer('Unknown Player')).toBe('Unknown Player');
  });

  it('fetches scorers and computes team stats and averages', async () => {
    const mockScorers = {
      competition: { id: 2021, name: 'Premier League', code: 'PL' },
      season: { currentMatchday: 6 },
      scorers: [
        {
          player: { id: 38101, name: 'Erling Haaland', nationality: 'Norway' },
          team: { id: 65, name: 'Manchester City FC', shortName: 'Man City' },
          playedMatches: 5,
          goals: 5,
          assists: 1,
          penalties: 0,
        },
      ],
    };

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockScorers,
    } as any);

    const res = await getCompetitionStats('PL', { forceReload: true });
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('/competitions/PL/scorers'),
      expect.objectContaining({
        headers: expect.objectContaining({
          'X-Auth-Token': FOOTBALL_API_TOKEN,
        }),
      }),
    );
    expect(res.scorers.length).toBe(1);
    expect(res.scorers[0].player.nameAr).toBe('إرلينغ هالاند');
    expect(res.scorers[0].goals).toBe(5);
    expect(res.scorers[0].rank).toBe(1);
  });
});
