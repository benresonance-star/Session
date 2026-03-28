import 'server-only';

import sampleSession from '@/data/sample-session.json';
import { createEmptySession } from '@/lib/session-builder';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import type { SessionDefinition } from '@/types/session';

const TABLE = 'session_definitions';

const fallbackSessions: SessionDefinition[] = [sampleSession as SessionDefinition];

function cloneFallbackList(): SessionDefinition[] {
  return fallbackSessions.map((session) => structuredClone(session));
}

function cloneFallbackSession(sessionId: string): SessionDefinition | null {
  const session = fallbackSessions.find((item) => item.session_id === sessionId);
  return session ? structuredClone(session) : null;
}

export function createNewSessionDraft(): SessionDefinition {
  const draft = createEmptySession();
  draft.tags = ['draft'];
  draft.duration_minutes = 30;
  return draft;
}

export async function listSessions(): Promise<SessionDefinition[]> {
  const client = createSupabaseAdmin();
  if (!client) {
    return cloneFallbackList();
  }

  const { data, error } = await client.from(TABLE).select('payload').order('title', { ascending: true });

  if (error) {
    return cloneFallbackList();
  }

  if (!data?.length) {
    return [];
  }

  return data.map((row) => structuredClone(row.payload as SessionDefinition));
}

export async function getSession(sessionId: string): Promise<SessionDefinition | null> {
  const client = createSupabaseAdmin();
  if (!client) {
    return cloneFallbackSession(sessionId);
  }

  const { data, error } = await client.from(TABLE).select('payload').eq('session_id', sessionId).maybeSingle();

  if (error || !data) {
    return cloneFallbackSession(sessionId);
  }

  return structuredClone(data.payload as SessionDefinition);
}
