import * as stylex from '@stylexjs/stylex';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api.js';
import { useAuthStore } from '../features/auth/authStore.js';
import { colors, font, radii, spacing } from '../styles/tokens.stylex.js';
import type { NotificationDTO } from '@orbit/shared';

const NOTIF_META: Record<string, { label: string; glyph: string }> = {
  job_followup_1d: { label: 'Follow up — 1 day',  glyph: '✦' },
  job_followup_3d: { label: 'Follow up — 3 days', glyph: '✦' },
  job_followup_5d: { label: 'Follow up — 5 days', glyph: '✦' },
  game_invite:     { label: 'Game invite',        glyph: '◉' },
  friend_request:  { label: 'Friend request',     glyph: '✿' },
};

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.round(diffMs / 60_000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min} min ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 7) return `${day}d ago`;
  return new Date(iso).toLocaleDateString();
}

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

  return (
    <>
      <header {...stylex.props(styles.bar)}>
        <div {...stylex.props(styles.logoWrap)}>
          <span {...stylex.props(styles.mark)}>
            <span {...stylex.props(styles.markDot)} />
          </span>
          <span {...stylex.props(styles.logo)}>orbit</span>
        </div>

        {user && (
          <button
            {...stylex.props(styles.bell)}
            onClick={() => setOpen(true)}
            aria-label="Notifications"
          >
            <span {...stylex.props(styles.bellGlyph)}>◔</span>
            {unread > 0 && <span {...stylex.props(styles.badge)}>{unread}</span>}
          </button>
        )}
      </header>

      {open && (
        <div {...stylex.props(styles.overlay)} onClick={() => setOpen(false)}>
          <div {...stylex.props(styles.drawer)} onClick={(e) => e.stopPropagation()}>
            <div {...stylex.props(styles.grip)} />
            <div {...stylex.props(styles.drawerHeader)}>
              <h3 {...stylex.props(styles.drawerTitle)}>Notifications</h3>
              <button
                onClick={() => setOpen(false)}
                {...stylex.props(styles.closeBtn)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div {...stylex.props(styles.body)}>
              {sent.length === 0 && (
                <p {...stylex.props(styles.empty)}>No notifications yet.</p>
              )}
              {sent.slice(0, 30).map((n) => {
                const meta = NOTIF_META[n.type] ?? { label: n.type, glyph: '·' };
                const time = n.sentAt ? timeAgo(n.sentAt) : '';
                return (
                  <button
                    key={n.id}
                    {...stylex.props(styles.item, !n.read && styles.itemUnread)}
                    onClick={() => {
                      if (!n.read) readMutation.mutate(n.id);
                      setOpen(false);
                    }}
                  >
                    <span {...stylex.props(styles.itemGlyph)}>{meta.glyph}</span>
                    <span {...stylex.props(styles.itemBody)}>
                      <span {...stylex.props(styles.itemTitle)}>{meta.label}</span>
                      <span {...stylex.props(styles.itemTime)}>{time}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
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
    paddingLeft: spacing.s5,
    paddingRight: spacing.s4,
    backgroundColor: colors.bg,
    zIndex: 100,
    justifyContent: 'space-between',
  },
  logoWrap: { display: 'flex', alignItems: 'center', gap: spacing.s3 },
  mark: {
    width: '26px',
    height: '26px',
    borderRadius: radii.full,
    backgroundColor: colors.accent,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  markDot: {
    width: '8px',
    height: '8px',
    borderRadius: radii.full,
    backgroundColor: colors.bg,
  },
  logo: {
    fontFamily: font.display,
    fontSize: font.xl,
    fontWeight: 600,
    fontStyle: 'italic',
    color: colors.textPrimary,
    letterSpacing: '-0.02em',
    lineHeight: 1,
  },
  bell: {
    position: 'relative',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    width: '38px',
    height: '38px',
    borderRadius: radii.full,
    color: colors.textSecondary,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background 0.15s, color 0.15s',
    ':hover': { backgroundColor: colors.surface, color: colors.textPrimary },
  },
  bellGlyph: { fontSize: '18px', lineHeight: 1 },
  badge: {
    position: 'absolute',
    top: '4px',
    right: '4px',
    backgroundColor: colors.accent,
    color: colors.fgOnAccent,
    fontSize: '10px',
    fontWeight: 700,
    borderRadius: radii.full,
    minWidth: '16px',
    height: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0 4px',
  },

  // Drawer
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(8, 16, 12, 0.6)',
    backdropFilter: 'blur(4px)',
    zIndex: 200,
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  drawer: {
    width: '100%',
    maxWidth: '480px',
    backgroundColor: colors.surface,
    borderRadius: '28px 28px 0 0',
    display: 'flex',
    flexDirection: 'column',
    maxHeight: '92dvh',
    overflowY: 'auto',
    paddingBottom: spacing.s5,
  },
  grip: {
    width: '36px',
    height: '4px',
    borderRadius: '2px',
    backgroundColor: colors.border,
    margin: `${spacing.s2} auto 0`,
  },
  drawerHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: `${spacing.s3} ${spacing.s5} ${spacing.s2}`,
  },
  drawerTitle: {
    fontFamily: font.display,
    fontSize: font.xl,
    fontWeight: 600,
    color: colors.textPrimary,
    letterSpacing: '-0.02em',
    margin: 0,
  },
  closeBtn: {
    background: colors.surface2,
    border: 'none',
    color: colors.textSecondary,
    fontSize: font.sm,
    cursor: 'pointer',
    width: '32px',
    height: '32px',
    borderRadius: radii.full,
  },
  body: {
    padding: `0 ${spacing.s5}`,
  },
  empty: {
    fontSize: font.sm,
    color: colors.textSecondary,
    padding: spacing.s8,
    textAlign: 'center',
  },
  item: {
    display: 'flex',
    gap: spacing.s3,
    padding: `${spacing.s3} 0`,
    background: 'transparent',
    border: 'none',
    borderBottom: `1px solid ${colors.borderSoft}`,
    width: '100%',
    textAlign: 'left',
    cursor: 'pointer',
    alignItems: 'center',
  },
  itemUnread: {},
  itemGlyph: {
    width: '38px',
    height: '38px',
    minWidth: '38px',
    borderRadius: radii.full,
    backgroundColor: colors.surface2,
    color: colors.accentBright,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px',
    flexShrink: 0,
  },
  itemBody: { flex: 1, display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 },
  itemTitle: { fontSize: font.sm, color: colors.textPrimary, fontWeight: 500 },
  itemTime: { fontSize: font.xs, color: colors.textSecondary },
});
