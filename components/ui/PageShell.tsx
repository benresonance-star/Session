import type { ReactNode } from 'react';

export function PageShell({
  children,
  width = 'max-w-5xl',
  className = '',
  frameClassName = ''
}: {
  children: ReactNode;
  width?: 'max-w-3xl' | 'max-w-4xl' | 'max-w-5xl';
  className?: string;
  frameClassName?: string;
}): JSX.Element {
  return (
    <main className={`skin-page min-h-screen px-6 py-10 sm:px-10 ${className}`.trim()}>
      <div className={`skin-screen mx-auto ${width} ${frameClassName}`.trim()}>{children}</div>
    </main>
  );
}
