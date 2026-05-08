import * as stylex from '@stylexjs/stylex';
import { NavLink } from 'react-router';
import { colors, radii } from '../styles/tokens.stylex.js';

const NAV_ITEMS = [
  { to: '/',          label: 'Home',   glyph: '☾' },
  { to: '/jobs',      label: 'Work',   glyph: '✦' },
  { to: '/gym',       label: 'Move',   glyph: '◐' },
  { to: '/badminton', label: 'Play',   glyph: '◉' },
  { to: '/friends',   label: 'People', glyph: '✿' },
] as const;

export function BottomNav() {
  return (
    <nav {...stylex.props(styles.nav)}>
      {NAV_ITEMS.map((item) => (
        <NavLink key={item.to} to={item.to} end={item.to === '/'}>
          {({ isActive }) => (
            <div {...stylex.props(styles.item, isActive && styles.itemActive)}>
              <span {...stylex.props(styles.glyph)}>{item.glyph}</span>
              <span {...stylex.props(styles.label)}>{item.label}</span>
              <span {...stylex.props(styles.pip, isActive && styles.pipActive)} />
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
    display: 'grid',
    gridTemplateColumns: 'repeat(5, 1fr)',
    backgroundColor: 'rgba(20, 32, 28, 0.85)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    zIndex: 100,
    paddingBottom: 'calc(env(safe-area-inset-bottom) + 6px)',
  },
  item: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '4px',
    padding: '6px 0',
    position: 'relative',
    color: colors.textDeep,
    transition: 'color 0.15s',
    height: '100%',
  },
  itemActive: {
    color: colors.textPrimary,
  },
  glyph: {
    fontSize: '22px',
    lineHeight: 1,
  },
  label: {
    fontSize: '10px',
    fontWeight: 500,
  },
  pip: {
    position: 'absolute',
    bottom: '2px',
    width: '4px',
    height: '4px',
    borderRadius: radii.full,
    backgroundColor: colors.accent,
    opacity: 0,
    transition: 'opacity 0.15s',
  },
  pipActive: {
    opacity: 1,
  },
});

