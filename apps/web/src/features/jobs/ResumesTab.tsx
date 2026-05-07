import { useRef } from 'react';
import * as stylex from '@stylexjs/stylex';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api.js';
import { colors, font, radii, spacing } from '../../styles/tokens.stylex.js';
import type { ResumeDTO } from '@orbit/shared';

export function ResumesTab() {
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);

  const resumesQ = useQuery<ResumeDTO[]>({
    queryKey: ['resumes'],
    queryFn: () => api.get<ResumeDTO[]>('/resumes').then((r) => r.data),
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => {
      const form = new FormData();
      form.append('file', file);
      return api.post<ResumeDTO>('/resumes/upload', form).then((r) => r.data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['resumes'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/resumes/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['resumes'] }),
  });

  const download = async (id: string) => {
    const { data } = await api.get<{ url: string }>(`/resumes/${id}/download`);
    window.open(data.url, '_blank');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) uploadMutation.mutate(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadMutation.mutate(file);
    e.target.value = '';
  };

  return (
    <div {...stylex.props(styles.container)}>
      {/* Drop zone */}
      <div
        {...stylex.props(styles.dropZone)}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.doc,.docx"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
        {uploadMutation.isPending ? (
          <p {...stylex.props(styles.dropText)}>Uploading…</p>
        ) : (
          <>
            <p {...stylex.props(styles.dropIcon)}>📄</p>
            <p {...stylex.props(styles.dropText)}>Drag & drop or tap to upload</p>
            <p {...stylex.props(styles.dropHint)}>PDF, DOC, DOCX · max 10 MB</p>
          </>
        )}
      </div>

      {uploadMutation.isError && (
        <p {...stylex.props(styles.error)}>Upload failed. Check file type and size.</p>
      )}

      {/* Resume list */}
      <div {...stylex.props(styles.list)}>
        {resumesQ.isLoading && <p {...stylex.props(styles.muted)}>Loading…</p>}
        {resumesQ.data?.length === 0 && (
          <p {...stylex.props(styles.muted)}>No resumes yet.</p>
        )}
        {resumesQ.data?.map((r) => (
          <div key={r.id} {...stylex.props(styles.row)}>
            <div {...stylex.props(styles.rowInfo)}>
              <p {...stylex.props(styles.filename)}>{r.filename}</p>
              <p {...stylex.props(styles.date)}>
                Uploaded {new Date(r.uploadedAt).toLocaleDateString()}
              </p>
            </div>
            <div {...stylex.props(styles.actions)}>
              <button onClick={() => download(r.id)} {...stylex.props(styles.actionBtn)}>
                ↓
              </button>
              <button
                onClick={() => { if (confirm('Delete this resume?')) deleteMutation.mutate(r.id); }}
                {...stylex.props(styles.actionBtn, styles.deleteBtn)}
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const styles = stylex.create({
  container: { display: 'flex', flexDirection: 'column', gap: spacing.s4 },
  dropZone: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.s2,
    padding: spacing.s8,
    border: `2px dashed ${colors.border}`,
    borderRadius: radii.lg,
    cursor: 'pointer',
    backgroundColor: colors.surface,
    transition: 'border-color 0.15s',
  },
  dropIcon: { fontSize: '2rem' },
  dropText: { fontSize: font.md, color: colors.textPrimary, fontWeight: 500 },
  dropHint: { fontSize: font.sm, color: colors.textSecondary },
  error: { fontSize: font.sm, color: colors.danger },
  list: { display: 'flex', flexDirection: 'column', gap: spacing.s2 },
  muted: { color: colors.textSecondary, fontSize: font.sm, textAlign: 'center', paddingTop: spacing.s4 },
  row: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: `${spacing.s3} ${spacing.s4}`,
    backgroundColor: colors.surface,
    border: `1px solid ${colors.border}`,
    borderRadius: radii.md,
  },
  rowInfo: { display: 'flex', flexDirection: 'column', gap: spacing.s1, flex: 1, overflow: 'hidden' },
  filename: { fontSize: font.md, color: colors.textPrimary, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  date: { fontSize: font.xs, color: colors.textSecondary },
  actions: { display: 'flex', gap: spacing.s2, flexShrink: 0 },
  actionBtn: {
    background: 'none',
    border: `1px solid ${colors.border}`,
    borderRadius: radii.md,
    color: colors.textSecondary,
    fontSize: font.md,
    padding: `${spacing.s1} ${spacing.s2}`,
    cursor: 'pointer',
  },
  deleteBtn: { color: colors.danger, borderColor: colors.danger },
});
