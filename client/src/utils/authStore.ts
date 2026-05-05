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

// Read localStorage synchronously at module load time — no async, no flicker
const _token = localStorage.getItem('nexusjournal_access_token');
const _userRaw = localStorage.getItem('nexusjournal_user');
const _refreshToken = localStorage.getItem('nexusjournal_refresh_token');
const _user: User | null = (_token && _userRaw && _refreshToken) ? JSON.parse(_userRaw) : null;

export const useAuthStore = create<AuthState>((set) => ({
  user: _user,
  accessToken: _token,
  refreshToken: _refreshToken,
  isAuthenticated: !!_user,
  isLoading: false,
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
    // No-op: session is already restored synchronously at startup
  },
}));
