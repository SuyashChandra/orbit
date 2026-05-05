import * as stylex from '@stylexjs/stylex';
import { NavLink } from 'react-router';
import { colors, font } from '../styles/tokens.stylex.js';

const NAV_ITEMS = [
  { to: '/', label: 'Feed', icon: '⚡' },
  { to: '/jobs', label: 'Jobs', icon: '💼' },
  { to: '/gym', label: 'Gym', icon: '🏋️' },
  { to: '/badminton', label: 'Court', icon: '🏸' },
  { to: '/friends', label: 'Friends', icon: '👥' },
] as const;

export function BottomNav() {
  return (
    <nav {...stylex.props(styles.nav)}>
      {NAV_ITEMS.map((item) => (
        <NavLink key={item.to} to={item.to} end={item.to === '/'}>
          {({ isActive }) => (
            <div {...stylex.props(styles.item, isActive && styles.itemActive)}>
              <span {...stylex.props(styles.icon)}>{item.icon}</span>
              <span {...stylex.props(styles.label, isActive && styles.labelActive)}>
                {item.label}
              </span>
            </div>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

const styles = stylex.create({
  nav: {
    position: 'fixed',
    bottom: 0,
    left: '50%',
    transform: 'translateX(-50%)',
    width: '100%',
    maxWidth: '480px',
    height: 'var(--bottom-nav-height)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: colors.bg,
    borderTop: `1px solid ${colors.border}`,
    zIndex: 100,
    paddingBottom: 'env(safe-area-inset-bottom)',
  },
  item: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '2px',
    padding: '4px 8px',
    opacity: 0.5,
    transition: 'opacity 0.15s',
  },
  itemActive: {
    opacity: 1,
  },
  icon: {
    fontSize: '20px',
    lineHeight: 1,
  },
  label: {
    fontSize: font.xs,
    color: colors.textSecondary,
  },
  labelActive: {
    color: colors.accent,
    fontWeight: 600,
  },
});
