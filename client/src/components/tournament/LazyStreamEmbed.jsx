import { useEffect, useRef, useState } from 'react';
import { StreamEmbed } from './StreamEmbed.jsx';

/**
 * Defers mounting the iframe until the row is visible (saves ~100 embeds on BR dashboards)
 * or until `forceShow` is true (e.g. accordion expanded).
 */
export function LazyStreamEmbed({ streamUrl, playerName, forceShow = false }) {
  const rootRef = useRef(null);
  const [visible, setVisible] = useState(forceShow);

  useEffect(() => {
    if (forceShow) {
      setVisible(true);
      return undefined;
    }
    const el = rootRef.current;
    if (!el) return undefined;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) setVisible(true);
      },
      { rootMargin: '160px', threshold: 0.02 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [forceShow]);

  return (
    <div ref={rootRef} className="min-h-[80px]">
      {!visible ? (
        <div className="flex min-h-[120px] items-center justify-center rounded-lg border border-dashed border-brand-border bg-brand-subtle/20 px-3 text-center text-xs text-brand-muted">
          Stream loads when visible
        </div>
      ) : (
        <StreamEmbed streamUrl={streamUrl} playerName={playerName} />
      )}
    </div>
  );
}
