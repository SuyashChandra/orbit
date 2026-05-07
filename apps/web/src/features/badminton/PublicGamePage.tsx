import * as stylex from '@stylexjs/stylex';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router';
import axios from 'axios';
import { colors, font, radii, spacing } from '../../styles/tokens.stylex.js';
import type { BadmintonGameDTO } from '@orbit/shared';

const publicApi = axios.create({
  baseURL: import.meta.env['VITE_API_URL'] ?? 'http://localhost:3000',
});

const STATUS_COLORS: Record<string, string> = {
  upcoming: '#6c63ff',
  ongoing: '#f59e0b',
  completed: '#10b981',
  cancelled: '#6b7280',
};

const PARTICIPANT_COLORS: Record<string, string> = {
  invited: '#f59e0b',
  accepted: '#10b981',
  declined: '#ef4444',
};

export function PublicGamePage() {
  const { id } = useParams<{ id: string }>();

  const gameQ = useQuery<BadmintonGameDTO>({
    queryKey: ['public-game', id],
    queryFn: () => publicApi.get<BadmintonGameDTO>(`/games/${id}`).then((r) => r.data),
  });

  if (gameQ.isLoading) {
    return (
      <div {...stylex.props(styles.page)}>
        <p {...stylex.props(styles.muted)}>Loading…</p>
      </div>
    );
  }

  if (gameQ.isError || !gameQ.data) {
    return (
      <div {...stylex.props(styles.page)}>
        <p {...stylex.props(styles.muted)}>Game not found.</p>
      </div>
    );
  }

  const game = gameQ.data;
  const scheduledAt = new Date(game.scheduledAt);
  const accepted = game.participants.filter((p) => p.status === 'accepted');

  return (
    <div {...stylex.props(styles.page)}>
      <div {...stylex.props(styles.card)}>
        {/* Branding */}
        <p {...stylex.props(styles.brand)}>🏸 Orbit</p>

        {/* Status */}
        <span
          {...stylex.props(styles.statusBadge)}
          style={{ color: STATUS_COLORS[game.status], backgroundColor: STATUS_COLORS[game.status] + '22' }}
        >
          {game.status}
        </span>

        {/* Date / time */}
        <div {...stylex.props(styles.dateBlock)}>
          <p {...stylex.props(styles.dateMain)}>
            {scheduledAt.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
          <p {...stylex.props(styles.dateTime)}>
            {scheduledAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>

        {/* Location */}
        {game.location && (
          <div {...stylex.props(styles.infoRow)}>
            <span>📍</span>
            <p {...stylex.props(styles.infoText)}>{game.location}</p>
          </div>
        )}

        {/* Notes */}
        {game.notes && (
          <div {...stylex.props(styles.infoRow)}>
            <span>📝</span>
            <p {...stylex.props(styles.infoText)}>{game.notes}</p>
          </div>
        )}

        {/* Organiser */}
        <div {...stylex.props(styles.section)}>
          <p {...stylex.props(styles.sectionLabel)}>Organiser</p>
          <div {...stylex.props(styles.personRow)}>
            <Avatar name={game.creator.name} avatar={game.creator.avatar} />
            <p {...stylex.props(styles.personName)}>{game.creator.name}</p>
          </div>
        </div>

        {/* Players */}
        <div {...stylex.props(styles.section)}>
          <p {...stylex.props(styles.sectionLabel)}>
            Players ({accepted.length + 1} confirmed)
          </p>

          {/* Creator always confirmed */}
          <div {...stylex.props(styles.personRow)}>
            <Avatar name={game.creator.name} avatar={game.creator.avatar} />
            <p {...stylex.props(styles.personName)}>{game.creator.name}</p>
            <span {...stylex.props(styles.pBadge)} style={{ color: '#10b981', backgroundColor: '#10b98122' }}>Going</span>
          </div>

          {game.participants.map((p) => (
            <div key={p.userId} {...stylex.props(styles.personRow)}>
              <Avatar name={p.name} avatar={p.avatar} />
              <p {...stylex.props(styles.personName)}>{p.name}</p>
              <span
                {...stylex.props(styles.pBadge)}
                style={{ color: PARTICIPANT_COLORS[p.status], backgroundColor: PARTICIPANT_COLORS[p.status] + '22' }}
              >
                {p.status}
              </span>
            </div>
          ))}
        </div>

        <p {...stylex.props(styles.footer)}>Shared via Orbit</p>
      </div>
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
  page: {
    minHeight: '100dvh', backgroundColor: colors.bg,
    display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
    padding: spacing.s4,
  },
  card: {
    width: '100%', maxWidth: '440px',
    backgroundColor: colors.surface, border: `1px solid ${colors.border}`,
    borderRadius: radii.lg, padding: spacing.s6,
    display: 'flex', flexDirection: 'column', gap: spacing.s4,
    marginTop: spacing.s6,
  },
  brand: { fontSize: font.lg, fontWeight: 700, color: colors.accent },
  statusBadge: {
    display: 'inline-block', width: 'fit-content',
    padding: `4px ${spacing.s3}`, borderRadius: radii.full,
    fontSize: font.sm, fontWeight: 600, textTransform: 'capitalize',
  },
  dateBlock: { display: 'flex', flexDirection: 'column', gap: spacing.s1 },
  dateMain: { fontSize: font.xl, fontWeight: 700, color: colors.textPrimary },
  dateTime: { fontSize: font.lg, color: colors.textSecondary },
  infoRow: { display: 'flex', gap: spacing.s2, alignItems: 'flex-start' },
  infoText: { fontSize: font.md, color: colors.textPrimary, flex: 1 },
  section: { display: 'flex', flexDirection: 'column', gap: spacing.s2 },
  sectionLabel: { fontSize: font.xs, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: '0.08em' },
  personRow: {
    display: 'flex', alignItems: 'center', gap: spacing.s3,
    padding: `${spacing.s2} 0`, borderBottom: `1px solid ${colors.border}`,
  },
  personName: { flex: 1, fontSize: font.md, color: colors.textPrimary, fontWeight: 500 },
  pBadge: {
    fontSize: font.xs, fontWeight: 600, borderRadius: radii.full,
    padding: `2px ${spacing.s2}`, textTransform: 'capitalize',
  },
  avatar: { width: '32px', height: '32px', borderRadius: radii.full, objectFit: 'cover', flexShrink: 0 },
  avatarFallback: {
    width: '32px', height: '32px', borderRadius: radii.full,
    backgroundColor: colors.accent, color: colors.fgOnAccent,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: font.sm, fontWeight: 700, flexShrink: 0,
  },
  muted: { color: colors.textSecondary, fontSize: font.md, marginTop: spacing.s12 },
  footer: { fontSize: font.xs, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.s2 },
});
