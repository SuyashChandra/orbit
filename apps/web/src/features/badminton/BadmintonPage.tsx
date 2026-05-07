import { useState } from 'react';
import * as stylex from '@stylexjs/stylex';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router';
import { api } from '../../lib/api.js';
import { useAuthStore } from '../auth/authStore.js';
import { colors, font, radii, spacing } from '../../styles/tokens.stylex.js';
import type { BadmintonGameDTO, CreateGameBody } from '@orbit/shared';

type Tab = 'upcoming' | 'past';

const STATUS_COLORS: Record<string, string> = {
  upcoming: '#6c63ff',
  ongoing: '#f59e0b',
  completed: '#10b981',
  cancelled: '#6b7280',
};

export function BadmintonPage() {
  const [tab, setTab] = useState<Tab>('upcoming');
  const [showForm, setShowForm] = useState(false);
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();

  const gamesQ = useQuery<BadmintonGameDTO[]>({
    queryKey: ['games'],
    queryFn: () => api.get<BadmintonGameDTO[]>('/games').then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (body: CreateGameBody) =>
      api.post<BadmintonGameDTO>('/games', body).then((r) => r.data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['games'] });
      setShowForm(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/games/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['games'] }),
  });

  const now = new Date();
  const upcoming = gamesQ.data?.filter(
    (g) => g.status !== 'completed' && g.status !== 'cancelled' && new Date(g.scheduledAt) >= now,
  ) ?? [];
  const past = gamesQ.data?.filter(
    (g) => g.status === 'completed' || g.status === 'cancelled' || new Date(g.scheduledAt) < now,
  ) ?? [];
  const shown = tab === 'upcoming' ? upcoming : past;

  return (
    <div {...stylex.props(styles.page)}>
      <div {...stylex.props(styles.header)}>
        <h2 {...stylex.props(styles.title)}>Badminton</h2>
        <button onClick={() => setShowForm(true)} {...stylex.props(styles.addBtn)}>+ Game</button>
      </div>

      <div {...stylex.props(styles.tabs)}>
        {(['upcoming', 'past'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            {...stylex.props(styles.tab, tab === t && styles.tabActive)}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
            {t === 'upcoming' && upcoming.length > 0 && (
              <span {...stylex.props(styles.tabCount)}>{upcoming.length}</span>
            )}
          </button>
        ))}
      </div>

      <div {...stylex.props(styles.list)}>
        {gamesQ.isLoading && <p {...stylex.props(styles.muted)}>Loading…</p>}
        {shown.length === 0 && !gamesQ.isLoading && (
          <p {...stylex.props(styles.muted)}>
            {tab === 'upcoming' ? 'No upcoming games. Create one!' : 'No past games.'}
          </p>
        )}
        {shown.map((g) => (
          <Link key={g.id} to={`/badminton/${g.id}`} style={{ textDecoration: 'none' }}>
            <GameCard
              game={g}
              isCreator={g.creator.id === user?.id}
              onDelete={() => deleteMutation.mutate(g.id)}
            />
          </Link>
        ))}
      </div>

      {showForm && (
        <CreateGameDrawer
          onSubmit={(body) => createMutation.mutate(body)}
          onClose={() => setShowForm(false)}
          isSubmitting={createMutation.isPending}
        />
      )}
    </div>
  );
}

function GameCard({
  game, isCreator, onDelete,
}: {
  game: BadmintonGameDTO;
  isCreator: boolean;
  onDelete: () => void;
}) {
  const date = new Date(game.scheduledAt);
  const accepted = game.participants.filter((p) => p.status === 'accepted').length;

  return (
    <div {...stylex.props(styles.card)}>
      <div {...stylex.props(styles.cardLeft)}>
        <div {...stylex.props(styles.dateBlock)}>
          <span {...stylex.props(styles.dateDay)}>{date.getDate()}</span>
          <span {...stylex.props(styles.dateMonth)}>
            {date.toLocaleString('default', { month: 'short' })}
          </span>
        </div>
      </div>
      <div {...stylex.props(styles.cardMain)}>
        <div {...stylex.props(styles.cardTopRow)}>
          <span
            {...stylex.props(styles.statusBadge)}
            style={{ color: STATUS_COLORS[game.status], backgroundColor: STATUS_COLORS[game.status] + '22' }}
          >
            {game.status}
          </span>
          {isCreator && (
            <button
              onClick={(e) => { e.preventDefault(); if (confirm('Delete game?')) onDelete(); }}
              {...stylex.props(styles.deleteBtn)}
            >
              ✕
            </button>
          )}
        </div>
        <p {...stylex.props(styles.time)}>
          {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
        {game.location && <p {...stylex.props(styles.location)}>📍 {game.location}</p>}
        <p {...stylex.props(styles.participants)}>
          👤 {accepted + 1} player{accepted + 1 !== 1 ? 's' : ''} · {game.participants.length} invited
        </p>
      </div>
    </div>
  );
}

function CreateGameDrawer({
  onSubmit, onClose, isSubmitting,
}: {
  onSubmit: (body: CreateGameBody) => void;
  onClose: () => void;
  isSubmitting: boolean;
}) {
  const tomorrow = new Date(Date.now() + 86400000);
  tomorrow.setHours(10, 0, 0, 0);
  const defaultDatetime = tomorrow.toISOString().slice(0, 16);

  const [scheduledAt, setScheduledAt] = useState(defaultDatetime);
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');

  return (
    <div {...stylex.props(styles.overlay)} onClick={onClose}>
      <div {...stylex.props(styles.drawer)} onClick={(e) => e.stopPropagation()}>
        <div {...stylex.props(styles.drawerHeader)}>
          <h3 {...stylex.props(styles.drawerTitle)}>New Game</h3>
          <button onClick={onClose} {...stylex.props(styles.closeBtn)}>✕</button>
        </div>

        <div {...stylex.props(styles.fields)}>
          <div {...stylex.props(styles.field)}>
            <label {...stylex.props(styles.label)}>Date & Time *</label>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              {...stylex.props(styles.input)}
            />
          </div>
          <div {...stylex.props(styles.field)}>
            <label {...stylex.props(styles.label)}>Location</label>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Sports Hall Block A"
              {...stylex.props(styles.input)}
            />
          </div>
          <div {...stylex.props(styles.field)}>
            <label {...stylex.props(styles.label)}>Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Any extra info…"
              {...stylex.props(styles.input, styles.textarea)}
            />
          </div>
        </div>

        <button
          onClick={() => {
            const body: CreateGameBody = { scheduledAt: new Date(scheduledAt).toISOString() };
            if (location) body.location = location;
            if (notes) body.notes = notes;
            onSubmit(body);
          }}
          disabled={isSubmitting || !scheduledAt}
          {...stylex.props(styles.submitBtn)}
        >
          {isSubmitting ? 'Creating…' : 'Create Game'}
        </button>
      </div>
    </div>
  );
}

const styles = stylex.create({
  page: { display: 'flex', flexDirection: 'column', gap: spacing.s4, padding: spacing.s4 },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: font.xl, fontWeight: 700, color: colors.textPrimary },
  addBtn: {
    padding: `${spacing.s2} ${spacing.s4}`,
    backgroundColor: colors.accent,
    color: '#fff',
    border: 'none',
    borderRadius: radii.md,
    fontSize: font.md,
    fontWeight: 600,
    cursor: 'pointer',
  },
  tabs: { display: 'flex', borderBottom: `1px solid ${colors.border}` },
  tab: {
    padding: `${spacing.s2} ${spacing.s4}`,
    fontSize: font.md,
    color: colors.textSecondary,
    background: 'none',
    border: 'none',
    borderBottom: '2px solid transparent',
    cursor: 'pointer',
    marginBottom: '-1px',
    display: 'flex',
    alignItems: 'center',
    gap: spacing.s2,
  },
  tabActive: { color: colors.accent, borderBottomColor: colors.accent },
  tabCount: {
    backgroundColor: colors.accent,
    color: '#fff',
    borderRadius: radii.full,
    fontSize: font.xs,
    fontWeight: 700,
    minWidth: '18px',
    height: '18px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0 4px',
  },
  list: { display: 'flex', flexDirection: 'column', gap: spacing.s3 },
  muted: { color: colors.textSecondary, fontSize: font.sm, textAlign: 'center', paddingTop: spacing.s8 },
  card: {
    display: 'flex',
    gap: spacing.s3,
    padding: spacing.s4,
    backgroundColor: colors.surface,
    border: `1px solid ${colors.border}`,
    borderRadius: radii.lg,
  },
  cardLeft: { flexShrink: 0 },
  dateBlock: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    backgroundColor: colors.surfaceRaised,
    borderRadius: radii.md,
    padding: `${spacing.s2} ${spacing.s3}`,
    minWidth: '44px',
  },
  dateDay: { fontSize: font.xl, fontWeight: 800, color: colors.textPrimary, lineHeight: 1 },
  dateMonth: { fontSize: font.xs, color: colors.textSecondary, textTransform: 'uppercase' },
  cardMain: { flex: 1, display: 'flex', flexDirection: 'column', gap: spacing.s1 },
  cardTopRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  statusBadge: {
    fontSize: font.xs,
    fontWeight: 600,
    borderRadius: radii.full,
    padding: `2px ${spacing.s2}`,
    textTransform: 'capitalize',
  },
  deleteBtn: { background: 'none', border: 'none', color: colors.textSecondary, cursor: 'pointer', fontSize: font.sm },
  time: { fontSize: font.md, fontWeight: 600, color: colors.textPrimary },
  location: { fontSize: font.sm, color: colors.textSecondary },
  participants: { fontSize: font.xs, color: colors.textSecondary, marginTop: spacing.s1 },
  overlay: {
    position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 200, display: 'flex', alignItems: 'flex-end',
  },
  drawer: {
    width: '100%', maxWidth: '480px', margin: '0 auto',
    backgroundColor: colors.bg, borderRadius: `${radii.lg} ${radii.lg} 0 0`,
    padding: spacing.s4, display: 'flex', flexDirection: 'column',
    gap: spacing.s4, maxHeight: '90dvh', overflowY: 'auto',
  },
  drawerHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  drawerTitle: { fontSize: font.lg, fontWeight: 700, color: colors.textPrimary },
  closeBtn: { background: 'none', border: 'none', color: colors.textSecondary, fontSize: font.lg, cursor: 'pointer' },
  fields: { display: 'flex', flexDirection: 'column', gap: spacing.s3 },
  field: { display: 'flex', flexDirection: 'column', gap: spacing.s1 },
  label: { fontSize: font.sm, color: colors.textSecondary },
  input: {
    padding: `${spacing.s2} ${spacing.s3}`, backgroundColor: colors.surface,
    border: `1px solid ${colors.border}`, borderRadius: radii.md,
    color: colors.textPrimary, fontSize: font.md, width: '100%',
  },
  textarea: { resize: 'vertical', fontFamily: 'inherit' },
  submitBtn: {
    padding: `${spacing.s3} ${spacing.s4}`, backgroundColor: colors.accent,
    color: '#fff', border: 'none', borderRadius: radii.md,
    fontSize: font.md, fontWeight: 600, cursor: 'pointer', width: '100%',
  },
});
