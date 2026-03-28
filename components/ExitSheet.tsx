'use client';

import Link from 'next/link';

export function ExitSheet({ sessionId }: { sessionId: string }): JSX.Element {
  return (
    <main className="min-h-screen bg-bg text-text px-6 py-10 sm:px-10">
      <div className="mx-auto max-w-xl pt-24 text-center">
        <h1 className="text-title">exit session?</h1>
        <div className="mt-12 space-y-6 text-2xl">
          <div>
            <Link href={`/play/${sessionId}`} className="text-text hover:text-next">resume later</Link>
          </div>
          <div>
            <Link href="/home" className="text-text hover:text-text">end session</Link>
          </div>
          <div>
            <Link href={`/play/${sessionId}`} className="text-muted hover:text-text">cancel</Link>
          </div>
        </div>
      </div>
    </main>
  );
}
