'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { clearPausedSession, getPausedStep, sessionPauseStorageKeyPrefix } from '@/lib/session-pause-storage';
import type { SessionDefinition } from '@/types/session';

export function usePausedSessions(items: SessionDefinition[]): {
  pausedBySession: Record<string, number>;
  resumePausedSession: (sessionId: string, at: number, onNavigate: (href: string) => void) => void;
  cancelPausedSession: (sessionId: string) => void;
} {
  const [storageVersion, setStorageVersion] = useState(0);

  const pausedBySession = useMemo(() => {
    void storageVersion;
    const next: Record<string, number> = {};
    for (const session of items) {
      const at = getPausedStep(session.session_id);
      if (at != null) {
        next[session.session_id] = at;
      }
    }
    return next;
  }, [items, storageVersion]);

  useEffect(() => {
    function onStorage(event: StorageEvent): void {
      if (!event.key?.startsWith(sessionPauseStorageKeyPrefix())) {
        return;
      }
      setStorageVersion((current) => current + 1);
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const resumePausedSession = useCallback((sessionId: string, at: number, onNavigate: (href: string) => void) => {
    clearPausedSession(sessionId);
    setStorageVersion((current) => current + 1);
    onNavigate(`/play/${encodeURIComponent(sessionId)}?at=${at}`);
  }, []);

  const cancelPausedSession = useCallback((sessionId: string) => {
    clearPausedSession(sessionId);
    setStorageVersion((current) => current + 1);
  }, []);

  return {
    pausedBySession,
    resumePausedSession,
    cancelPausedSession
  };
}
