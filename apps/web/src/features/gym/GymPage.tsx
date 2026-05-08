import { useState } from 'react';
import { StationHead } from '../../components/StationHead.js';
import { TodayLog } from './TodayLog.js';
import { WorkoutList } from './WorkoutList.js';
import { ExerciseBrowser } from './ExerciseBrowser.js';

type GymTab = 'today' | 'workouts' | 'exercises';

const TAB_LABELS: Record<GymTab, string> = {
  today: 'Today',
  workouts: 'Routines',
  exercises: 'Library',
};

export function GymPage() {
  const [tab, setTab] = useState<GymTab>('today');

  return (
    <div className="flex flex-col h-full">
      <StationHead eyebrow="Move" title="Gym" sub="Log your sets, build your routines." />

      <div className="flex gap-1.5 py-2 px-4 pb-3 shrink-0">
        {(['today', 'workouts', 'exercises'] as GymTab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`py-2 px-4 border-none text-sm font-medium rounded-full cursor-pointer ${tab === t ? 'bg-surface text-fg' : 'bg-transparent text-fg-muted'}`}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-8">
        {tab === 'today' && <TodayLog />}
        {tab === 'workouts' && <WorkoutList />}
        {tab === 'exercises' && <ExerciseBrowser />}
      </div>
    </div>
  );
}
