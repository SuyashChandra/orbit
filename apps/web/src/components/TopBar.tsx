import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api.js';
import { useAuthStore } from '../features/auth/authStore.js';
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
      <header className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] h-[var(--nav-height)] flex items-center pl-5 pr-4 bg-bg z-[100] justify-between">
        <div className="flex items-center gap-3">
          <span className="w-[26px] h-[26px] rounded-full bg-accent flex items-center justify-center">
            <span className="w-2 h-2 rounded-full bg-bg" />
          </span>
          <span className="font-display text-xl font-semibold italic text-fg tracking-tight leading-none">orbit</span>
        </div>

        {user && (
          <button
            className="relative bg-transparent border-none cursor-pointer w-[38px] h-[38px] rounded-full text-fg-muted flex items-center justify-center transition hover:bg-surface hover:text-fg"
            onClick={() => setOpen(true)}
            aria-label="Notifications"
          >
            <span style={{ fontSize: '18px', lineHeight: 1 }}>◔</span>
            {unread > 0 && (
              <span className="absolute top-1 right-1 bg-accent text-on-accent text-[10px] font-bold rounded-full min-w-4 h-4 flex items-center justify-center px-1">
                {unread}
              </span>
            )}
          </button>
        )}
      </header>

      {open && (
        <div
          className="fixed inset-0 z-[200] flex items-end justify-center"
          style={{ backgroundColor: 'rgba(8, 16, 12, 0.6)', backdropFilter: 'blur(4px)' }}
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-[480px] bg-surface flex flex-col max-h-[92dvh] overflow-y-auto pb-5"
            style={{ borderRadius: '28px 28px 0 0' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-9 h-1 rounded-[2px] bg-border mx-auto mt-2" />
            <div className="flex items-center justify-between py-3 px-5 pb-2">
              <h3 className="font-display text-xl font-semibold text-fg tracking-tight m-0">Notifications</h3>
              <button
                onClick={() => setOpen(false)}
                className="bg-surface-2 border-none text-fg-muted text-sm cursor-pointer w-8 h-8 rounded-full"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="px-5">
              {sent.length === 0 && (
                <p className="text-sm text-fg-muted p-8 text-center">No notifications yet.</p>
              )}
              {sent.slice(0, 30).map((n) => {
                const meta = NOTIF_META[n.type] ?? { label: n.type, glyph: '·' };
                const time = n.sentAt ? timeAgo(n.sentAt) : '';
                return (
                  <button
                    key={n.id}
                    className="flex gap-3 py-3 bg-transparent border-none border-b border-border-soft w-full text-left cursor-pointer items-center"
                    onClick={() => {
                      if (!n.read) readMutation.mutate(n.id);
                      setOpen(false);
                    }}
                  >
                    <span className="w-[38px] h-[38px] min-w-[38px] rounded-full bg-surface-2 text-accent-bright flex items-center justify-center text-base shrink-0" style={{ fontSize: '16px' }}>
                      {meta.glyph}
                    </span>
                    <span className="flex-1 flex flex-col gap-0.5 min-w-0">
                      <span className="text-sm text-fg font-medium">{meta.label}</span>
                      <span className="text-xs text-fg-muted">{time}</span>
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
