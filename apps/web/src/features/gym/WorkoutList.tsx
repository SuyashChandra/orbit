import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api.js';
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
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg font-semibold text-fg">My Workouts</h3>
        <button
          onClick={() => setCreating(true)}
          className="py-2 px-4 bg-accent text-on-accent border-none rounded-full text-base font-semibold cursor-pointer"
        >
          + New
        </button>
      </div>

      {creating && (
        <div className="flex gap-2 items-center">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Workout name…"
            autoFocus
            onKeyDown={(e) => { if (e.key === 'Enter' && newName.trim()) createMutation.mutate(newName.trim()); }}
            className="flex-1 py-2 px-3 bg-surface border border-border rounded-md text-fg text-base"
          />
          <button
            onClick={() => { if (newName.trim()) createMutation.mutate(newName.trim()); }}
            disabled={createMutation.isPending}
            className="py-2 px-3 bg-accent text-on-accent border-none rounded-md text-sm cursor-pointer"
          >
            {createMutation.isPending ? '…' : 'Create'}
          </button>
          <button
            onClick={() => setCreating(false)}
            className="bg-transparent border-none text-fg-muted text-base cursor-pointer p-1"
          >✕</button>
        </div>
      )}

      {workoutsQ.isLoading && <p className="text-fg-muted text-sm text-center pt-6">Loading…</p>}
      {workoutsQ.data?.length === 0 && (
        <p className="text-fg-muted text-sm text-center pt-6">No workouts yet. Create one to get started.</p>
      )}

      <div className="flex flex-col gap-3">
        {workoutsQ.data?.map((w) => (
          <div key={w.id} className="flex items-center bg-surface rounded-lg overflow-hidden">
            <button onClick={() => setEditing(w)} className="flex-1 p-4 bg-transparent border-none text-left cursor-pointer">
              <p className="font-display text-lg font-semibold text-fg">{w.name}</p>
              <p className="text-sm text-fg-muted mt-1">
                {w.exercises.length} exercise{w.exercises.length !== 1 ? 's' : ''}
                {w.exercises.length > 0 && ` · ${w.exercises.map((e) => e.exercise.name).slice(0, 3).join(', ')}${w.exercises.length > 3 ? '…' : ''}`}
              </p>
            </button>
            <button
              onClick={() => { if (confirm('Delete this workout?')) deleteMutation.mutate(w.id); }}
              className="bg-transparent border-none text-fg-muted text-base cursor-pointer py-4 px-3 shrink-0"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
