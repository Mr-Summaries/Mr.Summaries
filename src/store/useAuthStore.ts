import { create } from 'zustand';
import { account, databases, APPWRITE_CONFIG, ID } from '../lib/appwrite';

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
      const currentAccount = await account.get();
      console.log('Current User Labels:', currentAccount.labels);
      const isAdmin = currentAccount.labels?.includes('admin') || false;
      console.log('Is Admin:', isAdmin);
      set({ user: currentAccount, isAdmin });
    } catch (error) {
      set({ user: null, isAdmin: false });
    } finally {
      set({ isLoading: false });
    }
  },
  login: async (email, pass) => {
    await account.createEmailPasswordSession(email, pass);
    const { checkAuth } = useAuthStore.getState();
    await checkAuth();
  },
  signup: async (email, pass, name) => {
    await account.create(ID.unique(), email, pass, name);
    await account.createEmailPasswordSession(email, pass);
    const { checkAuth } = useAuthStore.getState();
    await checkAuth();
  },
  updateName: async (name) => {
    await account.updateName(name);
    const { checkAuth } = useAuthStore.getState();
    await checkAuth();
  },
  updateEmail: async (email, pass) => {
    await account.updateEmail(email, pass);
    const { checkAuth } = useAuthStore.getState();
    await checkAuth();
  },
  logout: async () => {
    await account.deleteSession('current');
    set({ user: null, isAdmin: false });
  }
}));
