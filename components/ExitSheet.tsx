'use client';
import { useRouter } from 'next/navigation';
import { useMemo } from 'react';
import { LcdRule, LcdTransportButton, LcdTransportLink } from '@/components/ui/LcdChrome';
import { PageShell } from '@/components/ui/PageShell';
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
    <PageShell width="max-w-3xl" className="text-center">
      <div className="pt-24">
        <h1 className="skin-display skin-display-live skin-ghost text-title">exit session?</h1>
        <LcdRule className="mt-8" />
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <LcdTransportButton type="button" onClick={handleResumeLater}>
            resume
          </LcdTransportButton>
          <LcdTransportButton type="button" onClick={handleEndSession}>
            end
          </LcdTransportButton>
          <LcdTransportLink href={playHref}>cancel</LcdTransportLink>
        </div>
      </div>
    </PageShell>
  );
}
