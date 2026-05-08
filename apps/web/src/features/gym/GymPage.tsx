import { useState } from 'react';
import * as stylex from '@stylexjs/stylex';
import { colors, font, radii, spacing } from '../../styles/tokens.stylex.js';
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
    <div {...stylex.props(styles.page)}>
      <StationHead eyebrow="Move" title="Gym" sub="Log your sets, build your routines." />

      <div {...stylex.props(styles.tabs)}>
        {(['today', 'workouts', 'exercises'] as GymTab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            {...stylex.props(styles.tab, tab === t && styles.tabActive)}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      <div {...stylex.props(styles.content)}>
        {tab === 'today' && <TodayLog />}
        {tab === 'workouts' && <WorkoutList />}
        {tab === 'exercises' && <ExerciseBrowser />}
      </div>
    </div>
  );
}

const styles = stylex.create({
  page: { display: 'flex', flexDirection: 'column', height: '100%' },
  tabs: {
    display: 'flex',
    gap: '6px',
    padding: `${spacing.s2} ${spacing.s4} ${spacing.s3}`,
    flexShrink: 0,
  },
  tab: {
    padding: `${spacing.s2} ${spacing.s4}`,
    border: 'none',
    background: 'transparent',
    color: colors.textSecondary,
    fontSize: font.sm,
    fontWeight: 500,
    borderRadius: radii.full,
    cursor: 'pointer',
  },
  tabActive: {
    backgroundColor: colors.surface,
    color: colors.textPrimary,
  },
  content: {
    flex: 1,
    overflowY: 'auto',
    paddingLeft: spacing.s4,
    paddingRight: spacing.s4,
    paddingBottom: spacing.s8,
  },
});
