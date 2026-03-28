import { createEmptySession } from '@/lib/session-builder';
import type { SessionDefinition } from '@/types/session';

export function createNewSessionDraft(): SessionDefinition {
  const draft = createEmptySession();
  draft.tags = ['draft'];
  draft.duration_minutes = 30;
  return draft;
}
