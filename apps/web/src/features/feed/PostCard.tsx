import { useEffect, useRef, useState } from 'react';
import * as stylex from '@stylexjs/stylex';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api.js';
import { avatarColor } from '../../lib/avatarColor.js';
import { colors, font, radii, spacing } from '../../styles/tokens.stylex.js';
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
    <article {...stylex.props(styles.card)}>
      {/* Header */}
      <div {...stylex.props(styles.header)}>
        <div {...stylex.props(styles.avatarWrap)}>
          {post.author.avatar
            ? <img src={post.author.avatar} alt="" {...stylex.props(styles.avatar)} />
            : (
              <div
                {...stylex.props(styles.avatarFallback)}
                style={{ backgroundColor: avatarColor(post.author.id) }}
              >
                {post.author.name[0]?.toUpperCase()}
              </div>
            )
          }
        </div>
        <div {...stylex.props(styles.authorInfo)}>
          <span {...stylex.props(styles.authorName)}>{post.author.name}</span>
          <span {...stylex.props(styles.timestamp)}>{timestamp}</span>
        </div>
        <div {...stylex.props(styles.menuWrap)} ref={menuRef}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            {...stylex.props(styles.menuBtn)}
            aria-label="More"
          >
            ⋯
          </button>
          {menuOpen && (
            <div {...stylex.props(styles.menu)}>
              {isOwn ? (
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    if (confirm('Delete this post?')) deleteMutation.mutate();
                  }}
                  {...stylex.props(styles.menuItem, styles.menuItemDanger)}
                >
                  Delete post
                </button>
              ) : (
                <button
                  onClick={() => setMenuOpen(false)}
                  {...stylex.props(styles.menuItem)}
                >
                  Hide
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <p {...stylex.props(styles.content)}>{post.content}</p>

      {/* Images */}
      {post.images.length > 0 && (
        <div {...stylex.props(styles.imagesGrid, post.images.length === 1 && styles.imagesSingle)}>
          {post.images.map((img) => (
            <button
              key={img.id}
              onClick={() => setLightboxImg(img.url)}
              {...stylex.props(styles.imageBtn)}
            >
              <img src={img.url} alt="" {...stylex.props(styles.postImage)} />
            </button>
          ))}
        </div>
      )}

      {/* Linked workout */}
      {post.workoutLog && (
        <div {...stylex.props(styles.linkedCard)}>
          <span {...stylex.props(styles.linkedIcon)}>🏋️</span>
          <span {...stylex.props(styles.linkedText)}>
            Workout{post.workoutLog.workoutName ? ` · ${post.workoutLog.workoutName}` : ''}
            <span {...stylex.props(styles.linkedDate)}>
              {' · '}{new Date(post.workoutLog.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          </span>
        </div>
      )}

      {/* Linked game */}
      {post.game && (
        <div {...stylex.props(styles.linkedCard)}>
          <span {...stylex.props(styles.linkedIcon)}>🏸</span>
          <span {...stylex.props(styles.linkedText)}>
            Badminton game
            {post.game.location && ` · ${post.game.location}`}
            <span {...stylex.props(styles.linkedDate)}>
              {' · '}{new Date(post.game.scheduledAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          </span>
        </div>
      )}

      {/* Reaction bar */}
      <div {...stylex.props(styles.reactionBar)}>
        <div {...stylex.props(styles.reactions)}>
          {REACTION_TYPES.map((type) => {
            const summary = post.reactions.find((r) => r.type === type);
            const active = post.userReaction === type;
            return (
              <button
                key={type}
                onClick={() => reactMutation.mutate(type)}
                {...stylex.props(styles.reactionBtn, active && styles.reactionBtnActive)}
              >
                <span {...stylex.props(styles.reactionGlyph)}>{REACTION_GLYPH[type]}</span>
                {summary ? summary.count : null}
              </button>
            );
          })}
        </div>
        <span {...stylex.props(styles.spacer)} />
        {totalReactions > 0 && (
          <span {...stylex.props(styles.totalCount)}>
            {totalReactions} {totalReactions === 1 ? 'reaction' : 'reactions'}
          </span>
        )}
        <button
          onClick={() => setShowComments((v) => !v)}
          {...stylex.props(styles.commentToggle)}
        >
          <span {...stylex.props(styles.reactionGlyph)}>◌</span>
          {post.commentCount > 0 ? post.commentCount : 'Reply'}
        </button>
      </div>

      {/* Comments */}
      {showComments && (
        <div {...stylex.props(styles.commentsSection)}>
          {commentsQ.data?.comments.map((c) => (
            <div key={c.id} {...stylex.props(styles.comment)}>
              <div {...stylex.props(styles.commentAuthor)}>{c.author.name}</div>
              <div {...stylex.props(styles.commentContent)}>{c.content}</div>
              {c.author.id === user?.id && (
                <button
                  onClick={() => deleteCommentMutation.mutate(c.id)}
                  {...stylex.props(styles.commentDelete)}
                >✕</button>
              )}
            </div>
          ))}
          <div {...stylex.props(styles.commentInput)}>
            <input
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Write a comment…"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && commentText.trim()) {
                  commentMutation.mutate(commentText.trim());
                }
              }}
              {...stylex.props(styles.commentField)}
            />
            <button
              onClick={() => { if (commentText.trim()) commentMutation.mutate(commentText.trim()); }}
              disabled={commentMutation.isPending || !commentText.trim()}
              {...stylex.props(styles.commentSubmit)}
            >
              Send
            </button>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightboxImg && (
        <div {...stylex.props(styles.lightbox)} onClick={() => setLightboxImg(null)}>
          <img src={lightboxImg} alt="" {...stylex.props(styles.lightboxImg)} />
        </div>
      )}
    </article>
  );
}

const styles = stylex.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    overflow: 'hidden',
    padding: `${spacing.s5} ${spacing.s5} ${spacing.s4}`,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.s3,
    marginBottom: spacing.s3,
  },
  avatarWrap: { flexShrink: 0 },
  avatar: {
    width: '40px',
    height: '40px',
    borderRadius: radii.full,
    objectFit: 'cover',
  },
  avatarFallback: {
    width: '40px',
    height: '40px',
    borderRadius: radii.full,
    backgroundColor: colors.accent,
    color: colors.fgOnAccent,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: font.md,
    fontWeight: 700,
  },
  authorInfo: { flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' },
  authorName: { fontSize: font.md, fontWeight: 600, color: colors.textPrimary },
  timestamp: { fontSize: font.xs, color: colors.textDeep },
  menuWrap: { position: 'relative' },
  menuBtn: {
    width: '32px',
    height: '32px',
    borderRadius: radii.full,
    background: 'transparent',
    border: 'none',
    color: colors.textDeep,
    fontSize: font.lg,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background 0.15s',
    ':hover': { backgroundColor: colors.surface2 },
  },
  menu: {
    position: 'absolute',
    top: 'calc(100% + 4px)',
    right: 0,
    backgroundColor: colors.surface2,
    borderRadius: radii.md,
    boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
    overflow: 'hidden',
    minWidth: '140px',
    zIndex: 50,
  },
  menuItem: {
    display: 'block',
    width: '100%',
    padding: `${spacing.s3} ${spacing.s4}`,
    background: 'transparent',
    border: 'none',
    color: colors.textPrimary,
    fontSize: font.sm,
    textAlign: 'left',
    cursor: 'pointer',
    ':hover': { backgroundColor: colors.surfaceRaised },
  },
  menuItemDanger: { color: colors.danger },
  spacer: { flex: 1 },
  totalCount: {
    fontSize: font.xs,
    color: colors.textDeep,
    marginRight: spacing.s2,
  },
  reactionGlyph: {
    fontSize: '15px',
    lineHeight: 1,
  },
  content: {
    fontSize: font.md,
    color: colors.textPrimary,
    lineHeight: '1.55',
    whiteSpace: 'pre-wrap',
    margin: 0,
  },
  imagesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '2px',
    marginTop: spacing.s3,
    borderRadius: radii.md,
    overflow: 'hidden',
  },
  imagesSingle: { gridTemplateColumns: '1fr' },
  imageBtn: {
    background: 'none',
    border: 'none',
    padding: 0,
    cursor: 'pointer',
    display: 'block',
    lineHeight: 0,
  },
  postImage: {
    width: '100%',
    aspectRatio: '1',
    objectFit: 'cover',
    display: 'block',
  },
  linkedCard: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.s2,
    marginTop: spacing.s3,
    padding: `${spacing.s3} ${spacing.s4}`,
    backgroundColor: colors.bgOuter,
    borderRadius: radii.md,
  },
  linkedIcon: { fontSize: font.md },
  linkedText: { fontSize: font.sm, color: colors.textPrimary, fontWeight: 500 },
  linkedDate: { color: colors.textSecondary, fontWeight: 400 },
  reactionBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.s3,
  },
  reactions: { display: 'flex', gap: spacing.s1 },
  reactionBtn: {
    background: 'transparent',
    border: 'none',
    borderRadius: radii.full,
    padding: `${spacing.s2} ${spacing.s3}`,
    fontSize: font.sm,
    fontWeight: 500,
    cursor: 'pointer',
    color: colors.textSecondary,
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    transition: 'background 0.15s, color 0.15s',
  },
  reactionBtnActive: {
    backgroundColor: colors.accentSoft,
    color: colors.accentBright,
    fontWeight: 600,
  },
  commentToggle: {
    background: 'none',
    border: 'none',
    fontSize: font.sm,
    color: colors.textSecondary,
    cursor: 'pointer',
    padding: `${spacing.s1} ${spacing.s2}`,
  },
  commentsSection: {
    marginTop: spacing.s4,
    paddingTop: spacing.s3,
    borderTop: `1px solid ${colors.borderSoft}`,
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.s3,
  },
  comment: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    position: 'relative',
  },
  commentAuthor: { fontSize: font.xs, fontWeight: 700, color: colors.textPrimary },
  commentContent: { fontSize: font.sm, color: colors.textPrimary },
  commentDelete: {
    position: 'absolute',
    top: 0,
    right: 0,
    background: 'none',
    border: 'none',
    color: colors.textSecondary,
    fontSize: font.xs,
    cursor: 'pointer',
    padding: spacing.s1,
  },
  commentInput: { display: 'flex', gap: spacing.s2, marginTop: spacing.s1 },
  commentField: {
    flex: 1,
    padding: `${spacing.s2} ${spacing.s3}`,
    backgroundColor: colors.bgOuter,
    border: 'none',
    borderRadius: radii.md,
    color: colors.textPrimary,
    fontSize: font.sm,
    outline: 'none',
  },
  commentSubmit: {
    padding: `${spacing.s2} ${spacing.s3}`,
    backgroundColor: colors.accent,
    color: colors.fgOnAccent,
    border: 'none',
    borderRadius: radii.md,
    fontSize: font.sm,
    cursor: 'pointer',
    fontWeight: 600,
    ':disabled': { opacity: 0.5, cursor: 'not-allowed' },
  },
  lightbox: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.9)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    cursor: 'zoom-out',
  },
  lightboxImg: {
    maxWidth: '90vw',
    maxHeight: '90vh',
    objectFit: 'contain',
    borderRadius: radii.md,
  },
});
