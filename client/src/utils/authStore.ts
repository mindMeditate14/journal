import { create } from 'zustand';
import { User } from '../types';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (user: User, accessToken: string, refreshToken: string) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
  restoreSession: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: true,
  login: (user, accessToken, refreshToken) => {
    localStorage.setItem('nexusjournal_access_token', accessToken);
    localStorage.setItem('nexusjournal_refresh_token', refreshToken);
    localStorage.setItem('nexusjournal_user', JSON.stringify(user));
    set({
      user,
      accessToken,
      refreshToken,
      isAuthenticated: true,
    });
  },
  logout: () => {
    localStorage.removeItem('nexusjournal_access_token');
    localStorage.removeItem('nexusjournal_refresh_token');
    localStorage.removeItem('nexusjournal_user');
    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
    });
  },
  setLoading: (loading) => set({ isLoading: loading }),
  restoreSession: () => {
    const token = localStorage.getItem('nexusjournal_access_token');
    const user = localStorage.getItem('nexusjournal_user');
    const refreshToken = localStorage.getItem('nexusjournal_refresh_token');

    if (token && user && refreshToken) {
      set({
        accessToken: token,
        user: JSON.parse(user),
        refreshToken,
        isAuthenticated: true,
        isLoading: false,
      });
    } else {
      set({ isLoading: false });
    }
  },
}));
