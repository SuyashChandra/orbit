import { useState } from 'react';
import * as stylex from '@stylexjs/stylex';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api.js';
import { colors, font, radii, spacing } from '../../styles/tokens.stylex.js';
import { useAuthStore } from '../auth/authStore.js';
import type { PostDTO, CommentDTO } from '@orbit/shared';
import { REACTION_TYPES } from '@orbit/shared';

const REACTION_EMOJI: Record<string, string> = { like: '👍', fire: '🔥', strong: '💪' };

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

  return (
    <article {...stylex.props(styles.card)}>
      {/* Header */}
      <div {...stylex.props(styles.header)}>
        <div {...stylex.props(styles.avatarWrap)}>
          {post.author.avatar
            ? <img src={post.author.avatar} alt="" {...stylex.props(styles.avatar)} />
            : <div {...stylex.props(styles.avatarFallback)}>{post.author.name[0]?.toUpperCase()}</div>
          }
        </div>
        <div {...stylex.props(styles.authorInfo)}>
          <span {...stylex.props(styles.authorName)}>{post.author.name}</span>
          <span {...stylex.props(styles.timestamp)}>{timestamp}</span>
        </div>
        {isOwn && (
          <button
            onClick={() => { if (confirm('Delete this post?')) deleteMutation.mutate(); }}
            {...stylex.props(styles.deleteBtn)}
          >✕</button>
        )}
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
                {REACTION_EMOJI[type]} {summary ? summary.count : ''}
              </button>
            );
          })}
        </div>
        <button
          onClick={() => setShowComments((v) => !v)}
          {...stylex.props(styles.commentToggle)}
        >
          💬 {post.commentCount > 0 ? post.commentCount : ''}
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
    border: `1px solid ${colors.border}`,
    borderRadius: radii.lg,
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.s3,
    padding: `${spacing.s4} ${spacing.s4} ${spacing.s2}`,
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
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: font.md,
    fontWeight: 700,
  },
  authorInfo: { flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' },
  authorName: { fontSize: font.md, fontWeight: 700, color: colors.textPrimary },
  timestamp: { fontSize: font.xs, color: colors.textSecondary },
  deleteBtn: {
    background: 'none',
    border: 'none',
    color: colors.textSecondary,
    fontSize: font.sm,
    cursor: 'pointer',
    padding: spacing.s1,
  },
  content: {
    padding: `${spacing.s2} ${spacing.s4} ${spacing.s3}`,
    fontSize: font.md,
    color: colors.textPrimary,
    lineHeight: '1.5',
    whiteSpace: 'pre-wrap',
  },
  imagesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '2px',
    margin: `0 ${spacing.s4} ${spacing.s3}`,
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
    margin: `0 ${spacing.s4} ${spacing.s3}`,
    padding: `${spacing.s2} ${spacing.s3}`,
    backgroundColor: colors.bg,
    borderRadius: radii.md,
    border: `1px solid ${colors.border}`,
  },
  linkedIcon: { fontSize: font.md },
  linkedText: { fontSize: font.sm, color: colors.textPrimary, fontWeight: 500 },
  linkedDate: { color: colors.textSecondary, fontWeight: 400 },
  reactionBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: `${spacing.s2} ${spacing.s3}`,
    borderTop: `1px solid ${colors.border}`,
  },
  reactions: { display: 'flex', gap: spacing.s1 },
  reactionBtn: {
    background: 'none',
    border: `1px solid ${colors.border}`,
    borderRadius: radii.full,
    padding: `${spacing.s1} ${spacing.s3}`,
    fontSize: font.sm,
    cursor: 'pointer',
    color: colors.textSecondary,
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  reactionBtnActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
    color: '#fff',
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
    borderTop: `1px solid ${colors.border}`,
    padding: `${spacing.s3} ${spacing.s4}`,
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
    backgroundColor: colors.bg,
    border: `1px solid ${colors.border}`,
    borderRadius: radii.md,
    color: colors.textPrimary,
    fontSize: font.sm,
  },
  commentSubmit: {
    padding: `${spacing.s2} ${spacing.s3}`,
    backgroundColor: colors.accent,
    color: '#fff',
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
