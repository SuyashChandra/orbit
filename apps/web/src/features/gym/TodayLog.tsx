import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { api } from '../../lib/api.js';
import type { ExerciseDTO, WorkoutDTO, WorkoutLogDTO, WorkoutLogSetDTO } from '@orbit/shared';

const today = new Date().toISOString().slice(0, 10);

interface HistoryPoint { date: string; maxWeight: number; totalReps: number; }

export function TodayLog() {
  const [selectedExercise, setSelectedExercise] = useState<ExerciseDTO | null>(null);
  const [showWorkoutPicker, setShowWorkoutPicker] = useState(false);
  const qc = useQueryClient();

  const logsQ = useQuery<WorkoutLogDTO[]>({
    queryKey: ['logs', today],
    queryFn: () => api.get<WorkoutLogDTO[]>(`/logs?date=${today}`).then((r) => r.data),
  });

  const workoutsQ = useQuery<WorkoutDTO[]>({
    queryKey: ['workouts'],
    queryFn: () => api.get<WorkoutDTO[]>('/workouts').then((r) => r.data),
  });

  const createLogMutation = useMutation({
    mutationFn: (workoutId?: string) =>
      api.post<WorkoutLogDTO>('/logs', { date: today, workoutId }).then((r) => r.data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['logs', today] });
      setShowWorkoutPicker(false);
    },
  });

  const addSetMutation = useMutation({
    mutationFn: ({ logId, body }: { logId: string; body: { exerciseId: string; setNumber: number; reps: number; weight?: number } }) =>
      api.post<WorkoutLogSetDTO>(`/logs/${logId}/sets`, body).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['logs', today] }),
  });

  const deleteSetMutation = useMutation({
    mutationFn: ({ logId, setId }: { logId: string; setId: string }) =>
      api.delete(`/logs/${logId}/sets/${setId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['logs', today] }),
  });

  const historyQ = useQuery<HistoryPoint[]>({
    queryKey: ['history', selectedExercise?.id],
    queryFn: () =>
      api.get<HistoryPoint[]>(`/logs/history/${selectedExercise!.id}`).then((r) => r.data),
    enabled: !!selectedExercise,
  });

  const log = logsQ.data?.[0];

  // Collect all exercises from the log's linked workout + ad-hoc sets
  const workoutExercises = log?.workout
    ? workoutsQ.data?.find((w) => w.id === log.workout?.id)?.exercises ?? []
    : [];

  const setsByExercise = new Map<string, WorkoutLogSetDTO[]>();
  for (const set of log?.sets ?? []) {
    const arr = setsByExercise.get(set.exerciseId) ?? [];
    arr.push(set);
    setsByExercise.set(set.exerciseId, arr);
  }

  // All exercises to show: workout plan + any ad-hoc ones
  const allExercises = workoutExercises.map((we) => we.exercise);
  // add ad-hoc ones not in workout
  for (const exerciseId of setsByExercise.keys()) {
    if (!allExercises.find((e) => e.id === exerciseId)) {
      allExercises.push({ id: exerciseId, name: exerciseId, category: '', muscleGroups: [], isCustom: false, createdByUserId: null });
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="mb-2">
        <h3 className="text-lg font-bold text-fg">
          {new Date(today + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </h3>
      </div>

      {!log && (
        <div className="flex flex-col items-center gap-4 pt-6">
          <p className="text-fg-muted text-sm text-center">No workout logged today yet.</p>
          <div className="flex flex-col gap-2 w-full max-w-[280px]">
            <button
              onClick={() => setShowWorkoutPicker(true)}
              className="py-3 px-4 bg-accent text-on-accent border-none rounded-md text-base font-semibold cursor-pointer"
            >
              Start from Workout
            </button>
            <button
              onClick={() => createLogMutation.mutate(undefined)}
              className="py-3 px-4 bg-transparent border border-border rounded-md text-base text-fg-muted cursor-pointer"
            >
              Log ad-hoc
            </button>
          </div>
        </div>
      )}

      {log && (
        <>
          {log.workout && (
            <p className="text-sm text-fg-muted font-medium">📋 {log.workout.name}</p>
          )}

          {allExercises.map((ex) => {
            const sets = setsByExercise.get(ex.id) ?? [];
            return (
              <ExerciseLogCard
                key={ex.id}
                exercise={ex}
                sets={sets}
                onAddSet={(reps, weight) => {
                  const body: { exerciseId: string; setNumber: number; reps: number; weight?: number } = {
                    exerciseId: ex.id, setNumber: sets.length + 1, reps,
                  };
                  if (weight) body.weight = weight;
                  addSetMutation.mutate({ logId: log.id, body });
                }}
                onDeleteSet={(setId) => deleteSetMutation.mutate({ logId: log.id, setId })}
                onShowHistory={() => setSelectedExercise(ex)}
              />
            );
          })}

          <AdHocExerciseAdder logId={log.id} onAdded={() => qc.invalidateQueries({ queryKey: ['logs', today] })} />
        </>
      )}

      {/* Workout picker */}
      {showWorkoutPicker && (
        <div
          className="fixed inset-0 z-[200] flex items-end"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
          onClick={() => setShowWorkoutPicker(false)}
        >
          <div
            className="w-full max-w-[480px] mx-auto bg-bg p-4 flex flex-col gap-3 max-h-[70dvh] overflow-y-auto"
            style={{ borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0' }}
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-lg font-bold text-fg">Pick a Workout</p>
            {workoutsQ.data?.length === 0 && (
              <p className="text-fg-muted text-sm text-center">No workouts. Create one in the Workouts tab.</p>
            )}
            {workoutsQ.data?.map((w) => (
              <button
                key={w.id}
                onClick={() => createLogMutation.mutate(w.id)}
                className="block w-full py-3 px-2 bg-transparent border-none border-b border-border text-left cursor-pointer"
              >
                <p className="text-base font-semibold text-fg">{w.name}</p>
                <p className="text-xs text-fg-muted mt-0.5">{w.exercises.length} exercises</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* History chart modal */}
      {selectedExercise && (
        <div
          className="fixed inset-0 z-[200] flex items-end"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
          onClick={() => setSelectedExercise(null)}
        >
          <div
            className="w-full max-w-[480px] mx-auto bg-bg p-4 flex flex-col gap-3 max-h-[70dvh] overflow-y-auto"
            style={{ borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <p className="text-lg font-bold text-fg">{selectedExercise.name}</p>
              <button
                onClick={() => setSelectedExercise(null)}
                className="bg-transparent border-none text-fg-muted text-lg cursor-pointer"
              >✕</button>
            </div>
            {historyQ.isLoading && <p className="text-fg-muted text-sm text-center">Loading…</p>}
            {historyQ.data && historyQ.data.length < 2 && (
              <p className="text-fg-muted text-sm text-center">Log at least 2 sessions to see a chart.</p>
            )}
            {historyQ.data && historyQ.data.length >= 2 && (
              <div style={{ height: 200, marginTop: 8 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={historyQ.data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#888' }} tickFormatter={(d) => d.slice(5)} />
                    <YAxis tick={{ fontSize: 10, fill: '#888' }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: 8 }}
                      labelStyle={{ color: '#aaa', fontSize: 12 }}
                      itemStyle={{ color: '#6c63ff', fontSize: 12 }}
                    />
                    <Line type="monotone" dataKey="maxWeight" stroke="#6c63ff" strokeWidth={2} dot={{ r: 3 }} name="Max weight (kg)" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ExerciseLogCard({
  exercise, sets, onAddSet, onDeleteSet, onShowHistory,
}: {
  exercise: ExerciseDTO;
  sets: WorkoutLogSetDTO[];
  onAddSet: (reps: number, weight: number) => void;
  onDeleteSet: (setId: string) => void;
  onShowHistory: () => void;
}) {
  const [reps, setReps] = useState('');
  const [weight, setWeight] = useState('');

  return (
    <div className="bg-surface border border-border rounded-lg p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-base font-bold text-fg">{exercise.name}</p>
        <button onClick={onShowHistory} className="bg-transparent border-none text-[18px] cursor-pointer">📈</button>
      </div>

      {/* Existing sets */}
      {sets.length > 0 && (
        <div className="flex flex-col gap-1">
          <div className="flex gap-2 pb-1 border-b border-border">
            <span className="w-8 text-xs text-fg-muted text-center">Set</span>
            <span className="flex-1 text-xs text-fg-muted text-center">Reps</span>
            <span className="flex-1 text-xs text-fg-muted text-center">kg</span>
            <span style={{ width: 24 }} />
          </div>
          {sets.map((s) => (
            <div key={s.id} className="flex gap-2 items-center">
              <span className="w-8 text-sm text-fg-muted font-semibold text-center">{s.setNumber}</span>
              <span className="flex-1 text-sm text-fg text-center">{s.reps}</span>
              <span className="flex-1 text-sm text-fg text-center">{s.weight ?? '—'}</span>
              <button
                onClick={() => onDeleteSet(s.id)}
                className="w-6 bg-transparent border-none text-fg-muted cursor-pointer text-sm"
              >✕</button>
            </div>
          ))}
        </div>
      )}

      {/* Add set */}
      <div className="flex gap-2 items-center">
        <input
          type="number"
          value={reps}
          onChange={(e) => setReps(e.target.value)}
          placeholder="Reps"
          min="0"
          className="flex-1 py-2 bg-bg border border-border rounded-md text-fg text-base text-center"
        />
        <input
          type="number"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          placeholder="kg"
          min="0"
          step="0.5"
          className="flex-1 py-2 bg-bg border border-border rounded-md text-fg text-base text-center"
        />
        <button
          onClick={() => {
            const r = parseInt(reps, 10);
            if (!r) return;
            onAddSet(r, parseFloat(weight));
            setReps('');
            setWeight('');
          }}
          className="py-2 px-3 bg-accent text-on-accent border-none rounded-md text-sm font-semibold cursor-pointer shrink-0"
        >
          + Set
        </button>
      </div>
    </div>
  );
}

function AdHocExerciseAdder({ logId, onAdded }: { logId: string; onAdded: () => void }) {
  const [show, setShow] = useState(false);
  const [search, setSearch] = useState('');

  const exercisesQ = useQuery<{ exercises: ExerciseDTO[] }>({
    queryKey: ['exercises', search],
    queryFn: () => {
      const params = search ? `?q=${encodeURIComponent(search)}` : '';
      return api.get<{ exercises: ExerciseDTO[] }>(`/exercises${params}`).then((r) => r.data);
    },
    enabled: show,
  });

  const addSetMutation = useMutation({
    mutationFn: (exerciseId: string) =>
      api.post(`/logs/${logId}/sets`, { exerciseId, setNumber: 1, reps: 0 }),
    onSuccess: () => {
      onAdded();
      setShow(false);
      setSearch('');
    },
  });

  if (!show) {
    return (
      <button
        onClick={() => setShow(true)}
        className="py-3 px-4 bg-transparent border border-dashed border-border rounded-md text-fg-muted text-base cursor-pointer w-full"
      >
        + Add Exercise
      </button>
    );
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
      onClick={() => setShow(false)}
    >
      <div
        className="w-full max-w-[480px] mx-auto bg-bg p-4 flex flex-col gap-3 max-h-[70dvh] overflow-y-auto"
        style={{ borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <p className="text-lg font-bold text-fg">Add Exercise</p>
          <button onClick={() => setShow(false)} className="bg-transparent border-none text-fg-muted text-lg cursor-pointer">✕</button>
        </div>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search…"
          autoFocus
          className="py-2 px-3 bg-surface border border-border rounded-md text-fg text-base w-full"
        />
        <div className="overflow-y-auto flex-1">
          {exercisesQ.data?.exercises.map((ex) => (
            <button
              key={ex.id}
              onClick={() => addSetMutation.mutate(ex.id)}
              className="block w-full py-3 px-2 bg-transparent border-none border-b border-border text-left cursor-pointer"
            >
              <p className="text-base font-semibold text-fg">{ex.name}</p>
              <p className="text-xs text-fg-muted mt-0.5">{ex.category}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
