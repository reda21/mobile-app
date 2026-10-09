const host = globalThis as unknown as { nativeEventEmitter?: unknown };

/**
 * true sur device/simulateur ou web, false sous Node/vitest.
 * Centralise le test d'environnement historiquement écrit `(globalThis as any)...`.
 */
export function isNativeRuntime(): boolean {
  return (
    typeof window !== 'undefined' ||
    typeof navigator !== 'undefined' ||
    host.nativeEventEmitter !== undefined
  );
}
