import { useState } from 'react';
import * as stylex from '@stylexjs/stylex';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router';
import { api } from '../../lib/api.js';
import { useAuthStore } from '../auth/authStore.js';
import { colors, font, radii, spacing } from '../../styles/tokens.stylex.js';
import { StationHead } from '../../components/StationHead.js';
import { Pill } from '../../components/Pill.js';
import type { BadmintonGameDTO, CreateGameBody } from '@orbit/shared';

type Tab = 'upcoming' | 'past';

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
  const upcoming = (gamesQ.data ?? []).filter(
    (g) => g.status !== 'completed' && g.status !== 'cancelled' && new Date(g.scheduledAt) >= now,
  );
  const past = (gamesQ.data ?? []).filter(
    (g) => g.status === 'completed' || g.status === 'cancelled' || new Date(g.scheduledAt) < now,
  );
  const shown = tab === 'upcoming' ? upcoming : past;

  // Soonest upcoming → hero card
  const next = upcoming
    .slice()
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())[0];

  return (
    <div {...stylex.props(styles.page)}>
      <StationHead
        eyebrow="Play"
        title="Court"
        sub={`Badminton · ${upcoming.length} upcoming`}
        action={
          <button onClick={() => setShowForm(true)} {...stylex.props(styles.addBtn)}>
            + Game
          </button>
        }
      />

      {next && tab === 'upcoming' && <NextGameHero game={next} />}

      <div {...stylex.props(styles.tabs)}>
        <button
          onClick={() => setTab('upcoming')}
          {...stylex.props(styles.tab, tab === 'upcoming' && styles.tabActive)}
        >
          Upcoming
          <span {...stylex.props(styles.count, tab === 'upcoming' && styles.countActive)}>
            {upcoming.length}
          </span>
        </button>
        <button
          onClick={() => setTab('past')}
          {...stylex.props(styles.tab, tab === 'past' && styles.tabActive)}
        >
          Past
          <span {...stylex.props(styles.count, tab === 'past' && styles.countActive)}>
            {past.length}
          </span>
        </button>
      </div>

      <div {...stylex.props(styles.list)}>
        {gamesQ.isLoading && <p {...stylex.props(styles.muted)}>Loading…</p>}
        {!gamesQ.isLoading && shown.length === 0 && (
          <div {...stylex.props(styles.empty)}>
            <span {...stylex.props(styles.emptyGlyph)}>◉</span>
            <span {...stylex.props(styles.emptyTitle)}>
              {tab === 'upcoming' ? 'No games yet' : 'No past games'}
            </span>
            <span {...stylex.props(styles.emptySub)}>
              {tab === 'upcoming' ? 'Schedule one and invite some friends.' : ''}
            </span>
          </div>
        )}
        {shown.map((g) => (
          <Link key={g.id} to={`/badminton/${g.id}`} style={{ textDecoration: 'none' }}>
            <GameCard
              game={g}
              isCreator={g.creator.id === user?.id}
              isPast={tab === 'past'}
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

function NextGameHero({ game }: { game: BadmintonGameDTO }) {
  const date = new Date(game.scheduledAt);
  const accepted = game.participants.filter((p) => p.status === 'accepted').length;
  const invited = game.participants.length;
  const days = Math.round((date.getTime() - Date.now()) / 86_400_000);
  const when =
    days <= 0 ? 'today' :
    days === 1 ? 'tomorrow' :
    `in ${days} days`;
  const time = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const dayName = date.toLocaleString('default', { weekday: 'long' });
  const mapsHref = game.location
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(game.location)}`
    : null;

  return (
    <div {...stylex.props(styles.heroWrap)}>
      <Link to={`/badminton/${game.id}`} style={{ textDecoration: 'none' }}>
        <article {...stylex.props(styles.hero)}>
          <div {...stylex.props(styles.heroEyebrow)}>✿ Coming up · {when}</div>

          <div {...stylex.props(styles.heroBody)}>
            <div {...stylex.props(styles.heroDate)}>
              <span {...stylex.props(styles.heroDay)}>{date.getDate()}</span>
              <span {...stylex.props(styles.heroMonth)}>
                {date.toLocaleString('default', { month: 'short' })}
              </span>
            </div>
            <div {...stylex.props(styles.heroInfo)}>
              <div {...stylex.props(styles.heroTime)}>
                {dayName}, {time}
              </div>
              {game.location && <div {...stylex.props(styles.heroLoc)}>{game.location}</div>}
              <div {...stylex.props(styles.heroMeta)}>
                {accepted + 1} confirmed · {invited} invited
              </div>
            </div>
          </div>

          <div {...stylex.props(styles.heroActions)}>
            <span {...stylex.props(styles.heroPrimaryBtn)}>Open</span>
            {mapsHref && (
              <a
                href={mapsHref}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                {...stylex.props(styles.heroGhostBtn)}
              >
                Map
              </a>
            )}
          </div>
        </article>
      </Link>
    </div>
  );
}

function GameCard({
  game, isCreator, isPast, onDelete,
}: {
  game: BadmintonGameDTO;
  isCreator: boolean;
  isPast: boolean;
  onDelete: () => void;
}) {
  const date = new Date(game.scheduledAt);
  const accepted = game.participants.filter((p) => p.status === 'accepted').length;

  return (
    <article {...stylex.props(styles.card, isPast && styles.cardPast)}>
      <div {...stylex.props(styles.dateBlock)}>
        <span {...stylex.props(styles.dateDay)}>{date.getDate()}</span>
        <span {...stylex.props(styles.dateMonth)}>
          {date.toLocaleString('default', { month: 'short' })}
        </span>
      </div>

      <div {...stylex.props(styles.cardMain)}>
        <div {...stylex.props(styles.cardTopRow)}>
          <p {...stylex.props(styles.time)}>
            {date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
          </p>
          <Pill status={game.status} />
        </div>
        {game.location && <p {...stylex.props(styles.location)}>{game.location}</p>}
        <p {...stylex.props(styles.participants)}>
          {accepted + 1} player{accepted + 1 !== 1 ? 's' : ''} · {game.participants.length} invited
        </p>
      </div>

      {isCreator && (
        <button
          onClick={(e) => { e.preventDefault(); if (confirm('Delete game?')) onDelete(); }}
          {...stylex.props(styles.deleteBtn)}
          aria-label="Delete"
        >
          ✕
        </button>
      )}
    </article>
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
        <div {...stylex.props(styles.grip)} />
        <div {...stylex.props(styles.drawerHeader)}>
          <h3 {...stylex.props(styles.drawerTitle)}>Schedule a game</h3>
          <button onClick={onClose} {...stylex.props(styles.closeBtn)} aria-label="Close">✕</button>
        </div>

        <div {...stylex.props(styles.fields)}>
          <div {...stylex.props(styles.field)}>
            <label {...stylex.props(styles.fieldLabel)}>When</label>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              {...stylex.props(styles.input)}
            />
          </div>
          <div {...stylex.props(styles.field)}>
            <label {...stylex.props(styles.fieldLabel)}>Where</label>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Sports Hall A"
              {...stylex.props(styles.input)}
            />
          </div>
          <div {...stylex.props(styles.field)}>
            <label {...stylex.props(styles.fieldLabel)}>Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Anything else…"
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
          {isSubmitting ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  );
}

const styles = stylex.create({
  page: { display: 'flex', flexDirection: 'column', paddingBottom: spacing.s8 },
  addBtn: {
    padding: `${spacing.s2} ${spacing.s4}`,
    backgroundColor: colors.accent,
    color: colors.fgOnAccent,
    border: 'none',
    borderRadius: radii.full,
    fontSize: font.sm,
    fontWeight: 600,
    cursor: 'pointer',
  },

  // Hero (next game) card
  heroWrap: { padding: `${spacing.s2} ${spacing.s4} 0` },
  hero: {
    padding: spacing.s5,
    background: `linear-gradient(165deg, ${colors.surfaceRaised} 0%, ${colors.surface} 70%)`,
    borderRadius: radii.lg,
    cursor: 'pointer',
  },
  heroEyebrow: {
    fontSize: font.xs,
    color: colors.accentBright,
    fontWeight: 600,
    marginBottom: spacing.s3,
  },
  heroBody: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.s4,
    marginBottom: spacing.s4,
  },
  heroDate: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
    borderRadius: radii.md,
    padding: `${spacing.s3} ${spacing.s4}`,
    minWidth: '70px',
  },
  heroDay: {
    fontFamily: font.display,
    fontSize: '32px',
    fontWeight: 600,
    lineHeight: 1,
    color: colors.textPrimary,
  },
  heroMonth: {
    fontSize: '11px',
    color: colors.accentBright,
    fontWeight: 600,
    marginTop: '2px',
    textTransform: 'uppercase',
  },
  heroInfo: { flex: 1, minWidth: 0 },
  heroTime: {
    fontFamily: font.display,
    fontSize: '24px',
    fontWeight: 600,
    lineHeight: 1.1,
    color: colors.textPrimary,
    letterSpacing: '-0.02em',
    marginBottom: '4px',
  },
  heroLoc: { fontSize: font.sm, color: colors.textPrimary, marginBottom: '4px' },
  heroMeta: { fontSize: font.xs, color: colors.textSecondary },
  heroActions: { display: 'flex', gap: spacing.s2 },
  heroPrimaryBtn: {
    flex: 1,
    textAlign: 'center',
    padding: `${spacing.s3} ${spacing.s4}`,
    backgroundColor: colors.accent,
    color: colors.fgOnAccent,
    borderRadius: radii.full,
    fontSize: font.sm,
    fontWeight: 600,
  },
  heroGhostBtn: {
    flex: 1,
    textAlign: 'center',
    padding: `${spacing.s3} ${spacing.s4}`,
    backgroundColor: colors.surface,
    color: colors.textPrimary,
    borderRadius: radii.full,
    fontSize: font.sm,
    fontWeight: 600,
  },

  // Tabs (pill style)
  tabs: {
    display: 'flex',
    gap: '6px',
    padding: `${spacing.s4} ${spacing.s4} ${spacing.s3}`,
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
  tabActive: { backgroundColor: colors.surface, color: colors.textPrimary },
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
    gap: spacing.s3,
    padding: `0 ${spacing.s4}`,
  },
  muted: {
    color: colors.textSecondary,
    fontSize: font.sm,
    textAlign: 'center',
    padding: spacing.s8,
  },
  empty: {
    textAlign: 'center',
    padding: `${spacing.s8} ${spacing.s5}`,
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.s1,
  },
  emptyGlyph: { fontSize: '32px', marginBottom: spacing.s2, color: colors.accentBright },
  emptyTitle: { fontFamily: font.display, fontSize: font.lg, fontWeight: 600, color: colors.textPrimary },
  emptySub: { fontSize: font.sm, color: colors.textSecondary },

  // Game card
  card: {
    display: 'flex',
    gap: spacing.s4,
    padding: spacing.s5,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    cursor: 'pointer',
    transition: 'opacity 0.15s',
  },
  cardPast: { opacity: 0.7 },
  dateBlock: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface2,
    borderRadius: radii.md,
    padding: `${spacing.s2} ${spacing.s3}`,
    minWidth: '56px',
    alignSelf: 'flex-start',
  },
  dateDay: {
    fontFamily: font.display,
    fontSize: '22px',
    fontWeight: 600,
    color: colors.textPrimary,
    lineHeight: 1,
  },
  dateMonth: {
    fontSize: font.xs,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    marginTop: '2px',
  },
  cardMain: { flex: 1, display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 },
  cardTopRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.s2,
  },
  time: { fontSize: font.md, fontWeight: 600, color: colors.textPrimary },
  location: { fontSize: font.sm, color: colors.textSecondary },
  participants: { fontSize: font.xs, color: colors.textSecondary, marginTop: spacing.s1 },
  deleteBtn: {
    background: 'transparent',
    border: 'none',
    color: colors.textDeep,
    cursor: 'pointer',
    fontSize: font.sm,
    padding: spacing.s1,
    flexShrink: 0,
    alignSelf: 'flex-start',
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
    gap: spacing.s4,
    maxHeight: '92dvh',
    overflowY: 'auto',
    padding: `${spacing.s2} ${spacing.s5} ${spacing.s5}`,
  },
  grip: {
    width: '36px',
    height: '4px',
    borderRadius: '2px',
    backgroundColor: colors.border,
    margin: `${spacing.s2} auto 0`,
  },
  drawerHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
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
  fields: { display: 'flex', flexDirection: 'column', gap: spacing.s4 },
  field: { display: 'flex', flexDirection: 'column', gap: spacing.s2 },
  fieldLabel: { fontSize: font.sm, color: colors.textSecondary, fontWeight: 500 },
  input: {
    padding: `${spacing.s3} ${spacing.s4}`,
    backgroundColor: colors.surface2,
    border: 'none',
    borderRadius: radii.md,
    color: colors.textPrimary,
    fontSize: font.md,
    width: '100%',
    outline: 'none',
    fontFamily: font.sans,
  },
  textarea: { resize: 'vertical', minHeight: '80px' },
  submitBtn: {
    padding: spacing.s4,
    backgroundColor: colors.accent,
    color: colors.fgOnAccent,
    border: 'none',
    borderRadius: radii.full,
    fontSize: font.md,
    fontWeight: 600,
    cursor: 'pointer',
    width: '100%',
    ':disabled': { opacity: 0.4, cursor: 'not-allowed' },
  },
});
