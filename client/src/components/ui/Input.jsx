import { forwardRef } from 'react';
import clsx from 'clsx';

export const Input = forwardRef(function Input(
  { className, label, error, id, ...props },
  ref
) {
  const inputId = id || props.name;
  return (
    <div className="w-full">
      {label ? (
        <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-brand-light">
          {label}
        </label>
      ) : null}
      <input ref={ref} id={inputId} className={clsx('input', error && 'border-red-500', className)} {...props} />
      {error ? <p className="mt-1 text-sm text-red-400">{error}</p> : null}
    </div>
  );
});
