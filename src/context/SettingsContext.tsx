import React, { createContext, useContext, useMemo, useState, useEffect, useCallback } from 'react';

interface SettingsContextValue {
  slippageBps: number;
  setSlippageBps: (value: number) => void;
}

const DEFAULT_SLIPPAGE_BPS = 50; // 0.5%
export const SLIPPAGE_LIMIT_BPS = 10000; // 100%
export const MIN_SLIPPAGE_BPS = 1; // 0.01%

const SettingsContext = createContext<SettingsContextValue>({
  slippageBps: DEFAULT_SLIPPAGE_BPS,
  setSlippageBps: () => {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('setSlippageBps called outside of SettingsProvider');
    }
  },
});

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [slippageBps, setSlippageBpsState] = useState<number>(DEFAULT_SLIPPAGE_BPS);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.localStorage.getItem('ww_auto_slippage_bps');
    if (!stored) return;
    const parsed = Number(stored);
    if (!Number.isNaN(parsed) && parsed > 0) {
      const normalized = Math.min(SLIPPAGE_LIMIT_BPS, Math.max(MIN_SLIPPAGE_BPS, Math.round(parsed)));
      setSlippageBpsState(normalized);
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('ww_auto_slippage_bps', String(slippageBps));
    }
  }, [slippageBps]);

  const setSlippageBps = useCallback((value: number) => {
    const normalized = Math.min(SLIPPAGE_LIMIT_BPS, Math.max(MIN_SLIPPAGE_BPS, Math.round(value)));
    setSlippageBpsState(normalized);
  }, []);

  const value = useMemo(
    () => ({
      slippageBps,
      setSlippageBps,
    }),
    [slippageBps, setSlippageBps]
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
};

export const useSettings = () => useContext(SettingsContext);
