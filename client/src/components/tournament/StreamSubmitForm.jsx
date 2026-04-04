import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { CheckCircle2 } from 'lucide-react';
import { submitStreamLink } from '../../api/match.api.js';
import { isValidStreamUrl } from '../../utils/stream.js';
import { Button } from '../ui/Button.jsx';
import { LoadingSpinner } from '../ui/LoadingSpinner.jsx';

export function StreamSubmitForm({ match, currentUserId, onSubmitted }) {
  const [url, setUrl] = useState('');
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [forceEdit, setForceEdit] = useState(false);

  const { isParticipant, existingUrl } = useMemo(() => {
    if (!match || !currentUserId) {
      return { isParticipant: false, existingUrl: '' };
    }
    const me = String(currentUserId);
    const proof = match.proof || {};

    if (match.kind === 'br_lobby' && Array.isArray(match.brTeams)) {
      let inLobby = false;
      for (const slot of match.brTeams) {
        const players = slot.players || [];
        for (const p of players) {
          const pid = p?._id || p;
          if (pid != null && String(pid) === me) {
            inLobby = true;
            break;
          }
        }
        if (inLobby) break;
      }
      const row = (proof.squadStreams || []).find((s) => String(s.user) === me || String(s.user?._id) === me);
      const submittedUrl = row?.streamUrl || '';
      return { isParticipant: inLobby, existingUrl: submittedUrl || '' };
    }

    const p1Id = match.player1?._id || match.player1;
    const p2Id = match.player2?._id || match.player2;
    const isP1 = p1Id && String(p1Id) === me;
    const isP2 = p2Id && String(p2Id) === me;
    const submittedUrl = isP1 ? proof.player1StreamUrl : isP2 ? proof.player2StreamUrl : '';
    return { isParticipant: isP1 || isP2, existingUrl: submittedUrl || '' };
  }, [match, currentUserId]);

  const effectiveUrl = url || existingUrl || '';
  const hasSubmitted = !!existingUrl && !forceEdit;
  const isValid = !!effectiveUrl && isValidStreamUrl(effectiveUrl);
  const showError = touched && !!effectiveUrl && !isValid;

  const handleChange = (e) => {
    const next = e.target.value;
    setUrl(next);
    if (!touched) setTouched(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched(true);
    if (!isValid || !effectiveUrl || !match?._id) return;
    try {
      setSubmitting(true);
      await submitStreamLink(match._id, effectiveUrl);
      toast.success('Stream link submitted! Admin can now monitor your match.');
      setForceEdit(false);
      if (typeof onSubmitted === 'function') onSubmitted();
    } catch (error) {
      const msg = error?.response?.data?.message || 'Failed to submit stream link';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (!match || !currentUserId || !isParticipant) return null;

  if (hasSubmitted) {
    return (
      <div className="card-surface flex flex-col gap-4 p-5">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-6 w-6 text-green-500" aria-hidden />
          <div>
            <h3 className="font-display text-lg font-bold tracking-wide text-green-400">
              Stream submitted successfully
            </h3>
            <p className="mt-1 text-sm text-brand-muted">
              Your stream link is active. Admins can now monitor your match.
            </p>
          </div>
        </div>
        <div className="overflow-x-auto rounded-md border border-brand-border bg-brand-subtle px-3 py-2 text-xs text-brand-muted">
          <code className="whitespace-pre break-all">{existingUrl}</code>
        </div>
        <div>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setForceEdit(true);
              setUrl(existingUrl);
              setTouched(false);
            }}
            className="w-full sm:w-auto"
          >
            Update Link
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card-surface flex flex-col gap-5 p-5">
      <div>
        <h3 className="font-display text-lg font-bold tracking-[0.15em] text-brand-light">
          SUBMIT YOUR STREAM LINK
        </h3>
        <p className="mt-1 text-sm text-brand-muted">
          You must go live before your match starts.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 text-xs font-semibold">
        <span className="inline-flex items-center gap-1 rounded-full bg-red-600/20 px-3 py-1 text-red-400">
          <span aria-hidden>🔴</span>
          YouTube Live
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-[#9146FF]/20 px-3 py-1 text-[#b394ff]">
          <span aria-hidden>💜</span>
          Twitch
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-blue-600/20 px-3 py-1 text-blue-400">
          <span aria-hidden>🔵</span>
          Facebook Gaming
        </span>
      </div>

      <div className="space-y-2">
        <label className="mb-1.5 block text-sm font-medium text-brand-light" htmlFor="stream-url">
          Stream URL
        </label>
        <div className="relative">
          <input
            id="stream-url"
            type="url"
            value={effectiveUrl}
            onChange={handleChange}
            onBlur={() => setTouched(true)}
            placeholder="https://youtube.com/live/your-stream-id"
            className={`input pr-10 ${showError ? 'border-red-500' : ''}`}
            autoComplete="off"
          />
          {isValid && (
            <CheckCircle2
              className="pointer-events-none absolute inset-y-0 right-3 my-auto h-5 w-5 text-green-500"
              aria-hidden
            />
          )}
        </div>
        {showError ? (
          <p className="text-sm text-red-400">
            Only YouTube, Twitch, or Facebook Gaming links accepted
          </p>
        ) : null}
      </div>

      <Button
        type="submit"
        disabled={!isValid || submitting}
        className="flex w-full items-center justify-center gap-2"
      >
        {submitting ? (
          <>
            <LoadingSpinner size="sm" className="h-4 w-4 border-[1.5px]" />
            <span>Submitting…</span>
          </>
        ) : (
          <>
            <span aria-hidden>GO LIVE 🔴</span>
          </>
        )}
      </Button>

      <p className="text-xs text-brand-muted">
        Need help going live?{' '}
        <button
          type="button"
          onClick={() =>
            window.open(
              'https://support.google.com/youtube/answer/2474026',
              '_blank',
              'noopener,noreferrer'
            )
          }
          className="font-semibold text-brand-orange underline-offset-2 hover:underline"
        >
          YouTube Live Guide →
        </button>
      </p>
    </form>
  );
}

