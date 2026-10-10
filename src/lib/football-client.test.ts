import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  fetchFootballData,
  getRateLimitStatus,
  resetFootballClientState,
  FOOTBALL_API_TOKEN,
} from './football-client';

describe('football-client service', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    resetFootballClientState();
  });

  it('fetches remote data with auth headers and caches it', async () => {
    const mockData = { matches: [{ id: 1, name: 'Match 1' }] };
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockData,
    } as any);

    const res = await fetchFootballData<typeof mockData>('/matches');
    expect(res.data).toEqual(mockData);
    expect(res.fromCache).toBe(false);
    expect(res.stale).toBe(false);
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('/matches'),
      expect.objectContaining({
        headers: expect.objectContaining({
          'X-Auth-Token': FOOTBALL_API_TOKEN,
        }),
      }),
    );

    // Second call without forceReload should hit cache directly and not call fetch
    const res2 = await fetchFootballData<typeof mockData>('/matches');
    expect(res2.data).toEqual(mockData);
    expect(res2.fromCache).toBe(true);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('coalesces in-flight simultaneous requests to the same endpoint', async () => {
    let resolvePromise: (value: any) => void;
    const delayedPromise = new Promise(resolve => {
      resolvePromise = resolve;
    });

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementationOnce(
      () =>
        delayedPromise.then(() => ({
          ok: true,
          status: 200,
          json: async () => ({ status: 'success' }),
        })) as any,
    );

    // Two simultaneous calls
    const p1 = fetchFootballData('/competitions/PL/standings');
    const p2 = fetchFootballData('/competitions/PL/standings');

    resolvePromise!({ ok: true });
    const [r1, r2] = await Promise.all([p1, p2]);

    expect(r1.data).toEqual({ status: 'success' });
    expect(r2.data).toEqual({ status: 'success' });
    // fetch should only have been called ONCE!
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('serves stale cache and avoids 429 when rate limit (10 calls/min) is reached', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(
      async url =>
        ({
          ok: true,
          status: 200,
          json: async () => ({ url, count: 1 }),
        } as any),
    );

    // Initial call to populate cache
    await fetchFootballData('/matches?date=test');
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    // Exhaust 9 more calls on different endpoints to reach 10 calls
    for (let i = 1; i <= 9; i++) {
      await fetchFootballData(`/endpoint-${i}`);
    }
    expect(fetchSpy).toHaveBeenCalledTimes(10);
    expect(getRateLimitStatus().remaining).toBe(0);

    // Now attempt an 11th call on an endpoint that has cached data
    const resOverLimit = await fetchFootballData('/matches?date=test', { forceReload: true });
    // Should NOT call fetch (prevent 429) and serve cached data
    expect(fetchSpy).toHaveBeenCalledTimes(10);
    expect(resOverLimit.fromCache).toBe(true);
    expect(resOverLimit.rateLimited).toBe(true);
    expect(resOverLimit.stale).toBe(true);
  });

  it('falls back to cache when API returns 429', async () => {
    // First call succeeds and caches
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ key: 'cached-value' }),
    } as any);

    await fetchFootballData('/competitions/PD/matches');

    // Second call forces reload but API returns 429
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 429,
    } as any);

    const res = await fetchFootballData<{ key: string }>('/competitions/PD/matches', {
      forceReload: true,
    });
    expect(res.data).toEqual({ key: 'cached-value' });
    expect(res.stale).toBe(true);
  });

  it('falls back to cache on network failure', async () => {
    // Populate cache
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ value: 42 }),
    } as any);
    await fetchFootballData('/scores');

    // Network error on reload
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Network request failed'));

    const res = await fetchFootballData<{ value: number }>('/scores', { forceReload: true });
    expect(res.data).toEqual({ value: 42 });
    expect(res.stale).toBe(true);
  });
});
