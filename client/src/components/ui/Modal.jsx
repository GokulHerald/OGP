import { useEffect } from 'react';
import clsx from 'clsx';
import { X } from 'lucide-react';

export function Modal({ open, onClose, title, children, className }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/70"
        aria-label="Close modal"
        onClick={onClose}
      />
      <div
        className={clsx(
          'card-surface relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto p-6 shadow-2xl',
          className
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          {title ? (
            <h2 id="modal-title" className="font-display text-xl font-bold text-brand-light">
              {title}
            </h2>
          ) : (
            <span />
          )}
          <button type="button" onClick={onClose} className="btn-ghost rounded-lg p-1 text-brand-muted">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
