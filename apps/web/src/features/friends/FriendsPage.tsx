import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api.js';
import { avatarColor } from '../../lib/avatarColor.js';
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
    <div className="flex flex-col pb-8">
      <StationHead
        eyebrow="People"
        title="Your circle"
        sub={`${friendCount} ${friendCount === 1 ? 'friend' : 'friends'} · ${pendingCount} pending`}
      />

      {/* Add friend card */}
      <div className="py-2 px-4">
        <article className="bg-surface rounded-lg p-5 flex flex-col gap-2">
          <h2 className="font-display text-lg font-semibold text-fg m-0" style={{ letterSpacing: '-0.01em' }}>Add a friend</h2>
          <p className="text-sm text-fg-muted m-0 mb-2">
            Type their friend code — they'll get a request.
          </p>
          <div className="flex gap-2">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))}
              placeholder="ABC123"
              maxLength={6}
              className="flex-1 py-3 px-4 bg-surface-2 border-none rounded-md text-fg text-lg font-semibold outline-none text-center uppercase"
              style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.18em' }}
            />
            <button
              onClick={() => addMutation.mutate({ friendCode: code })}
              disabled={code.length < 6 || addMutation.isPending}
              className="py-2 px-5 bg-accent text-on-accent border-none rounded-full text-sm font-semibold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {addMutation.isPending ? '…' : 'Send'}
            </button>
          </div>
          {addMutation.isError && (
            <p className="text-sm text-danger mt-2">{errorMsg ?? 'Something went wrong'}</p>
          )}
          {flash && <p className="text-sm text-accent-bright font-medium mt-2">✓ {flash}</p>}
        </article>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 py-2 px-4 pb-3">
        <button
          onClick={() => setTab('friends')}
          className={`py-2 px-4 border-none text-sm font-medium rounded-full flex items-center gap-1.5 cursor-pointer ${tab === 'friends' ? 'bg-surface text-fg' : 'bg-transparent text-fg-muted'}`}
        >
          Friends
          <span className={`text-[11px] px-1.5 py-px rounded-full font-semibold ${tab === 'friends' ? 'bg-accent text-on-accent' : 'bg-surface-2 text-fg-muted'}`} style={{ padding: '1px 7px' }}>
            {friendCount}
          </span>
        </button>
        <button
          onClick={() => setTab('requests')}
          className={`py-2 px-4 border-none text-sm font-medium rounded-full flex items-center gap-1.5 cursor-pointer ${tab === 'requests' ? 'bg-surface text-fg' : 'bg-transparent text-fg-muted'}`}
        >
          Pending
          <span className={`text-[11px] px-1.5 py-px rounded-full font-semibold ${tab === 'requests' ? 'bg-accent text-on-accent' : 'bg-surface-2 text-fg-muted'}`} style={{ padding: '1px 7px' }}>
            {pendingCount}
          </span>
        </button>
      </div>

      {/* Friends list */}
      {tab === 'friends' && (
        <div className="flex flex-col gap-2 px-4">
          {friendsQ.isLoading && <p className="text-fg-muted text-sm text-center p-6">Loading…</p>}
          {!friendsQ.isLoading && friendCount === 0 && (
            <div className="text-center py-8 px-5 text-fg-muted flex flex-col gap-1">
              <span className="text-[32px] mb-2">✿</span>
              <span className="font-display text-lg font-semibold text-fg">No friends yet</span>
              <span className="text-sm text-fg-muted">
                Share your code or add one above to start your circle.
              </span>
            </div>
          )}
          {friendsQ.data?.map((f) => <FriendRow key={f.id} friend={f} />)}
        </div>
      )}

      {/* Requests list */}
      {tab === 'requests' && (
        <div className="flex flex-col gap-2 px-4">
          {requestsQ.isLoading && <p className="text-fg-muted text-sm text-center p-6">Loading…</p>}
          {!requestsQ.isLoading && pendingCount === 0 && (
            <div className="text-center py-8 px-5 text-fg-muted flex flex-col gap-1">
              <span className="text-[32px] mb-2">♡</span>
              <span className="font-display text-lg font-semibold text-fg">No pending requests</span>
            </div>
          )}
          {requestsQ.data?.map((f) => (
            <article key={f.id} className="flex items-center gap-3 p-3 bg-surface rounded-md">
              <Avatar name={f.user.name} avatar={f.user.avatar} seed={f.user.id} />
              <div className="flex-1 flex flex-col gap-0.5 min-w-0">
                <span className="text-base font-semibold text-fg">{f.user.name}</span>
                <span className="text-xs text-fg-muted" style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.08em' }}>wants to be friends</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => respondMutation.mutate({ id: f.id, action: 'accept' })}
                  disabled={respondMutation.isPending}
                  className="py-2 px-4 bg-accent text-on-accent border-none rounded-full text-sm font-semibold cursor-pointer disabled:opacity-40"
                >
                  Accept
                </button>
                <button
                  onClick={() => respondMutation.mutate({ id: f.id, action: 'decline' })}
                  disabled={respondMutation.isPending}
                  className="py-2 px-4 bg-transparent text-fg-muted border-none rounded-full text-sm font-medium cursor-pointer hover:text-danger"
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
    <article className="flex items-center gap-3 p-3 bg-surface rounded-md">
      <Avatar name={friend.user.name} avatar={friend.user.avatar} seed={friend.user.id} />
      <div className="flex-1 flex flex-col gap-0.5 min-w-0">
        <span className="text-base font-semibold text-fg">{friend.user.name}</span>
        <span className="text-xs text-fg-muted" style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.08em' }}>{friend.user.friendCode}</span>
      </div>
    </article>
  );
}
