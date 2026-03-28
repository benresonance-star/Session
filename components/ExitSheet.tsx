'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo } from 'react';
import { clearPausedSession, setPausedSession } from '@/lib/session-pause-storage';

function parsePlanIndex(atParam: string | undefined): number {
  if (atParam == null || atParam === '') {
    return 0;
  }
  const n = Number.parseInt(atParam, 10);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export function ExitSheet({
  sessionId,
  atParam
}: {
  sessionId: string;
  atParam?: string;
}): JSX.Element {
  const router = useRouter();
  const planIndex = useMemo(() => parsePlanIndex(atParam), [atParam]);

  const playHref = `/play/${encodeURIComponent(sessionId)}?at=${planIndex}`;

  function handleResumeLater(): void {
    setPausedSession(sessionId, planIndex);
    router.push('/home');
  }

  function handleEndSession(): void {
    clearPausedSession(sessionId);
    router.push('/home');
  }

  return (
    <main className="min-h-screen bg-bg text-text px-6 py-10 sm:px-10">
      <div className="mx-auto max-w-xl pt-24 text-center">
        <h1 className="text-title">exit session?</h1>
        <div className="mt-12 space-y-6 text-2xl">
          <div>
            <button type="button" onClick={handleResumeLater} className="text-text hover:text-next">
              resume later
            </button>
          </div>
          <div>
            <button type="button" onClick={handleEndSession} className="text-text hover:text-text">
              end session
            </button>
          </div>
          <div>
            <Link href={playHref} className="text-muted hover:text-text">
              cancel
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
