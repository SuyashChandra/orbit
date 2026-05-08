import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router';
import { api } from '../../lib/api.js';
import { useAuthStore } from '../auth/authStore.js';
import type { BadmintonGameDTO, FriendDTO } from '@orbit/shared';
import { GAME_STATUS } from '@orbit/shared';

const STATUS_COLORS: Record<string, string> = {
  upcoming: '#6c63ff',
  ongoing: '#f59e0b',
  completed: '#10b981',
  cancelled: '#6b7280',
};

const PARTICIPANT_STATUS_COLORS: Record<string, string> = {
  invited: '#f59e0b',
  accepted: '#10b981',
  declined: '#ef4444',
};

export function GameDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [showInvite, setShowInvite] = useState(false);
  const [copied, setCopied] = useState(false);

  const gameQ = useQuery<BadmintonGameDTO>({
    queryKey: ['game', id],
    queryFn: () => api.get<BadmintonGameDTO>(`/games/${id}`).then((r) => r.data),
  });

  const friendsQ = useQuery<FriendDTO[]>({
    queryKey: ['friends'],
    queryFn: () => api.get<FriendDTO[]>('/friends').then((r) => r.data),
    enabled: showInvite,
  });

  const updateMutation = useMutation({
    mutationFn: (body: { status?: string; location?: string; notes?: string }) =>
      api.patch<BadmintonGameDTO>(`/games/${id}`, body).then((r) => r.data),
    onSuccess: (updated) => {
      qc.setQueryData(['game', id], updated);
      void qc.invalidateQueries({ queryKey: ['games'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/games/${id}`),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['games'] }); navigate('/badminton'); },
  });

  const inviteMutation = useMutation({
    mutationFn: (userId: string) =>
      api.post<BadmintonGameDTO>(`/games/${id}/invite`, { userId }).then((r) => r.data),
    onSuccess: (updated) => {
      qc.setQueryData(['game', id], updated);
      setShowInvite(false);
    },
  });

  const respondMutation = useMutation({
    mutationFn: (status: 'accepted' | 'declined') =>
      api.patch<BadmintonGameDTO>(`/games/${id}/participants/${user!.id}/respond`, { status }).then((r) => r.data),
    onSuccess: (updated) => {
      qc.setQueryData(['game', id], updated);
      void qc.invalidateQueries({ queryKey: ['games'] });
    },
  });

  const copyLink = () => {
    navigator.clipboard.writeText(`${import.meta.env['VITE_API_URL']?.replace('/api', '') || window.location.origin}/games/${id}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const game = gameQ.data;
  if (gameQ.isLoading) return <div className="flex flex-col gap-4 p-4 pb-12"><p className="text-fg-muted text-sm text-center pt-4">Loading…</p></div>;
  if (!game) return <div className="flex flex-col gap-4 p-4 pb-12"><p className="text-fg-muted text-sm text-center pt-4">Game not found.</p></div>;

  const isCreator = game.creator.id === user?.id;
  const myParticipation = game.participants.find((p) => p.userId === user?.id);
  const invitedIds = new Set(game.participants.map((p) => p.userId));
  const invitableFriends = friendsQ.data?.filter((f) => !invitedIds.has(f.user.id) && f.user.id !== game.creator.id) ?? [];

  const scheduledAt = new Date(game.scheduledAt);

  return (
    <div className="flex flex-col gap-4 p-4 pb-12">
      {/* Header */}
      <div className="flex justify-between items-center">
        <button onClick={() => navigate('/badminton')} className="bg-transparent border-none text-accent text-base cursor-pointer p-0">← Back</button>
        {isCreator && (
          <button
            onClick={() => { if (confirm('Delete this game?')) deleteMutation.mutate(); }}
            className="bg-transparent border-none text-danger text-sm cursor-pointer"
          >
            Delete
          </button>
        )}
      </div>

      {/* Date */}
      <div className="flex flex-col gap-1">
        <p className="text-[1.75rem] font-extrabold text-fg leading-[1.2]">
          {scheduledAt.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
        <p className="text-lg text-fg-muted">
          {scheduledAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>

      {/* Status */}
      <div className="flex flex-col gap-2">
        <span
          className="inline-block w-fit py-1 px-3 rounded-full text-sm font-semibold capitalize"
          style={{ color: STATUS_COLORS[game.status], backgroundColor: STATUS_COLORS[game.status] + '22' }}
        >
          {game.status}
        </span>
        {isCreator && (
          <div className="flex flex-wrap gap-2">
            {GAME_STATUS.map((s) => (
              <button
                key={s}
                onClick={() => updateMutation.mutate({ status: s })}
                className={`py-1 px-3 border rounded-full bg-transparent text-fg-muted text-xs cursor-pointer capitalize ${game.status === s ? 'font-bold' : ''}`}
                style={game.status === s ? { borderColor: STATUS_COLORS[s], color: STATUS_COLORS[s] } : { borderColor: 'var(--color-border)' }}
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Location */}
      {game.location && (
        <div className="flex gap-2 items-start">
          <span className="text-base shrink-0 mt-0.5">📍</span>
          <p className="text-base text-fg flex-1">{game.location}</p>
        </div>
      )}

      {/* Notes */}
      {game.notes && (
        <div className="flex gap-2 items-start">
          <span className="text-base shrink-0 mt-0.5">📝</span>
          <p className="text-base text-fg flex-1">{game.notes}</p>
        </div>
      )}

      {/* Copy link */}
      <button
        onClick={copyLink}
        className="py-3 px-4 bg-surface border border-border rounded-md text-fg text-base cursor-pointer text-left"
      >
        {copied ? '✓ Link copied!' : '🔗 Copy game link'}
      </button>

      {/* My invite response */}
      {myParticipation && myParticipation.status === 'invited' && (
        <div className="bg-surface border border-accent rounded-lg p-4 flex flex-col gap-3">
          <p className="text-base text-fg font-semibold">You've been invited to this game</p>
          <div className="flex gap-2">
            <button
              onClick={() => respondMutation.mutate('accepted')}
              disabled={respondMutation.isPending}
              className="flex-1 p-3 border-none rounded-md text-on-accent text-base font-semibold cursor-pointer"
              style={{ backgroundColor: '#10b981' }}
            >
              Accept
            </button>
            <button
              onClick={() => respondMutation.mutate('declined')}
              disabled={respondMutation.isPending}
              className="flex-1 p-3 bg-transparent border border-danger rounded-md text-danger text-base font-semibold cursor-pointer"
            >
              Decline
            </button>
          </div>
        </div>
      )}

      {/* Participants */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <p className="text-xs text-fg-muted uppercase" style={{ letterSpacing: '0.08em' }}>Players</p>
          {isCreator && (
            <button onClick={() => setShowInvite(true)} className="bg-transparent border-none text-accent text-sm cursor-pointer">
              + Invite
            </button>
          )}
        </div>

        {/* Creator */}
        <div className="flex items-center gap-3 py-2 border-b border-border">
          <Avatar name={game.creator.name} avatar={game.creator.avatar} />
          <div className="flex-1">
            <p className="text-base font-semibold text-fg">{game.creator.name}</p>
            <p className="text-xs text-fg-muted">Organiser</p>
          </div>
          <span className="text-xs font-semibold rounded-full capitalize px-2 py-0.5" style={{ color: '#10b981', backgroundColor: '#10b98122' }}>
            Going
          </span>
        </div>

        {game.participants.map((p) => (
          <div key={p.userId} className="flex items-center gap-3 py-2 border-b border-border">
            <Avatar name={p.name} avatar={p.avatar} />
            <p className="text-base font-semibold text-fg">{p.name}</p>
            <span
              className="text-xs font-semibold rounded-full capitalize px-2 py-0.5"
              style={{
                color: PARTICIPANT_STATUS_COLORS[p.status],
                backgroundColor: PARTICIPANT_STATUS_COLORS[p.status] + '22',
              }}
            >
              {p.status}
            </span>
          </div>
        ))}

        {game.participants.length === 0 && (
          <p className="text-fg-muted text-sm text-center pt-4">No invites sent yet.</p>
        )}
      </div>

      {/* Invite drawer */}
      {showInvite && (
        <div
          className="fixed inset-0 z-[200] flex items-end"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={() => setShowInvite(false)}
        >
          <div
            className="w-full max-w-[480px] mx-auto bg-bg p-4 flex flex-col gap-3 max-h-[70dvh] overflow-y-auto"
            style={{ borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0' }}
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-lg font-bold text-fg">Invite a Friend</p>
            {friendsQ.isLoading && <p className="text-fg-muted text-sm text-center pt-4">Loading…</p>}
            {invitableFriends.length === 0 && !friendsQ.isLoading && (
              <p className="text-fg-muted text-sm text-center pt-4">No friends available to invite.</p>
            )}
            {invitableFriends.map((f) => (
              <button
                key={f.user.id}
                onClick={() => inviteMutation.mutate(f.user.id)}
                disabled={inviteMutation.isPending}
                className="flex items-center gap-3 py-3 bg-transparent border-none border-b border-border cursor-pointer w-full"
              >
                <Avatar name={f.user.name} avatar={f.user.avatar} />
                <p className="text-base text-fg font-medium">{f.user.name}</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Avatar({ name, avatar }: { name: string; avatar: string | null }) {
  return avatar ? (
    <img src={avatar} alt={name} className="w-9 h-9 rounded-full object-cover shrink-0" />
  ) : (
    <div className="w-9 h-9 rounded-full bg-accent text-on-accent flex items-center justify-center text-sm font-bold shrink-0">
      {name.charAt(0).toUpperCase()}
    </div>
  );
}
