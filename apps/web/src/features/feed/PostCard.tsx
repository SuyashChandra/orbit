import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api.js';
import { avatarColor } from '../../lib/avatarColor.js';
import { useAuthStore } from '../auth/authStore.js';
import type { PostDTO, CommentDTO } from '@orbit/shared';
import { REACTION_TYPES } from '@orbit/shared';

// Display only — wire-protocol reaction types stay 'like' | 'fire' | 'strong'.
const REACTION_GLYPH: Record<string, string> = { like: '♡', fire: '✦', strong: '◐' };

interface Props {
  post: PostDTO;
  onDelete?: () => void;
}

export function PostCard({ post, onDelete }: Props) {
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close the kebab menu on outside click / Escape
  useEffect(() => {
    if (!menuOpen) return;
    const onDocClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOpen(false); };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onEsc);
    };
  }, [menuOpen]);

  const reactMutation = useMutation({
    mutationFn: async (type: string) => {
      if (post.userReaction === type) {
        await api.delete(`/posts/${post.id}/reactions`);
      } else {
        await api.post(`/posts/${post.id}/reactions`, { type });
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['feed'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/posts/${post.id}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['feed'] });
      onDelete?.();
    },
  });

  const commentMutation = useMutation({
    mutationFn: (content: string) =>
      api.post<CommentDTO>(`/posts/${post.id}/comments`, { content }).then((r) => r.data),
    onSuccess: () => {
      setCommentText('');
      void qc.invalidateQueries({ queryKey: ['comments', post.id] });
      void qc.invalidateQueries({ queryKey: ['feed'] });
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/comments/${id}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['comments', post.id] });
      void qc.invalidateQueries({ queryKey: ['feed'] });
    },
  });

  const commentsQ = useQuery<{ comments: CommentDTO[] }>({
    queryKey: ['comments', post.id],
    queryFn: () => api.get<{ comments: CommentDTO[] }>(`/posts/${post.id}/comments`).then((r) => r.data),
    enabled: showComments,
  });

  const isOwn = user?.id === post.author.id;
  const timestamp = new Date(post.createdAt).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
  const totalReactions = post.reactions.reduce((s, r) => s + r.count, 0);

  return (
    <article className="bg-surface rounded-lg overflow-hidden py-5 px-5 pb-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <div className="shrink-0">
          {post.author.avatar
            ? <img src={post.author.avatar} alt="" className="w-10 h-10 rounded-full object-cover" />
            : (
              <div
                className="w-10 h-10 rounded-full text-on-accent flex items-center justify-center text-base font-bold"
                style={{ backgroundColor: avatarColor(post.author.id) }}
              >
                {post.author.name[0]?.toUpperCase()}
              </div>
            )
          }
        </div>
        <div className="flex-1 flex flex-col gap-0.5">
          <span className="text-base font-semibold text-fg">{post.author.name}</span>
          <span className="text-xs text-fg-dim">{timestamp}</span>
        </div>
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="w-8 h-8 rounded-full bg-transparent border-none text-fg-dim text-lg cursor-pointer flex items-center justify-center transition hover:bg-surface-2"
            aria-label="More"
          >
            ⋯
          </button>
          {menuOpen && (
            <div className="absolute top-[calc(100%+4px)] right-0 bg-surface-2 rounded-md overflow-hidden min-w-[140px] z-[50]" style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}>
              {isOwn ? (
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    if (confirm('Delete this post?')) deleteMutation.mutate();
                  }}
                  className="block w-full py-3 px-4 bg-transparent border-none text-danger text-sm text-left cursor-pointer hover:bg-raised"
                >
                  Delete post
                </button>
              ) : (
                <button
                  onClick={() => setMenuOpen(false)}
                  className="block w-full py-3 px-4 bg-transparent border-none text-fg text-sm text-left cursor-pointer hover:bg-raised"
                >
                  Hide
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <p className="text-base text-fg whitespace-pre-wrap m-0" style={{ lineHeight: '1.55' }}>{post.content}</p>

      {/* Images */}
      {post.images.length > 0 && (
        <div className={`grid gap-0.5 mt-3 rounded-md overflow-hidden ${post.images.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
          {post.images.map((img) => (
            <button
              key={img.id}
              onClick={() => setLightboxImg(img.url)}
              className="bg-transparent border-none p-0 cursor-pointer block leading-none"
            >
              <img src={img.url} alt="" className="w-full aspect-square object-cover block" />
            </button>
          ))}
        </div>
      )}

      {/* Linked workout */}
      {post.workoutLog && (
        <div className="flex items-center gap-2 mt-3 py-3 px-4 bg-surface-2 rounded-md">
          <span className="text-base">🏋️</span>
          <span className="text-sm text-fg font-medium">
            Workout{post.workoutLog.workoutName ? ` · ${post.workoutLog.workoutName}` : ''}
            <span className="text-fg-muted font-normal">
              {' · '}{new Date(post.workoutLog.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          </span>
        </div>
      )}

      {/* Linked game */}
      {post.game && (
        <div className="flex items-center gap-2 mt-3 py-3 px-4 bg-surface-2 rounded-md">
          <span className="text-base">🏸</span>
          <span className="text-sm text-fg font-medium">
            Badminton game
            {post.game.location && ` · ${post.game.location}`}
            <span className="text-fg-muted font-normal">
              {' · '}{new Date(post.game.scheduledAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          </span>
        </div>
      )}

      {/* Reaction bar */}
      <div className="flex items-center justify-between mt-3">
        <div className="flex gap-1">
          {REACTION_TYPES.map((type) => {
            const summary = post.reactions.find((r) => r.type === type);
            const active = post.userReaction === type;
            return (
              <button
                key={type}
                onClick={() => reactMutation.mutate(type)}
                className={`bg-transparent border-none rounded-full py-2 px-3 text-sm font-medium cursor-pointer flex items-center gap-1.5 transition ${active ? 'bg-accent-soft text-accent-bright font-semibold' : 'text-fg-muted'}`}
              >
                <span style={{ fontSize: '15px', lineHeight: 1 }}>{REACTION_GLYPH[type]}</span>
                {summary ? summary.count : null}
              </button>
            );
          })}
        </div>
        <span className="flex-1" />
        {totalReactions > 0 && (
          <span className="text-xs text-fg-dim mr-2">
            {totalReactions} {totalReactions === 1 ? 'reaction' : 'reactions'}
          </span>
        )}
        <button
          onClick={() => setShowComments((v) => !v)}
          className="bg-transparent border-none text-sm text-fg-muted cursor-pointer py-1 px-2 flex items-center gap-1.5"
        >
          <span style={{ fontSize: '15px', lineHeight: 1 }}>◌</span>
          {post.commentCount > 0 ? post.commentCount : 'Reply'}
        </button>
      </div>

      {/* Comments */}
      {showComments && (
        <div className="mt-4 pt-3 border-t border-border-soft flex flex-col gap-3">
          {commentsQ.data?.comments.map((c) => (
            <div key={c.id} className="flex flex-col gap-0.5 relative">
              <div className="text-xs font-bold text-fg">{c.author.name}</div>
              <div className="text-sm text-fg">{c.content}</div>
              {c.author.id === user?.id && (
                <button
                  onClick={() => deleteCommentMutation.mutate(c.id)}
                  className="absolute top-0 right-0 bg-transparent border-none text-fg-muted text-xs cursor-pointer p-1"
                >✕</button>
              )}
            </div>
          ))}
          <div className="flex gap-2 mt-1">
            <input
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Write a comment…"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && commentText.trim()) {
                  commentMutation.mutate(commentText.trim());
                }
              }}
              className="flex-1 py-2 px-3 bg-surface-2 border-none rounded-md text-fg text-sm outline-none"
            />
            <button
              onClick={() => { if (commentText.trim()) commentMutation.mutate(commentText.trim()); }}
              disabled={commentMutation.isPending || !commentText.trim()}
              className="py-2 px-3 bg-accent text-on-accent border-none rounded-md text-sm cursor-pointer font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Send
            </button>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightboxImg && (
        <div
          className="fixed inset-0 flex items-center justify-center z-[1000] cursor-zoom-out"
          style={{ backgroundColor: 'rgba(0,0,0,0.9)' }}
          onClick={() => setLightboxImg(null)}
        >
          <img
            src={lightboxImg}
            alt=""
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-md"
          />
        </div>
      )}
    </article>
  );
}
