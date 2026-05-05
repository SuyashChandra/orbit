import axios from 'axios';
import { useAuthStore } from '../features/auth/authStore.js';

export const api = axios.create({
  baseURL: import.meta.env['VITE_API_URL'] ?? 'http://localhost:3000',
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers['Authorization'] = `Bearer ${token}`;
  return config;
});

let isRefreshing = false;
let refreshQueue: Array<(token: string) => void> = [];

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error);
    }
    original._retry = true;

    if (isRefreshing) {
      return new Promise((resolve) => {
        refreshQueue.push((token) => {
          original.headers['Authorization'] = `Bearer ${token}`;
          resolve(api(original));
        });
      });
    }

    isRefreshing = true;
    try {
      const { data } = await axios.post<{ accessToken: string }>(
        `${import.meta.env['VITE_API_URL']}/auth/refresh`,
        {},
        { withCredentials: true },
      );
      const { accessToken } = data;
      useAuthStore.getState().setAccessToken(accessToken);
      refreshQueue.forEach((cb) => cb(accessToken));
      refreshQueue = [];
      original.headers['Authorization'] = `Bearer ${accessToken}`;
      return api(original);
    } catch {
      useAuthStore.getState().clear();
      window.location.href = '/login';
      return Promise.reject(error);
    } finally {
      isRefreshing = false;
    }
  },
);
