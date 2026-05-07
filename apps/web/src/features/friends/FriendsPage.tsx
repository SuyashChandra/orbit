import { useState } from 'react';
import * as stylex from '@stylexjs/stylex';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api.js';
import { colors, font, radii, spacing } from '../../styles/tokens.stylex.js';
import type { AddFriendBody, FriendDTO } from '@orbit/shared';

type Tab = 'friends' | 'requests';

export function FriendsPage() {
  const [tab, setTab] = useState<Tab>('friends');
  const [code, setCode] = useState('');
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
    onSuccess: () => {
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

  const pendingCount = requestsQ.data?.length ?? 0;

  return (
    <div {...stylex.props(styles.page)}>
      {/* Add friend */}
      <div {...stylex.props(styles.addCard)}>
        <p {...stylex.props(styles.addLabel)}>Add by friend code</p>
        <div {...stylex.props(styles.addRow)}>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="ABC123"
            maxLength={6}
            {...stylex.props(styles.input)}
          />
          <button
            onClick={() => addMutation.mutate({ friendCode: code })}
            disabled={code.length < 6 || addMutation.isPending}
            {...stylex.props(styles.addBtn)}
          >
            {addMutation.isPending ? '…' : 'Add'}
          </button>
        </div>
        {addMutation.isError && (
          <p {...stylex.props(styles.error)}>
            {(addMutation.error as { response?: { data?: { error?: string } } })?.response?.data
              ?.error ?? 'Something went wrong'}
          </p>
        )}
        {addMutation.isSuccess && (
          <p {...stylex.props(styles.success)}>Request sent!</p>
        )}
      </div>

      {/* Tabs */}
      <div {...stylex.props(styles.tabs)}>
        <button
          onClick={() => setTab('friends')}
          {...stylex.props(styles.tab, tab === 'friends' && styles.tabActive)}
        >
          Friends
        </button>
        <button
          onClick={() => setTab('requests')}
          {...stylex.props(styles.tab, tab === 'requests' && styles.tabActive)}
        >
          Requests{pendingCount > 0 ? ` (${pendingCount})` : ''}
        </button>
      </div>

      {/* Friends list */}
      {tab === 'friends' && (
        <div {...stylex.props(styles.list)}>
          {friendsQ.isLoading && <p {...stylex.props(styles.muted)}>Loading…</p>}
          {friendsQ.data?.length === 0 && (
            <p {...stylex.props(styles.muted)}>No friends yet. Add one using their friend code.</p>
          )}
          {friendsQ.data?.map((f) => (
            <FriendRow key={f.id} friend={f} />
          ))}
        </div>
      )}

      {/* Requests list */}
      {tab === 'requests' && (
        <div {...stylex.props(styles.list)}>
          {requestsQ.isLoading && <p {...stylex.props(styles.muted)}>Loading…</p>}
          {requestsQ.data?.length === 0 && (
            <p {...stylex.props(styles.muted)}>No pending requests.</p>
          )}
          {requestsQ.data?.map((f) => (
            <div key={f.id} {...stylex.props(styles.requestRow)}>
              <Avatar name={f.user.name} avatar={f.user.avatar} />
              <div {...stylex.props(styles.requestInfo)}>
                <span {...stylex.props(styles.friendName)}>{f.user.name}</span>
                <span {...stylex.props(styles.friendCode)}>{f.user.friendCode}</span>
              </div>
              <div {...stylex.props(styles.requestActions)}>
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
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Avatar({ name, avatar }: { name: string; avatar: string | null }) {
  return avatar ? (
    <img src={avatar} alt={name} {...stylex.props(styles.avatar)} />
  ) : (
    <div {...stylex.props(styles.avatarFallback)}>{name.charAt(0).toUpperCase()}</div>
  );
}

function FriendRow({ friend }: { friend: FriendDTO }) {
  return (
    <div {...stylex.props(styles.friendRow)}>
      <Avatar name={friend.user.name} avatar={friend.user.avatar} />
      <div>
        <p {...stylex.props(styles.friendName)}>{friend.user.name}</p>
        <p {...stylex.props(styles.friendCode)}>{friend.user.friendCode}</p>
      </div>
    </div>
  );
}

const styles = stylex.create({
  page: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.s4,
    padding: spacing.s4,
  },
  addCard: {
    backgroundColor: colors.surface,
    border: `1px solid ${colors.border}`,
    borderRadius: radii.lg,
    padding: spacing.s4,
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.s3,
  },
  addLabel: {
    fontSize: font.sm,
    color: colors.textSecondary,
  },
  addRow: {
    display: 'flex',
    gap: spacing.s2,
  },
  input: {
    flex: 1,
    padding: `${spacing.s2} ${spacing.s3}`,
    backgroundColor: colors.bg,
    border: `1px solid ${colors.border}`,
    borderRadius: radii.md,
    color: colors.textPrimary,
    fontSize: font.md,
    fontFamily: 'monospace',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
  },
  addBtn: {
    padding: `${spacing.s2} ${spacing.s4}`,
    backgroundColor: colors.accent,
    color: colors.fgOnAccent,
    border: 'none',
    borderRadius: radii.md,
    fontSize: font.md,
    fontWeight: 600,
    cursor: 'pointer',
  },
  error: {
    fontSize: font.sm,
    color: colors.danger,
  },
  success: {
    fontSize: font.sm,
    color: colors.success,
  },
  tabs: {
    display: 'flex',
    gap: spacing.s2,
    borderBottom: `1px solid ${colors.border}`,
  },
  tab: {
    padding: `${spacing.s2} ${spacing.s4}`,
    fontSize: font.md,
    color: colors.textSecondary,
    background: 'none',
    border: 'none',
    borderBottom: '2px solid transparent',
    cursor: 'pointer',
    marginBottom: '-1px',
  },
  tabActive: {
    color: colors.accent,
    borderBottomColor: colors.accent,
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.s2,
  },
  muted: {
    color: colors.textSecondary,
    fontSize: font.sm,
    textAlign: 'center',
    paddingTop: spacing.s6,
  },
  friendRow: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.s3,
    padding: spacing.s3,
    backgroundColor: colors.surface,
    border: `1px solid ${colors.border}`,
    borderRadius: radii.md,
  },
  requestRow: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.s3,
    padding: spacing.s3,
    backgroundColor: colors.surface,
    border: `1px solid ${colors.border}`,
    borderRadius: radii.md,
  },
  requestInfo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.s1,
  },
  requestActions: {
    display: 'flex',
    gap: spacing.s2,
  },
  avatar: {
    width: '40px',
    height: '40px',
    borderRadius: radii.full,
    objectFit: 'cover',
    flexShrink: 0,
  },
  avatarFallback: {
    width: '40px',
    height: '40px',
    borderRadius: radii.full,
    backgroundColor: colors.accent,
    color: colors.fgOnAccent,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: font.md,
    fontWeight: 700,
    flexShrink: 0,
  },
  friendName: {
    fontSize: font.md,
    fontWeight: 600,
    color: colors.textPrimary,
  },
  friendCode: {
    fontSize: font.xs,
    color: colors.textSecondary,
    fontFamily: 'monospace',
    letterSpacing: '0.08em',
  },
  acceptBtn: {
    padding: `${spacing.s1} ${spacing.s3}`,
    backgroundColor: colors.success,
    color: colors.fgOnAccent,
    border: 'none',
    borderRadius: radii.md,
    fontSize: font.sm,
    fontWeight: 600,
    cursor: 'pointer',
  },
  declineBtn: {
    padding: `${spacing.s1} ${spacing.s3}`,
    backgroundColor: 'transparent',
    color: colors.danger,
    border: `1px solid ${colors.danger}`,
    borderRadius: radii.md,
    fontSize: font.sm,
    fontWeight: 600,
    cursor: 'pointer',
  },
});
