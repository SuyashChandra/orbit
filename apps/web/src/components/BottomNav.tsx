import { NavLink } from 'react-router';

const NAV_ITEMS = [
  { to: '/',          label: 'Home',   glyph: '☾' },
  { to: '/jobs',      label: 'Work',   glyph: '✦' },
  { to: '/gym',       label: 'Move',   glyph: '◐' },
  { to: '/badminton', label: 'Play',   glyph: '◉' },
  { to: '/friends',   label: 'People', glyph: '✿' },
] as const;

export function BottomNav() {
  return (
    <nav
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] h-[var(--bottom-nav-height)] grid grid-cols-5 z-[100]"
      style={{
        backgroundColor: 'rgba(20, 32, 28, 0.85)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        paddingBottom: 'calc(env(safe-area-inset-bottom) + 6px)',
      }}
    >
      {NAV_ITEMS.map((item) => (
        <NavLink key={item.to} to={item.to} end={item.to === '/'}>
          {({ isActive }) => (
            <div className={`flex flex-col items-center justify-center gap-1 py-1.5 relative transition h-full ${isActive ? 'text-fg' : 'text-fg-dim'}`}>
              <span style={{ fontSize: '22px', lineHeight: 1 }}>{item.glyph}</span>
              <span className="text-[10px] font-medium">{item.label}</span>
              <span
                className={`absolute bottom-0.5 w-1 h-1 rounded-full bg-accent transition-opacity ${isActive ? 'opacity-100' : 'opacity-0'}`}
              />
            </div>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
