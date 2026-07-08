import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from '../services/storage/mmkv';

export type AppThemeType = 'system' | 'light' | 'dark';

interface AppState {
  // Theme state
  themeMode: AppThemeType;
  setThemeMode: (mode: AppThemeType) => void;

  // Onboarding state
  hasCompletedOnboarding: boolean;
  setHasCompletedOnboarding: (completed: boolean) => void;

  // Session state
  isHydrated: boolean;
  setIsHydrated: (isHydrated: boolean) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      themeMode: 'system',
      setThemeMode: (themeMode) => set({ themeMode }),

      hasCompletedOnboarding: false,
      setHasCompletedOnboarding: (hasCompletedOnboarding) => set({ hasCompletedOnboarding }),

      isHydrated: false,
      setIsHydrated: (isHydrated) => set({ isHydrated }),
    }),
    {
      name: 'app-storage',
      storage: createJSONStorage(() => zustandStorage),
      onRehydrateStorage: () => (state) => {
        state?.setIsHydrated(true);
      },
    }
  )
);
