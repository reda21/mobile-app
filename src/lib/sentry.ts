import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';

const dsn =
  Constants.expoConfig?.extra?.sentryDsn ??
  process.env.EXPO_PUBLIC_SENTRY_DSN ??
  '';

export function initSentry(): boolean {
  if (dsn) {
    Sentry.init({
      dsn,
      debug: false,
      tracesSampleRate: 0.2,
      enableAutoSessionTracking: true,
    });
    return true;
  }
  return false;
}

export function captureException(error: unknown, context?: Record<string, unknown>) {
  if (dsn) {
    Sentry.captureException(error, context ? { extra: context } : undefined);
  } else if (__DEV__) {
    console.warn('[Sentry dev capture]', error, context);
  }
}

export { Sentry };
