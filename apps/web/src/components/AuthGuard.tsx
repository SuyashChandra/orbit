import type { ReactNode } from 'react';
import { Navigate } from 'react-router';
import { useAuthStore } from '../features/auth/authStore.js';

export function AuthGuard({ children }: { children: ReactNode }) {
  const token = useAuthStore((s) => s.accessToken);
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
