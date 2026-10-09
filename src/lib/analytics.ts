export type AnalyticsEvent = 'feed_view' | 'article_open' | 'article_save' | 'search' | 'feed_error';
type Properties = { category?: string; article_id?: string; count?: number; duration_ms?: number; stale?: boolean; query_length?: number };

let consent = false;
let sessionId = '';
const pending = new Set<AbortController>();

export function setAnalyticsConsent(enabled: boolean) {
  consent = enabled;
  if (!enabled) {
    pending.forEach(controller => controller.abort());
    sessionId = '';
  }
}

/** Optional PostHog capture, without search text, article bodies or a persistent user ID. */
export async function track(event: AnalyticsEvent, properties: Properties = {}): Promise<void> {
  const token = process.env.EXPO_PUBLIC_POSTHOG_KEY;
  if (!consent || !token) return;
  const host = process.env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://eu.i.posthog.com';
  if (!/^https:\/\//.test(host)) return;
  sessionId ||= `session-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const controller = new AbortController();
  pending.add(controller);
  const timeout = setTimeout(() => controller.abort(), 3000);
  try {
    await fetch(`${host.replace(/\/$/, '')}/i/v0/e/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, event, properties: { ...properties, distinct_id: sessionId, $process_person_profile: false, $geoip_disable: true } }),
      signal: controller.signal,
    });
  } catch {
    // Analytics must never block reading, and no offline queue retains events.
  } finally {
    clearTimeout(timeout);
    pending.delete(controller);
  }
}
