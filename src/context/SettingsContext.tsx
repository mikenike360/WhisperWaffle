import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

interface SettingsContextValue {
  slippageBps: number;
  setSlippageBps: (bps: number) => void;
}

const DEFAULT_SLIPPAGE_BPS = 50; // 0.5%
const SLIPPAGE_STORAGE_KEY = 'whisperwaffle:slippageBps';

const SettingsContext = createContext<SettingsContextValue | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [slippageBps, setSlippageBpsState] = useState<number>(DEFAULT_SLIPPAGE_BPS);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const storedValue = window.localStorage.getItem(SLIPPAGE_STORAGE_KEY);
    if (storedValue) {
      const parsed = parseInt(storedValue, 10);
      if (!Number.isNaN(parsed) && parsed > 0) {
        setSlippageBpsState(parsed);
      }
    }
  }, []);

  const setSlippageBps = (bps: number) => {
    setSlippageBpsState(bps);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(SLIPPAGE_STORAGE_KEY, String(bps));
    }
  };

  const value = useMemo(() => ({ slippageBps, setSlippageBps }), [slippageBps]);

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
};

export const useSettings = (): SettingsContextValue => {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return ctx;
};

export const SLIPPAGE_LIMIT_BPS = 10000; // 100%
export const MIN_SLIPPAGE_BPS = 1; // 0.01%
