import { useEffect, useState } from 'react';
import * as stylex from '@stylexjs/stylex';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api.js';
import { avatarColor } from '../../lib/avatarColor.js';
import { colors, font, radii, spacing } from '../../styles/tokens.stylex.js';
import { StationHead } from '../../components/StationHead.js';
import type { AddFriendBody, FriendDTO } from '@orbit/shared';

type Tab = 'friends' | 'requests';

export function FriendsPage() {
  const [tab, setTab] = useState<Tab>('friends');
  const [code, setCode] = useState('');
  const [flash, setFlash] = useState<string | null>(null);
  const qc = useQueryClient();

  const friendsQ = useQuery<FriendDTO[]>({
    queryKey: ['friends'],
    queryFn: () => api.get<FriendDTO[]>('/friends').then((r) => r.data),
  });

  const requestsQ = useQuery<FriendDTO[]>({
    queryKey: ['friend-requests'],
    queryFn: () => api.get<FriendDTO[]>('/friends/requests').then((r) => r.data),
  });

  const addMutation = useMutation({
    mutationFn: (body: AddFriendBody) =>
      api.post<FriendDTO>('/friends/add', body).then((r) => r.data),
    onSuccess: (_, body) => {
      setFlash(`Request sent to ${body.friendCode}`);
      setCode('');
      void qc.invalidateQueries({ queryKey: ['friend-requests'] });
    },
  });

  const respondMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'accept' | 'decline' }) =>
      api.patch(`/friends/${id}/${action}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['friends'] });
      void qc.invalidateQueries({ queryKey: ['friend-requests'] });
    },
  });

  // Auto-dismiss the success flash
  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 2200);
    return () => clearTimeout(t);
  }, [flash]);

  const friendCount = friendsQ.data?.length ?? 0;
  const pendingCount = requestsQ.data?.length ?? 0;
  const errorMsg = (addMutation.error as { response?: { data?: { error?: string } } })?.response
    ?.data?.error;

  return (
    <div {...stylex.props(styles.page)}>
      <StationHead
        eyebrow="People"
        title="Your circle"
        sub={`${friendCount} ${friendCount === 1 ? 'friend' : 'friends'} · ${pendingCount} pending`}
      />

      {/* Add friend card */}
      <div {...stylex.props(styles.section)}>
        <article {...stylex.props(styles.addCard)}>
          <h2 {...stylex.props(styles.addTitle)}>Add a friend</h2>
          <p {...stylex.props(styles.addHint)}>
            Type their friend code — they'll get a request.
          </p>
          <div {...stylex.props(styles.addRow)}>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))}
              placeholder="ABC123"
              maxLength={6}
              {...stylex.props(styles.input)}
            />
            <button
              onClick={() => addMutation.mutate({ friendCode: code })}
              disabled={code.length < 6 || addMutation.isPending}
              {...stylex.props(styles.sendBtn)}
            >
              {addMutation.isPending ? '…' : 'Send'}
            </button>
          </div>
          {addMutation.isError && (
            <p {...stylex.props(styles.errorMsg)}>{errorMsg ?? 'Something went wrong'}</p>
          )}
          {flash && <p {...stylex.props(styles.flashMsg)}>✓ {flash}</p>}
        </article>
      </div>

      {/* Tabs */}
      <div {...stylex.props(styles.tabs)}>
        <button
          onClick={() => setTab('friends')}
          {...stylex.props(styles.tab, tab === 'friends' && styles.tabActive)}
        >
          Friends
          <span {...stylex.props(styles.count, tab === 'friends' && styles.countActive)}>
            {friendCount}
          </span>
        </button>
        <button
          onClick={() => setTab('requests')}
          {...stylex.props(styles.tab, tab === 'requests' && styles.tabActive)}
        >
          Pending
          <span {...stylex.props(styles.count, tab === 'requests' && styles.countActive)}>
            {pendingCount}
          </span>
        </button>
      </div>

      {/* Friends list */}
      {tab === 'friends' && (
        <div {...stylex.props(styles.list)}>
          {friendsQ.isLoading && <p {...stylex.props(styles.muted)}>Loading…</p>}
          {!friendsQ.isLoading && friendCount === 0 && (
            <div {...stylex.props(styles.empty)}>
              <span {...stylex.props(styles.emptyGlyph)}>✿</span>
              <span {...stylex.props(styles.emptyTitle)}>No friends yet</span>
              <span {...stylex.props(styles.emptySub)}>
                Share your code or add one above to start your circle.
              </span>
            </div>
          )}
          {friendsQ.data?.map((f) => <FriendRow key={f.id} friend={f} />)}
        </div>
      )}

      {/* Requests list */}
      {tab === 'requests' && (
        <div {...stylex.props(styles.list)}>
          {requestsQ.isLoading && <p {...stylex.props(styles.muted)}>Loading…</p>}
          {!requestsQ.isLoading && pendingCount === 0 && (
            <div {...stylex.props(styles.empty)}>
              <span {...stylex.props(styles.emptyGlyph)}>♡</span>
              <span {...stylex.props(styles.emptyTitle)}>No pending requests</span>
            </div>
          )}
          {requestsQ.data?.map((f) => (
            <article key={f.id} {...stylex.props(styles.row)}>
              <Avatar name={f.user.name} avatar={f.user.avatar} seed={f.user.id} />
              <div {...stylex.props(styles.rowInfo)}>
                <span {...stylex.props(styles.rowName)}>{f.user.name}</span>
                <span {...stylex.props(styles.rowCode)}>wants to be friends</span>
              </div>
              <div {...stylex.props(styles.rowActions)}>
                <button
                  onClick={() => respondMutation.mutate({ id: f.id, action: 'accept' })}
                  disabled={respondMutation.isPending}
                  {...stylex.props(styles.acceptBtn)}
                >
                  Accept
                </button>
                <button
                  onClick={() => respondMutation.mutate({ id: f.id, action: 'decline' })}
                  disabled={respondMutation.isPending}
                  {...stylex.props(styles.declineBtn)}
                >
                  Decline
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function Avatar({
  name,
  avatar,
  seed,
  size = 40,
}: {
  name: string;
  avatar: string | null;
  seed: string;
  size?: number;
}) {
  if (avatar) {
    return (
      <img
        src={avatar}
        alt={name}
        style={{
          width: size,
          height: size,
          borderRadius: 9999,
          objectFit: 'cover',
          flexShrink: 0,
        }}
      />
    );
  }
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 9999,
        backgroundColor: avatarColor(seed),
        color: '#0c1411',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: Math.round(size * 0.42),
        fontWeight: 700,
        fontFamily: 'var(--font-display)',
        flexShrink: 0,
      }}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

function FriendRow({ friend }: { friend: FriendDTO }) {
  return (
    <article {...stylex.props(styles.row)}>
      <Avatar name={friend.user.name} avatar={friend.user.avatar} seed={friend.user.id} />
      <div {...stylex.props(styles.rowInfo)}>
        <span {...stylex.props(styles.rowName)}>{friend.user.name}</span>
        <span {...stylex.props(styles.rowCode)}>{friend.user.friendCode}</span>
      </div>
    </article>
  );
}

const styles = stylex.create({
  page: {
    display: 'flex',
    flexDirection: 'column',
    paddingBottom: spacing.s8,
  },
  section: {
    padding: `${spacing.s2} ${spacing.s4}`,
  },
  addCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.s5,
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.s2,
  },
  addTitle: {
    fontFamily: font.display,
    fontSize: font.lg,
    fontWeight: 600,
    color: colors.textPrimary,
    margin: 0,
    letterSpacing: '-0.01em',
  },
  addHint: {
    fontSize: font.sm,
    color: colors.textSecondary,
    margin: 0,
    marginBottom: spacing.s2,
  },
  addRow: {
    display: 'flex',
    gap: spacing.s2,
  },
  input: {
    flex: 1,
    padding: `${spacing.s3} ${spacing.s4}`,
    backgroundColor: colors.surface2,
    border: 'none',
    borderRadius: radii.md,
    color: colors.textPrimary,
    fontSize: font.lg,
    fontFamily: font.mono,
    fontWeight: 600,
    letterSpacing: '0.18em',
    textAlign: 'center',
    textTransform: 'uppercase',
    outline: 'none',
  },
  sendBtn: {
    padding: `${spacing.s2} ${spacing.s5}`,
    backgroundColor: colors.accent,
    color: colors.fgOnAccent,
    border: 'none',
    borderRadius: radii.full,
    fontSize: font.sm,
    fontWeight: 600,
    cursor: 'pointer',
    ':disabled': { opacity: 0.4, cursor: 'not-allowed' },
  },
  errorMsg: {
    fontSize: font.sm,
    color: colors.danger,
    marginTop: spacing.s2,
  },
  flashMsg: {
    fontSize: font.sm,
    color: colors.accentBright,
    fontWeight: 500,
    marginTop: spacing.s2,
  },
  tabs: {
    display: 'flex',
    gap: '6px',
    padding: `${spacing.s2} ${spacing.s4} ${spacing.s3}`,
  },
  tab: {
    padding: `${spacing.s2} ${spacing.s4}`,
    border: 'none',
    background: 'transparent',
    color: colors.textSecondary,
    fontSize: font.sm,
    fontWeight: 500,
    borderRadius: radii.full,
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    cursor: 'pointer',
  },
  tabActive: {
    backgroundColor: colors.surface,
    color: colors.textPrimary,
  },
  count: {
    fontSize: '11px',
    backgroundColor: colors.surface2,
    color: colors.textSecondary,
    padding: '1px 7px',
    borderRadius: radii.full,
    fontWeight: 600,
  },
  countActive: {
    backgroundColor: colors.accent,
    color: colors.fgOnAccent,
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.s2,
    padding: `0 ${spacing.s4}`,
  },
  muted: {
    color: colors.textSecondary,
    fontSize: font.sm,
    textAlign: 'center',
    padding: spacing.s6,
  },
  empty: {
    textAlign: 'center',
    padding: `${spacing.s8} ${spacing.s5}`,
    color: colors.textSecondary,
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.s1,
  },
  emptyGlyph: {
    fontSize: '32px',
    marginBottom: spacing.s2,
  },
  emptyTitle: {
    fontFamily: font.display,
    fontSize: font.lg,
    fontWeight: 600,
    color: colors.textPrimary,
  },
  emptySub: {
    fontSize: font.sm,
    color: colors.textSecondary,
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.s3,
    padding: spacing.s3,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
  },
  rowInfo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    minWidth: 0,
  },
  rowName: {
    fontSize: font.md,
    fontWeight: 600,
    color: colors.textPrimary,
  },
  rowCode: {
    fontSize: font.xs,
    color: colors.textSecondary,
    fontFamily: font.mono,
    letterSpacing: '0.08em',
  },
  rowActions: {
    display: 'flex',
    gap: spacing.s2,
  },
  acceptBtn: {
    padding: `${spacing.s2} ${spacing.s4}`,
    backgroundColor: colors.accent,
    color: colors.fgOnAccent,
    border: 'none',
    borderRadius: radii.full,
    fontSize: font.sm,
    fontWeight: 600,
    cursor: 'pointer',
    ':disabled': { opacity: 0.4 },
  },
  declineBtn: {
    padding: `${spacing.s2} ${spacing.s4}`,
    backgroundColor: 'transparent',
    color: colors.textSecondary,
    border: 'none',
    borderRadius: radii.full,
    fontSize: font.sm,
    fontWeight: 500,
    cursor: 'pointer',
    ':hover': { color: colors.danger },
  },
});
