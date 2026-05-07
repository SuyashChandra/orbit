import { useRef, useState } from 'react';
import * as stylex from '@stylexjs/stylex';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api.js';
import { colors, font, radii, spacing } from '../../styles/tokens.stylex.js';
import type { PostDTO, WorkoutLogDTO, BadmintonGameDTO } from '@orbit/shared';

interface Props {
  onClose: () => void;
}

export function CreatePostModal({ onClose }: Props) {
  const qc = useQueryClient();
  const [content, setContent] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [linkedWorkoutLogId, setLinkedWorkoutLogId] = useState<string | null>(null);
  const [linkedGameId, setLinkedGameId] = useState<string | null>(null);
  const [showWorkoutPicker, setShowWorkoutPicker] = useState(false);
  const [showGamePicker, setShowGamePicker] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const today = new Date().toISOString().slice(0, 10);
  const workoutLogsQ = useQuery<WorkoutLogDTO[]>({
    queryKey: ['workoutlogs-recent', today],
    queryFn: async () => {
      const results: WorkoutLogDTO[] = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const date = d.toISOString().slice(0, 10);
        const { data } = await api.get<WorkoutLogDTO[]>(`/logs?date=${date}`);
        results.push(...data);
      }
      return results;
    },
    enabled: showWorkoutPicker,
  });

  const gamesQ = useQuery<BadmintonGameDTO[]>({
    queryKey: ['games'],
    queryFn: () => api.get<BadmintonGameDTO[]>('/games').then((r) => r.data),
    enabled: showGamePicker,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const body: { content: string; workoutLogId?: string; gameId?: string } = { content };
      if (linkedWorkoutLogId) body.workoutLogId = linkedWorkoutLogId;
      if (linkedGameId) body.gameId = linkedGameId;
      const { data: post } = await api.post<PostDTO>('/posts', body);

      for (const file of images) {
        const form = new FormData();
        form.append('file', file);
        await api.post(`/posts/${post.id}/images`, form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }
      return post;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['feed'] });
      onClose();
    },
  });

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const remaining = 4 - images.length;
    const toAdd = Array.from(files).slice(0, remaining);
    setImages((prev) => [...prev, ...toAdd]);
    toAdd.forEach((f) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setImagePreviews((prev) => [...prev, e.target!.result as string]);
        }
      };
      reader.readAsDataURL(f);
    });
  };

  const removeImage = (i: number) => {
    setImages((prev) => prev.filter((_, idx) => idx !== i));
    setImagePreviews((prev) => prev.filter((_, idx) => idx !== i));
  };

  const canSubmit = content.trim().length > 0 && !createMutation.isPending;

  return (
    <div {...stylex.props(styles.overlay)} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div {...stylex.props(styles.modal)}>
        <div {...stylex.props(styles.header)}>
          <h3 {...stylex.props(styles.title)}>New Post</h3>
          <button onClick={onClose} {...stylex.props(styles.closeBtn)}>✕</button>
        </div>

        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="What's on your mind?"
          autoFocus
          {...stylex.props(styles.textarea)}
        />

        {/* Image previews */}
        {imagePreviews.length > 0 && (
          <div {...stylex.props(styles.previews)}>
            {imagePreviews.map((src, i) => (
              <div key={i} {...stylex.props(styles.previewWrap)}>
                <img src={src} alt="" {...stylex.props(styles.preview)} />
                <button onClick={() => removeImage(i)} {...stylex.props(styles.removeImg)}>✕</button>
              </div>
            ))}
          </div>
        )}

        {/* Linked workout */}
        {linkedWorkoutLogId && (
          <div {...stylex.props(styles.linked)}>
            🏋️ Workout log linked
            <button onClick={() => setLinkedWorkoutLogId(null)} {...stylex.props(styles.unlinkBtn)}>✕</button>
          </div>
        )}

        {/* Linked game */}
        {linkedGameId && (
          <div {...stylex.props(styles.linked)}>
            🏸 Game linked
            <button onClick={() => setLinkedGameId(null)} {...stylex.props(styles.unlinkBtn)}>✕</button>
          </div>
        )}

        {/* Workout picker */}
        {showWorkoutPicker && (
          <div {...stylex.props(styles.picker)}>
            <div {...stylex.props(styles.pickerHeader)}>
              <span {...stylex.props(styles.pickerTitle)}>Link a workout</span>
              <button onClick={() => setShowWorkoutPicker(false)} {...stylex.props(styles.closeBtn)}>✕</button>
            </div>
            {workoutLogsQ.isLoading && <p {...stylex.props(styles.muted)}>Loading…</p>}
            {workoutLogsQ.data?.slice(0, 10).map((log) => (
              <button
                key={log.id}
                onClick={() => {
                  setLinkedWorkoutLogId(log.id);
                  setLinkedGameId(null);
                  setShowWorkoutPicker(false);
                }}
                {...stylex.props(styles.pickerItem)}
              >
                {new Date(log.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                {log.workout && <span {...stylex.props(styles.pickerSub)}> · {log.workout.name}</span>}
              </button>
            ))}
            {workoutLogsQ.data?.length === 0 && <p {...stylex.props(styles.muted)}>No logs yet</p>}
          </div>
        )}

        {/* Game picker */}
        {showGamePicker && (
          <div {...stylex.props(styles.picker)}>
            <div {...stylex.props(styles.pickerHeader)}>
              <span {...stylex.props(styles.pickerTitle)}>Link a game</span>
              <button onClick={() => setShowGamePicker(false)} {...stylex.props(styles.closeBtn)}>✕</button>
            </div>
            {gamesQ.isLoading && <p {...stylex.props(styles.muted)}>Loading…</p>}
            {gamesQ.data?.slice(0, 10).map((g) => (
              <button
                key={g.id}
                onClick={() => {
                  setLinkedGameId(g.id);
                  setLinkedWorkoutLogId(null);
                  setShowGamePicker(false);
                }}
                {...stylex.props(styles.pickerItem)}
              >
                🏸 {new Date(g.scheduledAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                {g.location && <span {...stylex.props(styles.pickerSub)}> · {g.location}</span>}
              </button>
            ))}
            {gamesQ.data?.length === 0 && <p {...stylex.props(styles.muted)}>No games yet</p>}
          </div>
        )}

        {/* Toolbar */}
        <div {...stylex.props(styles.toolbar)}>
          <div {...stylex.props(styles.toolbarLeft)}>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={images.length >= 4}
              {...stylex.props(styles.toolBtn)}
              title="Add photo"
            >📷</button>
            <button
              onClick={() => { setShowWorkoutPicker((v) => !v); setShowGamePicker(false); }}
              {...stylex.props(styles.toolBtn, !!linkedWorkoutLogId && styles.toolBtnActive)}
              title="Link workout"
            >🏋️</button>
            <button
              onClick={() => { setShowGamePicker((v) => !v); setShowWorkoutPicker(false); }}
              {...stylex.props(styles.toolBtn, !!linkedGameId && styles.toolBtnActive)}
              title="Link game"
            >🏸</button>
          </div>
          <button
            onClick={() => createMutation.mutate()}
            disabled={!canSubmit}
            {...stylex.props(styles.postBtn)}
          >
            {createMutation.isPending ? 'Posting…' : 'Post'}
          </button>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          style={{ display: 'none' }}
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>
    </div>
  );
}

const styles = stylex.create({
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
    zIndex: 200,
  },
  modal: {
    width: '100%',
    maxWidth: '600px',
    backgroundColor: colors.surface,
    borderRadius: `${radii.lg} ${radii.lg} 0 0`,
    display: 'flex',
    flexDirection: 'column',
    maxHeight: '90vh',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: `${spacing.s4} ${spacing.s4} ${spacing.s3}`,
    borderBottom: `1px solid ${colors.border}`,
  },
  title: { fontSize: font.lg, fontWeight: 700, color: colors.textPrimary },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: colors.textSecondary,
    fontSize: font.md,
    cursor: 'pointer',
    padding: spacing.s1,
  },
  textarea: {
    padding: spacing.s4,
    backgroundColor: 'transparent',
    border: 'none',
    color: colors.textPrimary,
    fontSize: font.md,
    resize: 'none',
    minHeight: '120px',
    outline: 'none',
    lineHeight: '1.5',
  },
  previews: {
    display: 'flex',
    gap: spacing.s2,
    padding: `0 ${spacing.s4} ${spacing.s2}`,
    flexWrap: 'wrap',
  },
  previewWrap: { position: 'relative', display: 'inline-block' },
  preview: {
    width: '80px',
    height: '80px',
    objectFit: 'cover',
    borderRadius: radii.md,
    display: 'block',
  },
  removeImg: {
    position: 'absolute',
    top: '-6px',
    right: '-6px',
    width: '20px',
    height: '20px',
    borderRadius: radii.full,
    backgroundColor: colors.danger,
    color: colors.fgOnAccent,
    border: 'none',
    fontSize: '10px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  linked: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.s2,
    padding: `${spacing.s2} ${spacing.s4}`,
    fontSize: font.sm,
    color: colors.textSecondary,
  },
  unlinkBtn: {
    background: 'none',
    border: 'none',
    color: colors.textSecondary,
    fontSize: font.xs,
    cursor: 'pointer',
  },
  picker: {
    borderTop: `1px solid ${colors.border}`,
    maxHeight: '200px',
    overflowY: 'auto',
    padding: `${spacing.s2} ${spacing.s4}`,
  },
  pickerHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.s2,
  },
  pickerTitle: { fontSize: font.sm, fontWeight: 700, color: colors.textPrimary },
  pickerItem: {
    display: 'block',
    width: '100%',
    textAlign: 'left',
    padding: `${spacing.s2} ${spacing.s3}`,
    background: 'none',
    border: `1px solid ${colors.border}`,
    borderRadius: radii.md,
    color: colors.textPrimary,
    fontSize: font.sm,
    cursor: 'pointer',
    marginBottom: spacing.s1,
  },
  pickerSub: { color: colors.textSecondary },
  muted: { fontSize: font.sm, color: colors.textSecondary, textAlign: 'center', padding: spacing.s3 },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: `${spacing.s3} ${spacing.s4}`,
    borderTop: `1px solid ${colors.border}`,
  },
  toolbarLeft: { display: 'flex', gap: spacing.s2 },
  toolBtn: {
    background: 'none',
    border: `1px solid ${colors.border}`,
    borderRadius: radii.md,
    padding: `${spacing.s2} ${spacing.s3}`,
    fontSize: font.md,
    cursor: 'pointer',
    ':disabled': { opacity: 0.4, cursor: 'not-allowed' },
  },
  toolBtnActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  postBtn: {
    padding: `${spacing.s2} ${spacing.s5}`,
    backgroundColor: colors.accent,
    color: colors.fgOnAccent,
    border: 'none',
    borderRadius: radii.full,
    fontSize: font.md,
    fontWeight: 700,
    cursor: 'pointer',
    ':disabled': { opacity: 0.5, cursor: 'not-allowed' },
  },
});
