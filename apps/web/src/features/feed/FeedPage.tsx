import { useEffect, useRef, useState } from 'react';
import * as stylex from '@stylexjs/stylex';
import { useInfiniteQuery } from '@tanstack/react-query';
import { api } from '../../lib/api.js';
import { colors, font, radii, spacing } from '../../styles/tokens.stylex.js';
import { PostCard } from './PostCard.js';
import { CreatePostModal } from './CreatePostModal.js';
import type { PostDTO } from '@orbit/shared';

interface FeedPage {
  posts: PostDTO[];
  nextCursor: string | null;
}

export function FeedPage() {
  const [showCreate, setShowCreate] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

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
      {/* Compose button */}
      <div {...stylex.props(styles.composeBar)}>
        <button onClick={() => setShowCreate(true)} {...stylex.props(styles.composeBtn)}>
          What's on your mind?
        </button>
        <button onClick={() => setShowCreate(true)} {...stylex.props(styles.postIconBtn)}>
          ✏️
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
          <p {...stylex.props(styles.muted, styles.center)}>You're all caught up 🎉</p>
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
  composeBar: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.s3,
    padding: spacing.s3,
    borderBottom: `1px solid ${colors.border}`,
    backgroundColor: colors.bg,
    flexShrink: 0,
  },
  composeBtn: {
    flex: 1,
    padding: `${spacing.s3} ${spacing.s4}`,
    backgroundColor: colors.surface,
    border: `1px solid ${colors.border}`,
    borderRadius: radii.full,
    color: colors.textSecondary,
    fontSize: font.md,
    textAlign: 'left',
    cursor: 'pointer',
  },
  postIconBtn: {
    width: '40px',
    height: '40px',
    backgroundColor: colors.accent,
    border: 'none',
    borderRadius: radii.full,
    fontSize: font.md,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
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
    fontSize: font.xl,
    fontWeight: 700,
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
    color: '#fff',
    border: 'none',
    borderRadius: radii.full,
    fontSize: font.md,
    fontWeight: 700,
    cursor: 'pointer',
    marginTop: spacing.s2,
  },
});
