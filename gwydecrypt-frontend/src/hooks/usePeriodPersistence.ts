import { useState, useEffect } from 'react';

type PeriodType = '1d' | '1w' | '1m' | '3m' | '1y' | 'all';

const STORAGE_KEYS = {
  dashboard: 'dashboard-period',
  portfolio: 'portfolio-period',
} as const;

export function usePeriodPersistence(page: 'dashboard' | 'portfolio', defaultPeriod: PeriodType = '1w') {
  const storageKey = STORAGE_KEYS[page];

  const [period, setPeriodState] = useState<PeriodType>(() => {
    // Load from localStorage on mount
    const stored = localStorage.getItem(storageKey);
    return (stored as PeriodType) || defaultPeriod;
  });

  const setPeriod = (newPeriod: PeriodType) => {
    setPeriodState(newPeriod);
    localStorage.setItem(storageKey, newPeriod);
  };

  return [period, setPeriod] as const;
}
