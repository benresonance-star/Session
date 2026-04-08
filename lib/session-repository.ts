import 'server-only';

import sampleSession from '@/data/sample-session.json';
import { normalizeSession } from '@/lib/normalize';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import type { SessionDefinition } from '@/types/session';

const TABLE = 'session_definitions';

const fallbackSessions: SessionDefinition[] = [sampleSession as SessionDefinition];

function safeNormalize(session: SessionDefinition): SessionDefinition {
  try {
    return normalizeSession(structuredClone(session)) as SessionDefinition;
  } catch {
    return structuredClone(session);
  }
}

function cloneFallbackList(): SessionDefinition[] {
  return fallbackSessions.map((session) => safeNormalize(session));
}

function cloneFallbackSession(sessionId: string): SessionDefinition | null {
  const session = fallbackSessions.find((item) => item.session_id === sessionId);
  return session ? safeNormalize(session) : null;
}

export async function listSessions(): Promise<SessionDefinition[]> {
  const client = createSupabaseAdmin();
  if (!client) {
    return cloneFallbackList();
  }

  const { data, error } = await client
    .from(TABLE)
    .select('payload')
    .order('sort_order', { ascending: true })
    .order('title', { ascending: true });

  if (error) {
    return cloneFallbackList();
  }

  if (!data?.length) {
    return [];
  }

  return data
    .filter((row) => row.payload != null && typeof row.payload === 'object')
    .map((row) => safeNormalize(row.payload as SessionDefinition));
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

  if (data.payload == null || typeof data.payload !== 'object') {
    return cloneFallbackSession(sessionId);
  }

  return safeNormalize(data.payload as SessionDefinition);
}
