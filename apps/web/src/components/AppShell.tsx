import * as stylex from '@stylexjs/stylex';
import { Outlet } from 'react-router';
import { BottomNav } from './BottomNav.js';
import { TopBar } from './TopBar.js';

export function AppShell() {
  return (
    <div {...stylex.props(styles.shell)}>
      <TopBar />
      <main {...stylex.props(styles.main)}>
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}

const styles = stylex.create({
  shell: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    maxWidth: '480px',
    margin: '0 auto',
    position: 'relative',
  },
  main: {
    flex: 1,
    overflowY: 'auto',
    paddingTop: 'var(--nav-height)',
    paddingBottom: 'var(--bottom-nav-height)',
  },
});
