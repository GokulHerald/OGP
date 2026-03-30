import clsx from 'clsx';

export function LoadingSpinner({ className, size = 'md' }) {
  const sizes = { sm: 'h-6 w-6 border-2', md: 'h-10 w-10 border-2', lg: 'h-14 w-14 border-[3px]' };
  return (
    <div
      className={clsx(
        'inline-block animate-spin rounded-full border-2 border-brand-border border-t-brand-red',
        sizes[size],
        className
      )}
      role="status"
      aria-label="Loading"
    />
  );
}
