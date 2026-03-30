import clsx from 'clsx';

const variants = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  ghost: 'btn-ghost',
};

export function Button({
  variant = 'primary',
  className,
  type = 'button',
  disabled,
  children,
  ...props
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      className={clsx(variants[variant] || variants.primary, className)}
      {...props}
    >
      {children}
    </button>
  );
}
