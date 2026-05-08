import type { ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';
import { colors, font, spacing } from '../styles/tokens.stylex.js';

interface Props {
  eyebrow?: string;
  title: string;
  sub?: string;
  action?: ReactNode;
}

export function StationHead({ eyebrow, title, sub, action }: Props) {
  return (
    <div {...stylex.props(styles.head)}>
      <div {...stylex.props(styles.left)}>
        {eyebrow && <span {...stylex.props(styles.eyebrow)}>{eyebrow}</span>}
        <h1 {...stylex.props(styles.title)}>{title}</h1>
        {sub && <span {...stylex.props(styles.sub)}>{sub}</span>}
      </div>
      {action && <div {...stylex.props(styles.action)}>{action}</div>}
    </div>
  );
}

const styles = stylex.create({
  head: {
    padding: `${spacing.s4} ${spacing.s5} ${spacing.s2}`,
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.s3,
  },
  left: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    minWidth: 0,
    flex: 1,
  },
  eyebrow: {
    fontSize: font.xs,
    color: colors.accentBright,
    fontWeight: 500,
    marginBottom: '2px',
  },
  title: {
    fontFamily: font.display,
    fontSize: '30px',
    fontWeight: 600,
    letterSpacing: '-0.025em',
    margin: 0,
    lineHeight: 1.1,
    color: colors.textPrimary,
  },
  sub: {
    fontSize: font.sm,
    color: colors.textSecondary,
    marginTop: '2px',
  },
  action: {
    flexShrink: 0,
  },
});
