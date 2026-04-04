import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Upload } from 'lucide-react';
import * as tournamentApi from '../api/tournament.api.js';
import * as matchApi from '../api/match.api.js';
import { useAuth } from '../hooks/useAuth.js';
import { BracketView } from '../components/tournament/BracketView.jsx';
import { StreamSubmitForm } from '../components/tournament/StreamSubmitForm.jsx';
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
  const { isAuthenticated, isOrganizer, isPlayer, user } = useAuth();
  const [tournament, setTournament] = useState(null);
  const [matches, setMatches] = useState([]);
  const [leaderboard, setLeaderboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [squadName, setSquadName] = useState('');
  const [memberIdInputs, setMemberIdInputs] = useState(['', '', '']);
  const [brWinnerTeamId, setBrWinnerTeamId] = useState('');

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

  const refetchMatches = useCallback(async () => {
    try {
      const { data } = await matchApi.getMatchesByTournament(id);
      setMatches(data.matches || []);
    } catch {
      toast.error('Failed to refresh matches');
    }
  }, [id]);

  const isSquadTournament = tournament?.format === 'battle_royale_squad';

  const myMatch = useMemo(() => {
    if (!user?._id) return null;
    const uid = String(user._id);
    return (
      matches.find((m) => {
        if (m.status === 'completed') return false;
        if (m.kind === 'br_lobby') {
          return (m.brTeams || []).some((slot) =>
            (slot.players || []).some((p) => String(p?._id || p) === uid)
          );
        }
        const p1 = m.player1?._id ?? m.player1;
        const p2 = m.player2?._id ?? m.player2;
        return (p1 != null && String(p1) === uid) || (p2 != null && String(p2) === uid);
      }) || null
    );
  }, [matches, user?._id]);

  const memberSlots = (tournament?.squadSize || 4) - 1;

  useEffect(() => {
    setMemberIdInputs((prev) => {
      const next = [...prev];
      while (next.length < memberSlots) next.push('');
      while (next.length > memberSlots) next.pop();
      return next;
    });
  }, [memberSlots, id]);

  const isRegistered = useMemo(() => {
    if (!user?._id || !tournament) return false;
    const uid = String(user._id);
    if (isSquadTournament) {
      const teams = tournament.registeredTeams || [];
      return teams.some((team) => {
        if (!team) return false;
        const cap = team.captain?._id || team.captain;
        if (String(cap) === uid) return true;
        return (team.members || []).some((m) => String(m._id || m) === uid);
      });
    }
    return tournament.registeredPlayers?.some((p) => String(p._id || p) === uid) ?? false;
  }, [tournament, user?._id, isSquadTournament]);
  const isOwner = tournament && user && String(tournament.organizer?._id || tournament.organizer) === String(user._id);

  const showActiveMatchPanel =
    isAuthenticated &&
    isRegistered &&
    tournament?.status === 'ongoing' &&
    myMatch != null;

  const showPlayerStreamHint =
    isAuthenticated &&
    isPlayer &&
    isRegistered &&
    !showActiveMatchPanel &&
    tournament?.status !== 'completed' &&
    tournament?.status !== 'cancelled';

  const opponentUsername = useMemo(() => {
    if (!myMatch || !user?._id) return '—';
    if (myMatch.kind === 'br_lobby') return 'Squad battle royale';
    const uid = String(user._id);
    const p1 = myMatch.player1?._id ?? myMatch.player1;
    const p2 = myMatch.player2?._id ?? myMatch.player2;
    if (p1 != null && String(p1) === uid) {
      return myMatch.player2?.username || 'TBD';
    }
    if (p2 != null && String(p2) === uid) {
      return myMatch.player1?.username || 'TBD';
    }
    return '—';
  }, [myMatch, user?._id]);

  const brLobbyMatch = useMemo(() => matches.find((m) => m.kind === 'br_lobby'), [matches]);

  const showBrWinnerPanel =
    isOrganizer &&
    isOwner &&
    tournament &&
    tournament.status === 'ongoing' &&
    brLobbyMatch &&
    brLobbyMatch.status !== 'completed';

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

  const handleRegisterSquad = async () => {
    const memberIds = memberIdInputs.map((s) => s.trim()).filter(Boolean);
    if (memberIds.length !== memberSlots) {
      toast.error(`Enter exactly ${memberSlots} teammate user IDs (MongoDB ObjectIds).`);
      return;
    }
    const uniq = new Set(memberIds);
    if (uniq.size !== memberIds.length) {
      toast.error('Duplicate member IDs');
      return;
    }
    setActionLoading(true);
    try {
      const res = await tournamentApi.registerSquad(id, {
        name: squadName.trim(),
        memberIds,
      });
      if (res.data?.requiresPayment) {
        const tid = res.data.team?._id;
        toast.success(
          `Squad created. Pay ₹${res.data.entryFee ?? tournament.entryFee} to confirm. Team ID: ${tid || '—'} (use with your payment flow).`,
          { duration: 8000 }
        );
      } else {
        toast.success(res.data?.message || 'Squad registered');
      }
      const { data } = await tournamentApi.getTournamentById(id);
      setTournament(data.tournament);
      setSquadName('');
      setMemberIdInputs((prev) => prev.map(() => ''));
    } catch (e) {
      toast.error(e.response?.data?.message || 'Squad registration failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeclareBrWinner = async () => {
    if (!brWinnerTeamId) {
      toast.error('Select a winning squad');
      return;
    }
    setActionLoading(true);
    try {
      await tournamentApi.setBrWinner(id, brWinnerTeamId);
      toast.success('Winner recorded; prize credited to captain wallet');
      const [tRes, mRes] = await Promise.all([
        tournamentApi.getTournamentById(id),
        matchApi.getMatchesByTournament(id),
      ]);
      setTournament(tRes.data.tournament);
      setMatches(mRes.data.matches || []);
      setBrWinnerTeamId('');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Could not set winner');
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
            Organizer: {tournament.organizer?.username || '—'} · Prize: ₹{tournament.prizePool}
            {isSquadTournament ? (
              <>
                {' '}
                · Squads {tournament.registeredTeams?.length ?? 0}/{tournament.maxTeams ?? '—'} ·{' '}
                {tournament.squadSize ?? 4} players per squad
              </>
            ) : (
              <>
                {' '}
                · Max {tournament.maxPlayers} players
              </>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {isAuthenticated &&
          !isOrganizer &&
          isPlayer &&
          tournament.status === 'registration' &&
          !isRegistered &&
          !isSquadTournament ? (
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

      {isAuthenticated &&
      !isOrganizer &&
      tournament.status === 'registration' &&
      !isRegistered &&
      isSquadTournament ? (
        <div className="card-surface mt-8 space-y-4 p-5">
          <h3 className="font-display text-sm font-bold uppercase tracking-wide text-brand-light">
            Register your squad (captain)
          </h3>
          <p className="text-sm text-brand-muted">
            Add exactly <strong className="text-brand-light">{memberSlots}</strong> teammates using their account user IDs
            (MongoDB ObjectIds from profile or database). Your squad will have {tournament.squadSize ?? 4} players
            including you.
          </p>
          <div>
            <label className="mb-1 block text-xs font-medium text-brand-muted" htmlFor="squad-name">
              Squad tag / name (optional)
            </label>
            <input
              id="squad-name"
              className="input w-full"
              value={squadName}
              onChange={(e) => setSquadName(e.target.value)}
              placeholder="e.g. Team Alpha"
            />
          </div>
          {memberIdInputs.map((val, i) => (
            <div key={i}>
              <label className="mb-1 block text-xs font-medium text-brand-muted" htmlFor={`member-${i}`}>
                Teammate {i + 1} user ID
              </label>
              <input
                id={`member-${i}`}
                className="input w-full font-mono text-sm"
                value={val}
                onChange={(e) => {
                  const next = [...memberIdInputs];
                  next[i] = e.target.value;
                  setMemberIdInputs(next);
                }}
                placeholder="507f1f77bcf86cd799439011"
              />
            </div>
          ))}
          <Button variant="primary" disabled={actionLoading} onClick={handleRegisterSquad}>
            Submit squad
          </Button>
        </div>
      ) : null}

      {showBrWinnerPanel ? (
        <div className="card-surface mt-8 space-y-4 border border-violet-500/25 p-5">
          <h3 className="font-display text-sm font-bold uppercase tracking-wide text-violet-300">
            Declare battle royale winner
          </h3>
          <p className="text-sm text-brand-muted">
            The prize pool is credited to the winning captain&apos;s wallet. Splitting among the squad is manual.
          </p>
          <select
            className="input w-full max-w-md bg-brand-card"
            value={brWinnerTeamId}
            onChange={(e) => setBrWinnerTeamId(e.target.value)}
            aria-label="Winning squad"
          >
            <option value="">Select winning squad</option>
            {(brLobbyMatch.brTeams || []).map((slot) => {
              const tid = String(slot.team?._id || slot.team);
              const t = slot.team;
              const label =
                typeof t === 'object' && t != null
                  ? t.name?.trim() || t.captain?.username || `Squad ${tid.slice(-6)}`
                  : tid;
              return (
                <option key={tid} value={tid}>
                  {label}
                </option>
              );
            })}
          </select>
          <Button variant="primary" disabled={actionLoading} onClick={handleDeclareBrWinner}>
            Confirm winning squad
          </Button>
        </div>
      ) : null}

      <section className="mt-12">
        <h2 className="font-display mb-4 text-xl font-black uppercase tracking-wide text-brand-light">
          Bracket & matches
        </h2>
        <BracketView matches={matches} />

        {showPlayerStreamHint ? (
          <div className="mt-8 rounded-xl border border-dashed border-brand-border bg-brand-subtle/30 p-5">
            <h3 className="font-display text-sm font-bold uppercase tracking-wide text-brand-light">
              YouTube / Twitch / Facebook stream link
            </h3>
            {tournament.status === 'registration' ? (
              <p className="mt-2 text-sm leading-relaxed text-brand-muted">
                {isSquadTournament ? (
                  <>
                    After the organizer starts the event, each squad member can submit a stream link from this page when
                    the <strong className="text-brand-orange">YOUR ACTIVE MATCH</strong> panel appears for the BR lobby.
                  </>
                ) : (
                  <>
                    You submit your live stream URL only when you have an{' '}
                    <strong className="text-brand-light">active</strong> bracket match. After the organizer{' '}
                    <strong className="text-brand-light">starts</strong> this tournament, stay on{' '}
                    <strong className="text-brand-light">this page</strong>. A{' '}
                    <strong className="text-brand-orange">YOUR ACTIVE MATCH</strong> block will appear below the bracket
                    with the form (YouTube Live, Twitch, or Facebook Gaming).
                  </>
                )}
              </p>
            ) : (
              <p className="mt-2 text-sm leading-relaxed text-brand-muted">
                {isSquadTournament ? (
                  <>
                    You&apos;re registered, but you&apos;re not in the live lobby roster or the match has finished. When
                    you&apos;re part of the active BR lobby, <strong className="text-brand-orange">YOUR ACTIVE MATCH</strong>{' '}
                    will appear here.
                  </>
                ) : (
                  <>
                    This tournament is live, but you don&apos;t have a{' '}
                    <strong className="text-brand-light">pending or live</strong> match right now (you may be waiting for
                    the next round, or your matches are finished). When you&apos;re drawn into an active match,{' '}
                    <strong className="text-brand-orange">YOUR ACTIVE MATCH</strong> will show up here with the stream link
                    and proof upload.
                  </>
                )}
              </p>
            )}
          </div>
        ) : null}

        {showActiveMatchPanel ? (
          <div className="mt-10 space-y-8">
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-red-600" />
              </span>
              <h3 className="font-display text-lg font-black uppercase tracking-wide text-brand-light">
                YOUR ACTIVE MATCH
              </h3>
            </div>

            <div className="card-surface space-y-6 p-5">
              <div className="space-y-1 border-b border-brand-border pb-4">
                <p className="text-sm text-brand-muted">
                  Round {myMatch.round} — Match {myMatch.matchNumber}
                </p>
                <p className="font-semibold text-brand-light">vs {opponentUsername}</p>
              </div>

              <StreamSubmitForm
                match={myMatch}
                currentUserId={user._id}
                onSubmitted={refetchMatches}
              />

              <div className="border-t border-brand-border pt-6">
                <h4 className="font-display text-base font-bold uppercase tracking-wide text-brand-light">
                  SUBMIT MATCH PROOF
                </h4>
                <p className="mt-1 text-sm text-brand-muted">
                  Upload a screenshot of your end-game results screen after the match
                </p>
                <div className="mt-4">
                  <MatchProofUpload matchId={myMatch._id} onSuccess={refetchMatches} />
                </div>
              </div>
            </div>
          </div>
        ) : null}
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

function MatchProofUpload({ matchId, onSuccess }) {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return undefined;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const setImageFile = (f) => {
    if (f && f.type.startsWith('image/')) setFile(f);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const f = e.dataTransfer.files?.[0];
    setImageFile(f);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file || !matchId) return;
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('screenshot', file);
      await matchApi.submitMatchProof(matchId, formData);
      toast.success('Proof submitted! Waiting for admin verification.');
      setFile(null);
      if (typeof onSuccess === 'function') onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit proof');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => {
          setImageFile(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`flex w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-brand-border bg-brand-subtle/40 px-4 py-10 text-center transition-colors hover:border-brand-red/50 hover:bg-brand-subtle/60 ${
          dragActive ? 'border-brand-red/60 bg-brand-subtle/70' : ''
        }`}
      >
        {preview ? (
          <img
            src={preview}
            alt="Screenshot preview"
            className="max-h-40 w-auto max-w-full rounded-lg border border-brand-border object-contain"
          />
        ) : (
          <>
            <Upload className="h-10 w-10 text-brand-muted" aria-hidden />
            <span className="text-sm text-brand-muted">
              Drop screenshot here or click to browse
            </span>
          </>
        )}
      </button>

      <Button
        type="submit"
        disabled={!file || submitting}
        className="flex w-full items-center justify-center gap-2"
      >
        {submitting ? (
          <>
            <LoadingSpinner size="sm" className="h-4 w-4 border-[1.5px]" />
            Submitting…
          </>
        ) : (
          'Submit proof'
        )}
      </Button>
    </form>
  );
}
