import { useEffect, useRef, useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { api } from '../../lib/api.js';
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
    <div className="flex flex-col h-full">
      {/* Greeting */}
      <div className="py-4 px-5 pb-2 flex flex-col gap-0.5">
        <h1 className="font-display font-semibold text-[26px] text-fg m-0 leading-[1.1]" style={{ letterSpacing: '-0.02em' }}>
          {greetingWord()}, {firstName}
        </h1>
        <span className="text-sm text-fg-muted">
          A little bit of everything you care about.
        </span>
      </div>

      {/* Compose button */}
      <div className="flex items-center gap-3 py-2 px-4 pb-4 bg-bg shrink-0">
        <button
          onClick={() => setShowCreate(true)}
          className="flex-1 py-3 px-5 bg-surface border-none rounded-full text-fg-muted text-sm text-left cursor-pointer"
        >
          Share something with your circle…
        </button>
      </div>

      {/* Feed */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-3 p-3">
        {feedQ.isLoading && (
          <div className="text-center pt-8">
            <p className="text-fg-muted text-sm text-center p-4">Loading feed…</p>
          </div>
        )}

        {!feedQ.isLoading && allPosts.length === 0 && (
          <div className="flex flex-col items-center gap-3 pt-12 px-6 text-center">
            <p className="font-display text-xl font-semibold tracking-tight text-fg">Nothing here yet</p>
            <p className="text-base text-fg-muted" style={{ lineHeight: '1.5' }}>
              Add friends and share your workouts and games to get started.
            </p>
            <button
              onClick={() => setShowCreate(true)}
              className="py-3 px-6 bg-accent text-on-accent border-none rounded-full text-base font-bold cursor-pointer mt-2"
            >
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
          <p className="text-fg-muted text-sm text-center p-4">Loading more…</p>
        )}

        {!feedQ.hasNextPage && allPosts.length > 0 && (
          <p className="text-fg-muted text-sm text-center p-4">You're all caught up ✿</p>
        )}
      </div>

      {showCreate && <CreatePostModal onClose={() => setShowCreate(false)} />}
    </div>
  );
}
