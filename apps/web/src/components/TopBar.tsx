import * as stylex from '@stylexjs/stylex';
import { colors, font, spacing } from '../styles/tokens.stylex.js';

export function TopBar() {
  return (
    <header {...stylex.props(styles.bar)}>
      <span {...stylex.props(styles.logo)}>Orbit</span>
    </header>
  );
}

const styles = stylex.create({
  bar: {
    position: 'fixed',
    top: 0,
    left: '50%',
    transform: 'translateX(-50%)',
    width: '100%',
    maxWidth: '480px',
    height: 'var(--nav-height)',
    display: 'flex',
    alignItems: 'center',
    paddingLeft: spacing.s4,
    paddingRight: spacing.s4,
    backgroundColor: colors.bg,
    borderBottom: `1px solid ${colors.border}`,
    zIndex: 100,
  },
  logo: {
    fontSize: font.xl,
    fontWeight: 700,
    color: colors.accent,
    letterSpacing: '-0.5px',
  },
});
