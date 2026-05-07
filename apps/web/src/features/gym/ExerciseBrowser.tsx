import { useState } from 'react';
import * as stylex from '@stylexjs/stylex';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api.js';
import { colors, font, radii, spacing } from '../../styles/tokens.stylex.js';
import type { CreateCustomExerciseBody, ExerciseDTO } from '@orbit/shared';

interface ExercisesResponse {
  exercises: ExerciseDTO[];
  page: number;
  hasMore: boolean;
}

export function ExerciseBrowser() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [selected, setSelected] = useState<ExerciseDTO | null>(null);
  const [showCustomForm, setShowCustomForm] = useState(false);
  const qc = useQueryClient();

  const debouncedSearch = useDebounce(search, 300);

  const categoriesQ = useQuery<string[]>({
    queryKey: ['exercise-categories'],
    queryFn: () => api.get<string[]>('/exercises/categories').then((r) => r.data),
  });

  const exercisesQ = useQuery<ExercisesResponse>({
    queryKey: ['exercises', debouncedSearch, category],
    queryFn: () => {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set('q', debouncedSearch);
      if (category) params.set('category', category);
      return api.get<ExercisesResponse>(`/exercises?${params}`).then((r) => r.data);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/exercises/custom/${id}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['exercises'] });
      setSelected(null);
    },
  });

  const exercises = exercisesQ.data?.exercises ?? [];

  return (
    <div {...stylex.props(styles.container)}>
      {/* Search */}
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search exercises…"
        {...stylex.props(styles.searchInput)}
      />

      {/* Category filters */}
      <div {...stylex.props(styles.chips)}>
        <button
          onClick={() => setCategory('')}
          {...stylex.props(styles.chip, category === '' && styles.chipActive)}
        >
          All
        </button>
        {categoriesQ.data?.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat === category ? '' : cat)}
            {...stylex.props(styles.chip, category === cat && styles.chipActive)}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Add custom button */}
      <div {...stylex.props(styles.customRow)}>
        <button onClick={() => setShowCustomForm(true)} {...stylex.props(styles.customBtn)}>
          + Custom Exercise
        </button>
      </div>

      {/* Exercise list */}
      {exercisesQ.isLoading && <p {...stylex.props(styles.muted)}>Loading…</p>}
      <div {...stylex.props(styles.list)}>
        {exercises.map((ex) => (
          <button
            key={ex.id}
            onClick={() => setSelected(ex)}
            {...stylex.props(styles.exerciseRow)}
          >
            <div>
              <p {...stylex.props(styles.exName)}>{ex.name}</p>
              <p {...stylex.props(styles.exMeta)}>
                {ex.category}
                {ex.muscleGroups.length > 0 && ` · ${ex.muscleGroups.slice(0, 3).join(', ')}`}
              </p>
            </div>
            {ex.isCustom && <span {...stylex.props(styles.customTag)}>Custom</span>}
          </button>
        ))}
        {exercises.length === 0 && !exercisesQ.isLoading && (
          <p {...stylex.props(styles.muted)}>No exercises found.</p>
        )}
      </div>

      {/* Detail modal */}
      {selected && (
        <Modal onClose={() => setSelected(null)}>
          <h3 {...stylex.props(styles.modalTitle)}>{selected.name}</h3>
          <p {...stylex.props(styles.modalMeta)}>{selected.category}</p>
          {selected.muscleGroups.length > 0 && (
            <div {...stylex.props(styles.muscleChips)}>
              {selected.muscleGroups.map((m) => (
                <span key={m} {...stylex.props(styles.muscleChip)}>{m}</span>
              ))}
            </div>
          )}
          {selected.isCustom && (
            <button
              onClick={() => { if (confirm('Delete this exercise?')) deleteMutation.mutate(selected.id); }}
              {...stylex.props(styles.deleteBtn)}
            >
              Delete Custom Exercise
            </button>
          )}
        </Modal>
      )}

      {/* Custom exercise form */}
      {showCustomForm && (
        <CustomExerciseForm
          onClose={() => setShowCustomForm(false)}
          onSaved={() => {
            void qc.invalidateQueries({ queryKey: ['exercises'] });
            void qc.invalidateQueries({ queryKey: ['exercise-categories'] });
            setShowCustomForm(false);
          }}
        />
      )}
    </div>
  );
}

function CustomExerciseForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<CreateCustomExerciseBody>({ name: '', category: '', muscleGroups: [] });
  const [muscleInput, setMuscleInput] = useState('');

  const mutation = useMutation({
    mutationFn: (body: CreateCustomExerciseBody) =>
      api.post<ExerciseDTO>('/exercises/custom', body).then((r) => r.data),
    onSuccess: onSaved,
  });

  const addMuscle = () => {
    const m = muscleInput.trim();
    if (m && !form.muscleGroups.includes(m)) {
      setForm((f) => ({ ...f, muscleGroups: [...f.muscleGroups, m] }));
    }
    setMuscleInput('');
  };

  return (
    <Modal onClose={onClose}>
      <h3 {...stylex.props(styles.modalTitle)}>New Custom Exercise</h3>
      <div {...stylex.props(styles.formFields)}>
        <label {...stylex.props(styles.label)}>Name *</label>
        <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} {...stylex.props(styles.input)} />
        <label {...stylex.props(styles.label)}>Category *</label>
        <input value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} {...stylex.props(styles.input)} placeholder="e.g. Chest, Back, Legs" />
        <label {...stylex.props(styles.label)}>Muscle Groups</label>
        <div {...stylex.props(styles.muscleInputRow)}>
          <input
            value={muscleInput}
            onChange={(e) => setMuscleInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addMuscle(); } }}
            placeholder="Type + Enter"
            {...stylex.props(styles.input, styles.flex1)}
          />
          <button onClick={addMuscle} {...stylex.props(styles.addMuscleBtn)}>Add</button>
        </div>
        {form.muscleGroups.length > 0 && (
          <div {...stylex.props(styles.muscleChips)}>
            {form.muscleGroups.map((m) => (
              <button
                key={m}
                onClick={() => setForm((f) => ({ ...f, muscleGroups: f.muscleGroups.filter((x) => x !== m) }))}
                {...stylex.props(styles.muscleChipRemove)}
              >
                {m} ✕
              </button>
            ))}
          </div>
        )}
      </div>
      <button
        onClick={() => mutation.mutate(form)}
        disabled={mutation.isPending || !form.name.trim() || !form.category.trim()}
        {...stylex.props(styles.submitBtn)}
      >
        {mutation.isPending ? 'Saving…' : 'Create Exercise'}
      </button>
    </Modal>
  );
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div {...stylex.props(styles.overlay)} onClick={onClose}>
      <div {...stylex.props(styles.modal)} onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} {...stylex.props(styles.closeBtn)}>✕</button>
        {children}
      </div>
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
  container: { display: 'flex', flexDirection: 'column', gap: spacing.s3 },
  searchInput: {
    padding: `${spacing.s2} ${spacing.s3}`,
    backgroundColor: colors.surface,
    border: `1px solid ${colors.border}`,
    borderRadius: radii.md,
    color: colors.textPrimary,
    fontSize: font.md,
    width: '100%',
  },
  chips: { display: 'flex', gap: spacing.s2, flexWrap: 'wrap' },
  chip: {
    padding: `${spacing.s1} ${spacing.s3}`,
    borderRadius: radii.full,
    border: `1px solid ${colors.border}`,
    backgroundColor: 'transparent',
    color: colors.textSecondary,
    fontSize: font.sm,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  chipActive: { backgroundColor: colors.accent, borderColor: colors.accent, color: '#fff' },
  customRow: { display: 'flex', justifyContent: 'flex-end' },
  customBtn: {
    padding: `${spacing.s1} ${spacing.s3}`,
    backgroundColor: 'transparent',
    border: `1px solid ${colors.accent}`,
    borderRadius: radii.md,
    color: colors.accent,
    fontSize: font.sm,
    cursor: 'pointer',
  },
  list: { display: 'flex', flexDirection: 'column', gap: spacing.s2 },
  exerciseRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: `${spacing.s3} ${spacing.s4}`,
    backgroundColor: colors.surface,
    border: `1px solid ${colors.border}`,
    borderRadius: radii.md,
    cursor: 'pointer',
    textAlign: 'left',
    width: '100%',
  },
  exName: { fontSize: font.md, fontWeight: 600, color: colors.textPrimary },
  exMeta: { fontSize: font.xs, color: colors.textSecondary, marginTop: '2px' },
  customTag: {
    fontSize: font.xs,
    color: colors.accent,
    border: `1px solid ${colors.accent}`,
    borderRadius: radii.full,
    padding: `1px ${spacing.s2}`,
    flexShrink: 0,
  },
  muted: { color: colors.textSecondary, fontSize: font.sm, textAlign: 'center', paddingTop: spacing.s6 },
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    zIndex: 200,
    display: 'flex',
    alignItems: 'flex-end',
  },
  modal: {
    width: '100%',
    maxWidth: '480px',
    margin: '0 auto',
    backgroundColor: colors.bg,
    borderRadius: `${radii.lg} ${radii.lg} 0 0`,
    padding: spacing.s6,
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.s4,
    maxHeight: '80dvh',
    overflowY: 'auto',
    position: 'relative',
  },
  closeBtn: {
    position: 'absolute',
    top: spacing.s4,
    right: spacing.s4,
    background: 'none',
    border: 'none',
    color: colors.textSecondary,
    fontSize: font.lg,
    cursor: 'pointer',
  },
  modalTitle: { fontSize: font.xl, fontWeight: 700, color: colors.textPrimary, paddingRight: spacing.s6 },
  modalMeta: { fontSize: font.md, color: colors.textSecondary },
  muscleChips: { display: 'flex', flexWrap: 'wrap', gap: spacing.s2 },
  muscleChip: {
    padding: `2px ${spacing.s3}`,
    backgroundColor: colors.surfaceRaised,
    borderRadius: radii.full,
    fontSize: font.sm,
    color: colors.textSecondary,
  },
  muscleChipRemove: {
    padding: `2px ${spacing.s3}`,
    backgroundColor: colors.surfaceRaised,
    border: 'none',
    borderRadius: radii.full,
    fontSize: font.sm,
    color: colors.textSecondary,
    cursor: 'pointer',
  },
  deleteBtn: {
    padding: `${spacing.s2} ${spacing.s4}`,
    backgroundColor: 'transparent',
    border: `1px solid ${colors.danger}`,
    borderRadius: radii.md,
    color: colors.danger,
    fontSize: font.sm,
    cursor: 'pointer',
  },
  formFields: { display: 'flex', flexDirection: 'column', gap: spacing.s2 },
  label: { fontSize: font.sm, color: colors.textSecondary },
  input: {
    padding: `${spacing.s2} ${spacing.s3}`,
    backgroundColor: colors.surface,
    border: `1px solid ${colors.border}`,
    borderRadius: radii.md,
    color: colors.textPrimary,
    fontSize: font.md,
  },
  flex1: { flex: 1 },
  muscleInputRow: { display: 'flex', gap: spacing.s2 },
  addMuscleBtn: {
    padding: `${spacing.s2} ${spacing.s3}`,
    backgroundColor: colors.surface,
    border: `1px solid ${colors.border}`,
    borderRadius: radii.md,
    color: colors.textSecondary,
    fontSize: font.sm,
    cursor: 'pointer',
    flexShrink: 0,
  },
  submitBtn: {
    padding: `${spacing.s3} ${spacing.s4}`,
    backgroundColor: colors.accent,
    color: '#fff',
    border: 'none',
    borderRadius: radii.md,
    fontSize: font.md,
    fontWeight: 600,
    cursor: 'pointer',
    width: '100%',
  },
});
