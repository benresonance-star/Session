import 'server-only';

import { normalizeSession } from '@/lib/normalize';
import { safeServiceErrorMessage } from '@/lib/safe-service-error';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { prepareSessionForPersistence } from '@/lib/session-validation';
import type { NormalizedSessionDefinition, SessionDefinition } from '@/types/session';

export const SESSION_DEFINITIONS_TABLE = 'session_definitions';

const INVALID_SESSION_PAYLOAD_MESSAGE = 'Stored session payload is invalid.';

export class SessionStoreUnavailableError extends Error {
  constructor(message = 'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local.') {
    super(message);
    this.name = 'SessionStoreUnavailableError';
  }
}

export class SessionStoreError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SessionStoreError';
  }
}

export class SessionStoreValidationError extends SessionStoreError {
  constructor(message: string) {
    super(message);
    this.name = 'SessionStoreValidationError';
  }
}

function getClient() {
  const client = createSupabaseAdmin();
  if (!client) {
    throw new SessionStoreUnavailableError();
  }
  return client;
}

function normalizeStoredSession(payload: unknown): NormalizedSessionDefinition {
  if (payload == null || typeof payload !== 'object') {
    throw new SessionStoreError(INVALID_SESSION_PAYLOAD_MESSAGE);
  }

  try {
    return normalizeSession(structuredClone(payload as SessionDefinition));
  } catch {
    throw new SessionStoreError(INVALID_SESSION_PAYLOAD_MESSAGE);
  }
}

export function isSessionStoreUnavailableError(error: unknown): error is SessionStoreUnavailableError {
  return error instanceof SessionStoreUnavailableError;
}

export function isSessionStoreValidationError(error: unknown): error is SessionStoreValidationError {
  return error instanceof SessionStoreValidationError;
}

export function sessionStoreErrorMessage(error: unknown, fallback = 'Supabase request failed.'): string {
  if (error instanceof SessionStoreUnavailableError || error instanceof SessionStoreError) {
    return error.message;
  }
  if (error instanceof Error) {
    return safeServiceErrorMessage(error.message) || fallback;
  }
  return fallback;
}

export async function listStoredSessions(): Promise<NormalizedSessionDefinition[]> {
  const client = getClient();
  const { data, error } = await client
    .from(SESSION_DEFINITIONS_TABLE)
    .select('payload')
    .order('sort_order', { ascending: true })
    .order('title', { ascending: true });

  if (error) {
    throw new SessionStoreError(safeServiceErrorMessage(error.message) || 'Supabase request failed.');
  }

  return (data ?? []).map((row) => normalizeStoredSession(row.payload));
}

export async function getStoredSession(sessionId: string): Promise<NormalizedSessionDefinition | null> {
  const client = getClient();
  const { data, error } = await client
    .from(SESSION_DEFINITIONS_TABLE)
    .select('payload')
    .eq('session_id', sessionId)
    .maybeSingle();

  if (error) {
    throw new SessionStoreError(safeServiceErrorMessage(error.message) || 'Supabase request failed.');
  }
  if (!data) {
    return null;
  }

  return normalizeStoredSession(data.payload);
}

export async function upsertStoredSession(session: SessionDefinition): Promise<void> {
  const client = getClient();
  const prepared = prepareSessionForPersistence(session);

  const { data: existing, error: existingError } = await client
    .from(SESSION_DEFINITIONS_TABLE)
    .select('sort_order')
    .eq('session_id', prepared.session_id)
    .maybeSingle();

  if (existingError) {
    throw new SessionStoreError(safeServiceErrorMessage(existingError.message) || 'Supabase request failed.');
  }

  let sortOrder: number;
  if (existing && typeof existing.sort_order === 'number') {
    sortOrder = existing.sort_order;
  } else {
    const { data: maxRow, error: maxRowError } = await client
      .from(SESSION_DEFINITIONS_TABLE)
      .select('sort_order')
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (maxRowError) {
      throw new SessionStoreError(safeServiceErrorMessage(maxRowError.message) || 'Supabase request failed.');
    }

    sortOrder = (typeof maxRow?.sort_order === 'number' ? maxRow.sort_order : -1) + 1;
  }

  const { error } = await client.from(SESSION_DEFINITIONS_TABLE).upsert(
    {
      session_id: prepared.session_id,
      title: prepared.title,
      payload: prepared,
      sort_order: sortOrder,
      updated_at: new Date().toISOString()
    },
    { onConflict: 'session_id' }
  );

  if (error) {
    throw new SessionStoreError(safeServiceErrorMessage(error.message) || 'Supabase request failed.');
  }
}

export async function deleteStoredSession(sessionId: string): Promise<void> {
  const client = getClient();
  const { error } = await client.from(SESSION_DEFINITIONS_TABLE).delete().eq('session_id', sessionId);

  if (error) {
    throw new SessionStoreError(safeServiceErrorMessage(error.message) || 'Supabase request failed.');
  }
}

export async function reorderStoredSessions(sessionIds: string[]): Promise<void> {
  const client = getClient();
  const { data: rows, error: fetchError } = await client.from(SESSION_DEFINITIONS_TABLE).select('session_id');

  if (fetchError) {
    throw new SessionStoreError(safeServiceErrorMessage(fetchError.message) || 'Supabase request failed.');
  }

  const dbIds = new Set((rows ?? []).map((row) => row.session_id as string));
  if (sessionIds.length !== dbIds.size) {
    throw new SessionStoreValidationError('session_ids must include every session exactly once.');
  }

  for (const id of sessionIds) {
    if (!dbIds.has(id)) {
      throw new SessionStoreValidationError('Unknown session id.');
    }
  }

  for (const id of dbIds) {
    if (!sessionIds.includes(id)) {
      throw new SessionStoreValidationError('Missing session id.');
    }
  }

  const results = await Promise.all(
    sessionIds.map((session_id, index) =>
      client.from(SESSION_DEFINITIONS_TABLE).update({ sort_order: index }).eq('session_id', session_id)
    )
  );

  const failed = results.find((result) => result.error);
  if (failed?.error) {
    throw new SessionStoreError(safeServiceErrorMessage(failed.error.message) || 'Supabase request failed.');
  }
}
