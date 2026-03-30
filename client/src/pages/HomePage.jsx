import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import * as tournamentApi from '../api/tournament.api.js';
import { TournamentCard } from '../components/tournament/TournamentCard.jsx';
import { LoadingSpinner } from '../components/ui/LoadingSpinner.jsx';
import { formatCountdownHMS, getSoonestUpcomingTournament } from '../utils/countdown.js';

const HERO_AVATARS = [
  { initials: 'AK', bg: 'bg-violet-600' },
  { initials: 'BR', bg: 'bg-blue-600' },
  { initials: 'MS', bg: 'bg-emerald-600' },
  { initials: 'RJ', bg: 'bg-amber-600' },
  { initials: 'TP', bg: 'bg-rose-600' },
  { initials: 'LX', bg: 'bg-cyan-600' },
];

function CountdownStrip({ targetDate }) {
  const [parts, setParts] = useState(() => formatCountdownHMS(targetDate));

  useEffect(() => {
    setParts(formatCountdownHMS(targetDate));
    if (!targetDate) return undefined;
    const t = setInterval(() => setParts(formatCountdownHMS(targetDate)), 1000);
    return () => clearInterval(t);
  }, [targetDate]);

  if (!targetDate || parts.done) {
    return (
      <div className="flex flex-wrap items-end justify-center gap-3 sm:gap-6">
        {['HOURS', 'MINS', 'SECS'].map((l) => (
          <div key={l} className="text-center">
            <div className="font-display text-4xl font-bold tabular-nums text-brand-muted sm:text-5xl">00</div>
            <div className="mt-1 text-[10px] font-semibold tracking-widest text-brand-muted">{l}</div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-end justify-center gap-3 sm:gap-6">
      {[
        { v: parts.h, l: 'HOURS' },
        { v: parts.m, l: 'MINS' },
        { v: parts.s, l: 'SECS' },
      ].map(({ v, l }) => (
        <div key={l} className="text-center">
          <div className="font-display text-4xl font-bold tabular-nums text-brand-light sm:text-5xl">
            {v}
          </div>
          <div className="mt-1 text-[10px] font-semibold tracking-widest text-brand-muted">{l}</div>
        </div>
      ))}
    </div>
  );
}

export function HomePage() {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let c = false;
    (async () => {
      try {
        const { data } = await tournamentApi.getAllTournaments({ limit: 24, page: 1 });
        if (!c) setTournaments(data.tournaments || []);
      } catch {
        if (!c) setTournaments([]);
      } finally {
        if (!c) setLoading(false);
      }
    })();
    return () => {
      c = true;
    };
  }, []);

  const soonest = useMemo(() => getSoonestUpcomingTournament(tournaments), [tournaments]);
  const featured = useMemo(() => tournaments.slice(0, 6), [tournaments]);

  const nextDateLabel = soonest?.startDate
    ? new Date(soonest.startDate).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'TBA';

  return (
    <div className="bg-brand-bg">
      {/* Hero */}
      <section className="relative min-h-[100svh] overflow-hidden">
        <div
          className="absolute inset-0 bg-brand-bg"
          style={{
            backgroundImage:
              'radial-gradient(ellipse 80% 60% at 100% 0%, rgba(232,57,42,0.08), transparent 55%)',
          }}
        />
        <div className="noise-bg pointer-events-none absolute inset-0" />

        <div className="relative z-10 mx-auto flex min-h-[100svh] max-w-6xl flex-col justify-center px-4 pb-24 pt-20 md:pb-16 md:pt-12">
          <div className="mb-10 flex flex-col items-center gap-3">
            <div className="flex -space-x-3">
              {HERO_AVATARS.map((a, i) => (
                <div
                  key={i}
                  className={`relative flex h-12 w-12 items-center justify-center rounded-full border-2 border-brand-bg text-xs font-bold text-white ${a.bg}`}
                >
                  {a.initials}
                </div>
              ))}
            </div>
            <p className="text-sm font-medium text-brand-muted">+124 players competing</p>
          </div>

          <div className="text-center">
            <span className="inline-flex items-center rounded-full border border-brand-border bg-brand-card px-4 py-1.5 text-xs font-semibold tracking-wide text-brand-orange">
              🎮 PUBG & FREE FIRE TOURNAMENTS
            </span>
            <h1 className="mt-8 font-display text-5xl font-black uppercase leading-[0.95] tracking-tight text-brand-light sm:text-7xl lg:text-[96px]">
              <span className="block">COMPETE.</span>
              <span className="block">WIN.</span>
              <span className="block text-gradient">DOMINATE.</span>
            </h1>

            <div className="mx-auto mt-10 flex max-w-2xl flex-wrap items-center justify-center gap-3 text-sm">
              <span className="inline-flex items-center gap-2 rounded-full bg-brand-card px-4 py-2 font-medium text-brand-light ring-1 ring-brand-border">
                <span className="h-2 w-2 rounded-full bg-green-500" />
                Active
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-brand-card px-4 py-2 text-brand-muted ring-1 ring-brand-border">
                📅 Next: {nextDateLabel}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-brand-card px-4 py-2 text-brand-orange ring-1 ring-brand-border">
                🏆 Prize: ₹50,000
              </span>
            </div>

            <div className="mt-12 flex flex-wrap justify-center gap-4">
              <Link
                to="/tournaments"
                className="btn-primary inline-flex items-center justify-center rounded-lg px-8 py-3.5 text-sm font-bold uppercase tracking-wide"
              >
                Join tournament
              </Link>
              <Link
                to="/tournaments"
                className="btn-secondary inline-flex items-center justify-center rounded-lg px-8 py-3.5 text-sm font-bold uppercase tracking-wide"
              >
                View bracket
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Countdown banner */}
      <section
        className="border-y border-[rgba(232,57,42,0.2)] px-4 py-6"
        style={{ backgroundColor: 'rgba(232,57,42,0.1)' }}
      >
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 md:flex-row md:gap-8">
          <div className="text-center md:text-left">
            <p className="text-xs font-bold tracking-[0.2em] text-brand-red">NEXT TOURNAMENT STARTS IN</p>
            <div className="mt-3 flex items-center justify-center gap-2 md:justify-start">
              <CountdownStrip targetDate={soonest?.startDate} />
            </div>
          </div>
          <Link
            to="/tournaments"
            className="btn-primary shrink-0 rounded-lg px-8 py-3 text-sm font-bold uppercase tracking-wide"
          >
            Register now
          </Link>
        </div>
      </section>

      {/* Featured */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <h2 className="font-display text-2xl font-bold uppercase tracking-wide text-brand-light sm:text-3xl">
          Featured tournaments
        </h2>
        <p className="mt-2 text-brand-muted">Compete and win prizes</p>

        {loading ? (
          <div className="flex justify-center py-20">
            <LoadingSpinner size="lg" />
          </div>
        ) : featured.length === 0 ? (
          <p className="py-16 text-center text-brand-muted">No tournaments listed yet.</p>
        ) : (
          <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((t) => (
              <li key={t._id}>
                <TournamentCard tournament={t} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Stats strip */}
      <section className="border-y border-brand-border bg-brand-surface py-16">
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-12 px-4 sm:grid-cols-3 sm:gap-8">
          {[
            { n: '3,200', l: 'Matches played' },
            { n: '235', l: 'Tournaments held' },
            { n: '565', l: 'Active players' },
          ].map(({ n, l }) => (
            <div key={l} className="text-center">
              <p className="font-display text-4xl font-black tabular-nums text-gradient sm:text-5xl">{n}</p>
              <p className="mt-2 text-sm font-medium uppercase tracking-wider text-brand-muted">{l}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
