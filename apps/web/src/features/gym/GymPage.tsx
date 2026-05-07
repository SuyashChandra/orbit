import { useState } from 'react';
import * as stylex from '@stylexjs/stylex';
import { colors, font, spacing } from '../../styles/tokens.stylex.js';
import { TodayLog } from './TodayLog.js';
import { WorkoutList } from './WorkoutList.js';
import { ExerciseBrowser } from './ExerciseBrowser.js';

type GymTab = 'today' | 'workouts' | 'exercises';

export function GymPage() {
  const [tab, setTab] = useState<GymTab>('today');

  return (
    <div {...stylex.props(styles.page)}>
      <div {...stylex.props(styles.tabs)}>
        {(['today', 'workouts', 'exercises'] as GymTab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            {...stylex.props(styles.tab, tab === t && styles.tabActive)}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
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
    borderBottom: `1px solid ${colors.border}`,
    backgroundColor: colors.bg,
    flexShrink: 0,
  },
  tab: {
    flex: 1,
    padding: `${spacing.s3} ${spacing.s2}`,
    fontSize: font.sm,
    color: colors.textSecondary,
    background: 'none',
    border: 'none',
    borderBottom: '2px solid transparent',
    cursor: 'pointer',
    marginBottom: '-1px',
    fontWeight: 500,
  },
  tabActive: { color: colors.accent, borderBottomColor: colors.accent },
  content: { flex: 1, overflowY: 'auto', padding: spacing.s4 },
});
