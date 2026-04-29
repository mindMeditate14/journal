import axios, { AxiosInstance, AxiosError } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

let refreshInFlight: Promise<string | null> | null = null;

const decodeJwtExp = (token: string): number | null => {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
    const decoded = JSON.parse(window.atob(padded));
    return typeof decoded.exp === 'number' ? decoded.exp : null;
  } catch {
    return null;
  }
};

const refreshAccessToken = async (): Promise<string | null> => {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      const refreshToken = localStorage.getItem('nexusjournal_refresh_token');
      if (!refreshToken) {
        return null;
      }

      const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, {
        refreshToken,
      });

      localStorage.setItem('nexusjournal_access_token', data.accessToken);
      localStorage.setItem('nexusjournal_refresh_token', data.refreshToken);
      return data.accessToken as string;
    })().finally(() => {
      refreshInFlight = null;
    });
  }

  return refreshInFlight;
};

const axiosInstance: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add JWT token
axiosInstance.interceptors.request.use(
  async (config) => {
    let token = localStorage.getItem('nexusjournal_access_token');

    // Pre-refresh token to avoid a visible 401 + retry round-trip.
    if (token) {
      const exp = decodeJwtExp(token);
      const now = Math.floor(Date.now() / 1000);
      const shouldRefresh = exp !== null && exp - now <= 15;

      if (shouldRefresh) {
        try {
          token = await refreshAccessToken();
        } catch {
          localStorage.removeItem('nexusjournal_access_token');
          localStorage.removeItem('nexusjournal_refresh_token');
          window.location.href = '/login';
          return config;
        }
      }
    }

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for token refresh
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as any;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const newAccessToken = await refreshAccessToken();
        if (newAccessToken) {
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return axiosInstance(originalRequest);
        }
      } catch (refreshError) {
        localStorage.removeItem('nexusjournal_access_token');
        localStorage.removeItem('nexusjournal_refresh_token');
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
