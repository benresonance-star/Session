const SESSION_PAUSE_SNAPSHOT_V = 1 as const;

const STORAGE_KEY_PREFIX = 'workoutSessionPause:';

function storageKey(sessionId: string): string {
  return `${STORAGE_KEY_PREFIX}${sessionId}`;
}

/** Prefix for `storage` event filtering (other tabs). */
export function sessionPauseStorageKeyPrefix(): string {
  return STORAGE_KEY_PREFIX;
}

function normalizeAt(at: number): number | null {
  if (!Number.isFinite(at) || at < 0 || !Number.isInteger(at)) {
    return null;
  }
  return at;
}

export function setPausedSession(sessionId: string, at: number): void {
  const n = normalizeAt(at);
  if (n == null) {
    return;
  }
  if (typeof window === 'undefined') {
    return;
  }
  try {
    localStorage.setItem(storageKey(sessionId), JSON.stringify({ v: SESSION_PAUSE_SNAPSHOT_V, at: n }));
  } catch {
    /* ignore quota / private mode */
  }
}

export function getPausedStep(sessionId: string): number | null {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    const raw = localStorage.getItem(storageKey(sessionId));
    if (!raw) {
      return null;
    }
    const o = JSON.parse(raw) as unknown;
    if (!o || typeof o !== 'object') {
      return null;
    }
    const rec = o as Record<string, unknown>;
    if (rec.v !== SESSION_PAUSE_SNAPSHOT_V || typeof rec.at !== 'number') {
      return null;
    }
    return normalizeAt(rec.at);
  } catch {
    return null;
  }
}

export function clearPausedSession(sessionId: string): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    localStorage.removeItem(storageKey(sessionId));
  } catch {
    /* ignore */
  }
}
