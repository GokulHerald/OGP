import clsx from 'clsx';
import { EmptyState } from '../ui/EmptyState.jsx';
import { GitBranch } from 'lucide-react';

function pid(u) {
  if (!u) return null;
  return String(u._id || u);
}

function BracketMatchCard({ match }) {
  if (!match) return null;
  const { player1, player2, winner, status } = match;
  const w = winner ? pid(winner) : null;
  const p1 = pid(player1);
  const p2 = pid(player2);
  const p1Win = w && p1 && w === p1;
  const p2Win = w && p2 && w === p2;

  const Row = ({ userDoc, win, lose }) => {
    const name = userDoc?.username || 'TBD';
    const initial = name.slice(0, 1).toUpperCase();
    return (
      <div
        className={clsx(
          'flex items-center gap-3 rounded-lg border border-brand-border bg-brand-card px-3 py-2.5',
          win && 'border-l-4 border-l-brand-red bg-brand-subtle/40',
          lose && 'opacity-50'
        )}
      >
        <div
          className={clsx(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white',
            win ? 'bg-brand-red' : 'bg-brand-border'
          )}
        >
          {initial}
        </div>
        <span
          className={clsx(
            'min-w-0 flex-1 truncate font-medium',
            win ? 'font-bold text-brand-light' : 'text-brand-muted',
            lose && 'line-through'
          )}
        >
          {name}
        </span>
      </div>
    );
  };

  return (
    <div className="relative w-[220px] shrink-0 rounded-xl border border-brand-border bg-[#0F0F0F] p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-brand-muted">
          M{match.matchNumber}
        </span>
        {status === 'live' ? (
          <span className="flex items-center gap-1 text-[10px] font-bold uppercase text-green-400">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-400" />
            LIVE
          </span>
        ) : null}
      </div>
      <div className="space-y-2">
        <Row userDoc={player1} win={p1Win} lose={Boolean(w && p1 && !p1Win)} />
        <Row userDoc={player2} win={p2Win} lose={Boolean(w && p2 && !p2Win)} />
      </div>
    </div>
  );
}

function SvgBetweenColumns() {
  return (
    <div className="flex w-10 shrink-0 items-stretch self-stretch py-10">
      <svg
        className="h-full min-h-[100px] w-full text-[#242424]"
        preserveAspectRatio="none"
        viewBox="0 0 40 200"
        aria-hidden
      >
        <path
          d="M 0 100 L 20 100 M 20 50 L 40 50 M 20 150 L 40 150 M 20 50 L 20 150"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </div>
  );
}

export function BracketView({ matches, className }) {
  if (!Array.isArray(matches) || matches.length === 0) {
    return (
      <EmptyState
        icon={GitBranch}
        title="No bracket yet"
        description="Matches will appear after the tournament starts."
      />
    );
  }

  const byRound = matches.reduce((acc, m) => {
    const r = m.round ?? 1;
    if (!acc[r]) acc[r] = [];
    acc[r].push(m);
    return acc;
  }, {});

  const rounds = Object.keys(byRound)
    .map(Number)
    .sort((a, b) => a - b);

  return (
    <div className={clsx('rounded-xl bg-[#0A0A0A] p-4', className)}>
      <div className="bracket-scrollbar overflow-x-auto pb-2">
        <div className="flex min-w-min items-stretch">
          {rounds.map((roundNum, colIdx) => (
            <div key={roundNum} className="flex items-stretch">
              {colIdx > 0 ? <SvgBetweenColumns /> : null}
              <div className="flex min-w-[240px] flex-col px-2">
                <h3 className="font-display mb-6 text-center text-sm font-bold uppercase tracking-[0.2em] text-brand-muted">
                  Round {roundNum}
                </h3>
                <div className="flex flex-1 flex-col justify-around gap-8">
                  {byRound[roundNum]
                    .slice()
                    .sort((a, b) => (a.matchNumber || 0) - (b.matchNumber || 0))
                    .map((match) => (
                      <BracketMatchCard key={match._id} match={match} />
                    ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
