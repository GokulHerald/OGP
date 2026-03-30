import clsx from 'clsx';

export function EmptyState({ icon: Icon, title, description, action, className }) {
  return (
    <div
      className={clsx(
        'flex flex-col items-center justify-center rounded-xl border border-dashed border-brand-border bg-brand-surface/80 px-6 py-16 text-center',
        className
      )}
    >
      {Icon ? <Icon className="mb-4 h-12 w-12 text-brand-muted" strokeWidth={1.25} /> : null}
      <h3 className="font-display text-lg font-semibold text-brand-light">{title}</h3>
      {description ? <p className="mt-2 max-w-sm text-sm text-brand-muted">{description}</p> : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
