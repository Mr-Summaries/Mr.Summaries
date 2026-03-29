import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ThemeState {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'dark',
      setTheme: () => {
        document.documentElement.classList.add('dark');
        set({ theme: 'dark' });
      },
      toggleTheme: () => {
        document.documentElement.classList.add('dark');
        set({ theme: 'dark' });
      },
    }),
    {
      name: 'theme-storage',
      onRehydrateStorage: () => (state) => {
        document.documentElement.classList.add('dark');
        if (state) {
          state.theme = 'dark';
        }
      },
    }
  )
);
