import { afterEach, expect, test, vi } from 'vitest';
import { setAnalyticsConsent, track } from './analytics.ts';

afterEach(() => { setAnalyticsConsent(false); vi.restoreAllMocks(); vi.unstubAllEnvs(); });

test('analytics sends nothing without consent or a project token', async () => {
  const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response());
  vi.stubEnv('EXPO_PUBLIC_POSTHOG_KEY', 'test-token');
  await track('search', { query_length: 5 });
  expect(fetchSpy).not.toHaveBeenCalled();
  setAnalyticsConsent(true);
  vi.stubEnv('EXPO_PUBLIC_POSTHOG_KEY', '');
  await track('feed_view');
  expect(fetchSpy).not.toHaveBeenCalled();
});

test('capture uses a temporary ID and stops after consent is revoked', async () => {
  const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response());
  vi.stubEnv('EXPO_PUBLIC_POSTHOG_KEY', 'test-token');
  vi.stubEnv('EXPO_PUBLIC_POSTHOG_HOST', 'https://eu.i.posthog.com');
  setAnalyticsConsent(true);
  await track('search', { query_length: 5, category: 'europe' });
  const [url, options] = fetchSpy.mock.calls[0]!;
  expect(url).toBe('https://eu.i.posthog.com/i/v0/e/');
  const body = JSON.parse(String(options?.body));
  expect(body.properties).toMatchObject({ query_length: 5, category: 'europe', $process_person_profile: false, $geoip_disable: true });
  expect(body.properties.distinct_id).toMatch(/^session-/);
  expect(body.properties).not.toHaveProperty('query');
  setAnalyticsConsent(false);
  await track('article_open');
  expect(fetchSpy).toHaveBeenCalledTimes(1);
});

test('a failed analytics request never rejects the user action', async () => {
  vi.stubEnv('EXPO_PUBLIC_POSTHOG_KEY', 'test-token');
  setAnalyticsConsent(true);
  vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'));
  await expect(track('feed_error')).resolves.toBeUndefined();
});
