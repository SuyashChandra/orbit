import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api.js';
import type { ExerciseDTO, WorkoutDTO } from '@orbit/shared';

interface ExercisesResponse { exercises: ExerciseDTO[]; }

export function WorkoutBuilder({ workout, onBack }: { workout: WorkoutDTO; onBack: () => void }) {
  const [search, setSearch] = useState('');
  const [showPicker, setShowPicker] = useState(false);
  const qc = useQueryClient();

  const workoutQ = useQuery<WorkoutDTO>({
    queryKey: ['workout', workout.id],
    queryFn: () => api.get<WorkoutDTO>(`/workouts/${workout.id}`).then((r) => r.data),
    initialData: workout,
  });

  const debouncedSearch = useDebounce(search, 300);
  const exercisesQ = useQuery<ExercisesResponse>({
    queryKey: ['exercises', debouncedSearch],
    queryFn: () => {
      const params = debouncedSearch ? `?q=${encodeURIComponent(debouncedSearch)}` : '';
      return api.get<ExercisesResponse>(`/exercises${params}`).then((r) => r.data);
    },
    enabled: showPicker,
  });

  const addMutation = useMutation({
    mutationFn: ({ exerciseId, orderIndex }: { exerciseId: string; orderIndex: number }) =>
      api.post<WorkoutDTO>(`/workouts/${workout.id}/exercises`, { exerciseId, orderIndex }).then((r) => r.data),
    onSuccess: (updated) => {
      qc.setQueryData(['workout', workout.id], updated);
      setShowPicker(false);
      setSearch('');
    },
  });

  const removeMutation = useMutation({
    mutationFn: (exerciseId: string) =>
      api.delete(`/workouts/${workout.id}/exercises/${exerciseId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workout', workout.id] }),
  });

  const reorderMutation = useMutation({
    mutationFn: (exerciseList: { id: string; orderIndex: number }[]) =>
      api.patch<WorkoutDTO>(`/workouts/${workout.id}/exercises`, { exercises: exerciseList }).then((r) => r.data),
    onSuccess: (updated) => qc.setQueryData(['workout', workout.id], updated),
  });

  const current = workoutQ.data!;
  const sorted = [...current.exercises].sort((a, b) => a.orderIndex - b.orderIndex);

  const moveUp = (idx: number) => {
    if (idx === 0) return;
    const reordered = sorted.map((e, i) => {
      if (i === idx - 1) return { id: e.id, orderIndex: idx };
      if (i === idx) return { id: e.id, orderIndex: idx - 1 };
      return { id: e.id, orderIndex: i };
    });
    reorderMutation.mutate(reordered);
  };

  const moveDown = (idx: number) => {
    if (idx === sorted.length - 1) return;
    const reordered = sorted.map((e, i) => {
      if (i === idx) return { id: e.id, orderIndex: idx + 1 };
      if (i === idx + 1) return { id: e.id, orderIndex: idx };
      return { id: e.id, orderIndex: i };
    });
    reorderMutation.mutate(reordered);
  };

  const existingIds = new Set(current.exercises.map((e) => e.exercise.id));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="bg-transparent border-none text-accent text-base cursor-pointer p-0">← Back</button>
        <h3 className="text-lg font-bold text-fg">{current.name}</h3>
      </div>

      {sorted.length === 0 && (
        <p className="text-fg-muted text-sm text-center pt-4">No exercises yet. Add some below.</p>
      )}

      <div className="flex flex-col gap-2">
        {sorted.map((we, idx) => (
          <div key={we.id} className="flex items-center gap-2 py-3 px-3 bg-surface border border-border rounded-md">
            <div className="flex flex-col gap-0.5">
              <button
                onClick={() => moveUp(idx)}
                disabled={idx === 0}
                className="bg-transparent border-none text-fg-muted text-[10px] cursor-pointer p-0.5 leading-none disabled:opacity-30"
              >▲</button>
              <button
                onClick={() => moveDown(idx)}
                disabled={idx === sorted.length - 1}
                className="bg-transparent border-none text-fg-muted text-[10px] cursor-pointer p-0.5 leading-none disabled:opacity-30"
              >▼</button>
            </div>
            <div className="flex-1">
              <p className="text-base font-semibold text-fg">{we.exercise.name}</p>
              <p className="text-xs text-fg-muted">{we.exercise.category}</p>
            </div>
            <button
              onClick={() => removeMutation.mutate(we.exercise.id)}
              className="bg-transparent border-none text-fg-muted cursor-pointer text-base p-1"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      <button
        onClick={() => setShowPicker(true)}
        className="py-3 px-4 bg-transparent border border-dashed border-border rounded-md text-fg-muted text-base cursor-pointer w-full"
      >
        + Add Exercise
      </button>

      {/* Exercise picker */}
      {showPicker && (
        <div
          className="fixed inset-0 z-[200] flex items-end"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
          onClick={() => setShowPicker(false)}
        >
          <div
            className="w-full max-w-[480px] mx-auto bg-bg flex flex-col max-h-[75dvh]"
            style={{ borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex gap-2 p-4 border-b border-border shrink-0">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search exercises…"
                autoFocus
                className="flex-1 py-2 px-3 bg-surface border border-border rounded-md text-fg text-base"
              />
              <button
                onClick={() => setShowPicker(false)}
                className="bg-transparent border-none text-fg-muted text-lg cursor-pointer"
              >✕</button>
            </div>
            <div className="overflow-y-auto flex-1 p-2">
              {exercisesQ.isLoading && <p className="text-fg-muted text-sm text-center pt-4">Loading…</p>}
              {exercisesQ.data?.exercises
                .filter((e) => !existingIds.has(e.id))
                .map((ex) => (
                  <button
                    key={ex.id}
                    onClick={() => addMutation.mutate({ exerciseId: ex.id, orderIndex: sorted.length })}
                    disabled={addMutation.isPending}
                    className="block w-full py-3 px-4 bg-transparent border-none border-b border-border text-left cursor-pointer"
                  >
                    <p className="text-base font-semibold text-fg">{ex.name}</p>
                    <p className="text-xs text-fg-muted">{ex.category}</p>
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useState(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  });
  return debounced;
}
