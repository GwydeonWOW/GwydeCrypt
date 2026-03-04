import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type RefreshInterval = 'off' | '5m' | '15m' | '30m' | '1h';

interface AutoRefreshState {
  interval: RefreshInterval;
  setInterval: (interval: RefreshInterval) => void;
  getIntervalInMs: () => number;
}

export const useAutoRefreshStore = create<AutoRefreshState>()(
  persist(
    (set, get) => ({
      interval: 'off',
      setInterval: (interval: RefreshInterval) => set({ interval }),
      getIntervalInMs: () => {
        const interval = get().interval;
        switch (interval) {
          case '5m': return 5 * 60 * 1000;
          case '15m': return 15 * 60 * 1000;
          case '30m': return 30 * 60 * 1000;
          case '1h': return 60 * 60 * 1000;
          default: return 0;
        }
      },
    }),
    {
      name: 'auto-refresh-storage',
    }
  )
);
