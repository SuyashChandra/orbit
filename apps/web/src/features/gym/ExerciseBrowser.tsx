import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api.js';
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
    <div className="flex flex-col gap-3">
      {/* Search */}
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search exercises…"
        className="py-2 px-3 bg-surface border border-border rounded-md text-fg text-base w-full"
      />

      {/* Category filters */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setCategory('')}
          className={`py-1 px-3 rounded-full border text-sm cursor-pointer whitespace-nowrap ${category === '' ? 'bg-accent border-accent text-on-accent' : 'bg-transparent border-border text-fg-muted'}`}
        >
          All
        </button>
        {categoriesQ.data?.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat === category ? '' : cat)}
            className={`py-1 px-3 rounded-full border text-sm cursor-pointer whitespace-nowrap ${category === cat ? 'bg-accent border-accent text-on-accent' : 'bg-transparent border-border text-fg-muted'}`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Add custom button */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowCustomForm(true)}
          className="py-1 px-3 bg-transparent border border-accent rounded-md text-accent text-sm cursor-pointer"
        >
          + Custom Exercise
        </button>
      </div>

      {/* Exercise list */}
      {exercisesQ.isLoading && <p className="text-fg-muted text-sm text-center pt-6">Loading…</p>}
      <div className="flex flex-col gap-2">
        {exercises.map((ex) => (
          <button
            key={ex.id}
            onClick={() => setSelected(ex)}
            className="flex items-center justify-between py-3 px-4 bg-surface border border-border rounded-md cursor-pointer text-left w-full"
          >
            <div>
              <p className="text-base font-semibold text-fg">{ex.name}</p>
              <p className="text-xs text-fg-muted mt-0.5">
                {ex.category}
                {ex.muscleGroups.length > 0 && ` · ${ex.muscleGroups.slice(0, 3).join(', ')}`}
              </p>
            </div>
            {ex.isCustom && (
              <span className="text-xs text-accent border border-accent rounded-full py-px px-2 shrink-0">Custom</span>
            )}
          </button>
        ))}
        {exercises.length === 0 && !exercisesQ.isLoading && (
          <p className="text-fg-muted text-sm text-center pt-6">No exercises found.</p>
        )}
      </div>

      {/* Detail modal */}
      {selected && (
        <Modal onClose={() => setSelected(null)}>
          <h3 className="text-xl font-bold text-fg pr-6">{selected.name}</h3>
          <p className="text-base text-fg-muted">{selected.category}</p>
          {selected.muscleGroups.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selected.muscleGroups.map((m) => (
                <span key={m} className="py-0.5 px-3 bg-raised rounded-full text-sm text-fg-muted">{m}</span>
              ))}
            </div>
          )}
          {selected.isCustom && (
            <button
              onClick={() => { if (confirm('Delete this exercise?')) deleteMutation.mutate(selected.id); }}
              className="py-2 px-4 bg-transparent border border-danger rounded-md text-danger text-sm cursor-pointer"
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
      <h3 className="text-xl font-bold text-fg pr-6">New Custom Exercise</h3>
      <div className="flex flex-col gap-2">
        <label className="text-sm text-fg-muted">Name *</label>
        <input
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          className="py-2 px-3 bg-surface border border-border rounded-md text-fg text-base"
        />
        <label className="text-sm text-fg-muted">Category *</label>
        <input
          value={form.category}
          onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
          placeholder="e.g. Chest, Back, Legs"
          className="py-2 px-3 bg-surface border border-border rounded-md text-fg text-base"
        />
        <label className="text-sm text-fg-muted">Muscle Groups</label>
        <div className="flex gap-2">
          <input
            value={muscleInput}
            onChange={(e) => setMuscleInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addMuscle(); } }}
            placeholder="Type + Enter"
            className="flex-1 py-2 px-3 bg-surface border border-border rounded-md text-fg text-base"
          />
          <button
            onClick={addMuscle}
            className="py-2 px-3 bg-surface border border-border rounded-md text-fg-muted text-sm cursor-pointer shrink-0"
          >Add</button>
        </div>
        {form.muscleGroups.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {form.muscleGroups.map((m) => (
              <button
                key={m}
                onClick={() => setForm((f) => ({ ...f, muscleGroups: f.muscleGroups.filter((x) => x !== m) }))}
                className="py-0.5 px-3 bg-raised border-none rounded-full text-sm text-fg-muted cursor-pointer"
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
        className="py-3 px-4 bg-accent text-on-accent border-none rounded-md text-base font-semibold cursor-pointer w-full disabled:opacity-50"
      >
        {mutation.isPending ? 'Saving…' : 'Save'}
      </button>
    </Modal>
  );
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[200] flex items-end"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-[480px] mx-auto bg-bg p-6 flex flex-col gap-4 max-h-[80dvh] overflow-y-auto relative"
        style={{ borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0' }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 bg-transparent border-none text-fg-muted text-lg cursor-pointer"
        >✕</button>
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
