import clsx from 'clsx';

const variants = {
  green: 'badge-green',
  red: 'badge-red',
  orange: 'badge-orange',
  gray: 'badge-gray',
};

export function Badge({ variant = 'gray', className, children, ...props }) {
  return (
    <span className={clsx(variants[variant] || variants.gray, className)} {...props}>
      {children}
    </span>
  );
}
