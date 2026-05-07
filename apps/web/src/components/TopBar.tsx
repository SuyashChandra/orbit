import * as stylex from '@stylexjs/stylex';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api.js';
import { useAuthStore } from '../features/auth/authStore.js';
import { colors, font, radii, spacing } from '../styles/tokens.stylex.js';
import type { NotificationDTO } from '@orbit/shared';

export function TopBar() {
  const user = useAuthStore((s) => s.user);
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();

  const notifQ = useQuery<NotificationDTO[]>({
    queryKey: ['notifications'],
    queryFn: () => api.get<NotificationDTO[]>('/notifications').then((r) => r.data),
    enabled: !!user,
    refetchInterval: 60_000,
  });

  const readMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/notifications/${id}/read`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const sent = notifQ.data?.filter((n) => n.sentAt) ?? [];
  const unread = sent.filter((n) => !n.read).length;

  const LABELS: Record<string, string> = {
    job_followup_1d: 'Follow up — 1 day',
    job_followup_3d: 'Follow up — 3 days',
    job_followup_5d: 'Follow up — 5 days',
    game_invite: 'Game invite',
    friend_request: 'Friend request',
  };

  return (
    <header {...stylex.props(styles.bar)}>
      <span {...stylex.props(styles.logo)}>Orbit</span>

      {user && (
        <button {...stylex.props(styles.bell)} onClick={() => setOpen((o) => !o)}>
          🔔
          {unread > 0 && <span {...stylex.props(styles.badge)}>{unread}</span>}
        </button>
      )}

      {open && (
        <>
          <div {...stylex.props(styles.overlay)} onClick={() => setOpen(false)} />
          <div {...stylex.props(styles.dropdown)}>
            <p {...stylex.props(styles.dropTitle)}>Notifications</p>
            {sent.length === 0 && (
              <p {...stylex.props(styles.empty)}>No notifications yet.</p>
            )}
            {sent.slice(0, 20).map((n) => (
              <div
                key={n.id}
                {...stylex.props(styles.item, !n.read && styles.itemUnread)}
                onClick={() => { if (!n.read) readMutation.mutate(n.id); setOpen(false); }}
              >
                <p {...stylex.props(styles.itemTitle)}>{LABELS[n.type] ?? n.type}</p>
                <p {...stylex.props(styles.itemTime)}>
                  {new Date(n.scheduledFor).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        </>
      )}
    </header>
  );
}

const styles = stylex.create({
  bar: {
    position: 'fixed',
    top: 0,
    left: '50%',
    transform: 'translateX(-50%)',
    width: '100%',
    maxWidth: '480px',
    height: 'var(--nav-height)',
    display: 'flex',
    alignItems: 'center',
    paddingLeft: spacing.s4,
    paddingRight: spacing.s4,
    backgroundColor: colors.bg,
    borderBottom: `1px solid ${colors.border}`,
    zIndex: 100,
    justifyContent: 'space-between',
  },
  logo: {
    fontSize: font.xl,
    fontWeight: 700,
    color: colors.accent,
    letterSpacing: '-0.5px',
  },
  bell: {
    position: 'relative',
    background: 'none',
    border: 'none',
    fontSize: '20px',
    cursor: 'pointer',
    padding: spacing.s1,
    lineHeight: 1,
  },
  badge: {
    position: 'absolute',
    top: '-2px',
    right: '-4px',
    backgroundColor: colors.danger,
    color: colors.fgOnAccent,
    fontSize: '10px',
    fontWeight: 700,
    borderRadius: radii.full,
    minWidth: '16px',
    height: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0 3px',
  },
  overlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 149,
  },
  dropdown: {
    position: 'absolute',
    top: 'calc(var(--nav-height) - 4px)',
    right: spacing.s2,
    width: '300px',
    backgroundColor: colors.bg,
    border: `1px solid ${colors.border}`,
    borderRadius: radii.lg,
    boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
    zIndex: 150,
    maxHeight: '400px',
    overflowY: 'auto',
  },
  dropTitle: {
    fontSize: font.sm,
    fontWeight: 700,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    padding: `${spacing.s3} ${spacing.s4}`,
    borderBottom: `1px solid ${colors.border}`,
  },
  empty: { fontSize: font.sm, color: colors.textSecondary, padding: spacing.s4, textAlign: 'center' },
  item: {
    padding: `${spacing.s3} ${spacing.s4}`,
    cursor: 'pointer',
    borderBottom: `1px solid ${colors.border}`,
  },
  itemUnread: { backgroundColor: colors.surfaceRaised },
  itemTitle: { fontSize: font.sm, color: colors.textPrimary, fontWeight: 500 },
  itemTime: { fontSize: font.xs, color: colors.textSecondary, marginTop: spacing.s1 },
});
