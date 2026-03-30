import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import * as tournamentApi from '../api/tournament.api.js';
import * as matchApi from '../api/match.api.js';
import { useAuth } from '../hooks/useAuth.js';
import { Input } from '../components/ui/Input.jsx';
import { Button } from '../components/ui/Button.jsx';
import { LoadingSpinner } from '../components/ui/LoadingSpinner.jsx';
import { Modal } from '../components/ui/Modal.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { Eye } from 'lucide-react';

const tabs = [
  { id: 'mine', label: 'My tournaments' },
  { id: 'create', label: 'Create' },
  { id: 'active', label: 'Active matches' },
  { id: 'verify', label: 'Verify results' },
];

const schema = z.object({
  name: z.string().min(3).max(100),
  game: z.enum(['PUBG', 'FreeFire']),
  entryFee: z.coerce.number().min(0),
  prizePool: z.coerce.number().min(0),
  maxPlayers: z.coerce.number().refine((n) => [8, 16, 32].includes(n), 'Must be 8, 16, or 32'),
  startDate: z.string().min(1),
  rules: z.string().max(1000).optional(),
});

function OrganizerMatchCard({ match, tournamentName, tournamentId, onSetResult }) {
  const stream =
    match.proof?.player1StreamUrl ||
    match.proof?.player2StreamUrl ||
    '';
  const shot =
    match.proof?.player1Screenshot ||
    match.proof?.player2Screenshot ||
    '';

  return (
    <div className="card-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-brand-muted">{tournamentName}</p>
          <p className="font-display text-lg font-bold text-brand-light">
            Round {match.round} · Match {match.matchNumber}
          </p>
          <Badge variant={match.status === 'live' ? 'orange' : 'gray'} className="mt-2">
            {match.status}
          </Badge>
        </div>
        <div className="flex flex-wrap gap-2">
          {stream ? (
            <a
              href={stream}
              target="_blank"
              rel="noreferrer"
              className="btn-secondary inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold uppercase"
            >
              <Eye className="h-4 w-4" />
              Watch stream
            </a>
          ) : null}
          <Button variant="primary" className="!px-4 !py-2 text-xs" onClick={() => onSetResult(match, tournamentId)}>
            Set result
          </Button>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-4">
        {stream ? (
          <div className="relative h-14 w-[100px] overflow-hidden rounded-md bg-black ring-1 ring-brand-border">
            <div className="flex h-full items-center justify-center text-[10px] text-brand-muted">Stream</div>
          </div>
        ) : null}
        {shot ? (
          <img src={shot} alt="" className="h-14 w-[100px] rounded-md object-cover ring-1 ring-brand-border" />
        ) : null}
      </div>
    </div>
  );
}

export function AdminDashboardPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState('mine');
  const [tournaments, setTournaments] = useState([]);
  const [matchesByT, setMatchesByT] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [resultModal, setResultModal] = useState({ open: false, match: null, tournamentId: null });
  const [resultForm, setResultForm] = useState({
    winnerId: '',
    player1Kills: 0,
    player2Kills: 0,
    player1Placement: 1,
    player2Placement: 2,
    player1Score: 0,
    player2Score: 0,
    notes: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await tournamentApi.getAllTournaments({ limit: 100, page: 1 });
      const all = data.tournaments || [];
      const mine = all.filter((t) => String(t.organizer?._id || t.organizer) === String(user?._id));
      setTournaments(mine);
      const next = {};
      await Promise.all(
        mine.map(async (t) => {
          try {
            const m = await matchApi.getMatchesByTournament(t._id);
            next[t._id] = m.data.matches || [];
          } catch {
            next[t._id] = [];
          }
        })
      );
      setMatchesByT(next);
    } catch {
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, [user?._id]);

  useEffect(() => {
    load();
  }, [load]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    reset,
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      game: 'PUBG',
      entryFee: 0,
      prizePool: 1000,
      maxPlayers: 8,
      startDate: new Date().toISOString().slice(0, 10),
    },
  });

  const selectedGame = watch('game');

  const flatMatches = useMemo(() => {
    const rows = [];
    tournaments.forEach((t) => {
      (matchesByT[t._id] || []).forEach((m) => {
        rows.push({ match: m, tournament: t });
      });
    });
    return rows;
  }, [tournaments, matchesByT]);

  const activeMatches = useMemo(
    () => flatMatches.filter(({ match }) => match.status === 'live' || match.status === 'pending'),
    [flatMatches]
  );

  const verifyMatches = useMemo(
    () => flatMatches.filter(({ match }) => match.status !== 'completed'),
    [flatMatches]
  );

  const onCreate = async (data) => {
    setSubmitting(true);
    try {
      const res = await tournamentApi.createTournament(data);
      toast.success('Tournament created');
      reset();
      await load();
      const tid = res.data.tournament?._id;
      if (tid) window.location.href = `/tournaments/${tid}`;
    } catch (e) {
      toast.error(e.response?.data?.message || 'Create failed');
    } finally {
      setSubmitting(false);
    }
  };

  const openResult = (match, tournamentId) => {
    setResultForm((f) => ({
      ...f,
      winnerId: '',
      player1Kills: 0,
      player2Kills: 0,
      player1Placement: 1,
      player2Placement: 2,
      player1Score: 0,
      player2Score: 0,
      notes: '',
    }));
    setResultModal({ open: true, match, tournamentId });
  };

  const submitResult = async () => {
    const { match, tournamentId } = resultModal;
    if (!match || !resultForm.winnerId) {
      toast.error('Pick a winner');
      return;
    }
    try {
      await matchApi.setMatchResult(match._id, {
        winnerId: resultForm.winnerId,
        player1Kills: Number(resultForm.player1Kills),
        player2Kills: Number(resultForm.player2Kills),
        player1Placement: Number(resultForm.player1Placement),
        player2Placement: Number(resultForm.player2Placement),
        player1Score: Number(resultForm.player1Score),
        player2Score: Number(resultForm.player2Score),
        notes: resultForm.notes,
      });
      toast.success('Result saved');
      setResultModal({ open: false, match: null, tournamentId: null });
      await load();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed');
    }
  };

  const p1 = resultModal.match?.player1;
  const p2 = resultModal.match?.player2;
  const p1id = p1 && (typeof p1 === 'object' ? p1._id : p1);
  const p2id = p2 && (typeof p2 === 'object' ? p2._id : p2);
  const p1name = typeof p1 === 'object' && p1?.username ? p1.username : 'Player 1';
  const p2name = typeof p2 === 'object' && p2?.username ? p2.username : 'Player 2';

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="font-display text-3xl font-black uppercase text-brand-light">Dashboard</h1>
      <p className="mt-1 text-brand-muted">Organizer control center</p>

      <div className="mt-8 flex flex-wrap gap-1 border-b border-brand-border">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={clsx(
              'relative px-4 py-3 text-sm font-semibold transition-colors',
              tab === t.id ? 'text-brand-light' : 'text-brand-muted hover:text-brand-light'
            )}
          >
            {t.label}
            {tab === t.id ? <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-brand-red" /> : null}
          </button>
        ))}
      </div>

      <div className="mt-10">
        {loading ? (
          <div className="flex justify-center py-16">
            <LoadingSpinner size="lg" />
          </div>
        ) : null}

        {!loading && tab === 'mine' ? (
          <ul className="space-y-3">
            {tournaments.length === 0 ? (
              <p className="text-brand-muted">You have no tournaments yet. Create one in the Create tab.</p>
            ) : (
              tournaments.map((t) => (
                <li key={t._id}>
                  <Link
                    to={`/tournaments/${t._id}`}
                    className="card-surface flex items-center justify-between p-4 hover:shadow-glow-red"
                  >
                    <span className="font-display font-bold text-brand-light">{t.name}</span>
                    <Badge variant="orange">{t.status}</Badge>
                  </Link>
                </li>
              ))
            )}
          </ul>
        ) : null}

        {!loading && tab === 'create' ? (
          <form onSubmit={handleSubmit(onCreate)} className="mx-auto max-w-xl space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setValue('game', 'PUBG', { shouldValidate: true })}
                className={clsx(
                  'rounded-xl border-2 p-8 text-left transition-all',
                  selectedGame === 'PUBG'
                    ? 'border-brand-red shadow-glow-red-strong'
                    : 'border-brand-border bg-gradient-to-br from-brand-red/20 to-brand-bg'
                )}
              >
                <p className="font-display text-2xl font-black text-brand-light">PUBG</p>
                <p className="mt-2 text-sm text-brand-muted">Battle royale squads</p>
              </button>
              <button
                type="button"
                onClick={() => setValue('game', 'FreeFire', { shouldValidate: true })}
                className={clsx(
                  'rounded-xl border-2 p-8 text-left transition-all',
                  selectedGame === 'FreeFire'
                    ? 'border-brand-orange shadow-glow-red'
                    : 'border-brand-border bg-gradient-to-br from-brand-orange/25 to-brand-bg'
                )}
              >
                <p className="font-display text-2xl font-black text-brand-light">Free Fire</p>
                <p className="mt-2 text-sm text-brand-muted">Fast mobile action</p>
              </button>
            </div>
            <input type="hidden" {...register('game')} />

            <Input label="Tournament name" {...register('name')} error={errors.name?.message} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Entry fee" type="number" {...register('entryFee')} error={errors.entryFee?.message} />
              <Input label="Prize pool" type="number" {...register('prizePool')} error={errors.prizePool?.message} />
            </div>
            <div>
              <p className="mb-2 text-sm font-medium text-brand-light">Max players</p>
              <div className="flex flex-wrap gap-2">
                {[8, 16, 32].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setValue('maxPlayers', n, { shouldValidate: true })}
                    className={clsx(
                      'rounded-full border px-6 py-2.5 font-display text-lg font-bold transition-all',
                      Number(watch('maxPlayers')) === n
                        ? 'border-brand-red bg-brand-red/15 text-brand-light shadow-glow-red'
                        : 'border-brand-border text-brand-muted hover:border-brand-red/40'
                    )}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <input type="hidden" {...register('maxPlayers')} />
              {errors.maxPlayers ? <p className="mt-1 text-sm text-red-400">{errors.maxPlayers.message}</p> : null}
            </div>
            <Input label="Start date" type="date" {...register('startDate')} error={errors.startDate?.message} />
            <div>
              <label className="mb-1.5 block text-sm font-medium text-brand-light">Rules (optional)</label>
              <textarea className="input min-h-[100px] resize-y" {...register('rules')} />
            </div>
            <Button type="submit" variant="primary" disabled={submitting}>
              {submitting ? <LoadingSpinner className="mx-auto !border-t-white" size="sm" /> : 'Create tournament'}
            </Button>
          </form>
        ) : null}

        {!loading && tab === 'active' ? (
          <div className="space-y-4">
            {activeMatches.length === 0 ? (
              <p className="text-brand-muted">No active or pending matches.</p>
            ) : (
              activeMatches.map(({ match, tournament }) => (
                <OrganizerMatchCard
                  key={match._id}
                  match={match}
                  tournamentName={tournament.name}
                  tournamentId={tournament._id}
                  onSetResult={openResult}
                />
              ))
            )}
          </div>
        ) : null}

        {!loading && tab === 'verify' ? (
          <div className="space-y-4">
            {verifyMatches.length === 0 ? (
              <p className="text-brand-muted">Nothing to verify.</p>
            ) : (
              verifyMatches.map(({ match, tournament }) => (
                <OrganizerMatchCard
                  key={`${match._id}-v`}
                  match={match}
                  tournamentName={tournament.name}
                  tournamentId={tournament._id}
                  onSetResult={openResult}
                />
              ))
            )}
          </div>
        ) : null}
      </div>

      <Modal
        open={resultModal.open}
        onClose={() => setResultModal({ open: false, match: null, tournamentId: null })}
        title="Set match result"
      >
        <div className="space-y-4">
          <div>
            <p className="text-sm text-brand-muted">Winner</p>
            <select
              className="input mt-1"
              value={resultForm.winnerId}
              onChange={(e) => setResultForm((f) => ({ ...f, winnerId: e.target.value }))}
            >
              <option value="">Select…</option>
              {p1id ? <option value={String(p1id)}>{p1name}</option> : null}
              {p2id ? <option value={String(p2id)}>{p2name}</option> : null}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs text-brand-muted">
              P1 kills
              <input
                type="number"
                className="input mt-1"
                value={resultForm.player1Kills}
                onChange={(e) => setResultForm((f) => ({ ...f, player1Kills: e.target.value }))}
              />
            </label>
            <label className="text-xs text-brand-muted">
              P2 kills
              <input
                type="number"
                className="input mt-1"
                value={resultForm.player2Kills}
                onChange={(e) => setResultForm((f) => ({ ...f, player2Kills: e.target.value }))}
              />
            </label>
            <label className="text-xs text-brand-muted">
              P1 placement
              <input
                type="number"
                className="input mt-1"
                value={resultForm.player1Placement}
                onChange={(e) => setResultForm((f) => ({ ...f, player1Placement: e.target.value }))}
              />
            </label>
            <label className="text-xs text-brand-muted">
              P2 placement
              <input
                type="number"
                className="input mt-1"
                value={resultForm.player2Placement}
                onChange={(e) => setResultForm((f) => ({ ...f, player2Placement: e.target.value }))}
              />
            </label>
            <label className="text-xs text-brand-muted">
              P1 score
              <input
                type="number"
                className="input mt-1"
                value={resultForm.player1Score}
                onChange={(e) => setResultForm((f) => ({ ...f, player1Score: e.target.value }))}
              />
            </label>
            <label className="text-xs text-brand-muted">
              P2 score
              <input
                type="number"
                className="input mt-1"
                value={resultForm.player2Score}
                onChange={(e) => setResultForm((f) => ({ ...f, player2Score: e.target.value }))}
              />
            </label>
          </div>
          <label className="text-xs text-brand-muted">
            Notes
            <textarea
              className="input mt-1 min-h-[60px]"
              value={resultForm.notes}
              onChange={(e) => setResultForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </label>
          <Button variant="primary" className="w-full" onClick={submitResult}>
            Save result
          </Button>
        </div>
      </Modal>
    </div>
  );
}
