import Link from 'next/link';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

export function LcdRule({
  className = ''
}: {
  className?: string;
}): JSX.Element {
  return <div className={`skin-rule border-t border-line ${className}`.trim()} aria-hidden />;
}

export function LcdLabel({
  children,
  className = ''
}: {
  children: ReactNode;
  className?: string;
}): JSX.Element {
  return <div className={`skin-label text-[11px] text-muted ${className}`.trim()}>{children}</div>;
}

export function LcdTransportButton({
  children,
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
}): JSX.Element {
  return (
    <button
      {...props}
      className={`skin-control skin-transport inline-flex min-w-[3.4rem] items-center justify-center border border-border px-3 py-2 text-[11px] text-text transition-colors hover:border-text disabled:pointer-events-none disabled:opacity-40 ${className}`.trim()}
    >
      {children}
    </button>
  );
}

export function LcdTransportLink({
  href,
  children,
  className = ''
}: {
  href: string;
  children: ReactNode;
  className?: string;
}): JSX.Element {
  return (
    <Link
      href={href}
      className={`skin-control skin-transport inline-flex min-w-[3.4rem] items-center justify-center border border-border px-3 py-2 text-[11px] text-text transition-colors hover:border-text ${className}`.trim()}
    >
      {children}
    </Link>
  );
}
