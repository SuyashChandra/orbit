import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router';
import { api } from '../../lib/api.js';
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
    <div className="flex flex-col pb-8">
      <StationHead
        eyebrow="Work"
        title="Your applications"
        sub={`${total} total · ${active} active`}
        action={
          pageTab === 'applications' && (
            <button
              onClick={() => setShowForm(true)}
              className="py-2 px-4 bg-accent text-on-accent border-none rounded-full text-sm font-semibold cursor-pointer"
            >
              + Add
            </button>
          )
        }
      />

      {/* Page tabs */}
      <div className="flex gap-1.5 py-2 px-4 pb-3">
        <button
          onClick={() => setPageTab('applications')}
          className={`py-2 px-4 border-none text-sm font-medium rounded-full cursor-pointer ${pageTab === 'applications' ? 'bg-surface text-fg' : 'bg-transparent text-fg-muted'}`}
        >
          Applications
        </button>
        <button
          onClick={() => setPageTab('resumes')}
          className={`py-2 px-4 border-none text-sm font-medium rounded-full cursor-pointer ${pageTab === 'resumes' ? 'bg-surface text-fg' : 'bg-transparent text-fg-muted'}`}
        >
          Resumes
        </button>
      </div>

      {pageTab === 'resumes' && <div className="px-4"><ResumesTab /></div>}

      {pageTab === 'applications' && (
        <>
          {/* Status filter chips */}
          <div className="flex gap-2 px-4 pb-3 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
            <button
              onClick={() => setStatusFilter('all')}
              className={`text-sm font-medium py-2 px-4 rounded-full border-none whitespace-nowrap cursor-pointer transition ${statusFilter === 'all' ? 'bg-accent text-on-accent font-semibold' : 'bg-surface text-fg-muted'}`}
            >
              All · {total}
            </button>
            {JOB_STATUS.map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`text-sm font-medium py-2 px-4 rounded-full border-none whitespace-nowrap cursor-pointer transition ${statusFilter === s ? 'bg-accent text-on-accent font-semibold' : 'bg-surface text-fg-muted'}`}
              >
                {STATUS_LABELS[s]} · {counts[s]}
              </button>
            ))}
          </div>

          {/* Job list */}
          <div className="flex flex-col gap-3 px-4">
            {jobsQ.isLoading && <p className="text-fg-muted text-sm text-center p-8">Loading…</p>}
            {!jobsQ.isLoading && jobsQ.data?.jobs.length === 0 && (
              <div className="text-center py-8 px-5 flex flex-col gap-1">
                <span className="text-[32px] mb-2 text-accent-bright">✦</span>
                <span className="font-display text-lg font-semibold text-fg">Nothing here yet</span>
                <span className="text-sm text-fg-muted">No applications in this phase.</span>
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
    <article className="p-5 bg-surface rounded-lg cursor-pointer">
      <div className="flex justify-between items-start gap-2 mb-2">
        <span className="text-xs text-fg-muted">
          Applied {new Date(job.appliedAt).toLocaleDateString()}
        </span>
        <Pill status={job.status} />
      </div>

      <h3 className="font-display text-[22px] font-semibold text-fg m-0 leading-[1.15]" style={{ letterSpacing: '-0.02em' }}>
        {job.jobTitle}
      </h3>
      <div className="flex items-baseline gap-1.5 mt-1">
        <span className="text-sm text-accent-bright font-semibold">{job.companyName}</span>
        {job.location && <span className="text-xs text-fg-muted">· {job.location}</span>}
      </div>

      <div className="mt-4 pt-3 border-t border-border-soft flex items-center gap-2">
        <span className="text-sm text-fg-muted">↳</span>
        <span className="text-sm text-fg flex-1">{stageLabel(job)}</span>
        <button
          onClick={(e) => { e.preventDefault(); onDelete(); }}
          className="bg-transparent border-none text-fg-dim cursor-pointer text-base p-1 shrink-0"
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
    <div
      className="fixed inset-0 z-[200] flex items-end justify-center"
      style={{ backgroundColor: 'rgba(8, 16, 12, 0.6)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-[480px] bg-surface flex flex-col gap-4 max-h-[92dvh] overflow-y-auto py-2 px-5 pb-5"
        style={{ borderRadius: '28px 28px 0 0' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-9 h-1 rounded-[2px] bg-border mx-auto mt-2" />
        <div className="flex items-center justify-between">
          <h3 className="font-display text-xl font-semibold text-fg tracking-tight m-0">Add an application</h3>
          <button onClick={onClose} className="bg-surface-2 border-none text-fg-muted text-sm cursor-pointer w-8 h-8 rounded-full" aria-label="Close">✕</button>
        </div>

        <div className="flex flex-col gap-4">
          <Field label="Company">
            <input
              value={form.companyName}
              onChange={(e) => set('companyName', e.target.value)}
              placeholder="e.g. Stripe"
              className="py-3 px-4 bg-surface-2 border-none rounded-md text-fg text-base w-full outline-none"
            />
          </Field>
          <Field label="Role">
            <input
              value={form.jobTitle}
              onChange={(e) => set('jobTitle', e.target.value)}
              placeholder="e.g. Senior Frontend"
              className="py-3 px-4 bg-surface-2 border-none rounded-md text-fg text-base w-full outline-none"
            />
          </Field>
          <Field label="Location">
            <input
              value={form.location ?? ''}
              onChange={(e) => set('location', e.target.value)}
              placeholder="Remote · NYC · …"
              className="py-3 px-4 bg-surface-2 border-none rounded-md text-fg text-base w-full outline-none"
            />
          </Field>
          <Field label="Where are you in the process?">
            <div className="flex flex-wrap gap-1.5">
              {JOB_STATUS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => set('status', s)}
                  className={`text-sm font-medium py-2 px-4 rounded-full border-none whitespace-nowrap cursor-pointer ${form.status === s ? 'bg-accent text-on-accent font-semibold' : 'bg-surface text-fg-muted'}`}
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
              className="py-3 px-4 bg-surface-2 border-none rounded-md text-fg text-base w-full outline-none resize-y"
              style={{ minHeight: '80px', fontFamily: 'var(--font-sans)' }}
            />
          </Field>
        </div>

        <button
          onClick={() => onSubmit(form)}
          disabled={isSubmitting || !valid}
          className="p-4 bg-accent text-on-accent border-none rounded-full text-base font-semibold cursor-pointer w-full disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm text-fg-muted font-medium">{label}</label>
      {children}
    </div>
  );
}
