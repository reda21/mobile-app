import { describe, expect, it } from 'vitest';
import { isNativeRuntime } from './runtime';

describe('isNativeRuntime', () => {
  it('équivaut au prédicat historique (refactor sans changement de comportement)', () => {
    const host = globalThis as unknown as { nativeEventEmitter?: unknown };
    const legacy =
      typeof window !== 'undefined' ||
      typeof navigator !== 'undefined' ||
      host.nativeEventEmitter !== undefined;
    expect(isNativeRuntime()).toBe(legacy);
  });
});
