import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  formatDateToIso,
  getNextDayIso,
  generateCalendarDays,
  getMatchesForDate,
  getMatchesForMatchday,
} from './calendar';
import { FOOTBALL_API_TOKEN } from './matches';
import { resetFootballClientState } from './football-client';

describe('calendar service', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    resetFootballClientState();
  });

  it('formats Date to YYYY-MM-DD ISO string', () => {
    const d = new Date(2026, 9, 10); // 10 Oct 2026
    expect(formatDateToIso(d)).toBe('2026-10-10');
  });

  it('computes next day ISO correctly', () => {
    expect(getNextDayIso('2026-10-10')).toBe('2026-10-11');
    expect(getNextDayIso('2026-10-31')).toBe('2026-11-01');
    expect(getNextDayIso('2026-12-31')).toBe('2027-01-01');
  });

  it('generates a range of calendar days containing today', () => {
    const days = generateCalendarDays(-2, 5);
    expect(days.length).toBe(5);
    expect(days.some(d => d.isToday)).toBe(true);
    expect(days[0].dayNameAr).toBeTruthy();
    expect(typeof days[0].dayNumber).toBe('number');
  });

  it('fetches matches for a specific date using dateFrom and next day dateTo', async () => {
    const mockPayload = {
      matches: [
        {
          id: 991,
          utcDate: '2026-10-17T15:00:00Z',
          status: 'TIMED',
          homeTeam: { name: 'Real Madrid' },
          awayTeam: { name: 'Barcelona' },
        },
      ],
    };

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockPayload,
    } as any);

    const matches = await getMatchesForDate('2026-10-17', { forceReload: true });
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('dateFrom=2026-10-17&dateTo=2026-10-18'),
      expect.objectContaining({
        headers: expect.objectContaining({
          'X-Auth-Token': FOOTBALL_API_TOKEN,
        }),
      }),
    );
    expect(matches.length).toBe(1);
    expect(matches[0].id).toBe(991);
  });

  it('fetches matches for a competition matchday', async () => {
    const mockPayload = {
      competition: { id: 2021, name: 'Premier League', code: 'PL' },
      season: { currentMatchday: 7 },
      matches: [
        {
          id: 501,
          matchday: 7,
          status: 'TIMED',
          homeTeam: { name: 'Arsenal' },
          awayTeam: { name: 'Chelsea' },
        },
      ],
    };

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockPayload,
    } as any);

    const res = await getMatchesForMatchday('PL', 7, { forceReload: true });
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('/competitions/PL/matches?matchday=7'),
      expect.any(Object),
    );
    expect(res.matchday).toBe(7);
    expect(res.matches.length).toBe(1);
  });
});
