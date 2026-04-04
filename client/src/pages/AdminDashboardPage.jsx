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
import { StreamEmbed } from '../components/tournament/StreamEmbed.jsx';
import { LazyStreamEmbed } from '../components/tournament/LazyStreamEmbed.jsx';

const tabs = [
  { id: 'mine', label: 'My tournaments' },
  { id: 'create', label: 'Create' },
  { id: 'active', label: 'Active matches' },
  { id: 'verify', label: 'Verify results' },
];

const schema = z
  .object({
    name: z.string().min(3).max(100),
    game: z.enum(['PUBG', 'FreeFire']),
    entryFee: z.coerce.number().min(0),
    prizePool: z.coerce.number().min(0),
    startDate: z.string().min(1),
    rules: z.string().max(1000).optional(),
    format: z.enum(['single-elimination', 'battle_royale_squad']),
    maxPlayers: z.coerce.number(),
    maxTeams: z.coerce.number(),
    squadSize: z.coerce.number(),
  })
  .superRefine((data, ctx) => {
    if (data.format === 'single-elimination') {
      if (![8, 16, 32].includes(Number(data.maxPlayers))) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Must be 8, 16, or 32',
          path: ['maxPlayers'],
        });
      }
    } else {
      const mt = Number(data.maxTeams);
      const ss = Number(data.squadSize);
      if (!Number.isFinite(mt) || mt < 2 || mt > 32) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'maxTeams must be 2–32',
          path: ['maxTeams'],
        });
      }
      if (!Number.isFinite(ss) || ss < 2 || ss > 8) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'squadSize must be 2–8',
          path: ['squadSize'],
        });
      }
      if (Number.isFinite(mt) && Number.isFinite(ss) && mt * ss > 128) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Capacity cannot exceed 128',
          path: ['maxTeams'],
        });
      }
    }
  });

function BrLobbyOrganizerCard({ match, tournamentName, tournamentId, onRefresh }) {
  const [expanded, setExpanded] = useState({});
  const proof = match.proof || {};
  const squadStreams = proof.squadStreams || [];
  const slots = match.brTeams || [];
  const [pickTeamId, setPickTeamId] = useState('');
  const [declaring, setDeclaring] = useState(false);

  const toggleTeam = (tid) => {
    setExpanded((prev) => ({ ...prev, [tid]: !prev[tid] }));
  };

  const streamRowForUser = (userId) =>
    squadStreams.find((s) => String(s.user) === userId || String(s.user?._id) === userId);

  const teamTitle = (slot) => {
    const t = slot.team;
    if (t && typeof t === 'object') {
      return t.name?.trim() || t.captain?.username || 'Squad';
    }
    return 'Squad';
  };

  const declareWinner = async () => {
    if (!pickTeamId) {
      toast.error('Select a winning squad');
      return;
    }
    try {
      setDeclaring(true);
      await tournamentApi.setBrWinner(tournamentId, pickTeamId);
      toast.success('Winner set; captain wallet credited');
      await onRefresh();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to set winner');
    } finally {
      setDeclaring(false);
    }
  };

  return (
    <div className="card-surface flex flex-col p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-brand-muted">{tournamentName}</p>
          <p className="font-display text-lg font-bold text-brand-light">Battle royale lobby</p>
          <p className="mt-1 text-xs text-violet-300/90">Round {match.round} · {slots.length} squads</p>
          <Badge variant={match.status === 'live' ? 'orange' : 'gray'} className="mt-2">
            {match.status}
          </Badge>
        </div>
      </div>

      <div className="mt-4 space-y-3 border-t border-brand-border pt-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-muted">
          Streams by squad (expand to load embeds)
        </p>
        {slots.map((slot) => {
          const tid = String(slot.team?._id || slot.team);
          const open = Boolean(expanded[tid]);
          const players = slot.players || [];
          return (
            <div key={tid} className="overflow-hidden rounded-lg border border-brand-border bg-brand-subtle/20">
              <button
                type="button"
                onClick={() => toggleTeam(tid)}
                className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm font-semibold text-brand-light hover:bg-brand-subtle/40"
              >
                <span>{teamTitle(slot)}</span>
                <span className="text-xs font-normal text-brand-muted">{open ? '▼' : '▶'}</span>
              </button>
              {open ? (
                <div className="grid grid-cols-1 gap-3 border-t border-brand-border p-3 sm:grid-cols-2">
                  {players.map((p) => {
                    const pid = String(p?._id || p);
                    const row = streamRowForUser(pid);
                    const uname = p?.username || 'Player';
                    if (!row?.streamUrl) {
                      return (
                        <div
                          key={pid}
                          className="flex min-h-[100px] items-center justify-center rounded-lg border border-dashed border-brand-border px-3 text-center text-xs text-brand-muted"
                        >
                          {uname} — no stream yet
                        </div>
                      );
                    }
                    return (
                      <LazyStreamEmbed
                        key={pid}
                        streamUrl={row.streamUrl}
                        playerName={uname}
                        forceShow={open}
                      />
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="mt-6 border-t border-brand-border pt-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-muted">Screenshot evidence</p>
        {slots.length === 0 ? (
          <p className="mt-2 text-sm text-brand-muted">No squads in lobby</p>
        ) : (
          slots.map((slot) => {
            const tid = String(slot.team?._id || slot.team);
            const players = slot.players || [];
            const shots = players
              .map((p) => {
                const pid = String(p?._id || p);
                const row = streamRowForUser(pid);
                return row?.screenshot ? { p, pid, url: row.screenshot } : null;
              })
              .filter(Boolean);
            if (shots.length === 0) return null;
            return (
              <div key={`grp-${tid}`} className="mt-4">
                <p className="text-xs font-medium text-brand-light">{teamTitle(slot)}</p>
                <div className="mt-2 flex flex-wrap gap-4">
                  {shots.map(({ p, url }) => (
                    <div key={url} className="space-y-1.5">
                      <button
                        type="button"
                        onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}
                        className="block rounded-lg border-0 bg-transparent p-0"
                      >
                        <img
                          src={url}
                          alt={`${p?.username || 'Player'} proof`}
                          className="h-20 w-32 cursor-pointer rounded-lg border border-brand-border object-cover transition-opacity hover:opacity-90"
                        />
                      </button>
                      <p className="text-xs text-brand-muted">{p?.username}&apos;s proof</p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>

      {match.status !== 'completed' ? (
        <div className="mt-6 flex flex-col gap-3 border-t border-brand-border pt-4 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1">
            <label className="mb-1 block text-xs text-brand-muted" htmlFor={`br-win-${match._id}`}>
              Winning squad
            </label>
            <select
              id={`br-win-${match._id}`}
              className="input w-full max-w-md bg-brand-card"
              value={pickTeamId}
              onChange={(e) => setPickTeamId(e.target.value)}
            >
              <option value="">Select squad</option>
              {slots.map((slot) => {
                const tid = String(slot.team?._id || slot.team);
                return (
                  <option key={tid} value={tid}>
                    {teamTitle(slot)}
                  </option>
                );
              })}
            </select>
          </div>
          <Button variant="primary" className="!px-4 !py-2 text-xs" disabled={declaring} onClick={declareWinner}>
            {declaring ? 'Saving…' : 'Declare BR winner'}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function OrganizerMatchCard({ match, tournamentName, tournamentId, onSetResult, onRefresh }) {
  if (match.kind === 'br_lobby') {
    return (
      <BrLobbyOrganizerCard
        match={match}
        tournamentName={tournamentName}
        tournamentId={tournamentId}
        onRefresh={onRefresh}
      />
    );
  }

  const proof = match.proof || {};
  const p1Stream = proof.player1StreamUrl;
  const p2Stream = proof.player2StreamUrl;
  const hasAnyStream = Boolean(p1Stream || p2Stream);
  const hasBothStreams = Boolean(p1Stream && p2Stream);

  const p1Shot = proof.player1Screenshot;
  const p2Shot = proof.player2Screenshot;
  const hasAnyScreenshot = Boolean(p1Shot || p2Shot);

  const p1User = typeof match.player1 === 'object' && match.player1 != null ? match.player1 : null;
  const p2User = typeof match.player2 === 'object' && match.player2 != null ? match.player2 : null;
  const p1Username = p1User?.username || 'Player 1';
  const p2Username = p2User?.username || 'Player 2';

  return (
    <div className="card-surface flex flex-col p-4">
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
      </div>

      <div className="mt-4 flex flex-wrap gap-6 border-t border-brand-border pt-4 text-sm">
        <div>
          <p className="text-xs uppercase tracking-wider text-brand-muted">Player 1</p>
          <p className="mt-0.5 font-medium text-brand-light">{p1Username}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-brand-muted">Player 2</p>
          <p className="mt-0.5 font-medium text-brand-light">{p2Username}</p>
        </div>
      </div>

      <div className="mt-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-muted">Streams</p>
        {!hasAnyStream ? (
          <div className="mt-2 rounded-lg border border-dashed border-brand-border bg-brand-subtle/30 px-4 py-5">
            <p className="text-sm text-brand-muted">No streams submitted yet</p>
            <p className="mt-2 text-xs text-brand-muted/90">
              Players must submit their stream link when the match goes live
            </p>
          </div>
        ) : (
          <div
            className={clsx(
              'mt-3 gap-4',
              hasBothStreams ? 'grid grid-cols-1 md:grid-cols-2' : 'flex flex-col'
            )}
          >
            {p1Stream ? (
              <StreamEmbed streamUrl={p1Stream} playerName={p1User?.username} />
            ) : null}
            {p2Stream ? (
              <StreamEmbed streamUrl={p2Stream} playerName={p2User?.username} />
            ) : null}
          </div>
        )}
      </div>

      <div className="mt-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-muted">Screenshot evidence</p>
        {!hasAnyScreenshot ? (
          <p className="mt-2 text-sm text-brand-muted">No screenshots submitted</p>
        ) : (
          <div className="mt-3 flex flex-wrap gap-6">
            {p1Shot ? (
              <div className="space-y-1.5">
                <button
                  type="button"
                  onClick={() => window.open(p1Shot, '_blank', 'noopener,noreferrer')}
                  className="block rounded-lg border-0 bg-transparent p-0"
                >
                  <img
                    src={p1Shot}
                    alt={`${p1Username} match proof`}
                    className="h-20 w-32 cursor-pointer rounded-lg border border-brand-border object-cover transition-opacity hover:opacity-90"
                  />
                </button>
                <p className="text-xs text-brand-muted">
                  {p1Username}&apos;s proof
                </p>
              </div>
            ) : null}
            {p2Shot ? (
              <div className="space-y-1.5">
                <button
                  type="button"
                  onClick={() => window.open(p2Shot, '_blank', 'noopener,noreferrer')}
                  className="block rounded-lg border-0 bg-transparent p-0"
                >
                  <img
                    src={p2Shot}
                    alt={`${p2Username} match proof`}
                    className="h-20 w-32 cursor-pointer rounded-lg border border-brand-border object-cover transition-opacity hover:opacity-90"
                  />
                </button>
                <p className="text-xs text-brand-muted">
                  {p2Username}&apos;s proof
                </p>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {match.status !== 'completed' ? (
        <div className="mt-6 flex justify-end border-t border-brand-border pt-4">
          <Button
            variant="primary"
            className="!px-4 !py-2 text-xs"
            onClick={() => onSetResult(match, tournamentId)}
          >
            Set result
          </Button>
        </div>
      ) : null}
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
      format: 'single-elimination',
      maxPlayers: 8,
      maxTeams: 12,
      squadSize: 4,
      startDate: new Date().toISOString().slice(0, 10),
    },
  });

  const selectedGame = watch('game');
  const createFormat = watch('format');

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
      const payload = {
        name: data.name,
        game: data.game,
        entryFee: data.entryFee,
        prizePool: data.prizePool,
        startDate: data.startDate,
        rules: data.rules,
        format: data.format,
      };
      if (data.format === 'battle_royale_squad') {
        payload.maxTeams = Number(data.maxTeams);
        payload.squadSize = Number(data.squadSize);
      } else {
        payload.maxPlayers = Number(data.maxPlayers);
      }
      const res = await tournamentApi.createTournament(payload);
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
            <div>
              <p className="mb-2 text-sm font-medium text-brand-light">Format</p>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'single-elimination', label: '1v1 bracket' },
                  { id: 'battle_royale_squad', label: 'Squad battle royale' },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setValue('format', f.id, { shouldValidate: true })}
                    className={clsx(
                      'rounded-full border px-4 py-2 text-sm font-bold transition-all',
                      createFormat === f.id
                        ? 'border-brand-red bg-brand-red/15 text-brand-light shadow-glow-red'
                        : 'border-brand-border text-brand-muted hover:border-brand-red/40'
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              <input type="hidden" {...register('format')} />
              {errors.format ? <p className="mt-1 text-sm text-red-400">{errors.format.message}</p> : null}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Entry fee" type="number" {...register('entryFee')} error={errors.entryFee?.message} />
              <Input label="Prize pool" type="number" {...register('prizePool')} error={errors.prizePool?.message} />
            </div>
            {createFormat === 'single-elimination' ? (
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
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                <Input label="Max squads" type="number" {...register('maxTeams')} error={errors.maxTeams?.message} />
                <Input label="Squad size" type="number" {...register('squadSize')} error={errors.squadSize?.message} />
                <p className="sm:col-span-2 text-xs text-brand-muted">
                  Total capacity = max squads × squad size (max 128).
                </p>
              </div>
            )}
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
                  onRefresh={load}
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
                  onRefresh={load}
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
