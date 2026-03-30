import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import * as tournamentApi from '../api/tournament.api.js';
import * as matchApi from '../api/match.api.js';
import { useAuth } from '../hooks/useAuth.js';
import { BracketView } from '../components/tournament/BracketView.jsx';
import { LoadingSpinner } from '../components/ui/LoadingSpinner.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { Button } from '../components/ui/Button.jsx';
import toast from 'react-hot-toast';

const statusVariant = {
  registration: 'orange',
  ongoing: 'green',
  completed: 'gray',
  cancelled: 'red',
};

export function TournamentDetailPage() {
  const { id } = useParams();
  const { isAuthenticated, isOrganizer, user } = useAuth();
  const [tournament, setTournament] = useState(null);
  const [matches, setMatches] = useState([]);
  const [leaderboard, setLeaderboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const [tRes, mRes, lRes] = await Promise.all([
          tournamentApi.getTournamentById(id),
          matchApi.getMatchesByTournament(id).catch(() => ({ data: { matches: [] } })),
          matchApi.getLeaderboard(id).catch(() => ({ data: null })),
        ]);
        if (!cancelled) {
          setTournament(tRes.data.tournament);
          setMatches(mRes.data.matches || []);
          setLeaderboard(lRes.data?.leaderboard || null);
        }
      } catch {
        if (!cancelled) toast.error('Failed to load tournament');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const isRegistered =
    tournament?.registeredPlayers?.some((p) => String(p._id || p) === String(user?._id)) ?? false;
  const isOwner = tournament && user && String(tournament.organizer?._id || tournament.organizer) === String(user._id);

  const handleRegister = async () => {
    setActionLoading(true);
    try {
      await tournamentApi.registerForTournament(id);
      toast.success('Registered');
      const { data } = await tournamentApi.getTournamentById(id);
      setTournament(data.tournament);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Register failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStart = async () => {
    setActionLoading(true);
    try {
      await tournamentApi.startTournament(id);
      toast.success('Tournament started');
      const [tRes, mRes] = await Promise.all([
        tournamentApi.getTournamentById(id),
        matchApi.getMatchesByTournament(id),
      ]);
      setTournament(tRes.data.tournament);
      setMatches(mRes.data.matches || []);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Could not start');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16 text-center">
        <p className="text-brand-muted">Tournament not found.</p>
        <Link to="/tournaments" className="mt-4 inline-block text-brand-orange hover:underline">
          Back to list
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <Link to="/tournaments" className="text-sm text-brand-muted hover:text-brand-light">
        ← Tournaments
      </Link>
      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-display text-3xl font-black text-brand-light md:text-4xl">{tournament.name}</h1>
            <Badge variant={statusVariant[tournament.status] || 'gray'}>{tournament.status}</Badge>
          </div>
          <p className="mt-1 text-brand-orange">{tournament.game}</p>
          <p className="mt-2 text-sm text-brand-muted">
            Organizer: {tournament.organizer?.username || '—'} · Prize: ₹{tournament.prizePool} · Max{' '}
            {tournament.maxPlayers} players
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {isAuthenticated && !isOrganizer && tournament.status === 'registration' && !isRegistered ? (
            <Button variant="primary" disabled={actionLoading} onClick={handleRegister}>
              Register
            </Button>
          ) : null}
          {isOwner && tournament.status === 'registration' ? (
            <Button variant="secondary" disabled={actionLoading} onClick={handleStart}>
              Start tournament
            </Button>
          ) : null}
        </div>
      </div>

      <section className="mt-12">
        <h2 className="font-display mb-4 text-xl font-black uppercase tracking-wide text-brand-light">
          Bracket & matches
        </h2>
        <BracketView matches={matches} />
      </section>

      {leaderboard?.entries?.length ? (
        <section className="mt-12">
          <h2 className="font-display mb-4 text-xl font-black uppercase tracking-wide text-brand-light">
            Leaderboard
          </h2>
          <div className="card-surface overflow-x-auto p-4">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-brand-border text-brand-muted">
                  <th className="pb-2 pr-4">#</th>
                  <th className="pb-2 pr-4">Player</th>
                  <th className="pb-2">Points</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.entries.map((e, i) => (
                  <tr key={e.player?._id || i} className="border-b border-brand-border/60">
                    <td className="py-2 pr-4 text-brand-muted">{e.rank ?? i + 1}</td>
                    <td className="py-2 pr-4 text-brand-light">{e.player?.username || '—'}</td>
                    <td className="py-2">{e.points ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}
