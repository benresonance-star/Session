import type { ReactNode } from 'react';

export function PageShell({
  children,
  width = 'max-w-5xl'
}: {
  children: ReactNode;
  width?: 'max-w-3xl' | 'max-w-4xl' | 'max-w-5xl';
}): JSX.Element {
  return (
    <main className="min-h-screen bg-bg text-text px-6 py-10 sm:px-10">
      <div className={`mx-auto ${width}`}>{children}</div>
    </main>
  );
}
