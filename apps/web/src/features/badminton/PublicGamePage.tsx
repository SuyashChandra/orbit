import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router';
import axios from 'axios';
import type { BadmintonGameDTO } from '@orbit/shared';

const publicApi = axios.create({
  baseURL: import.meta.env['VITE_API_URL'] ?? 'http://localhost:3000',
});

const STATUS_COLORS: Record<string, string> = {
  upcoming: '#6c63ff',
  ongoing: '#f59e0b',
  completed: '#10b981',
  cancelled: '#6b7280',
};

const PARTICIPANT_COLORS: Record<string, string> = {
  invited: '#f59e0b',
  accepted: '#10b981',
  declined: '#ef4444',
};

export function PublicGamePage() {
  const { id } = useParams<{ id: string }>();

  const gameQ = useQuery<BadmintonGameDTO>({
    queryKey: ['public-game', id],
    queryFn: () => publicApi.get<BadmintonGameDTO>(`/games/${id}`).then((r) => r.data),
  });

  if (gameQ.isLoading) {
    return (
      <div className="min-h-dvh bg-bg flex items-start justify-center p-4">
        <p className="text-fg-muted text-base mt-12">Loading…</p>
      </div>
    );
  }

  if (gameQ.isError || !gameQ.data) {
    return (
      <div className="min-h-dvh bg-bg flex items-start justify-center p-4">
        <p className="text-fg-muted text-base mt-12">Game not found.</p>
      </div>
    );
  }

  const game = gameQ.data;
  const scheduledAt = new Date(game.scheduledAt);
  const accepted = game.participants.filter((p) => p.status === 'accepted');

  return (
    <div className="min-h-dvh bg-bg flex items-start justify-center p-4">
      <div className="w-full max-w-[440px] bg-surface border border-border rounded-lg p-6 flex flex-col gap-4 mt-6">
        {/* Branding */}
        <p className="font-display text-lg font-semibold italic text-accent">🏸 Orbit</p>

        {/* Status */}
        <span
          className="inline-block w-fit py-1 px-3 rounded-full text-sm font-semibold capitalize"
          style={{ color: STATUS_COLORS[game.status], backgroundColor: STATUS_COLORS[game.status] + '22' }}
        >
          {game.status}
        </span>

        {/* Date / time */}
        <div className="flex flex-col gap-1">
          <p className="font-display text-xl font-semibold text-fg">
            {scheduledAt.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
          <p className="text-lg text-fg-muted">
            {scheduledAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>

        {/* Location */}
        {game.location && (
          <div className="flex gap-2 items-start">
            <span>📍</span>
            <p className="text-base text-fg flex-1">{game.location}</p>
          </div>
        )}

        {/* Notes */}
        {game.notes && (
          <div className="flex gap-2 items-start">
            <span>📝</span>
            <p className="text-base text-fg flex-1">{game.notes}</p>
          </div>
        )}

        {/* Organiser */}
        <div className="flex flex-col gap-2">
          <p className="text-xs text-fg-muted uppercase" style={{ letterSpacing: '0.08em' }}>Organiser</p>
          <div className="flex items-center gap-3 py-2 border-b border-border">
            <Avatar name={game.creator.name} avatar={game.creator.avatar} />
            <p className="text-base text-fg font-medium">{game.creator.name}</p>
          </div>
        </div>

        {/* Players */}
        <div className="flex flex-col gap-2">
          <p className="text-xs text-fg-muted uppercase" style={{ letterSpacing: '0.08em' }}>
            Players ({accepted.length + 1} confirmed)
          </p>

          {/* Creator always confirmed */}
          <div className="flex items-center gap-3 py-2 border-b border-border">
            <Avatar name={game.creator.name} avatar={game.creator.avatar} />
            <p className="flex-1 text-base text-fg font-medium">{game.creator.name}</p>
            <span className="text-xs font-semibold rounded-full capitalize px-2 py-0.5" style={{ color: '#10b981', backgroundColor: '#10b98122' }}>Going</span>
          </div>

          {game.participants.map((p) => (
            <div key={p.userId} className="flex items-center gap-3 py-2 border-b border-border">
              <Avatar name={p.name} avatar={p.avatar} />
              <p className="flex-1 text-base text-fg font-medium">{p.name}</p>
              <span
                className="text-xs font-semibold rounded-full capitalize px-2 py-0.5"
                style={{ color: PARTICIPANT_COLORS[p.status], backgroundColor: PARTICIPANT_COLORS[p.status] + '22' }}
              >
                {p.status}
              </span>
            </div>
          ))}
        </div>

        <p className="text-xs text-fg-muted text-center mt-2">Shared via Orbit</p>
      </div>
    </div>
  );
}

function Avatar({ name, avatar }: { name: string; avatar: string | null }) {
  return avatar ? (
    <img src={avatar} alt={name} className="w-8 h-8 rounded-full object-cover shrink-0" />
  ) : (
    <div className="w-8 h-8 rounded-full bg-accent text-on-accent flex items-center justify-center text-sm font-bold shrink-0">
      {name.charAt(0).toUpperCase()}
    </div>
  );
}
