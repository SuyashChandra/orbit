import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import * as stylex from '@stylexjs/stylex';
import { api } from '../../lib/api.js';
import { useAuthStore } from './authStore.js';
import { colors, font } from '../../styles/tokens.stylex.js';
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
    <div {...stylex.props(styles.page)}>
      <p {...stylex.props(styles.text)}>Signing you in…</p>
    </div>
  );
}

const styles = stylex.create({
  page: {
    minHeight: '100dvh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
  text: {
    color: colors.textSecondary,
    fontSize: font.md,
  },
});
