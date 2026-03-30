import { Link } from 'react-router-dom';
import { useTournaments } from '../hooks/useTournaments.js';
import { LoadingSpinner } from '../components/ui/LoadingSpinner.jsx';
import { EmptyState } from '../components/ui/EmptyState.jsx';
import { BarChart2 } from 'lucide-react';
import { Badge } from '../components/ui/Badge.jsx';

const statusVariant = {
  registration: 'orange',
  ongoing: 'green',
  completed: 'gray',
  cancelled: 'red',
};

export function LeaderboardPage() {
  const { data, loading, error } = useTournaments({ limit: 50, page: 1 });
  const list = data?.tournaments || [];

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="font-display text-3xl font-black uppercase tracking-tight text-brand-light">Leaderboards</h1>
      <p className="mt-2 text-brand-muted">Open a tournament to see full standings and points.</p>

      {loading ? (
        <div className="flex justify-center py-20">
          <LoadingSpinner size="lg" />
        </div>
      ) : error ? (
        <p className="mt-8 text-center text-red-400">{error}</p>
      ) : !list.length ? (
        <div className="mt-12">
          <EmptyState
            icon={BarChart2}
            title="No tournaments yet"
            description="When events go live, leaderboard links will show up here."
          />
        </div>
      ) : (
        <ul className="mt-10 space-y-3">
          {list.map((t) => (
            <li key={t._id}>
              <Link
                to={`/tournaments/${t._id}`}
                className="card-surface flex flex-wrap items-center justify-between gap-3 p-4 transition-all hover:shadow-glow-red"
              >
                <div>
                  <p className="font-display text-lg font-bold text-brand-light">{t.name}</p>
                  <p className="text-sm text-brand-orange">{t.game}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={statusVariant[t.status] || 'gray'}>{t.status}</Badge>
                  <span className="text-sm font-semibold text-brand-muted">View →</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
