import * as stylex from '@stylexjs/stylex';
import { font, radii, spacing } from '../styles/tokens.stylex.js';

interface PillMeta {
  label: string;
  color: string;
  bg: string;
}

const STATUS_META: Record<string, PillMeta> = {
  // Job statuses
  applied:      { label: 'Applied',      color: 'var(--color-accent-bright)', bg: 'var(--color-accent-soft)' },
  screening:    { label: 'Screening',    color: 'var(--color-info)',          bg: 'rgba(140, 184, 216, 0.13)' },
  interviewing: { label: 'Interviewing', color: 'var(--color-warning)',       bg: 'rgba(227, 168, 106, 0.13)' },
  offer:        { label: 'Offer',        color: 'var(--color-warm)',          bg: 'rgba(230, 199, 154, 0.13)' },
  rejected:     { label: 'Rejected',     color: 'var(--color-danger)',        bg: 'rgba(224, 128, 112, 0.13)' },
  withdrawn:    { label: 'Withdrawn',    color: 'var(--color-text-deep)',     bg: 'var(--color-surface-2)' },
  // Game statuses
  upcoming:     { label: 'Upcoming',     color: 'var(--color-accent-bright)', bg: 'var(--color-accent-soft)' },
  ongoing:      { label: 'Ongoing',      color: 'var(--color-warning)',       bg: 'rgba(227, 168, 106, 0.13)' },
  completed:    { label: 'Completed',    color: 'var(--color-warm)',          bg: 'rgba(230, 199, 154, 0.13)' },
  cancelled:    { label: 'Cancelled',    color: 'var(--color-text-deep)',     bg: 'var(--color-surface-2)' },
};

interface Props {
  status: string;
  /** Override label without changing colors */
  label?: string;
}

export function Pill({ status, label }: Props) {
  const meta = STATUS_META[status] ?? {
    label: status,
    color: 'var(--color-text-secondary)',
    bg: 'var(--color-surface-2)',
  };
  return (
    <span
      {...stylex.props(styles.pill)}
      style={{ color: meta.color, backgroundColor: meta.bg }}
    >
      <span {...stylex.props(styles.dot)} style={{ backgroundColor: 'currentColor' }} />
      {label ?? meta.label}
    </span>
  );
}

const styles = stylex.create({
  pill: {
    fontSize: font.xs,
    fontWeight: 600,
    padding: `${spacing.s1} ${spacing.s3}`,
    borderRadius: radii.full,
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    whiteSpace: 'nowrap',
  },
  dot: {
    width: '6px',
    height: '6px',
    borderRadius: radii.full,
    opacity: 0.85,
  },
});

