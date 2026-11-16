import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import { logicalToday, yearIndexInCycle, type ISODate } from './lib/dates';
import { loadSettings, saveSettings, type Settings } from './lib/settings';

type Ctx = {
  settings: Settings;
  updateSettings: (patch: Partial<Settings>) => void;
  /** Today's diary date (03:00 cutoff). Re-evaluated whenever the app returns to the foreground. */
  today: ISODate;
  /** Start date, falling back to today before onboarding is done. */
  start: ISODate;
  /** Colour index (0..4) of the current diary year. */
  currentK: number;
  /** Incremented after any write so open screens can reload. */
  version: number;
  bump: () => void;
};

const AppCtx = createContext<Ctx | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [today, setToday] = useState(logicalToday);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') setToday(logicalToday());
    });
    const t = setInterval(() => setToday(logicalToday()), 60_000);
    return () => {
      sub.remove();
      clearInterval(t);
    };
  }, []);

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    saveSettings(patch);
    setSettings(loadSettings());
  }, []);

  const bump = useCallback(() => setVersion((v) => v + 1), []);

  const value = useMemo<Ctx>(() => {
    const start = settings.startDate ?? today;
    return {
      settings,
      updateSettings,
      today,
      start,
      currentK: yearIndexInCycle(start, today),
      version,
      bump,
    };
  }, [settings, updateSettings, today, version, bump]);

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

export function useApp(): Ctx {
  const v = useContext(AppCtx);
  if (!v) throw new Error('useApp outside AppProvider');
  return v;
}

/**
 * Reads from the local database during render. SQLite calls are synchronous,
 * so the result is memoised on `deps` and recomputed after every write (`bump`).
 */
export function useDb<T>(read: () => T, deps: readonly unknown[]): T {
  const { version } = useApp();
  const key = JSON.stringify(deps);
  // `read` closes over exactly the values in `deps`, so `key` stands in for it.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => read(), [key, version]);
}

/**
 * A date the user has navigated to, which resets whenever the route's `date`
 * param changes. `null` means "follow today".
 */
export function useNavDate(param: string | undefined) {
  const [nav, setNav] = useState<{ date: ISODate | null; param: string | undefined }>({ date: param ?? null, param });
  if (param !== nav.param) setNav({ date: param ?? null, param });
  const set = useCallback((next: ISODate | null | ((d: ISODate | null) => ISODate | null)) => {
    setNav((s) => ({ ...s, date: typeof next === 'function' ? next(s.date) : next }));
  }, []);
  return [nav.date, set] as const;
}
