import { useState } from 'react';
import * as stylex from '@stylexjs/stylex';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api.js';
import { useAuthStore } from '../auth/authStore.js';
import { colors, font, radii, spacing } from '../../styles/tokens.stylex.js';
import type { UpdateProfileBody, UserDTO } from '@orbit/shared';

export function ProfilePage() {
  const { user, setUser, clear } = useAuthStore();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.name ?? '');
  const [copied, setCopied] = useState(false);
  const qc = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: (body: UpdateProfileBody) =>
      api.patch<UserDTO>('/users/me', body).then((r) => r.data),
    onSuccess: (updated) => {
      setUser(updated);
      qc.setQueryData(['me'], updated);
      setEditing(false);
    },
  });

  const handleCopyCode = () => {
    if (!user) return;
    navigator.clipboard.writeText(user.friendCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleLogout = async () => {
    await api.post('/auth/logout').catch(() => {});
    clear();
    window.location.href = '/login';
  };

  if (!user) return null;

  return (
    <div {...stylex.props(styles.page)}>
      <div {...stylex.props(styles.avatarWrap)}>
        {user.avatar ? (
          <img src={user.avatar} alt={user.name} {...stylex.props(styles.avatar)} />
        ) : (
          <div {...stylex.props(styles.avatarFallback)}>
            {user.name.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      {editing ? (
        <div {...stylex.props(styles.editRow)}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            {...stylex.props(styles.input)}
            maxLength={80}
          />
          <button
            onClick={() => updateMutation.mutate({ name })}
            disabled={updateMutation.isPending || !name.trim()}
            {...stylex.props(styles.btn, styles.btnAccent)}
          >
            {updateMutation.isPending ? 'Saving…' : 'Save'}
          </button>
          <button onClick={() => setEditing(false)} {...stylex.props(styles.btn, styles.btnGhost)}>
            Cancel
          </button>
        </div>
      ) : (
        <div {...stylex.props(styles.nameRow)}>
          <h2 {...stylex.props(styles.name)}>{user.name}</h2>
          <button onClick={() => setEditing(true)} {...stylex.props(styles.editBtn)}>
            Edit
          </button>
        </div>
      )}

      <p {...stylex.props(styles.email)}>{user.email}</p>

      <div {...stylex.props(styles.codeCard)}>
        <span {...stylex.props(styles.codeLabel)}>Friend Code</span>
        <div {...stylex.props(styles.codeRow)}>
          <span {...stylex.props(styles.code)}>{user.friendCode}</span>
          <button onClick={handleCopyCode} {...stylex.props(styles.copyBtn)}>
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>

      <button onClick={handleLogout} {...stylex.props(styles.logoutBtn)}>
        Sign out
      </button>
    </div>
  );
}

const styles = stylex.create({
  page: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: spacing.s6,
    padding: spacing.s6,
  },
  avatarWrap: {
    marginTop: spacing.s4,
  },
  avatar: {
    width: '88px',
    height: '88px',
    borderRadius: radii.full,
    objectFit: 'cover',
  },
  avatarFallback: {
    width: '88px',
    height: '88px',
    borderRadius: radii.full,
    backgroundColor: colors.accent,
    color: colors.fgOnAccent,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: font.xxl,
    fontWeight: 700,
  },
  nameRow: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.s3,
  },
  name: {
    fontSize: font.xl,
    fontWeight: 700,
    color: colors.textPrimary,
  },
  editBtn: {
    fontSize: font.sm,
    color: colors.accent,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: `${spacing.s1} ${spacing.s2}`,
  },
  editRow: {
    display: 'flex',
    gap: spacing.s2,
    width: '100%',
    maxWidth: '320px',
  },
  input: {
    flex: 1,
    padding: `${spacing.s2} ${spacing.s3}`,
    backgroundColor: colors.surface,
    border: `1px solid ${colors.border}`,
    borderRadius: radii.md,
    color: colors.textPrimary,
    fontSize: font.md,
  },
  email: {
    fontSize: font.sm,
    color: colors.textSecondary,
  },
  codeCard: {
    width: '100%',
    maxWidth: '320px',
    backgroundColor: colors.surface,
    border: `1px solid ${colors.border}`,
    borderRadius: radii.lg,
    padding: spacing.s4,
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.s2,
  },
  codeLabel: {
    fontSize: font.xs,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
  },
  codeRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  code: {
    fontSize: font.xl,
    fontWeight: 700,
    color: colors.accent,
    letterSpacing: '0.12em',
  },
  copyBtn: {
    fontSize: font.sm,
    color: colors.accent,
    background: 'none',
    border: `1px solid ${colors.accent}`,
    borderRadius: radii.md,
    padding: `${spacing.s1} ${spacing.s3}`,
    cursor: 'pointer',
  },
  btn: {
    padding: `${spacing.s3} ${spacing.s4}`,
    borderRadius: radii.md,
    fontSize: font.md,
    fontWeight: 600,
    border: 'none',
    cursor: 'pointer',
  },
  btnAccent: {
    backgroundColor: colors.accent,
    color: colors.fgOnAccent,
  },
  btnGhost: {
    backgroundColor: colors.surface,
    color: colors.textSecondary,
    border: `1px solid ${colors.border}`,
  },
  logoutBtn: {
    width: '100%',
    maxWidth: '320px',
    padding: `${spacing.s3} ${spacing.s4}`,
    borderRadius: radii.md,
    fontSize: font.md,
    fontWeight: 600,
    backgroundColor: 'transparent',
    color: colors.danger,
    border: `1px solid ${colors.danger}`,
    cursor: 'pointer',
    marginTop: spacing.s4,
  },
});
