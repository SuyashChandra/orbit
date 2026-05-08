import { useEffect, useState, type ReactNode } from 'react';
import { Navigate } from 'react-router';
import { useAuthStore } from '../features/auth/authStore.js';
import { api } from '../lib/api.js';

export function AuthGuard({ children }: { children: ReactNode }) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);

  // If we have no user at all, skip the refresh attempt — go straight to login.
  const needsRefresh = !accessToken && !!user;
  const [refreshing, setRefreshing] = useState(needsRefresh);

  useEffect(() => {
    if (!needsRefresh) return;

    // accessToken was lost (page refresh wipes in-memory state).
    // The httpOnly refresh cookie is still present — exchange it for a new token.
    api
      .post<{ accessToken: string }>('/auth/refresh')
      .then(({ data }) => {
        useAuthStore.getState().setAccessToken(data.accessToken);
      })
      .catch(() => {
        // Refresh token expired or missing — force re-login.
        useAuthStore.getState().clear();
      })
      .finally(() => setRefreshing(false));
  }, []);

  if (refreshing) return null;
  if (!accessToken) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
