import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { formatCountdown } from '../../utils/countdown.js';

const AVATAR_COLORS = [
  'bg-violet-600',
  'bg-blue-600',
  'bg-emerald-600',
  'bg-amber-600',
  'bg-rose-600',
  'bg-cyan-600',
];

function initialsFromUser(u) {
  const name = u?.username || '?';
  return name.slice(0, 2).toUpperCase();
}

export function TournamentCard({ tournament, className }) {
  const [, setTick] = useState(0);
  const { _id, name, game, status, startDate, maxPlayers, registeredPlayers } = tournament || {};
  const players = Array.isArray(registeredPlayers) ? registeredPlayers : [];
  const count = players.length;
  const max = maxPlayers ?? 8;
  const fillPct = Math.min(100, Math.round((count / max) * 100));

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const cd = startDate ? formatCountdown(startDate) : '—:—:—';
  const accent =
    game === 'FreeFire'
      ? 'bg-gradient-to-r from-brand-orange to-amber-500'
      : 'bg-gradient-to-r from-brand-red to-brand-orange';

  if (!tournament) return null;

  return (
    <Link
      to={`/tournaments/${_id}`}
      className={clsx(
        'card-surface group relative block cursor-pointer overflow-hidden transition-all duration-300',
        'hover:border-brand-red/40 hover:shadow-glow-red',
        className
      )}
    >
      <div className={clsx('h-1 w-full', accent)} />

      <div className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="font-mono text-sm font-bold tracking-widest text-brand-red">{cd}</div>
          {status === 'ongoing' ? (
            <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-green-400">
              <span className="h-2 w-2 animate-pulse rounded-full bg-green-400" />
              LIVE
            </span>
          ) : null}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span
            className={clsx(
              'rounded-md px-2 py-0.5 text-xs font-bold uppercase',
              game === 'FreeFire' ? 'bg-brand-orange/20 text-brand-orange' : 'bg-brand-red/20 text-brand-red'
            )}
          >
            {game}
          </span>
          <span className="text-xs text-brand-muted">Mobile</span>
        </div>

        <h3 className="mt-3 font-display text-lg font-bold text-brand-light group-hover:text-white">{name}</h3>
        <p className="mt-1 font-display text-xl font-bold text-brand-orange">₹{tournament.prizePool ?? 0}</p>

        <div className="mt-4 flex items-center gap-2">
          <div className="flex -space-x-2">
            {players.slice(0, 4).map((p, i) => (
              <div
                key={p._id || i}
                className={clsx(
                  'flex h-8 w-8 items-center justify-center rounded-full border-2 border-brand-card text-[10px] font-bold text-white',
                  AVATAR_COLORS[i % AVATAR_COLORS.length]
                )}
              >
                {initialsFromUser(p)}
              </div>
            ))}
          </div>
          {count > 4 ? (
            <span className="text-xs font-semibold text-brand-muted">+{count - 4}</span>
          ) : null}
        </div>

        <div className="mt-4">
          <div className="mb-1 flex justify-between text-xs text-brand-muted">
            <span>
              {count}/{max} slots
            </span>
            <span>{fillPct}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-brand-subtle">
            <div
              className="h-full rounded-full bg-gradient-to-r from-brand-red to-brand-orange transition-all duration-500"
              style={{ width: `${fillPct}%` }}
            />
          </div>
        </div>

        <div className="mt-4">
          <span className="btn-primary inline-flex w-full items-center justify-center rounded-lg py-2.5 text-center text-sm font-bold uppercase">
            Join
          </span>
        </div>
      </div>

      {status === 'completed' ? (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-[2px]">
          <span className="font-display text-2xl font-black uppercase tracking-widest text-brand-muted">
            Ended
          </span>
        </div>
      ) : null}
    </Link>
  );
}
