import { useState } from 'react';
import * as stylex from '@stylexjs/stylex';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { api } from '../../lib/api.js';
import { colors, font, radii, spacing } from '../../styles/tokens.stylex.js';
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
  const exerciseIds = new Set(workoutExercises.map((we) => we.exercise.id));
  for (const exerciseId of setsByExercise.keys()) {
    exerciseIds.add(exerciseId);
  }
  const allExercises = workoutExercises.map((we) => we.exercise);
  // add ad-hoc ones not in workout
  for (const exerciseId of setsByExercise.keys()) {
    if (!allExercises.find((e) => e.id === exerciseId)) {
      // we don't have the exercise data locally — show minimal
      allExercises.push({ id: exerciseId, name: exerciseId, category: '', muscleGroups: [], isCustom: false, createdByUserId: null });
    }
  }

  return (
    <div {...stylex.props(styles.container)}>
      <div {...stylex.props(styles.dateRow)}>
        <h3 {...stylex.props(styles.dateLabel)}>
          {new Date(today + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </h3>
      </div>

      {!log && (
        <div {...stylex.props(styles.startSection)}>
          <p {...stylex.props(styles.muted)}>No workout logged today yet.</p>
          <div {...stylex.props(styles.startBtns)}>
            <button onClick={() => setShowWorkoutPicker(true)} {...stylex.props(styles.startBtn)}>
              Start from Workout
            </button>
            <button onClick={() => createLogMutation.mutate(undefined)} {...stylex.props(styles.startBtnGhost)}>
              Log ad-hoc
            </button>
          </div>
        </div>
      )}

      {log && (
        <>
          {log.workout && (
            <p {...stylex.props(styles.workoutLabel)}>📋 {log.workout.name}</p>
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
        <div {...stylex.props(styles.overlay)} onClick={() => setShowWorkoutPicker(false)}>
          <div {...stylex.props(styles.drawer)} onClick={(e) => e.stopPropagation()}>
            <p {...stylex.props(styles.drawerTitle)}>Pick a Workout</p>
            {workoutsQ.data?.length === 0 && (
              <p {...stylex.props(styles.muted)}>No workouts. Create one in the Workouts tab.</p>
            )}
            {workoutsQ.data?.map((w) => (
              <button
                key={w.id}
                onClick={() => createLogMutation.mutate(w.id)}
                {...stylex.props(styles.pickerItem)}
              >
                <p {...stylex.props(styles.pickerName)}>{w.name}</p>
                <p {...stylex.props(styles.pickerMeta)}>{w.exercises.length} exercises</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* History chart modal */}
      {selectedExercise && (
        <div {...stylex.props(styles.overlay)} onClick={() => setSelectedExercise(null)}>
          <div {...stylex.props(styles.drawer)} onClick={(e) => e.stopPropagation()}>
            <div {...stylex.props(styles.chartHeader)}>
              <p {...stylex.props(styles.drawerTitle)}>{selectedExercise.name}</p>
              <button onClick={() => setSelectedExercise(null)} {...stylex.props(styles.closeBtn)}>✕</button>
            </div>
            {historyQ.isLoading && <p {...stylex.props(styles.muted)}>Loading…</p>}
            {historyQ.data && historyQ.data.length < 2 && (
              <p {...stylex.props(styles.muted)}>Log at least 2 sessions to see a chart.</p>
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
    <div {...stylex.props(styles.exCard)}>
      <div {...stylex.props(styles.exCardHeader)}>
        <p {...stylex.props(styles.exCardName)}>{exercise.name}</p>
        <button onClick={onShowHistory} {...stylex.props(styles.historyBtn)}>📈</button>
      </div>

      {/* Existing sets */}
      {sets.length > 0 && (
        <div {...stylex.props(styles.setsTable)}>
          <div {...stylex.props(styles.setsHeaderRow)}>
            <span {...stylex.props(styles.setCol)}>Set</span>
            <span {...stylex.props(styles.repsCol)}>Reps</span>
            <span {...stylex.props(styles.weightCol)}>kg</span>
            <span style={{ width: 24 }} />
          </div>
          {sets.map((s) => (
            <div key={s.id} {...stylex.props(styles.setRow)}>
              <span {...stylex.props(styles.setCol, styles.setNum)}>{s.setNumber}</span>
              <span {...stylex.props(styles.repsCol, styles.setValue)}>{s.reps}</span>
              <span {...stylex.props(styles.weightCol, styles.setValue)}>{s.weight ?? '—'}</span>
              <button onClick={() => onDeleteSet(s.id)} {...stylex.props(styles.deleteSetBtn)}>✕</button>
            </div>
          ))}
        </div>
      )}

      {/* Add set */}
      <div {...stylex.props(styles.addSetRow)}>
        <input
          type="number"
          value={reps}
          onChange={(e) => setReps(e.target.value)}
          placeholder="Reps"
          min="0"
          {...stylex.props(styles.setInput)}
        />
        <input
          type="number"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          placeholder="kg"
          min="0"
          step="0.5"
          {...stylex.props(styles.setInput)}
        />
        <button
          onClick={() => {
            const r = parseInt(reps, 10);
            if (!r) return;
            onAddSet(r, parseFloat(weight));
            setReps('');
            setWeight('');
          }}
          {...stylex.props(styles.logSetBtn)}
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
  const qc = useQueryClient();

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
      <button onClick={() => setShow(true)} {...stylex.props(styles.addExerciseBtn)}>
        + Add Exercise
      </button>
    );
  }

  return (
    <div {...stylex.props(styles.overlay)} onClick={() => setShow(false)}>
      <div {...stylex.props(styles.drawer)} onClick={(e) => e.stopPropagation()}>
        <div {...stylex.props(styles.chartHeader)}>
          <p {...stylex.props(styles.drawerTitle)}>Add Exercise</p>
          <button onClick={() => setShow(false)} {...stylex.props(styles.closeBtn)}>✕</button>
        </div>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search…"
          autoFocus
          {...stylex.props(styles.searchInput)}
        />
        <div {...stylex.props(styles.pickerScroll)}>
          {exercisesQ.data?.exercises.map((ex) => (
            <button key={ex.id} onClick={() => addSetMutation.mutate(ex.id)} {...stylex.props(styles.pickerItem)}>
              <p {...stylex.props(styles.pickerName)}>{ex.name}</p>
              <p {...stylex.props(styles.pickerMeta)}>{ex.category}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

const styles = stylex.create({
  container: { display: 'flex', flexDirection: 'column', gap: spacing.s4 },
  dateRow: { marginBottom: spacing.s2 },
  dateLabel: { fontSize: font.lg, fontWeight: 700, color: colors.textPrimary },
  startSection: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: spacing.s4, paddingTop: spacing.s6 },
  startBtns: { display: 'flex', flexDirection: 'column', gap: spacing.s2, width: '100%', maxWidth: '280px' },
  startBtn: {
    padding: `${spacing.s3} ${spacing.s4}`,
    backgroundColor: colors.accent,
    color: '#fff',
    border: 'none',
    borderRadius: radii.md,
    fontSize: font.md,
    fontWeight: 600,
    cursor: 'pointer',
  },
  startBtnGhost: {
    padding: `${spacing.s3} ${spacing.s4}`,
    backgroundColor: 'transparent',
    border: `1px solid ${colors.border}`,
    borderRadius: radii.md,
    fontSize: font.md,
    color: colors.textSecondary,
    cursor: 'pointer',
  },
  workoutLabel: { fontSize: font.sm, color: colors.textSecondary, fontWeight: 500 },
  muted: { color: colors.textSecondary, fontSize: font.sm, textAlign: 'center' },
  exCard: {
    backgroundColor: colors.surface,
    border: `1px solid ${colors.border}`,
    borderRadius: radii.lg,
    padding: spacing.s4,
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.s3,
  },
  exCardHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  exCardName: { fontSize: font.md, fontWeight: 700, color: colors.textPrimary },
  historyBtn: { background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer' },
  setsTable: { display: 'flex', flexDirection: 'column', gap: '4px' },
  setsHeaderRow: { display: 'flex', gap: spacing.s2, paddingBottom: '4px', borderBottom: `1px solid ${colors.border}` },
  setRow: { display: 'flex', gap: spacing.s2, alignItems: 'center' },
  setCol: { width: '32px', fontSize: font.xs, color: colors.textSecondary, textAlign: 'center' },
  repsCol: { flex: 1, fontSize: font.xs, color: colors.textSecondary, textAlign: 'center' },
  weightCol: { flex: 1, fontSize: font.xs, color: colors.textSecondary, textAlign: 'center' },
  setNum: { fontSize: font.sm, color: colors.textSecondary, fontWeight: 600 },
  setValue: { fontSize: font.sm, color: colors.textPrimary, textAlign: 'center' },
  deleteSetBtn: { width: '24px', background: 'none', border: 'none', color: colors.textSecondary, cursor: 'pointer', fontSize: font.sm },
  addSetRow: { display: 'flex', gap: spacing.s2, alignItems: 'center' },
  setInput: {
    flex: 1,
    padding: `${spacing.s2} ${spacing.s2}`,
    backgroundColor: colors.bg,
    border: `1px solid ${colors.border}`,
    borderRadius: radii.md,
    color: colors.textPrimary,
    fontSize: font.md,
    textAlign: 'center',
  },
  logSetBtn: {
    padding: `${spacing.s2} ${spacing.s3}`,
    backgroundColor: colors.accent,
    color: '#fff',
    border: 'none',
    borderRadius: radii.md,
    fontSize: font.sm,
    fontWeight: 600,
    cursor: 'pointer',
    flexShrink: 0,
  },
  addExerciseBtn: {
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
  drawer: {
    width: '100%',
    maxWidth: '480px',
    margin: '0 auto',
    backgroundColor: colors.bg,
    borderRadius: `${radii.lg} ${radii.lg} 0 0`,
    padding: spacing.s4,
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.s3,
    maxHeight: '70dvh',
    overflowY: 'auto',
  },
  drawerTitle: { fontSize: font.lg, fontWeight: 700, color: colors.textPrimary },
  chartHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  closeBtn: { background: 'none', border: 'none', color: colors.textSecondary, fontSize: font.lg, cursor: 'pointer' },
  pickerItem: {
    display: 'block',
    width: '100%',
    padding: `${spacing.s3} ${spacing.s2}`,
    backgroundColor: 'transparent',
    border: 'none',
    borderBottom: `1px solid ${colors.border}`,
    textAlign: 'left',
    cursor: 'pointer',
  },
  pickerName: { fontSize: font.md, fontWeight: 600, color: colors.textPrimary },
  pickerMeta: { fontSize: font.xs, color: colors.textSecondary, marginTop: '2px' },
  pickerScroll: { overflowY: 'auto', flex: 1 },
  searchInput: {
    padding: `${spacing.s2} ${spacing.s3}`,
    backgroundColor: colors.surface,
    border: `1px solid ${colors.border}`,
    borderRadius: radii.md,
    color: colors.textPrimary,
    fontSize: font.md,
    width: '100%',
  },
});
