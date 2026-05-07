import { useState } from 'react';
import * as stylex from '@stylexjs/stylex';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router';
import { api } from '../../lib/api.js';
import { colors, font, radii, spacing } from '../../styles/tokens.stylex.js';
import type { CreateJobBody, JobApplicationDTO } from '@orbit/shared';
import { JOB_STATUS } from '@orbit/shared';
import { ResumesTab } from './ResumesTab.js';

type PageTab = 'applications' | 'resumes';

type JobStatus = (typeof JOB_STATUS)[number];

const STATUS_COLORS: Record<JobStatus, string> = {
  applied: '#6c63ff',
  screening: '#3b82f6',
  interviewing: '#f59e0b',
  offer: '#10b981',
  rejected: '#ef4444',
  withdrawn: '#6b7280',
};

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

  return (
    <div {...stylex.props(styles.page)}>
      <div {...stylex.props(styles.header)}>
        <h2 {...stylex.props(styles.title)}>Jobs</h2>
        {pageTab === 'applications' && (
          <button onClick={() => setShowForm(true)} {...stylex.props(styles.addBtn)}>
            + Add
          </button>
        )}
      </div>

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

      {pageTab === 'resumes' && <ResumesTab />}

      {pageTab === 'applications' && <>
      {/* Status filter tabs */}
      <div {...stylex.props(styles.filterRow)}>
        {(['all', ...JOB_STATUS] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            {...stylex.props(styles.filterBtn, statusFilter === s && styles.filterBtnActive)}
          >
            {s === 'all' ? 'All' : STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {/* Job list */}
      <div {...stylex.props(styles.list)}>
        {jobsQ.isLoading && <p {...stylex.props(styles.muted)}>Loading…</p>}
        {jobsQ.data?.jobs.length === 0 && (
          <p {...stylex.props(styles.muted)}>No applications yet. Add one to get started.</p>
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
      </>}
    </div>
  );
}

function JobCard({ job, onDelete }: { job: JobApplicationDTO; onDelete: () => void }) {
  return (
    <div {...stylex.props(styles.card)}>
      <div {...stylex.props(styles.cardMain)}>
        <span
          {...stylex.props(styles.badge)}
          style={{ backgroundColor: STATUS_COLORS[job.status] + '22', color: STATUS_COLORS[job.status] }}
        >
          {STATUS_LABELS[job.status]}
        </span>
        <p {...stylex.props(styles.company)}>{job.companyName}</p>
        <p {...stylex.props(styles.jobTitle)}>{job.jobTitle}</p>
        {job.location && <p {...stylex.props(styles.location)}>{job.location}</p>}
        <p {...stylex.props(styles.date)}>
          Applied {new Date(job.appliedAt).toLocaleDateString()}
        </p>
      </div>
      <button
        onClick={(e) => { e.preventDefault(); onDelete(); }}
        {...stylex.props(styles.deleteBtn)}
        aria-label="Delete"
      >
        ✕
      </button>
    </div>
  );
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

  return (
    <div {...stylex.props(styles.overlay)} onClick={onClose}>
      <div {...stylex.props(styles.drawer)} onClick={(e) => e.stopPropagation()}>
        <div {...stylex.props(styles.drawerHeader)}>
          <h3 {...stylex.props(styles.drawerTitle)}>Add Application</h3>
          <button onClick={onClose} {...stylex.props(styles.closeBtn)}>✕</button>
        </div>

        <div {...stylex.props(styles.formFields)}>
          <Field label="Company *">
            <input value={form.companyName} onChange={(e) => set('companyName', e.target.value)} {...stylex.props(styles.input)} />
          </Field>
          <Field label="Job Title *">
            <input value={form.jobTitle} onChange={(e) => set('jobTitle', e.target.value)} {...stylex.props(styles.input)} />
          </Field>
          <Field label="Location">
            <input value={form.location ?? ''} onChange={(e) => set('location', e.target.value)} {...stylex.props(styles.input)} />
          </Field>
          <Field label="Status">
            <select
              value={form.status}
              onChange={(e) => set('status', e.target.value)}
              {...stylex.props(styles.input)}
            >
              {JOB_STATUS.map((s) => (
                <option key={s} value={s}>{STATUS_LABELS[s]}</option>
              ))}
            </select>
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
          disabled={isSubmitting || !form.companyName.trim() || !form.jobTitle.trim()}
          {...stylex.props(styles.submitBtn)}
        >
          {isSubmitting ? 'Adding…' : 'Add Application'}
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div {...stylex.props(styles.field)}>
      <label {...stylex.props(styles.label)}>{label}</label>
      {children}
    </div>
  );
}

const styles = stylex.create({
  page: { display: 'flex', flexDirection: 'column', gap: spacing.s3, padding: spacing.s4 },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: font.xl, fontWeight: 700, color: colors.textPrimary },
  addBtn: {
    padding: `${spacing.s2} ${spacing.s4}`,
    backgroundColor: colors.accent,
    color: '#fff',
    border: 'none',
    borderRadius: radii.md,
    fontSize: font.md,
    fontWeight: 600,
    cursor: 'pointer',
  },
  pageTabs: { display: 'flex', borderBottom: `1px solid ${colors.border}` },
  pageTab: {
    padding: `${spacing.s2} ${spacing.s4}`,
    fontSize: font.md,
    color: colors.textSecondary,
    background: 'none',
    border: 'none',
    borderBottom: '2px solid transparent',
    cursor: 'pointer',
    marginBottom: '-1px',
  },
  pageTabActive: { color: colors.accent, borderBottomColor: colors.accent },
  filterRow: { display: 'flex', gap: spacing.s2, overflowX: 'auto', paddingBottom: spacing.s1 },
  filterBtn: {
    padding: `${spacing.s1} ${spacing.s3}`,
    borderRadius: radii.full,
    border: `1px solid ${colors.border}`,
    backgroundColor: 'transparent',
    color: colors.textSecondary,
    fontSize: font.sm,
    whiteSpace: 'nowrap',
    cursor: 'pointer',
  },
  filterBtnActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
    color: '#fff',
  },
  list: { display: 'flex', flexDirection: 'column', gap: spacing.s3 },
  muted: { color: colors.textSecondary, fontSize: font.sm, textAlign: 'center', paddingTop: spacing.s8 },
  card: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: spacing.s4,
    backgroundColor: colors.surface,
    border: `1px solid ${colors.border}`,
    borderRadius: radii.lg,
    gap: spacing.s2,
  },
  cardMain: { display: 'flex', flexDirection: 'column', gap: spacing.s1, flex: 1 },
  badge: {
    display: 'inline-block',
    padding: `2px ${spacing.s2}`,
    borderRadius: radii.full,
    fontSize: font.xs,
    fontWeight: 600,
    width: 'fit-content',
  },
  company: { fontSize: font.lg, fontWeight: 700, color: colors.textPrimary },
  jobTitle: { fontSize: font.md, color: colors.textSecondary },
  location: { fontSize: font.sm, color: colors.textSecondary },
  date: { fontSize: font.xs, color: colors.textSecondary, marginTop: spacing.s1 },
  deleteBtn: {
    background: 'none',
    border: 'none',
    color: colors.textSecondary,
    cursor: 'pointer',
    fontSize: font.md,
    padding: spacing.s1,
    flexShrink: 0,
  },
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
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
    gap: spacing.s4,
    maxHeight: '90dvh',
    overflowY: 'auto',
  },
  drawerHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  drawerTitle: { fontSize: font.lg, fontWeight: 700, color: colors.textPrimary },
  closeBtn: { background: 'none', border: 'none', color: colors.textSecondary, fontSize: font.lg, cursor: 'pointer' },
  formFields: { display: 'flex', flexDirection: 'column', gap: spacing.s3 },
  field: { display: 'flex', flexDirection: 'column', gap: spacing.s1 },
  label: { fontSize: font.sm, color: colors.textSecondary },
  input: {
    padding: `${spacing.s2} ${spacing.s3}`,
    backgroundColor: colors.surface,
    border: `1px solid ${colors.border}`,
    borderRadius: radii.md,
    color: colors.textPrimary,
    fontSize: font.md,
    width: '100%',
  },
  textarea: { resize: 'vertical', fontFamily: 'inherit' },
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
