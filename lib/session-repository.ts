import sampleSession from '@/data/sample-session.json';
import { createEmptySession } from '@/lib/session-builder';
import type { SessionDefinition } from '@/types/session';

const seededSessions: SessionDefinition[] = [sampleSession as SessionDefinition];

export function listSeedSessions(): SessionDefinition[] {
  return seededSessions.map((session) => structuredClone(session));
}

export function getSeedSession(sessionId: string): SessionDefinition | null {
  const session = seededSessions.find((item) => item.session_id === sessionId);
  return session ? structuredClone(session) : null;
}

export function createNewSessionDraft(): SessionDefinition {
  const draft = createEmptySession();
  draft.tags = ['draft'];
  draft.duration_minutes = 30;
  return draft;
}
