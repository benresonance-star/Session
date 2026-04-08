import 'server-only';

import sampleSession from '@/data/sample-session.json';
import { normalizeSession } from '@/lib/normalize';
import {
  getStoredSession,
  isSessionStoreUnavailableError,
  listStoredSessions
} from '@/lib/session-store';
import type { NormalizedSessionDefinition, SessionDefinition } from '@/types/session';

const fallbackSessions: NormalizedSessionDefinition[] = [sampleSession as SessionDefinition].map((session) => getFallbackSession(session));

function getFallbackSession(session: SessionDefinition): NormalizedSessionDefinition {
  return normalizeSession(structuredClone(session));
}

function cloneFallbackList(): NormalizedSessionDefinition[] {
  return fallbackSessions.map((session) => structuredClone(session));
}

function cloneFallbackSession(sessionId: string): NormalizedSessionDefinition | null {
  const session = fallbackSessions.find((item) => item.session_id === sessionId);
  return session ? structuredClone(session) : null;
}

export async function listSessions(): Promise<NormalizedSessionDefinition[]> {
  try {
    return await listStoredSessions();
  } catch (error) {
    if (isSessionStoreUnavailableError(error)) {
      return cloneFallbackList();
    }
    throw error;
  }
}

export async function getSession(sessionId: string): Promise<NormalizedSessionDefinition | null> {
  try {
    return await getStoredSession(sessionId);
  } catch (error) {
    if (isSessionStoreUnavailableError(error)) {
      return cloneFallbackSession(sessionId);
    }
    throw error;
  }
}
