import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { api } from '../../lib/api.js';
import { useAuthStore } from './authStore.js';
import type { UserDTO } from '@orbit/shared';

export function AuthCallbackPage() {
  const navigate = useNavigate();
  const { setAccessToken, setUser } = useAuthStore();

  useEffect(() => {
    const hash = window.location.hash;
    const token = new URLSearchParams(hash.slice(1)).get('token');

    if (!token) {
      navigate('/login', { replace: true });
      return;
    }

    setAccessToken(token);

    api
      .get<UserDTO>('/users/me', {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then(({ data }) => {
        setUser(data);
        navigate('/', { replace: true });
      })
      .catch(() => {
        navigate('/login?error=fetch_failed', { replace: true });
      });
  }, [navigate, setAccessToken, setUser]);

  return (
    <div className="min-h-dvh flex items-center justify-center bg-bg">
      <p className="text-fg-muted text-base">Signing you in…</p>
    </div>
  );
}
