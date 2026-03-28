import type { SessionDefinition } from '@/types/session';

export function createSessionVariant(
  session: SessionDefinition,
  newSessionId: string,
  newTitle: string
): SessionDefinition {
  const copy = structuredClone(session);
  copy.session_id = newSessionId;
  copy.title = newTitle;
  return copy;
}
