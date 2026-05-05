import { createBrowserRouter } from 'react-router';
import { AppShell } from './components/AppShell.js';
import { AuthGuard } from './components/AuthGuard.js';

export const router = createBrowserRouter([
  {
    path: '/login',
    lazy: () => import('./features/auth/LoginPage.js').then((m) => ({ Component: m.LoginPage })),
  },
  {
    path: '/',
    element: (
      <AuthGuard>
        <AppShell />
      </AuthGuard>
    ),
    children: [
      {
        index: true,
        lazy: () => import('./features/feed/FeedPage.js').then((m) => ({ Component: m.FeedPage })),
      },
      {
        path: 'jobs',
        lazy: () => import('./features/jobs/JobsPage.js').then((m) => ({ Component: m.JobsPage })),
      },
      {
        path: 'jobs/:id',
        lazy: () =>
          import('./features/jobs/JobDetailPage.js').then((m) => ({ Component: m.JobDetailPage })),
      },
      {
        path: 'gym',
        lazy: () => import('./features/gym/GymPage.js').then((m) => ({ Component: m.GymPage })),
      },
      {
        path: 'badminton',
        lazy: () =>
          import('./features/badminton/BadmintonPage.js').then((m) => ({
            Component: m.BadmintonPage,
          })),
      },
      {
        path: 'badminton/:id',
        lazy: () =>
          import('./features/badminton/GameDetailPage.js').then((m) => ({
            Component: m.GameDetailPage,
          })),
      },
      {
        path: 'friends',
        lazy: () =>
          import('./features/friends/FriendsPage.js').then((m) => ({
            Component: m.FriendsPage,
          })),
      },
      {
        path: 'profile',
        lazy: () =>
          import('./features/profile/ProfilePage.js').then((m) => ({
            Component: m.ProfilePage,
          })),
      },
    ],
  },
  // Public game detail (shareable link — no auth required)
  {
    path: '/games/:id',
    lazy: () =>
      import('./features/badminton/PublicGamePage.js').then((m) => ({
        Component: m.PublicGamePage,
      })),
  },
]);
