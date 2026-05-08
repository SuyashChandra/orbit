import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router';
import { api } from '../../lib/api.js';
import { useAuthStore } from '../auth/authStore.js';
import { StationHead } from '../../components/StationHead.js';
import { Pill } from '../../components/Pill.js';
import type { BadmintonGameDTO, CreateGameBody } from '@orbit/shared';

type Tab = 'upcoming' | 'past';

export function BadmintonPage() {
  const [tab, setTab] = useState<Tab>('upcoming');
  const [showForm, setShowForm] = useState(false);
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();

  const gamesQ = useQuery<BadmintonGameDTO[]>({
    queryKey: ['games'],
    queryFn: () => api.get<BadmintonGameDTO[]>('/games').then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (body: CreateGameBody) =>
      api.post<BadmintonGameDTO>('/games', body).then((r) => r.data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['games'] });
      setShowForm(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/games/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['games'] }),
  });

  const now = new Date();
  const upcoming = (gamesQ.data ?? []).filter(
    (g) => g.status !== 'completed' && g.status !== 'cancelled' && new Date(g.scheduledAt) >= now,
  );
  const past = (gamesQ.data ?? []).filter(
    (g) => g.status === 'completed' || g.status === 'cancelled' || new Date(g.scheduledAt) < now,
  );
  const shown = tab === 'upcoming' ? upcoming : past;

  // Soonest upcoming → hero card
  const next = upcoming
    .slice()
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())[0];

  return (
    <div className="flex flex-col pb-8">
      <StationHead
        eyebrow="Play"
        title="Court"
        sub={`Badminton · ${upcoming.length} upcoming`}
        action={
          <button
            onClick={() => setShowForm(true)}
            className="py-2 px-4 bg-accent text-on-accent border-none rounded-full text-sm font-semibold cursor-pointer"
          >
            + Game
          </button>
        }
      />

      {next && tab === 'upcoming' && <NextGameHero game={next} />}

      <div className="flex gap-1.5 py-4 px-4 pb-3">
        <button
          onClick={() => setTab('upcoming')}
          className={`py-2 px-4 border-none text-sm font-medium rounded-full flex items-center gap-1.5 cursor-pointer ${tab === 'upcoming' ? 'bg-surface text-fg' : 'bg-transparent text-fg-muted'}`}
        >
          Upcoming
          <span className={`text-[11px] rounded-full font-semibold ${tab === 'upcoming' ? 'bg-accent text-on-accent' : 'bg-surface-2 text-fg-muted'}`} style={{ padding: '1px 7px' }}>
            {upcoming.length}
          </span>
        </button>
        <button
          onClick={() => setTab('past')}
          className={`py-2 px-4 border-none text-sm font-medium rounded-full flex items-center gap-1.5 cursor-pointer ${tab === 'past' ? 'bg-surface text-fg' : 'bg-transparent text-fg-muted'}`}
        >
          Past
          <span className={`text-[11px] rounded-full font-semibold ${tab === 'past' ? 'bg-accent text-on-accent' : 'bg-surface-2 text-fg-muted'}`} style={{ padding: '1px 7px' }}>
            {past.length}
          </span>
        </button>
      </div>

      <div className="flex flex-col gap-3 px-4">
        {gamesQ.isLoading && <p className="text-fg-muted text-sm text-center p-8">Loading…</p>}
        {!gamesQ.isLoading && shown.length === 0 && (
          <div className="text-center py-8 px-5 flex flex-col gap-1">
            <span className="text-[32px] mb-2 text-accent-bright">◉</span>
            <span className="font-display text-lg font-semibold text-fg">
              {tab === 'upcoming' ? 'No games yet' : 'No past games'}
            </span>
            <span className="text-sm text-fg-muted">
              {tab === 'upcoming' ? 'Schedule one and invite some friends.' : ''}
            </span>
          </div>
        )}
        {shown.map((g) => (
          <Link key={g.id} to={`/badminton/${g.id}`} style={{ textDecoration: 'none' }}>
            <GameCard
              game={g}
              isCreator={g.creator.id === user?.id}
              isPast={tab === 'past'}
              onDelete={() => deleteMutation.mutate(g.id)}
            />
          </Link>
        ))}
      </div>

      {showForm && (
        <CreateGameDrawer
          onSubmit={(body) => createMutation.mutate(body)}
          onClose={() => setShowForm(false)}
          isSubmitting={createMutation.isPending}
        />
      )}
    </div>
  );
}

function NextGameHero({ game }: { game: BadmintonGameDTO }) {
  const date = new Date(game.scheduledAt);
  const accepted = game.participants.filter((p) => p.status === 'accepted').length;
  const invited = game.participants.length;
  const days = Math.round((date.getTime() - Date.now()) / 86_400_000);
  const when =
    days <= 0 ? 'today' :
    days === 1 ? 'tomorrow' :
    `in ${days} days`;
  const time = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const dayName = date.toLocaleString('default', { weekday: 'long' });
  const mapsHref = game.location
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(game.location)}`
    : null;

  return (
    <div className="py-2 px-4">
      <Link to={`/badminton/${game.id}`} style={{ textDecoration: 'none' }}>
        <article
          className="p-5 rounded-lg cursor-pointer"
          style={{ background: 'linear-gradient(165deg, var(--color-raised) 0%, var(--color-surface) 70%)' }}
        >
          <div className="text-xs text-accent-bright font-semibold mb-3">✿ Coming up · {when}</div>

          <div className="flex items-center gap-4 mb-4">
            <div className="flex flex-col items-center justify-center bg-bg rounded-md py-3 px-4 min-w-[70px]">
              <span className="font-display text-[32px] font-semibold leading-none text-fg">
                {date.getDate()}
              </span>
              <span className="text-[11px] text-accent-bright font-semibold mt-0.5 uppercase">
                {date.toLocaleString('default', { month: 'short' })}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-display text-[24px] font-semibold leading-[1.1] text-fg tracking-tight mb-1">
                {dayName}, {time}
              </div>
              {game.location && <div className="text-sm text-fg mb-1">{game.location}</div>}
              <div className="text-xs text-fg-muted">
                {accepted + 1} confirmed · {invited} invited
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <span className="flex-1 text-center py-3 px-4 bg-accent text-on-accent rounded-full text-sm font-semibold">Open</span>
            {mapsHref && (
              <a
                href={mapsHref}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex-1 text-center py-3 px-4 bg-surface text-fg rounded-full text-sm font-semibold"
              >
                Map
              </a>
            )}
          </div>
        </article>
      </Link>
    </div>
  );
}

function GameCard({
  game, isCreator, isPast, onDelete,
}: {
  game: BadmintonGameDTO;
  isCreator: boolean;
  isPast: boolean;
  onDelete: () => void;
}) {
  const date = new Date(game.scheduledAt);
  const accepted = game.participants.filter((p) => p.status === 'accepted').length;

  return (
    <article className={`flex gap-4 p-5 bg-surface rounded-lg cursor-pointer transition ${isPast ? 'opacity-70' : ''}`}>
      <div className="flex flex-col items-center justify-center bg-surface-2 rounded-md py-2 px-3 min-w-[56px] self-start">
        <span className="font-display text-[22px] font-semibold text-fg leading-none">
          {date.getDate()}
        </span>
        <span className="text-xs text-fg-muted uppercase mt-0.5">
          {date.toLocaleString('default', { month: 'short' })}
        </span>
      </div>

      <div className="flex-1 flex flex-col gap-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="text-base font-semibold text-fg">
            {date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
          </p>
          <Pill status={game.status} />
        </div>
        {game.location && <p className="text-sm text-fg-muted">{game.location}</p>}
        <p className="text-xs text-fg-muted mt-1">
          {accepted + 1} player{accepted + 1 !== 1 ? 's' : ''} · {game.participants.length} invited
        </p>
      </div>

      {isCreator && (
        <button
          onClick={(e) => { e.preventDefault(); if (confirm('Delete game?')) onDelete(); }}
          className="bg-transparent border-none text-fg-dim cursor-pointer text-sm p-1 shrink-0 self-start"
          aria-label="Delete"
        >
          ✕
        </button>
      )}
    </article>
  );
}

function CreateGameDrawer({
  onSubmit, onClose, isSubmitting,
}: {
  onSubmit: (body: CreateGameBody) => void;
  onClose: () => void;
  isSubmitting: boolean;
}) {
  const tomorrow = new Date(Date.now() + 86400000);
  tomorrow.setHours(10, 0, 0, 0);
  const defaultDatetime = tomorrow.toISOString().slice(0, 16);

  const [scheduledAt, setScheduledAt] = useState(defaultDatetime);
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');

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
          <h3 className="font-display text-xl font-semibold text-fg tracking-tight m-0">Schedule a game</h3>
          <button onClick={onClose} className="bg-surface-2 border-none text-fg-muted text-sm cursor-pointer w-8 h-8 rounded-full" aria-label="Close">✕</button>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-sm text-fg-muted font-medium">When</label>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="py-3 px-4 bg-surface-2 border-none rounded-md text-fg text-base w-full outline-none"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm text-fg-muted font-medium">Where</label>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Sports Hall A"
              className="py-3 px-4 bg-surface-2 border-none rounded-md text-fg text-base w-full outline-none"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm text-fg-muted font-medium">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Anything else…"
              className="py-3 px-4 bg-surface-2 border-none rounded-md text-fg text-base w-full outline-none resize-y"
              style={{ minHeight: '80px' }}
            />
          </div>
        </div>

        <button
          onClick={() => {
            const body: CreateGameBody = { scheduledAt: new Date(scheduledAt).toISOString() };
            if (location) body.location = location;
            if (notes) body.notes = notes;
            onSubmit(body);
          }}
          disabled={isSubmitting || !scheduledAt}
          className="p-4 bg-accent text-on-accent border-none rounded-full text-base font-semibold cursor-pointer w-full disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  );
}
