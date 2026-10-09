import { useEffect, type ReactNode } from 'react';
import { useAppStore, palettes, type AppState } from './store';

export { useAppStore, palettes };

export interface Settings extends AppState {
  colors: typeof palettes.light;
}

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const init = useAppStore(s => s.init);
  useEffect(() => {
    init();
  }, [init]);
  return <>{children}</>;
}

export function usePreferences(): Settings {
  const store = useAppStore();
  const colors = palettes[store.dark ? 'dark' : 'light'];
  return {
    ...store,
    colors,
  };
}
