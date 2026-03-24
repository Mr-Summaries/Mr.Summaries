import { create } from 'zustand';
import { api } from '../services/api';

interface AuthState {
  user: any | null;
  isAdmin: boolean;
  isLoading: boolean;
  checkAuth: () => Promise<void>;
  login: (email: string, pass: string) => Promise<void>;
  signup: (email: string, pass: string, name?: string) => Promise<void>;
  updateName: (name: string) => Promise<void>;
  updateEmail: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAdmin: false,
  isLoading: true,
  checkAuth: async () => {
    try {
      const user = await api.me();
      if (user) {
        set({ user, isAdmin: user.labels?.includes('admin') || false });
      } else {
        set({ user: null, isAdmin: false });
      }
    } catch (e) {
      set({ user: null, isAdmin: false });
    } finally {
      set({ isLoading: false });
    }
  },
  login: async (email, pass) => {
    const user = await api.login(email, pass);
    set({ user, isAdmin: user.labels?.includes('admin') || false });
  },
  signup: async (email, pass, name) => {
    const user = await api.signup(email, pass, name);
    set({ user, isAdmin: user.labels?.includes('admin') || false });
  },
  updateName: async (name) => {
    const user = await api.updateName(name);
    set({ user });
  },
  updateEmail: async (email, pass) => {
    const user = await api.updateEmail(email, pass);
    set({ user });
  },
  logout: async () => {
    await api.logout();
    set({ user: null, isAdmin: false });
  }
}));
