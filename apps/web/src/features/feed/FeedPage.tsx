import { useEffect, useRef, useState } from 'react';
import * as stylex from '@stylexjs/stylex';
import { useInfiniteQuery } from '@tanstack/react-query';
import { api } from '../../lib/api.js';
import { colors, font, radii, spacing } from '../../styles/tokens.stylex.js';
import { useAuthStore } from '../auth/authStore.js';
import { PostCard } from './PostCard.js';
import { CreatePostModal } from './CreatePostModal.js';
import type { PostDTO } from '@orbit/shared';

function greetingWord() {
  const h = new Date().getHours();
  if (h < 5) return 'Good night';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

interface FeedPage {
  posts: PostDTO[];
  nextCursor: string | null;
}

export function FeedPage() {
  const user = useAuthStore((s) => s.user);
  const [showCreate, setShowCreate] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const firstName = user?.name?.split(' ')[0] ?? 'there';

  const feedQ = useInfiniteQuery<FeedPage>({
    queryKey: ['feed'],
    queryFn: ({ pageParam }) => {
      const cursor = pageParam as string | undefined;
      const url = cursor ? `/feed?cursor=${encodeURIComponent(cursor)}` : '/feed';
      return api.get<FeedPage>(url).then((r) => r.data);
    },
    initialPageParam: undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });

  // Infinite scroll sentinel
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && feedQ.hasNextPage && !feedQ.isFetchingNextPage) {
          void feedQ.fetchNextPage();
        }
      },
      { rootMargin: '200px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [feedQ]);

  const allPosts = feedQ.data?.pages.flatMap((p) => p.posts) ?? [];

  return (
    <div {...stylex.props(styles.page)}>
      {/* Greeting */}
      <div {...stylex.props(styles.greeting)}>
        <h1 {...stylex.props(styles.greetingTitle)}>
          {greetingWord()}, {firstName}
        </h1>
        <span {...stylex.props(styles.greetingSub)}>
          A little bit of everything you care about.
        </span>
      </div>

      {/* Compose button */}
      <div {...stylex.props(styles.composeBar)}>
        <button onClick={() => setShowCreate(true)} {...stylex.props(styles.composeBtn)}>
          Share something with your circle…
        </button>
      </div>

      {/* Feed */}
      <div {...stylex.props(styles.feed)}>
        {feedQ.isLoading && (
          <div {...stylex.props(styles.center)}>
            <p {...stylex.props(styles.muted)}>Loading feed…</p>
          </div>
        )}

        {!feedQ.isLoading && allPosts.length === 0 && (
          <div {...stylex.props(styles.empty)}>
            <p {...stylex.props(styles.emptyTitle)}>Nothing here yet</p>
            <p {...stylex.props(styles.emptyBody)}>
              Add friends and share your workouts and games to get started.
            </p>
            <button onClick={() => setShowCreate(true)} {...stylex.props(styles.emptyBtn)}>
              Create your first post
            </button>
          </div>
        )}

        {allPosts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}

        {/* Scroll sentinel */}
        <div ref={sentinelRef} />

        {feedQ.isFetchingNextPage && (
          <p {...stylex.props(styles.muted, styles.center)}>Loading more…</p>
        )}

        {!feedQ.hasNextPage && allPosts.length > 0 && (
          <p {...stylex.props(styles.muted, styles.center)}>You're all caught up ✿</p>
        )}
      </div>

      {showCreate && <CreatePostModal onClose={() => setShowCreate(false)} />}
    </div>
  );
}

const styles = stylex.create({
  page: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
  },
  greeting: {
    padding: `${spacing.s4} ${spacing.s5} ${spacing.s2}`,
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  greetingTitle: {
    fontFamily: font.display,
    fontWeight: 600,
    fontSize: '26px',
    letterSpacing: '-0.02em',
    lineHeight: 1.1,
    color: colors.textPrimary,
    margin: 0,
  },
  greetingSub: {
    fontSize: font.sm,
    color: colors.textSecondary,
  },
  composeBar: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.s3,
    padding: `${spacing.s2} ${spacing.s4} ${spacing.s4}`,
    backgroundColor: colors.bg,
    flexShrink: 0,
  },
  composeBtn: {
    flex: 1,
    padding: `${spacing.s3} ${spacing.s5}`,
    backgroundColor: colors.surface,
    border: 'none',
    borderRadius: radii.full,
    color: colors.textSecondary,
    fontSize: font.sm,
    textAlign: 'left',
    cursor: 'pointer',
  },
  feed: {
    flex: 1,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.s3,
    padding: spacing.s3,
  },
  center: {
    textAlign: 'center',
    paddingTop: spacing.s8,
  },
  muted: {
    color: colors.textSecondary,
    fontSize: font.sm,
    textAlign: 'center',
    padding: spacing.s4,
  },
  empty: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: spacing.s3,
    paddingTop: spacing.s12,
    paddingLeft: spacing.s6,
    paddingRight: spacing.s6,
    textAlign: 'center',
  },
  emptyTitle: {
    fontFamily: font.display,
    fontSize: font.xl,
    fontWeight: 600,
    letterSpacing: '-0.02em',
    color: colors.textPrimary,
  },
  emptyBody: {
    fontSize: font.md,
    color: colors.textSecondary,
    lineHeight: '1.5',
  },
  emptyBtn: {
    padding: `${spacing.s3} ${spacing.s6}`,
    backgroundColor: colors.accent,
    color: colors.fgOnAccent,
    border: 'none',
    borderRadius: radii.full,
    fontSize: font.md,
    fontWeight: 700,
    cursor: 'pointer',
    marginTop: spacing.s2,
  },
});
