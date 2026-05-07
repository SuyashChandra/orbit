import { useState } from 'react';
import * as stylex from '@stylexjs/stylex';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api.js';
import { colors, font, radii, spacing } from '../../styles/tokens.stylex.js';
import type { WorkoutDTO } from '@orbit/shared';
import { WorkoutBuilder } from './WorkoutBuilder.js';

export function WorkoutList() {
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [editing, setEditing] = useState<WorkoutDTO | null>(null);
  const qc = useQueryClient();

  const workoutsQ = useQuery<WorkoutDTO[]>({
    queryKey: ['workouts'],
    queryFn: () => api.get<WorkoutDTO[]>('/workouts').then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (name: string) => api.post<WorkoutDTO>('/workouts', { name }).then((r) => r.data),
    onSuccess: (w) => {
      void qc.invalidateQueries({ queryKey: ['workouts'] });
      setCreating(false);
      setNewName('');
      setEditing(w);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/workouts/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workouts'] }),
  });

  if (editing) {
    return (
      <WorkoutBuilder
        workout={editing}
        onBack={() => {
          setEditing(null);
          void qc.invalidateQueries({ queryKey: ['workouts'] });
        }}
      />
    );
  }

  return (
    <div {...stylex.props(styles.container)}>
      <div {...stylex.props(styles.header)}>
        <h3 {...stylex.props(styles.title)}>My Workouts</h3>
        <button onClick={() => setCreating(true)} {...stylex.props(styles.addBtn)}>+ New</button>
      </div>

      {creating && (
        <div {...stylex.props(styles.createRow)}>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Workout name…"
            autoFocus
            onKeyDown={(e) => { if (e.key === 'Enter' && newName.trim()) createMutation.mutate(newName.trim()); }}
            {...stylex.props(styles.input)}
          />
          <button
            onClick={() => { if (newName.trim()) createMutation.mutate(newName.trim()); }}
            disabled={createMutation.isPending}
            {...stylex.props(styles.saveBtn)}
          >
            {createMutation.isPending ? '…' : 'Create'}
          </button>
          <button onClick={() => setCreating(false)} {...stylex.props(styles.cancelBtn)}>✕</button>
        </div>
      )}

      {workoutsQ.isLoading && <p {...stylex.props(styles.muted)}>Loading…</p>}
      {workoutsQ.data?.length === 0 && (
        <p {...stylex.props(styles.muted)}>No workouts yet. Create one to get started.</p>
      )}

      <div {...stylex.props(styles.list)}>
        {workoutsQ.data?.map((w) => (
          <div key={w.id} {...stylex.props(styles.card)}>
            <button onClick={() => setEditing(w)} {...stylex.props(styles.cardMain)}>
              <p {...stylex.props(styles.workoutName)}>{w.name}</p>
              <p {...stylex.props(styles.workoutMeta)}>
                {w.exercises.length} exercise{w.exercises.length !== 1 ? 's' : ''}
                {w.exercises.length > 0 && ` · ${w.exercises.map((e) => e.exercise.name).slice(0, 3).join(', ')}${w.exercises.length > 3 ? '…' : ''}`}
              </p>
            </button>
            <button
              onClick={() => { if (confirm('Delete this workout?')) deleteMutation.mutate(w.id); }}
              {...stylex.props(styles.deleteBtn)}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

const styles = stylex.create({
  container: { display: 'flex', flexDirection: 'column', gap: spacing.s4 },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: font.lg, fontWeight: 700, color: colors.textPrimary },
  addBtn: {
    padding: `${spacing.s2} ${spacing.s4}`,
    backgroundColor: colors.accent,
    color: colors.fgOnAccent,
    border: 'none',
    borderRadius: radii.md,
    fontSize: font.md,
    fontWeight: 600,
    cursor: 'pointer',
  },
  createRow: { display: 'flex', gap: spacing.s2, alignItems: 'center' },
  input: {
    flex: 1,
    padding: `${spacing.s2} ${spacing.s3}`,
    backgroundColor: colors.surface,
    border: `1px solid ${colors.border}`,
    borderRadius: radii.md,
    color: colors.textPrimary,
    fontSize: font.md,
  },
  saveBtn: {
    padding: `${spacing.s2} ${spacing.s3}`,
    backgroundColor: colors.accent,
    color: colors.fgOnAccent,
    border: 'none',
    borderRadius: radii.md,
    fontSize: font.sm,
    cursor: 'pointer',
  },
  cancelBtn: {
    background: 'none',
    border: 'none',
    color: colors.textSecondary,
    fontSize: font.md,
    cursor: 'pointer',
    padding: spacing.s1,
  },
  muted: { color: colors.textSecondary, fontSize: font.sm, textAlign: 'center', paddingTop: spacing.s6 },
  list: { display: 'flex', flexDirection: 'column', gap: spacing.s3 },
  card: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: colors.surface,
    border: `1px solid ${colors.border}`,
    borderRadius: radii.lg,
    overflow: 'hidden',
  },
  cardMain: {
    flex: 1,
    padding: `${spacing.s4} ${spacing.s4}`,
    background: 'none',
    border: 'none',
    textAlign: 'left',
    cursor: 'pointer',
  },
  workoutName: { fontSize: font.lg, fontWeight: 700, color: colors.textPrimary },
  workoutMeta: { fontSize: font.sm, color: colors.textSecondary, marginTop: spacing.s1 },
  deleteBtn: {
    background: 'none',
    border: 'none',
    color: colors.textSecondary,
    fontSize: font.md,
    cursor: 'pointer',
    padding: `${spacing.s4} ${spacing.s3}`,
    flexShrink: 0,
  },
});
