import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api.js';
import { useAuthStore } from '../auth/authStore.js';
import type { UpdateProfileBody, UserDTO } from '@orbit/shared';

export function ProfilePage() {
  const { user, setUser, clear } = useAuthStore();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.name ?? '');
  const [copied, setCopied] = useState(false);
  const qc = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: (body: UpdateProfileBody) =>
      api.patch<UserDTO>('/users/me', body).then((r) => r.data),
    onSuccess: (updated) => {
      setUser(updated);
      qc.setQueryData(['me'], updated);
      setEditing(false);
    },
  });

  const handleCopyCode = () => {
    if (!user) return;
    navigator.clipboard.writeText(user.friendCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleLogout = async () => {
    await api.post('/auth/logout').catch(() => {});
    clear();
    window.location.href = '/login';
  };

  if (!user) return null;

  return (
    <div className="flex flex-col items-center gap-6 p-6">
      <div className="mt-4">
        {user.avatar ? (
          <img src={user.avatar} alt={user.name} className="w-[88px] h-[88px] rounded-full object-cover" />
        ) : (
          <div className="w-[88px] h-[88px] rounded-full bg-accent text-on-accent flex items-center justify-center font-bold" style={{ fontSize: '1.75rem', fontWeight: 700 }}>
            {user.name.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      {editing ? (
        <div className="flex gap-2 w-full max-w-[320px]">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="flex-1 py-2 px-3 bg-surface border border-border rounded-md text-fg text-base"
            maxLength={80}
          />
          <button
            onClick={() => updateMutation.mutate({ name })}
            disabled={updateMutation.isPending || !name.trim()}
            className="py-3 px-4 bg-accent text-on-accent border-none rounded-md text-base font-semibold cursor-pointer"
          >
            {updateMutation.isPending ? 'Saving…' : 'Save'}
          </button>
          <button
            onClick={() => setEditing(false)}
            className="py-3 px-4 bg-surface text-fg-muted border border-border rounded-md text-base font-semibold cursor-pointer"
          >
            Cancel
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-fg">{user.name}</h2>
          <button
            onClick={() => setEditing(true)}
            className="text-sm text-accent bg-transparent border-none cursor-pointer py-1 px-2"
          >
            Edit
          </button>
        </div>
      )}

      <p className="text-sm text-fg-muted">{user.email}</p>

      <div className="w-full max-w-[320px] bg-surface border border-border rounded-lg p-4 flex flex-col gap-2">
        <span className="text-xs text-fg-muted uppercase" style={{ letterSpacing: '0.08em' }}>Friend Code</span>
        <div className="flex items-center justify-between">
          <span className="text-xl font-bold text-accent" style={{ letterSpacing: '0.12em' }}>{user.friendCode}</span>
          <button
            onClick={handleCopyCode}
            className="text-sm text-accent bg-transparent border border-accent rounded-md py-1 px-3 cursor-pointer"
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>

      <button
        onClick={handleLogout}
        className="w-full max-w-[320px] py-3 px-4 rounded-md text-base font-semibold bg-transparent text-danger border border-danger cursor-pointer mt-4"
      >
        Sign out
      </button>
    </div>
  );
}
