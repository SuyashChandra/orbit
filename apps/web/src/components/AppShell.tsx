import { Outlet } from 'react-router';
import { BottomNav } from './BottomNav.js';
import { TopBar } from './TopBar.js';

export function AppShell() {
  return (
    <div className="flex flex-col h-full max-w-[480px] mx-auto relative">
      <TopBar />
      <main className="flex-1 overflow-y-auto pt-[var(--nav-height)] pb-[var(--bottom-nav-height)]">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
