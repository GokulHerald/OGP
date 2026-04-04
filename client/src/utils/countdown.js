export function formatCountdown(targetDate) {
  const diff = new Date(targetDate) - new Date();
  if (diff <= 0) return 'STARTED';
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function formatCountdownHMS(targetDate) {
  if (targetDate == null) return { h: '00', m: '00', s: '00', done: true };
  const diff = new Date(targetDate) - new Date();
  if (diff <= 0) return { h: '00', m: '00', s: '00', done: true };
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return {
    h: String(h).padStart(2, '0'),
    m: String(m).padStart(2, '0'),
    s: String(s).padStart(2, '0'),
    done: false,
  };
}

export function getSoonestUpcomingTournament(tournaments) {
  if (!Array.isArray(tournaments) || tournaments.length === 0) return null;
  const now = Date.now();
  const upcoming = tournaments
    .filter((t) => t.startDate && ['registration', 'ongoing'].includes(t.status))
    .map((t) => ({ t, start: new Date(t.startDate).getTime() }))
    .filter(({ start }) => start > now)
    .sort((a, b) => a.start - b.start);
  return upcoming[0]?.t ?? null;
}
