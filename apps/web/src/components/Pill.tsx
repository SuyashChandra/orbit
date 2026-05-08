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
      className="text-xs font-semibold py-1 px-3 rounded-full inline-flex items-center gap-1.5 whitespace-nowrap"
      style={{ color: meta.color, backgroundColor: meta.bg }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ backgroundColor: 'currentColor', opacity: 0.85 }}
      />
      {label ?? meta.label}
    </span>
  );
}
