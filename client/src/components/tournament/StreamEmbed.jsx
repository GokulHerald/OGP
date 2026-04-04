import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ExternalLink } from 'lucide-react';
import { convertToEmbedUrl, detectPlatform } from '../../utils/stream.js';
import { Button } from '../ui/Button.jsx';

export function StreamEmbed({ streamUrl, playerName }) {
  const name = playerName?.trim() || 'Player';
  const trimmedUrl = streamUrl?.trim() ?? '';
  const platform = trimmedUrl ? detectPlatform(trimmedUrl) : 'unknown';
  const embedUrl = trimmedUrl ? convertToEmbedUrl(trimmedUrl) : null;
  const [iframeFailed, setIframeFailed] = useState(false);

  useEffect(() => {
    setIframeFailed(false);
  }, [embedUrl]);

  const openStream = () => {
    if (!trimmedUrl) return;
    window.open(trimmedUrl, '_blank', 'noopener,noreferrer');
  };

  if (!trimmedUrl) return null;

  if (platform === 'facebook' || embedUrl == null) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.25 }}
        className="card-surface border-l-4 border-l-brand-orange p-5"
      >
        <div className="flex flex-col gap-4">
          <div className="flex gap-4">
            <ExternalLink
              className="mt-0.5 h-8 w-8 shrink-0 text-brand-orange"
              aria-hidden
            />
            <div className="min-w-0">
              <h3 className="font-display text-lg font-bold tracking-wide text-brand-light">
                {name}&apos;s Stream
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-brand-muted">
                Facebook Gaming streams cannot be embedded. Open in a new tab to
                monitor.
              </p>
            </div>
          </div>
          <Button
            type="button"
            onClick={openStream}
            className="inline-flex w-full items-center justify-center gap-2 sm:w-auto"
          >
            <ExternalLink className="h-4 w-4" aria-hidden />
            WATCH STREAM
          </Button>
        </div>
      </motion.div>
    );
  }

  const isYoutube = platform === 'youtube';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
      className="card-surface overflow-hidden"
    >
      <div className="flex items-center gap-3 border-b border-brand-border px-4 py-3">
        <span
          className={
            isYoutube
              ? 'shrink-0 rounded-md bg-red-600 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-white'
              : 'shrink-0 rounded-md bg-[#9146FF] px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-white'
          }
        >
          {isYoutube ? 'YouTube' : 'Twitch'}
        </span>
        <h3 className="min-w-0 flex-1 truncate text-center text-sm font-semibold text-brand-light">
          {name}&apos;s Stream
        </h3>
        <button
          type="button"
          onClick={openStream}
          className="shrink-0 rounded-lg p-2 text-brand-muted transition-colors hover:bg-brand-subtle hover:text-brand-light"
          aria-label="Open in new tab"
        >
          <ExternalLink className="h-5 w-5" />
        </button>
      </div>

      {iframeFailed ? (
        <div className="flex flex-col items-center justify-center gap-3 px-4 py-10">
          <p className="text-center text-sm text-brand-muted">
            Stream could not be loaded in the player.
          </p>
          <Button
            type="button"
            variant="secondary"
            onClick={openStream}
            className="inline-flex items-center gap-2"
          >
            <ExternalLink className="h-4 w-4" aria-hidden />
            Open in new tab
          </Button>
        </div>
      ) : (
        <iframe
          title={`${name}'s stream`}
          src={embedUrl}
          width="100%"
          height="240"
          frameBorder="0"
          allowFullScreen
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          className="block w-full rounded-b-lg border-0 bg-black"
          onError={() => setIframeFailed(true)}
        />
      )}
    </motion.div>
  );
}
