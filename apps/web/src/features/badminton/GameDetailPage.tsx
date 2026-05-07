import { useState } from 'react';
import * as stylex from '@stylexjs/stylex';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router';
import { api } from '../../lib/api.js';
import { useAuthStore } from '../auth/authStore.js';
import { colors, font, radii, spacing } from '../../styles/tokens.stylex.js';
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
  if (gameQ.isLoading) return <div {...stylex.props(styles.page)}><p {...stylex.props(styles.muted)}>Loading…</p></div>;
  if (!game) return <div {...stylex.props(styles.page)}><p {...stylex.props(styles.muted)}>Game not found.</p></div>;

  const isCreator = game.creator.id === user?.id;
  const myParticipation = game.participants.find((p) => p.userId === user?.id);
  const invitedIds = new Set(game.participants.map((p) => p.userId));
  const invitableFriends = friendsQ.data?.filter((f) => !invitedIds.has(f.user.id) && f.user.id !== game.creator.id) ?? [];

  const scheduledAt = new Date(game.scheduledAt);

  return (
    <div {...stylex.props(styles.page)}>
      {/* Header */}
      <div {...stylex.props(styles.topRow)}>
        <button onClick={() => navigate('/badminton')} {...stylex.props(styles.backBtn)}>← Back</button>
        {isCreator && (
          <button
            onClick={() => { if (confirm('Delete this game?')) deleteMutation.mutate(); }}
            {...stylex.props(styles.deleteBtn)}
          >
            Delete
          </button>
        )}
      </div>

      {/* Date */}
      <div {...stylex.props(styles.dateSection)}>
        <p {...stylex.props(styles.dateMain)}>
          {scheduledAt.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
        <p {...stylex.props(styles.dateTime)}>
          {scheduledAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>

      {/* Status */}
      <div {...stylex.props(styles.statusRow)}>
        <span
          {...stylex.props(styles.statusBadge)}
          style={{ color: STATUS_COLORS[game.status], backgroundColor: STATUS_COLORS[game.status] + '22' }}
        >
          {game.status}
        </span>
        {isCreator && (
          <div {...stylex.props(styles.statusPicker)}>
            {GAME_STATUS.map((s) => (
              <button
                key={s}
                onClick={() => updateMutation.mutate({ status: s })}
                {...stylex.props(styles.statusBtn, game.status === s && styles.statusBtnActive)}
                style={game.status === s ? { borderColor: STATUS_COLORS[s], color: STATUS_COLORS[s] } : undefined}
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Location */}
      {game.location && (
        <div {...stylex.props(styles.infoRow)}>
          <span {...stylex.props(styles.infoIcon)}>📍</span>
          <p {...stylex.props(styles.infoText)}>{game.location}</p>
        </div>
      )}

      {/* Notes */}
      {game.notes && (
        <div {...stylex.props(styles.infoRow)}>
          <span {...stylex.props(styles.infoIcon)}>📝</span>
          <p {...stylex.props(styles.infoText)}>{game.notes}</p>
        </div>
      )}

      {/* Copy link */}
      <button onClick={copyLink} {...stylex.props(styles.copyBtn)}>
        {copied ? '✓ Link copied!' : '🔗 Copy game link'}
      </button>

      {/* My invite response */}
      {myParticipation && myParticipation.status === 'invited' && (
        <div {...stylex.props(styles.respondCard)}>
          <p {...stylex.props(styles.respondLabel)}>You've been invited to this game</p>
          <div {...stylex.props(styles.respondBtns)}>
            <button
              onClick={() => respondMutation.mutate('accepted')}
              disabled={respondMutation.isPending}
              {...stylex.props(styles.acceptBtn)}
            >
              Accept
            </button>
            <button
              onClick={() => respondMutation.mutate('declined')}
              disabled={respondMutation.isPending}
              {...stylex.props(styles.declineBtn)}
            >
              Decline
            </button>
          </div>
        </div>
      )}

      {/* Participants */}
      <div {...stylex.props(styles.section)}>
        <div {...stylex.props(styles.sectionHeader)}>
          <p {...stylex.props(styles.sectionLabel)}>Players</p>
          {isCreator && (
            <button onClick={() => setShowInvite(true)} {...stylex.props(styles.inviteBtn)}>
              + Invite
            </button>
          )}
        </div>

        {/* Creator */}
        <div {...stylex.props(styles.participantRow)}>
          <Avatar name={game.creator.name} avatar={game.creator.avatar} />
          <div {...stylex.props(styles.participantInfo)}>
            <p {...stylex.props(styles.participantName)}>{game.creator.name}</p>
            <p {...stylex.props(styles.participantRole)}>Organiser</p>
          </div>
          <span {...stylex.props(styles.participantBadge)} style={{ color: '#10b981', backgroundColor: '#10b98122' }}>
            Going
          </span>
        </div>

        {game.participants.map((p) => (
          <div key={p.userId} {...stylex.props(styles.participantRow)}>
            <Avatar name={p.name} avatar={p.avatar} />
            <p {...stylex.props(styles.participantName)}>{p.name}</p>
            <span
              {...stylex.props(styles.participantBadge)}
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
          <p {...stylex.props(styles.muted)}>No invites sent yet.</p>
        )}
      </div>

      {/* Invite drawer */}
      {showInvite && (
        <div {...stylex.props(styles.overlay)} onClick={() => setShowInvite(false)}>
          <div {...stylex.props(styles.drawer)} onClick={(e) => e.stopPropagation()}>
            <p {...stylex.props(styles.drawerTitle)}>Invite a Friend</p>
            {friendsQ.isLoading && <p {...stylex.props(styles.muted)}>Loading…</p>}
            {invitableFriends.length === 0 && !friendsQ.isLoading && (
              <p {...stylex.props(styles.muted)}>No friends available to invite.</p>
            )}
            {invitableFriends.map((f) => (
              <button
                key={f.user.id}
                onClick={() => inviteMutation.mutate(f.user.id)}
                disabled={inviteMutation.isPending}
                {...stylex.props(styles.friendItem)}
              >
                <Avatar name={f.user.name} avatar={f.user.avatar} />
                <p {...stylex.props(styles.friendName)}>{f.user.name}</p>
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
    <img src={avatar} alt={name} {...stylex.props(styles.avatar)} />
  ) : (
    <div {...stylex.props(styles.avatarFallback)}>{name.charAt(0).toUpperCase()}</div>
  );
}

const styles = stylex.create({
  page: { display: 'flex', flexDirection: 'column', gap: spacing.s4, padding: spacing.s4, paddingBottom: spacing.s12 },
  topRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  backBtn: { background: 'none', border: 'none', color: colors.accent, fontSize: font.md, cursor: 'pointer', padding: 0 },
  deleteBtn: { background: 'none', border: 'none', color: colors.danger, fontSize: font.sm, cursor: 'pointer' },
  dateSection: { display: 'flex', flexDirection: 'column', gap: spacing.s1 },
  dateMain: { fontSize: font.xxl, fontWeight: 800, color: colors.textPrimary, lineHeight: 1.2 },
  dateTime: { fontSize: font.lg, color: colors.textSecondary },
  statusRow: { display: 'flex', flexDirection: 'column', gap: spacing.s2 },
  statusBadge: {
    display: 'inline-block', width: 'fit-content',
    padding: `4px ${spacing.s3}`, borderRadius: radii.full,
    fontSize: font.sm, fontWeight: 600, textTransform: 'capitalize',
  },
  statusPicker: { display: 'flex', flexWrap: 'wrap', gap: spacing.s2 },
  statusBtn: {
    padding: `${spacing.s1} ${spacing.s3}`, border: `1px solid ${colors.border}`,
    borderRadius: radii.full, backgroundColor: 'transparent',
    color: colors.textSecondary, fontSize: font.xs, cursor: 'pointer', textTransform: 'capitalize',
  },
  statusBtnActive: { fontWeight: 700 },
  infoRow: { display: 'flex', gap: spacing.s2, alignItems: 'flex-start' },
  infoIcon: { fontSize: font.md, flexShrink: 0, marginTop: '2px' },
  infoText: { fontSize: font.md, color: colors.textPrimary, flex: 1 },
  copyBtn: {
    padding: `${spacing.s3} ${spacing.s4}`, backgroundColor: colors.surface,
    border: `1px solid ${colors.border}`, borderRadius: radii.md,
    color: colors.textPrimary, fontSize: font.md, cursor: 'pointer', textAlign: 'left',
  },
  respondCard: {
    backgroundColor: colors.surface, border: `1px solid ${colors.accent}`,
    borderRadius: radii.lg, padding: spacing.s4,
    display: 'flex', flexDirection: 'column', gap: spacing.s3,
  },
  respondLabel: { fontSize: font.md, color: colors.textPrimary, fontWeight: 600 },
  respondBtns: { display: 'flex', gap: spacing.s2 },
  acceptBtn: {
    flex: 1, padding: spacing.s3, backgroundColor: '#10b981',
    color: '#fff', border: 'none', borderRadius: radii.md,
    fontSize: font.md, fontWeight: 600, cursor: 'pointer',
  },
  declineBtn: {
    flex: 1, padding: spacing.s3, backgroundColor: 'transparent',
    border: `1px solid ${colors.danger}`, borderRadius: radii.md,
    color: colors.danger, fontSize: font.md, fontWeight: 600, cursor: 'pointer',
  },
  section: { display: 'flex', flexDirection: 'column', gap: spacing.s2 },
  sectionHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  sectionLabel: { fontSize: font.xs, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: '0.08em' },
  inviteBtn: { background: 'none', border: 'none', color: colors.accent, fontSize: font.sm, cursor: 'pointer' },
  participantRow: {
    display: 'flex', alignItems: 'center', gap: spacing.s3,
    padding: `${spacing.s2} 0`,
    borderBottom: `1px solid ${colors.border}`,
  },
  participantInfo: { flex: 1 },
  participantName: { fontSize: font.md, fontWeight: 600, color: colors.textPrimary },
  participantRole: { fontSize: font.xs, color: colors.textSecondary },
  participantBadge: {
    fontSize: font.xs, fontWeight: 600, borderRadius: radii.full,
    padding: `2px ${spacing.s2}`, textTransform: 'capitalize',
  },
  avatar: { width: '36px', height: '36px', borderRadius: radii.full, objectFit: 'cover', flexShrink: 0 },
  avatarFallback: {
    width: '36px', height: '36px', borderRadius: radii.full,
    backgroundColor: colors.accent, color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: font.sm, fontWeight: 700, flexShrink: 0,
  },
  muted: { color: colors.textSecondary, fontSize: font.sm, textAlign: 'center', paddingTop: spacing.s4 },
  overlay: {
    position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 200, display: 'flex', alignItems: 'flex-end',
  },
  drawer: {
    width: '100%', maxWidth: '480px', margin: '0 auto',
    backgroundColor: colors.bg, borderRadius: `${radii.lg} ${radii.lg} 0 0`,
    padding: spacing.s4, display: 'flex', flexDirection: 'column',
    gap: spacing.s3, maxHeight: '70dvh', overflowY: 'auto',
  },
  drawerTitle: { fontSize: font.lg, fontWeight: 700, color: colors.textPrimary },
  friendItem: {
    display: 'flex', alignItems: 'center', gap: spacing.s3,
    padding: `${spacing.s3} 0`, backgroundColor: 'transparent',
    border: 'none', borderBottom: `1px solid ${colors.border}`,
    cursor: 'pointer', width: '100%',
  },
  friendName: { fontSize: font.md, color: colors.textPrimary, fontWeight: 500 },
});
