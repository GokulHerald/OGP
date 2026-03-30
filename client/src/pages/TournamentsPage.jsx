import { useMemo, useState } from 'react';
import { useTournaments } from '../hooks/useTournaments.js';
import { TournamentCard } from '../components/tournament/TournamentCard.jsx';
import { TournamentFilters } from '../components/tournament/TournamentFilters.jsx';
import { LoadingSpinner } from '../components/ui/LoadingSpinner.jsx';
import { EmptyState } from '../components/ui/EmptyState.jsx';
import { Trophy } from 'lucide-react';

const defaultFilters = { game: undefined, status: undefined, page: 1, limit: 10 };

export function TournamentsPage() {
  const [filters, setFilters] = useState(defaultFilters);
  const params = useMemo(
    () => ({
      game: filters.game,
      status: filters.status,
      page: filters.page,
      limit: filters.limit,
    }),
    [filters.game, filters.status, filters.page, filters.limit]
  );

  const { data, loading, error } = useTournaments(params);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-display text-3xl font-black uppercase tracking-tight text-brand-light">Tournaments</h1>
      <p className="mt-2 text-brand-muted">Browse and join open competitions.</p>

      <TournamentFilters
        values={filters}
        onChange={setFilters}
        onReset={() => setFilters(defaultFilters)}
      />

      {loading ? (
        <div className="flex justify-center py-20">
          <LoadingSpinner size="lg" />
        </div>
      ) : error ? (
        <p className="text-center text-red-400">{error}</p>
      ) : !data?.tournaments?.length ? (
        <EmptyState
          icon={Trophy}
          title="No tournaments"
          description="Check back soon or adjust filters."
        />
      ) : (
        <>
          <ul className="grid gap-4 md:grid-cols-2">
            {data.tournaments.map((t) => (
              <li key={t._id}>
                <TournamentCard tournament={t} />
              </li>
            ))}
          </ul>
          {data.totalPages > 1 ? (
            <p className="mt-6 text-center text-sm text-brand-muted">
              Page {data.page} of {data.totalPages} ({data.totalCount} total)
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}
