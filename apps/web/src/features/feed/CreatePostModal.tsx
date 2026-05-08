import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api.js';
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
    <div
      className="fixed inset-0 flex items-end justify-center z-[200]"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-[600px] bg-surface flex flex-col max-h-[90vh] overflow-hidden rounded-t-lg">
        <div className="flex items-center justify-between py-4 px-4 pb-3 border-b border-border">
          <h3 className="text-lg font-bold text-fg">New Post</h3>
          <button onClick={onClose} className="bg-transparent border-none text-fg-muted text-base cursor-pointer p-1">✕</button>
        </div>

        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="What's on your mind?"
          autoFocus
          className="p-4 bg-transparent border-none text-fg text-base outline-none resize-none min-h-[120px]"
          style={{ lineHeight: '1.5' }}
        />

        {/* Image previews */}
        {imagePreviews.length > 0 && (
          <div className="flex gap-2 px-4 pb-2 flex-wrap">
            {imagePreviews.map((src, i) => (
              <div key={i} className="relative inline-block">
                <img src={src} alt="" className="w-20 h-20 object-cover rounded-md block" />
                <button
                  onClick={() => removeImage(i)}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-danger text-on-accent border-none text-[10px] cursor-pointer flex items-center justify-center"
                >✕</button>
              </div>
            ))}
          </div>
        )}

        {/* Linked workout */}
        {linkedWorkoutLogId && (
          <div className="flex items-center gap-2 py-2 px-4 text-sm text-fg-muted">
            🏋️ Workout log linked
            <button onClick={() => setLinkedWorkoutLogId(null)} className="bg-transparent border-none text-fg-muted text-xs cursor-pointer">✕</button>
          </div>
        )}

        {/* Linked game */}
        {linkedGameId && (
          <div className="flex items-center gap-2 py-2 px-4 text-sm text-fg-muted">
            🏸 Game linked
            <button onClick={() => setLinkedGameId(null)} className="bg-transparent border-none text-fg-muted text-xs cursor-pointer">✕</button>
          </div>
        )}

        {/* Workout picker */}
        {showWorkoutPicker && (
          <div className="border-t border-border max-h-[200px] overflow-y-auto py-2 px-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-fg">Link a workout</span>
              <button onClick={() => setShowWorkoutPicker(false)} className="bg-transparent border-none text-fg-muted text-base cursor-pointer p-1">✕</button>
            </div>
            {workoutLogsQ.isLoading && <p className="text-sm text-fg-muted text-center p-3">Loading…</p>}
            {workoutLogsQ.data?.slice(0, 10).map((log) => (
              <button
                key={log.id}
                onClick={() => {
                  setLinkedWorkoutLogId(log.id);
                  setLinkedGameId(null);
                  setShowWorkoutPicker(false);
                }}
                className="block w-full text-left py-2 px-3 bg-transparent border border-border rounded-md text-fg text-sm cursor-pointer mb-1"
              >
                {new Date(log.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                {log.workout && <span className="text-fg-muted"> · {log.workout.name}</span>}
              </button>
            ))}
            {workoutLogsQ.data?.length === 0 && <p className="text-sm text-fg-muted text-center p-3">No logs yet</p>}
          </div>
        )}

        {/* Game picker */}
        {showGamePicker && (
          <div className="border-t border-border max-h-[200px] overflow-y-auto py-2 px-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-fg">Link a game</span>
              <button onClick={() => setShowGamePicker(false)} className="bg-transparent border-none text-fg-muted text-base cursor-pointer p-1">✕</button>
            </div>
            {gamesQ.isLoading && <p className="text-sm text-fg-muted text-center p-3">Loading…</p>}
            {gamesQ.data?.slice(0, 10).map((g) => (
              <button
                key={g.id}
                onClick={() => {
                  setLinkedGameId(g.id);
                  setLinkedWorkoutLogId(null);
                  setShowGamePicker(false);
                }}
                className="block w-full text-left py-2 px-3 bg-transparent border border-border rounded-md text-fg text-sm cursor-pointer mb-1"
              >
                🏸 {new Date(g.scheduledAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                {g.location && <span className="text-fg-muted"> · {g.location}</span>}
              </button>
            ))}
            {gamesQ.data?.length === 0 && <p className="text-sm text-fg-muted text-center p-3">No games yet</p>}
          </div>
        )}

        {/* Toolbar */}
        <div className="flex items-center justify-between py-3 px-4 border-t border-border">
          <div className="flex gap-2">
            <button
              onClick={() => fileRef.current?.click()}
              disabled={images.length >= 4}
              className="bg-transparent border border-border rounded-md py-2 px-3 text-base cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              title="Add photo"
            >📷</button>
            <button
              onClick={() => { setShowWorkoutPicker((v) => !v); setShowGamePicker(false); }}
              className={`border rounded-md py-2 px-3 text-base cursor-pointer ${linkedWorkoutLogId ? 'bg-accent border-accent' : 'bg-transparent border-border'}`}
              title="Link workout"
            >🏋️</button>
            <button
              onClick={() => { setShowGamePicker((v) => !v); setShowWorkoutPicker(false); }}
              className={`border rounded-md py-2 px-3 text-base cursor-pointer ${linkedGameId ? 'bg-accent border-accent' : 'bg-transparent border-border'}`}
              title="Link game"
            >🏸</button>
          </div>
          <button
            onClick={() => createMutation.mutate()}
            disabled={!canSubmit}
            className="py-2 px-5 bg-accent text-on-accent border-none rounded-full text-base font-bold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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
