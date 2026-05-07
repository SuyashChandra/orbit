import { useState } from 'react';
import * as stylex from '@stylexjs/stylex';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api.js';
import { colors, font, radii, spacing } from '../../styles/tokens.stylex.js';
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
    <div {...stylex.props(styles.container)}>
      <div {...stylex.props(styles.header)}>
        <button onClick={onBack} {...stylex.props(styles.backBtn)}>← Back</button>
        <h3 {...stylex.props(styles.title)}>{current.name}</h3>
      </div>

      {sorted.length === 0 && (
        <p {...stylex.props(styles.muted)}>No exercises yet. Add some below.</p>
      )}

      <div {...stylex.props(styles.list)}>
        {sorted.map((we, idx) => (
          <div key={we.id} {...stylex.props(styles.exRow)}>
            <div {...stylex.props(styles.reorderBtns)}>
              <button onClick={() => moveUp(idx)} disabled={idx === 0} {...stylex.props(styles.reorderBtn)}>▲</button>
              <button onClick={() => moveDown(idx)} disabled={idx === sorted.length - 1} {...stylex.props(styles.reorderBtn)}>▼</button>
            </div>
            <div {...stylex.props(styles.exInfo)}>
              <p {...stylex.props(styles.exName)}>{we.exercise.name}</p>
              <p {...stylex.props(styles.exMeta)}>{we.exercise.category}</p>
            </div>
            <button
              onClick={() => removeMutation.mutate(we.exercise.id)}
              {...stylex.props(styles.removeBtn)}
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      <button onClick={() => setShowPicker(true)} {...stylex.props(styles.addBtn)}>
        + Add Exercise
      </button>

      {/* Exercise picker */}
      {showPicker && (
        <div {...stylex.props(styles.overlay)} onClick={() => setShowPicker(false)}>
          <div {...stylex.props(styles.picker)} onClick={(e) => e.stopPropagation()}>
            <div {...stylex.props(styles.pickerHeader)}>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search exercises…"
                autoFocus
                {...stylex.props(styles.searchInput)}
              />
              <button onClick={() => setShowPicker(false)} {...stylex.props(styles.closeBtn)}>✕</button>
            </div>
            <div {...stylex.props(styles.pickerList)}>
              {exercisesQ.isLoading && <p {...stylex.props(styles.muted)}>Loading…</p>}
              {exercisesQ.data?.exercises
                .filter((e) => !existingIds.has(e.id))
                .map((ex) => (
                  <button
                    key={ex.id}
                    onClick={() => addMutation.mutate({ exerciseId: ex.id, orderIndex: sorted.length })}
                    disabled={addMutation.isPending}
                    {...stylex.props(styles.pickerItem)}
                  >
                    <p {...stylex.props(styles.exName)}>{ex.name}</p>
                    <p {...stylex.props(styles.exMeta)}>{ex.category}</p>
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

const styles = stylex.create({
  container: { display: 'flex', flexDirection: 'column', gap: spacing.s4 },
  header: { display: 'flex', alignItems: 'center', gap: spacing.s3 },
  backBtn: { background: 'none', border: 'none', color: colors.accent, fontSize: font.md, cursor: 'pointer', padding: 0 },
  title: { fontSize: font.lg, fontWeight: 700, color: colors.textPrimary },
  muted: { color: colors.textSecondary, fontSize: font.sm, textAlign: 'center', paddingTop: spacing.s4 },
  list: { display: 'flex', flexDirection: 'column', gap: spacing.s2 },
  exRow: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.s2,
    padding: `${spacing.s3} ${spacing.s3}`,
    backgroundColor: colors.surface,
    border: `1px solid ${colors.border}`,
    borderRadius: radii.md,
  },
  reorderBtns: { display: 'flex', flexDirection: 'column', gap: '2px' },
  reorderBtn: {
    background: 'none',
    border: 'none',
    color: colors.textSecondary,
    fontSize: '10px',
    cursor: 'pointer',
    padding: '2px',
    lineHeight: 1,
    ':disabled': { opacity: 0.3 },
  },
  exInfo: { flex: 1 },
  exName: { fontSize: font.md, fontWeight: 600, color: colors.textPrimary },
  exMeta: { fontSize: font.xs, color: colors.textSecondary },
  removeBtn: { background: 'none', border: 'none', color: colors.textSecondary, cursor: 'pointer', fontSize: font.md, padding: spacing.s1 },
  addBtn: {
    padding: `${spacing.s3} ${spacing.s4}`,
    backgroundColor: 'transparent',
    border: `1px dashed ${colors.border}`,
    borderRadius: radii.md,
    color: colors.textSecondary,
    fontSize: font.md,
    cursor: 'pointer',
    width: '100%',
  },
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    zIndex: 200,
    display: 'flex',
    alignItems: 'flex-end',
  },
  picker: {
    width: '100%',
    maxWidth: '480px',
    margin: '0 auto',
    backgroundColor: colors.bg,
    borderRadius: `${radii.lg} ${radii.lg} 0 0`,
    display: 'flex',
    flexDirection: 'column',
    maxHeight: '75dvh',
  },
  pickerHeader: {
    display: 'flex',
    gap: spacing.s2,
    padding: spacing.s4,
    borderBottom: `1px solid ${colors.border}`,
    flexShrink: 0,
  },
  searchInput: {
    flex: 1,
    padding: `${spacing.s2} ${spacing.s3}`,
    backgroundColor: colors.surface,
    border: `1px solid ${colors.border}`,
    borderRadius: radii.md,
    color: colors.textPrimary,
    fontSize: font.md,
  },
  closeBtn: { background: 'none', border: 'none', color: colors.textSecondary, fontSize: font.lg, cursor: 'pointer' },
  pickerList: { overflowY: 'auto', flex: 1, padding: spacing.s2 },
  pickerItem: {
    display: 'block',
    width: '100%',
    padding: `${spacing.s3} ${spacing.s4}`,
    backgroundColor: 'transparent',
    border: 'none',
    borderBottom: `1px solid ${colors.border}`,
    textAlign: 'left',
    cursor: 'pointer',
  },
});
