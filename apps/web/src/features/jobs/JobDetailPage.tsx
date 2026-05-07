import { useState } from 'react';
import * as stylex from '@stylexjs/stylex';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router';
import { api } from '../../lib/api.js';
import { colors, font, radii, spacing } from '../../styles/tokens.stylex.js';
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
  if (jobQ.isLoading) return <div {...stylex.props(styles.page)}><p {...stylex.props(styles.muted)}>Loading…</p></div>;
  if (!job) return <div {...stylex.props(styles.page)}><p {...stylex.props(styles.muted)}>Not found.</p></div>;

  const linkedIds = new Set(job.resumes.map((r) => r.id));
  const availableResumes = resumesQ.data?.filter((r) => !linkedIds.has(r.id)) ?? [];

  return (
    <div {...stylex.props(styles.page)}>
      {/* Back + delete */}
      <div {...stylex.props(styles.topRow)}>
        <button onClick={() => navigate('/jobs')} {...stylex.props(styles.backBtn)}>← Back</button>
        <button
          onClick={() => { if (confirm('Delete this application?')) deleteMutation.mutate(); }}
          {...stylex.props(styles.deleteBtn)}
        >
          Delete
        </button>
      </div>

      {/* Status badge */}
      <span
        {...stylex.props(styles.badge)}
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
        style={styles.company}
      />
      <EditableField
        label="Job Title"
        value={job.jobTitle}
        isEditing={editingField === 'jobTitle'}
        onStartEdit={() => setEditingField('jobTitle')}
        onSave={(v) => updateMutation.mutate({ jobTitle: v })}
        onCancel={() => setEditingField(null)}
        style={styles.jobTitle}
      />
      {(job.location || editingField === 'location') && (
        <EditableField
          label="Location"
          value={job.location ?? ''}
          isEditing={editingField === 'location'}
          onStartEdit={() => setEditingField('location')}
          onSave={(v) => updateMutation.mutate({ location: v })}
          onCancel={() => setEditingField(null)}
          style={styles.location}
        />
      )}

      {/* Status selector */}
      <div {...stylex.props(styles.section)}>
        <p {...stylex.props(styles.sectionLabel)}>Status</p>
        <div {...stylex.props(styles.statusGrid)}>
          {JOB_STATUS.map((s) => (
            <button
              key={s}
              onClick={() => updateMutation.mutate({ status: s })}
              {...stylex.props(styles.statusBtn, job.status === s && styles.statusBtnActive)}
              style={job.status === s ? { borderColor: STATUS_COLORS[s], color: STATUS_COLORS[s] } : undefined}
            >
              {STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      {/* Description */}
      <div {...stylex.props(styles.section)}>
        <p {...stylex.props(styles.sectionLabel)}>Description</p>
        {editingField === 'jobDescription' ? (
          <EditableTextarea
            value={job.jobDescription ?? ''}
            onSave={(v) => updateMutation.mutate({ jobDescription: v })}
            onCancel={() => setEditingField(null)}
          />
        ) : (
          <p
            {...stylex.props(styles.description)}
            onClick={() => setEditingField('jobDescription')}
          >
            {job.jobDescription || <span {...stylex.props(styles.placeholder)}>Tap to add description…</span>}
          </p>
        )}
      </div>

      {/* Applied date */}
      <div {...stylex.props(styles.section)}>
        <p {...stylex.props(styles.sectionLabel)}>Applied</p>
        <p {...stylex.props(styles.dateText)}>{new Date(job.appliedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>

      {/* Resumes */}
      <div {...stylex.props(styles.section)}>
        <div {...stylex.props(styles.sectionHeader)}>
          <p {...stylex.props(styles.sectionLabel)}>Resumes</p>
          <button onClick={() => setShowResumePicker(true)} {...stylex.props(styles.linkBtn)}>
            + Link
          </button>
        </div>
        {job.resumes.length === 0 && (
          <p {...stylex.props(styles.muted)}>No resumes linked.</p>
        )}
        {job.resumes.map((r) => (
          <div key={r.id} {...stylex.props(styles.resumeRow)}>
            <span {...stylex.props(styles.resumeName)}>{r.filename}</span>
            <div {...stylex.props(styles.resumeActions)}>
              <button onClick={() => downloadResume(r.id)} {...stylex.props(styles.resumeBtn)}>↓</button>
              <button onClick={() => unlinkResumeMutation.mutate(r.id)} {...stylex.props(styles.resumeBtn)}>✕</button>
            </div>
          </div>
        ))}
      </div>

      {/* Resume picker */}
      {showResumePicker && (
        <div {...stylex.props(styles.overlay)} onClick={() => setShowResumePicker(false)}>
          <div {...stylex.props(styles.drawer)} onClick={(e) => e.stopPropagation()}>
            <h3 {...stylex.props(styles.drawerTitle)}>Link a Resume</h3>
            {availableResumes.length === 0 ? (
              <p {...stylex.props(styles.muted)}>No resumes available. Upload one in the Jobs tab.</p>
            ) : (
              availableResumes.map((r) => (
                <button
                  key={r.id}
                  onClick={() => linkResumeMutation.mutate(r.id)}
                  {...stylex.props(styles.resumePickerItem)}
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
  label, value, isEditing, onStartEdit, onSave, onCancel, style,
}: {
  label: string;
  value: string;
  isEditing: boolean;
  onStartEdit: () => void;
  onSave: (v: string) => void;
  onCancel: () => void;
  style: stylex.StyleXStyles;
}) {
  const [local, setLocal] = useState(value);

  if (isEditing) {
    return (
      <div {...stylex.props(styles.editRow)}>
        <input
          value={local}
          onChange={(e) => setLocal(e.target.value)}
          {...stylex.props(styles.editInput)}
          autoFocus
        />
        <button onClick={() => onSave(local)} {...stylex.props(styles.saveBtn)}>Save</button>
        <button onClick={onCancel} {...stylex.props(styles.cancelBtn)}>✕</button>
      </div>
    );
  }

  return (
    <p {...stylex.props(style)} onClick={onStartEdit} title={`Tap to edit ${label}`}>
      {value || <span {...stylex.props(styles.placeholder)}>Tap to add…</span>}
    </p>
  );
}

function EditableTextarea({ value, onSave, onCancel }: { value: string; onSave: (v: string) => void; onCancel: () => void }) {
  const [local, setLocal] = useState(value);
  return (
    <div {...stylex.props(styles.editCol)}>
      <textarea
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        rows={6}
        {...stylex.props(styles.editInput, styles.textarea)}
        autoFocus
      />
      <div {...stylex.props(styles.editActions)}>
        <button onClick={() => onSave(local)} {...stylex.props(styles.saveBtn)}>Save</button>
        <button onClick={onCancel} {...stylex.props(styles.cancelBtn)}>Cancel</button>
      </div>
    </div>
  );
}

const styles = stylex.create({
  page: { display: 'flex', flexDirection: 'column', gap: spacing.s4, padding: spacing.s4, paddingBottom: spacing.s12 },
  topRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  backBtn: { background: 'none', border: 'none', color: colors.accent, fontSize: font.md, cursor: 'pointer', padding: 0 },
  deleteBtn: { background: 'none', border: 'none', color: colors.danger, fontSize: font.sm, cursor: 'pointer' },
  badge: {
    display: 'inline-block',
    padding: `4px ${spacing.s3}`,
    borderRadius: radii.full,
    fontSize: font.sm,
    fontWeight: 600,
    width: 'fit-content',
  },
  company: { fontSize: font.xxl, fontWeight: 800, color: colors.textPrimary, cursor: 'pointer', lineHeight: 1.2 },
  jobTitle: { fontSize: font.lg, color: colors.textSecondary, cursor: 'pointer' },
  location: { fontSize: font.md, color: colors.textSecondary, cursor: 'pointer' },
  section: { display: 'flex', flexDirection: 'column', gap: spacing.s2 },
  sectionHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  sectionLabel: { fontSize: font.xs, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: '0.08em' },
  statusGrid: { display: 'flex', flexWrap: 'wrap', gap: spacing.s2 },
  statusBtn: {
    padding: `${spacing.s1} ${spacing.s3}`,
    border: `1px solid ${colors.border}`,
    borderRadius: radii.full,
    backgroundColor: 'transparent',
    color: colors.textSecondary,
    fontSize: font.sm,
    cursor: 'pointer',
  },
  statusBtnActive: { fontWeight: 700 },
  description: { fontSize: font.md, color: colors.textPrimary, lineHeight: 1.6, cursor: 'pointer', whiteSpace: 'pre-wrap' },
  placeholder: { color: colors.textSecondary },
  dateText: { fontSize: font.md, color: colors.textPrimary },
  linkBtn: { background: 'none', border: 'none', color: colors.accent, fontSize: font.sm, cursor: 'pointer' },
  resumeRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: `${spacing.s2} ${spacing.s3}`,
    backgroundColor: colors.surface,
    border: `1px solid ${colors.border}`,
    borderRadius: radii.md,
  },
  resumeName: { fontSize: font.sm, color: colors.textPrimary, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  resumeActions: { display: 'flex', gap: spacing.s2 },
  resumeBtn: { background: 'none', border: 'none', color: colors.textSecondary, cursor: 'pointer', fontSize: font.md, padding: spacing.s1 },
  muted: { color: colors.textSecondary, fontSize: font.sm },
  editRow: { display: 'flex', gap: spacing.s2, alignItems: 'center' },
  editCol: { display: 'flex', flexDirection: 'column', gap: spacing.s2 },
  editInput: {
    flex: 1,
    padding: `${spacing.s2} ${spacing.s3}`,
    backgroundColor: colors.surface,
    border: `1px solid ${colors.accent}`,
    borderRadius: radii.md,
    color: colors.textPrimary,
    fontSize: font.md,
    width: '100%',
  },
  textarea: { resize: 'vertical', fontFamily: 'inherit' },
  editActions: { display: 'flex', gap: spacing.s2 },
  saveBtn: {
    padding: `${spacing.s1} ${spacing.s3}`,
    backgroundColor: colors.accent,
    color: '#fff',
    border: 'none',
    borderRadius: radii.md,
    fontSize: font.sm,
    cursor: 'pointer',
  },
  cancelBtn: {
    padding: `${spacing.s1} ${spacing.s3}`,
    backgroundColor: 'transparent',
    color: colors.textSecondary,
    border: `1px solid ${colors.border}`,
    borderRadius: radii.md,
    fontSize: font.sm,
    cursor: 'pointer',
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
    gap: spacing.s3,
    maxHeight: '60dvh',
    overflowY: 'auto',
  },
  drawerTitle: { fontSize: font.lg, fontWeight: 700, color: colors.textPrimary },
  resumePickerItem: {
    padding: `${spacing.s3} ${spacing.s4}`,
    backgroundColor: colors.surface,
    border: `1px solid ${colors.border}`,
    borderRadius: radii.md,
    color: colors.textPrimary,
    fontSize: font.md,
    textAlign: 'left',
    cursor: 'pointer',
    width: '100%',
  },
});
