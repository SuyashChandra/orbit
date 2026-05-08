import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router';
import { api } from '../../lib/api.js';
import type { JobApplicationDTO, ResumeDTO, UpdateJobBody } from '@orbit/shared';
import { JOB_STATUS } from '@orbit/shared';

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

export function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [editingField, setEditingField] = useState<string | null>(null);
  const [showResumePicker, setShowResumePicker] = useState(false);

  const jobQ = useQuery<JobApplicationDTO>({
    queryKey: ['job', id],
    queryFn: () => api.get<JobApplicationDTO>(`/jobs/${id}`).then((r) => r.data),
  });

  const resumesQ = useQuery<ResumeDTO[]>({
    queryKey: ['resumes'],
    queryFn: () => api.get<ResumeDTO[]>('/resumes').then((r) => r.data),
  });

  const updateMutation = useMutation({
    mutationFn: (body: UpdateJobBody) =>
      api.patch<JobApplicationDTO>(`/jobs/${id}`, body).then((r) => r.data),
    onSuccess: (updated) => {
      qc.setQueryData(['job', id], updated);
      void qc.invalidateQueries({ queryKey: ['jobs'] });
      setEditingField(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/jobs/${id}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['jobs'] });
      navigate('/jobs');
    },
  });

  const linkResumeMutation = useMutation({
    mutationFn: (resumeId: string) => api.post(`/jobs/${id}/resumes`, { resumeId }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['job', id] });
      setShowResumePicker(false);
    },
  });

  const unlinkResumeMutation = useMutation({
    mutationFn: (resumeId: string) => api.delete(`/jobs/${id}/resumes/${resumeId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['job', id] }),
  });

  const downloadResume = async (resumeId: string) => {
    const { data } = await api.get<{ url: string }>(`/resumes/${resumeId}/download`);
    window.open(data.url, '_blank');
  };

  const job = jobQ.data;
  if (jobQ.isLoading) return <div className="flex flex-col gap-4 p-4 pb-12"><p className="text-fg-muted text-sm">Loading…</p></div>;
  if (!job) return <div className="flex flex-col gap-4 p-4 pb-12"><p className="text-fg-muted text-sm">Not found.</p></div>;

  const linkedIds = new Set(job.resumes.map((r) => r.id));
  const availableResumes = resumesQ.data?.filter((r) => !linkedIds.has(r.id)) ?? [];

  return (
    <div className="flex flex-col gap-4 p-4 pb-12">
      {/* Back + delete */}
      <div className="flex justify-between items-center">
        <button onClick={() => navigate('/jobs')} className="bg-transparent border-none text-accent text-base cursor-pointer p-0">← Back</button>
        <button
          onClick={() => { if (confirm('Delete this application?')) deleteMutation.mutate(); }}
          className="bg-transparent border-none text-danger text-sm cursor-pointer"
        >
          Delete
        </button>
      </div>

      {/* Status badge */}
      <span
        className="inline-block py-1 px-3 rounded-full text-sm font-semibold w-fit"
        style={{ backgroundColor: STATUS_COLORS[job.status] + '22', color: STATUS_COLORS[job.status] }}
      >
        {STATUS_LABELS[job.status]}
      </span>

      {/* Company / title */}
      <EditableField
        label="Company"
        value={job.companyName}
        isEditing={editingField === 'companyName'}
        onStartEdit={() => setEditingField('companyName')}
        onSave={(v) => updateMutation.mutate({ companyName: v })}
        onCancel={() => setEditingField(null)}
        className="text-[1.75rem] font-extrabold text-fg cursor-pointer leading-[1.2]"
      />
      <EditableField
        label="Job Title"
        value={job.jobTitle}
        isEditing={editingField === 'jobTitle'}
        onStartEdit={() => setEditingField('jobTitle')}
        onSave={(v) => updateMutation.mutate({ jobTitle: v })}
        onCancel={() => setEditingField(null)}
        className="text-lg text-fg-muted cursor-pointer"
      />
      {(job.location || editingField === 'location') && (
        <EditableField
          label="Location"
          value={job.location ?? ''}
          isEditing={editingField === 'location'}
          onStartEdit={() => setEditingField('location')}
          onSave={(v) => updateMutation.mutate({ location: v })}
          onCancel={() => setEditingField(null)}
          className="text-base text-fg-muted cursor-pointer"
        />
      )}

      {/* Status selector */}
      <div className="flex flex-col gap-2">
        <p className="text-xs text-fg-muted uppercase" style={{ letterSpacing: '0.08em' }}>Status</p>
        <div className="flex flex-wrap gap-2">
          {JOB_STATUS.map((s) => (
            <button
              key={s}
              onClick={() => updateMutation.mutate({ status: s })}
              className={`py-1 px-3 border rounded-full bg-transparent text-fg-muted text-sm cursor-pointer ${job.status === s ? 'font-bold' : ''}`}
              style={job.status === s ? { borderColor: STATUS_COLORS[s], color: STATUS_COLORS[s] } : { borderColor: 'var(--color-border)' }}
            >
              {STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      {/* Description */}
      <div className="flex flex-col gap-2">
        <p className="text-xs text-fg-muted uppercase" style={{ letterSpacing: '0.08em' }}>Description</p>
        {editingField === 'jobDescription' ? (
          <EditableTextarea
            value={job.jobDescription ?? ''}
            onSave={(v) => updateMutation.mutate({ jobDescription: v })}
            onCancel={() => setEditingField(null)}
          />
        ) : (
          <p
            className="text-base text-fg cursor-pointer whitespace-pre-wrap"
            style={{ lineHeight: 1.6 }}
            onClick={() => setEditingField('jobDescription')}
          >
            {job.jobDescription || <span className="text-fg-muted">Tap to add description…</span>}
          </p>
        )}
      </div>

      {/* Applied date */}
      <div className="flex flex-col gap-2">
        <p className="text-xs text-fg-muted uppercase" style={{ letterSpacing: '0.08em' }}>Applied</p>
        <p className="text-base text-fg">{new Date(job.appliedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>

      {/* Resumes */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <p className="text-xs text-fg-muted uppercase" style={{ letterSpacing: '0.08em' }}>Resumes</p>
          <button onClick={() => setShowResumePicker(true)} className="bg-transparent border-none text-accent text-sm cursor-pointer">
            + Link
          </button>
        </div>
        {job.resumes.length === 0 && (
          <p className="text-fg-muted text-sm">No resumes linked.</p>
        )}
        {job.resumes.map((r) => (
          <div key={r.id} className="flex items-center justify-between py-2 px-3 bg-surface border border-border rounded-md">
            <span className="text-sm text-fg flex-1 overflow-hidden text-ellipsis whitespace-nowrap">{r.filename}</span>
            <div className="flex gap-2">
              <button onClick={() => downloadResume(r.id)} className="bg-transparent border-none text-fg-muted cursor-pointer text-base p-1">↓</button>
              <button onClick={() => unlinkResumeMutation.mutate(r.id)} className="bg-transparent border-none text-fg-muted cursor-pointer text-base p-1">✕</button>
            </div>
          </div>
        ))}
      </div>

      {/* Resume picker */}
      {showResumePicker && (
        <div
          className="fixed inset-0 z-[200] flex items-end"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={() => setShowResumePicker(false)}
        >
          <div
            className="w-full max-w-[480px] mx-auto bg-bg p-4 flex flex-col gap-3 max-h-[60dvh] overflow-y-auto"
            style={{ borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-fg">Link a Resume</h3>
            {availableResumes.length === 0 ? (
              <p className="text-fg-muted text-sm">No resumes available. Upload one in the Jobs tab.</p>
            ) : (
              availableResumes.map((r) => (
                <button
                  key={r.id}
                  onClick={() => linkResumeMutation.mutate(r.id)}
                  className="py-3 px-4 bg-surface border border-border rounded-md text-fg text-base text-left cursor-pointer w-full"
                >
                  {r.filename}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function EditableField({
  label, value, isEditing, onStartEdit, onSave, onCancel, className,
}: {
  label: string;
  value: string;
  isEditing: boolean;
  onStartEdit: () => void;
  onSave: (v: string) => void;
  onCancel: () => void;
  className: string;
}) {
  const [local, setLocal] = useState(value);

  if (isEditing) {
    return (
      <div className="flex gap-2 items-center">
        <input
          value={local}
          onChange={(e) => setLocal(e.target.value)}
          className="flex-1 py-2 px-3 bg-surface border border-accent rounded-md text-fg text-base w-full"
          autoFocus
        />
        <button onClick={() => onSave(local)} className="py-1 px-3 bg-accent text-on-accent border-none rounded-md text-sm cursor-pointer">Save</button>
        <button onClick={onCancel} className="py-1 px-3 bg-transparent text-fg-muted border border-border rounded-md text-sm cursor-pointer">✕</button>
      </div>
    );
  }

  return (
    <p className={className} onClick={onStartEdit} title={`Tap to edit ${label}`}>
      {value || <span className="text-fg-muted">Tap to add…</span>}
    </p>
  );
}

function EditableTextarea({ value, onSave, onCancel }: { value: string; onSave: (v: string) => void; onCancel: () => void }) {
  const [local, setLocal] = useState(value);
  return (
    <div className="flex flex-col gap-2">
      <textarea
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        rows={6}
        className="py-2 px-3 bg-surface border border-accent rounded-md text-fg text-base w-full resize-y"
        style={{ fontFamily: 'inherit' }}
        autoFocus
      />
      <div className="flex gap-2">
        <button onClick={() => onSave(local)} className="py-1 px-3 bg-accent text-on-accent border-none rounded-md text-sm cursor-pointer">Save</button>
        <button onClick={onCancel} className="py-1 px-3 bg-transparent text-fg-muted border border-border rounded-md text-sm cursor-pointer">Cancel</button>
      </div>
    </div>
  );
}
