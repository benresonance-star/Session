import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

const variantClasses: Record<Variant, string> = {
  primary: 'border border-accent/40 text-text hover:border-accent hover:text-accent',
  secondary: 'border border-border text-muted hover:text-text hover:border-text/30',
  ghost: 'text-muted hover:text-text',
  danger: 'border border-warning/40 text-warning hover:border-warning hover:text-text'
};

export function ActionButton({
  children,
  className = '',
  variant = 'secondary',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: Variant;
}): JSX.Element {
  return (
    <button
      {...props}
      className={`skin-control inline-flex items-center justify-center rounded-[var(--radius-control)] px-3 py-1.5 text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-40 ${variantClasses[variant]} ${className}`.trim()}
    >
      {children}
    </button>
  );
}
