import { useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api.js';
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
    <div className="flex flex-col gap-4">
      {/* Drop zone */}
      <div
        className="flex flex-col items-center justify-center gap-2 p-8 border-2 border-dashed border-border rounded-lg cursor-pointer bg-surface transition"
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
          <p className="text-base text-fg font-medium">Uploading…</p>
        ) : (
          <>
            <p className="text-[2rem]">📄</p>
            <p className="text-base text-fg font-medium">Drag & drop or tap to upload</p>
            <p className="text-sm text-fg-muted">PDF, DOC, DOCX · max 10 MB</p>
          </>
        )}
      </div>

      {uploadMutation.isError && (
        <p className="text-sm text-danger">Upload failed. Check file type and size.</p>
      )}

      {/* Resume list */}
      <div className="flex flex-col gap-2">
        {resumesQ.isLoading && <p className="text-fg-muted text-sm text-center pt-4">Loading…</p>}
        {resumesQ.data?.length === 0 && (
          <p className="text-fg-muted text-sm text-center pt-4">No resumes yet.</p>
        )}
        {resumesQ.data?.map((r) => (
          <div key={r.id} className="flex items-center justify-between py-3 px-4 bg-surface border border-border rounded-md">
            <div className="flex flex-col gap-1 flex-1 overflow-hidden">
              <p className="text-base text-fg font-medium overflow-hidden text-ellipsis whitespace-nowrap">{r.filename}</p>
              <p className="text-xs text-fg-muted">
                Uploaded {new Date(r.uploadedAt).toLocaleDateString()}
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => download(r.id)}
                className="bg-transparent border border-border rounded-md text-fg-muted text-base py-1 px-2 cursor-pointer"
              >
                ↓
              </button>
              <button
                onClick={() => { if (confirm('Delete this resume?')) deleteMutation.mutate(r.id); }}
                className="bg-transparent border border-danger rounded-md text-danger text-base py-1 px-2 cursor-pointer"
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
