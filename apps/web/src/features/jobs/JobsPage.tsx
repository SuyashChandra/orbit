import { useState } from 'react';
import * as stylex from '@stylexjs/stylex';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router';
import { api } from '../../lib/api.js';
import { colors, font, radii, spacing } from '../../styles/tokens.stylex.js';
import type { CreateJobBody, JobApplicationDTO } from '@orbit/shared';
import { JOB_STATUS } from '@orbit/shared';
import { StationHead } from '../../components/StationHead.js';
import { Pill } from '../../components/Pill.js';
import { ResumesTab } from './ResumesTab.js';

type PageTab = 'applications' | 'resumes';

type JobStatus = (typeof JOB_STATUS)[number];

const STATUS_LABELS: Record<JobStatus, string> = {
  applied: 'Applied',
  screening: 'Screening',
  interviewing: 'Interviewing',
  offer: 'Offer',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
};

interface JobsResponse {
  jobs: JobApplicationDTO[];
  page: number;
  hasMore: boolean;
}

export function JobsPage() {
  const [pageTab, setPageTab] = useState<PageTab>('applications');
  const [statusFilter, setStatusFilter] = useState<JobStatus | 'all'>('all');
  const [showForm, setShowForm] = useState(false);
  const qc = useQueryClient();

  const queryKey = ['jobs', statusFilter];
  const jobsQ = useQuery<JobsResponse>({
    queryKey,
    queryFn: () => {
      const params = statusFilter !== 'all' ? `?status=${statusFilter}` : '';
      return api.get<JobsResponse>(`/jobs${params}`).then((r) => r.data);
    },
  });

  // Fetch full list once for stable counts (so chips don't disappear when filtered)
  const allJobsQ = useQuery<JobsResponse>({
    queryKey: ['jobs', 'all'],
    queryFn: () => api.get<JobsResponse>('/jobs').then((r) => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/jobs/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['jobs'] }),
  });

  const addMutation = useMutation({
    mutationFn: (body: CreateJobBody) => api.post<JobApplicationDTO>('/jobs', body).then((r) => r.data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['jobs'] });
      setShowForm(false);
    },
  });

  const allJobs = allJobsQ.data?.jobs ?? [];
  const total = allJobs.length;
  const counts = JOB_STATUS.reduce<Record<JobStatus, number>>((acc, s) => {
    acc[s] = allJobs.filter((j) => j.status === s).length;
    return acc;
  }, {} as Record<JobStatus, number>);
  const active = counts.applied + counts.screening + counts.interviewing + counts.offer;

  return (
    <div {...stylex.props(styles.page)}>
      <StationHead
        eyebrow="Work"
        title="Your applications"
        sub={`${total} total · ${active} active`}
        action={
          pageTab === 'applications' && (
            <button onClick={() => setShowForm(true)} {...stylex.props(styles.addBtn)}>
              + Add
            </button>
          )
        }
      />

      {/* Page tabs */}
      <div {...stylex.props(styles.pageTabs)}>
        <button
          onClick={() => setPageTab('applications')}
          {...stylex.props(styles.pageTab, pageTab === 'applications' && styles.pageTabActive)}
        >
          Applications
        </button>
        <button
          onClick={() => setPageTab('resumes')}
          {...stylex.props(styles.pageTab, pageTab === 'resumes' && styles.pageTabActive)}
        >
          Resumes
        </button>
      </div>

      {pageTab === 'resumes' && <div {...stylex.props(styles.body)}><ResumesTab /></div>}

      {pageTab === 'applications' && (
        <>
          {/* Status filter chips */}
          <div {...stylex.props(styles.chips)}>
            <button
              onClick={() => setStatusFilter('all')}
              {...stylex.props(styles.chip, statusFilter === 'all' && styles.chipActive)}
            >
              All · {total}
            </button>
            {JOB_STATUS.map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                {...stylex.props(styles.chip, statusFilter === s && styles.chipActive)}
              >
                {STATUS_LABELS[s]} · {counts[s]}
              </button>
            ))}
          </div>

          {/* Job list */}
          <div {...stylex.props(styles.list)}>
            {jobsQ.isLoading && <p {...stylex.props(styles.muted)}>Loading…</p>}
            {!jobsQ.isLoading && jobsQ.data?.jobs.length === 0 && (
              <div {...stylex.props(styles.empty)}>
                <span {...stylex.props(styles.emptyGlyph)}>✦</span>
                <span {...stylex.props(styles.emptyTitle)}>Nothing here yet</span>
                <span {...stylex.props(styles.emptySub)}>
                  No applications in this phase.
                </span>
              </div>
            )}
            {jobsQ.data?.jobs.map((job) => (
              <Link key={job.id} to={`/jobs/${job.id}`} style={{ textDecoration: 'none' }}>
                <JobCard job={job} onDelete={() => deleteMutation.mutate(job.id)} />
              </Link>
            ))}
          </div>

          {/* Add job drawer */}
          {showForm && (
            <JobFormDrawer
              onSubmit={(data) => addMutation.mutate(data)}
              onClose={() => setShowForm(false)}
              isSubmitting={addMutation.isPending}
            />
          )}
        </>
      )}
    </div>
  );
}

function JobCard({ job, onDelete }: { job: JobApplicationDTO; onDelete: () => void }) {
  return (
    <article {...stylex.props(styles.card)}>
      <div {...stylex.props(styles.cardTopRow)}>
        <span {...stylex.props(styles.cardDate)}>
          Applied {new Date(job.appliedAt).toLocaleDateString()}
        </span>
        <Pill status={job.status} />
      </div>

      <h3 {...stylex.props(styles.cardTitle)}>{job.jobTitle}</h3>
      <div {...stylex.props(styles.cardMeta)}>
        <span {...stylex.props(styles.cardCompany)}>{job.companyName}</span>
        {job.location && <span {...stylex.props(styles.cardLoc)}>· {job.location}</span>}
      </div>

      <div {...stylex.props(styles.cardFoot)}>
        <span {...stylex.props(styles.cardArrow)}>↳</span>
        <span {...stylex.props(styles.cardStage)}>{stageLabel(job)}</span>
        <button
          onClick={(e) => { e.preventDefault(); onDelete(); }}
          {...stylex.props(styles.deleteBtn)}
          aria-label="Remove"
        >
          ✕
        </button>
      </div>
    </article>
  );
}

function stageLabel(job: JobApplicationDTO): string {
  switch (job.status) {
    case 'applied':      return 'Just submitted';
    case 'screening':    return 'In screening';
    case 'interviewing': return 'Interviewing';
    case 'offer':        return 'Offer received';
    case 'rejected':     return 'Closed — not moving forward';
    case 'withdrawn':    return 'Withdrawn';
  }
}

function JobFormDrawer({
  onSubmit,
  onClose,
  isSubmitting,
}: {
  onSubmit: (data: CreateJobBody) => void;
  onClose: () => void;
  isSubmitting: boolean;
}) {
  const [form, setForm] = useState<CreateJobBody>({
    companyName: '',
    jobTitle: '',
    location: '',
    status: 'applied',
  });

  const set = (k: keyof CreateJobBody, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const valid = form.companyName?.trim() && form.jobTitle?.trim();

  return (
    <div {...stylex.props(styles.overlay)} onClick={onClose}>
      <div {...stylex.props(styles.drawer)} onClick={(e) => e.stopPropagation()}>
        <div {...stylex.props(styles.grip)} />
        <div {...stylex.props(styles.drawerHeader)}>
          <h3 {...stylex.props(styles.drawerTitle)}>Add an application</h3>
          <button onClick={onClose} {...stylex.props(styles.closeBtn)} aria-label="Close">✕</button>
        </div>

        <div {...stylex.props(styles.formFields)}>
          <Field label="Company">
            <input
              value={form.companyName}
              onChange={(e) => set('companyName', e.target.value)}
              placeholder="e.g. Stripe"
              {...stylex.props(styles.input)}
            />
          </Field>
          <Field label="Role">
            <input
              value={form.jobTitle}
              onChange={(e) => set('jobTitle', e.target.value)}
              placeholder="e.g. Senior Frontend"
              {...stylex.props(styles.input)}
            />
          </Field>
          <Field label="Location">
            <input
              value={form.location ?? ''}
              onChange={(e) => set('location', e.target.value)}
              placeholder="Remote · NYC · …"
              {...stylex.props(styles.input)}
            />
          </Field>
          <Field label="Where are you in the process?">
            <div {...stylex.props(styles.statusChips)}>
              {JOB_STATUS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => set('status', s)}
                  {...stylex.props(styles.chip, form.status === s && styles.chipActive)}
                >
                  {STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Description">
            <textarea
              value={form.jobDescription ?? ''}
              onChange={(e) => set('jobDescription', e.target.value)}
              rows={4}
              {...stylex.props(styles.input, styles.textarea)}
            />
          </Field>
        </div>

        <button
          onClick={() => onSubmit(form)}
          disabled={isSubmitting || !valid}
          {...stylex.props(styles.submitBtn)}
        >
          {isSubmitting ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div {...stylex.props(styles.field)}>
      <label {...stylex.props(styles.fieldLabel)}>{label}</label>
      {children}
    </div>
  );
}

const styles = stylex.create({
  page: { display: 'flex', flexDirection: 'column', paddingBottom: spacing.s8 },
  body: { padding: `0 ${spacing.s4}` },
  addBtn: {
    padding: `${spacing.s2} ${spacing.s4}`,
    backgroundColor: colors.accent,
    color: colors.fgOnAccent,
    border: 'none',
    borderRadius: radii.full,
    fontSize: font.sm,
    fontWeight: 600,
    cursor: 'pointer',
  },

  // Page tabs (Applications / Resumes)
  pageTabs: {
    display: 'flex',
    gap: '6px',
    padding: `${spacing.s2} ${spacing.s4} ${spacing.s3}`,
  },
  pageTab: {
    padding: `${spacing.s2} ${spacing.s4}`,
    border: 'none',
    background: 'transparent',
    color: colors.textSecondary,
    fontSize: font.sm,
    fontWeight: 500,
    borderRadius: radii.full,
    cursor: 'pointer',
  },
  pageTabActive: { backgroundColor: colors.surface, color: colors.textPrimary },

  // Status chips
  chips: {
    display: 'flex',
    gap: spacing.s2,
    padding: `0 ${spacing.s4} ${spacing.s3}`,
    overflowX: 'auto',
    scrollbarWidth: 'none',
  },
  chip: {
    fontSize: font.sm,
    fontWeight: 500,
    padding: `${spacing.s2} ${spacing.s4}`,
    borderRadius: radii.full,
    border: 'none',
    backgroundColor: colors.surface,
    color: colors.textSecondary,
    whiteSpace: 'nowrap',
    cursor: 'pointer',
    transition: 'background 0.15s, color 0.15s',
  },
  chipActive: {
    backgroundColor: colors.accent,
    color: colors.fgOnAccent,
    fontWeight: 600,
  },
  statusChips: { display: 'flex', flexWrap: 'wrap', gap: '6px' },

  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.s3,
    padding: `0 ${spacing.s4}`,
  },
  muted: {
    color: colors.textSecondary,
    fontSize: font.sm,
    textAlign: 'center',
    padding: spacing.s8,
  },
  empty: {
    textAlign: 'center',
    padding: `${spacing.s8} ${spacing.s5}`,
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.s1,
  },
  emptyGlyph: { fontSize: '32px', marginBottom: spacing.s2, color: colors.accentBright },
  emptyTitle: { fontFamily: font.display, fontSize: font.lg, fontWeight: 600, color: colors.textPrimary },
  emptySub: { fontSize: font.sm, color: colors.textSecondary },

  // Job card (cozy)
  card: {
    padding: spacing.s5,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    cursor: 'pointer',
  },
  cardTopRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.s2,
    marginBottom: spacing.s2,
  },
  cardDate: { fontSize: font.xs, color: colors.textSecondary },
  cardTitle: {
    fontFamily: font.display,
    fontSize: '22px',
    fontWeight: 600,
    color: colors.textPrimary,
    letterSpacing: '-0.02em',
    lineHeight: 1.15,
    margin: 0,
  },
  cardMeta: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '6px',
    marginTop: spacing.s1,
  },
  cardCompany: { fontSize: font.sm, color: colors.accentBright, fontWeight: 600 },
  cardLoc: { fontSize: font.xs, color: colors.textSecondary },
  cardFoot: {
    marginTop: spacing.s4,
    paddingTop: spacing.s3,
    borderTop: `1px solid ${colors.borderSoft}`,
    display: 'flex',
    alignItems: 'center',
    gap: spacing.s2,
  },
  cardArrow: { fontSize: font.sm, color: colors.textSecondary },
  cardStage: { fontSize: font.sm, color: colors.textPrimary, flex: 1 },
  deleteBtn: {
    background: 'transparent',
    border: 'none',
    color: colors.textDeep,
    cursor: 'pointer',
    fontSize: font.md,
    padding: spacing.s1,
    flexShrink: 0,
  },

  // Drawer
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(8, 16, 12, 0.6)',
    backdropFilter: 'blur(4px)',
    zIndex: 200,
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  drawer: {
    width: '100%',
    maxWidth: '480px',
    backgroundColor: colors.surface,
    borderRadius: '28px 28px 0 0',
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.s4,
    maxHeight: '92dvh',
    overflowY: 'auto',
    padding: `${spacing.s2} ${spacing.s5} ${spacing.s5}`,
  },
  grip: {
    width: '36px',
    height: '4px',
    borderRadius: '2px',
    backgroundColor: colors.border,
    margin: `${spacing.s2} auto 0`,
  },
  drawerHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  drawerTitle: {
    fontFamily: font.display,
    fontSize: font.xl,
    fontWeight: 600,
    color: colors.textPrimary,
    letterSpacing: '-0.02em',
    margin: 0,
  },
  closeBtn: {
    background: colors.surface2,
    border: 'none',
    color: colors.textSecondary,
    fontSize: font.sm,
    cursor: 'pointer',
    width: '32px',
    height: '32px',
    borderRadius: radii.full,
  },
  formFields: { display: 'flex', flexDirection: 'column', gap: spacing.s4 },
  field: { display: 'flex', flexDirection: 'column', gap: spacing.s2 },
  fieldLabel: { fontSize: font.sm, color: colors.textSecondary, fontWeight: 500 },
  input: {
    padding: `${spacing.s3} ${spacing.s4}`,
    backgroundColor: colors.surface2,
    border: 'none',
    borderRadius: radii.md,
    color: colors.textPrimary,
    fontSize: font.md,
    width: '100%',
    outline: 'none',
    fontFamily: font.sans,
  },
  textarea: { resize: 'vertical', minHeight: '80px' },
  submitBtn: {
    padding: spacing.s4,
    backgroundColor: colors.accent,
    color: colors.fgOnAccent,
    border: 'none',
    borderRadius: radii.full,
    fontSize: font.md,
    fontWeight: 600,
    cursor: 'pointer',
    width: '100%',
    ':disabled': { opacity: 0.4, cursor: 'not-allowed' },
  },
});
