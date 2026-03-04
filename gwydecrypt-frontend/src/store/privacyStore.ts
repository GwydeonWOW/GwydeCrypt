import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface PrivacyState {
  hideValues: boolean;
  toggleValues: () => void;
}

export const usePrivacyStore = create<PrivacyState>()(
  persist(
    (set) => ({
      hideValues: false,
      toggleValues: () => set((state) => ({ hideValues: !state.hideValues })),
    }),
    {
      name: 'privacy-storage',
    }
  )
);
