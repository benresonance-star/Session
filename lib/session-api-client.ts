'use client';

import { safeServiceErrorMessage } from '@/lib/safe-service-error';
import type { SessionDefinition } from '@/types/session';

interface SessionApiErrorPayload {
  errors?: string[];
  error?: string;
}

async function readErrorPayload(response: Response): Promise<SessionApiErrorPayload> {
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    return {};
  }
  return (await response.json().catch(() => ({}))) as SessionApiErrorPayload;
}

export async function saveSessionToServer(
  session: SessionDefinition
): Promise<{ ok: true } | { ok: false; status: number; messages: string[] }> {
  try {
    const response = await fetch('/api/sessions', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(session)
    });

    if (response.ok) {
      return { ok: true };
    }

    const payload = await readErrorPayload(response);
    if (payload.errors?.length) {
      return {
        ok: false,
        status: response.status,
        messages: payload.errors.map((error) => safeServiceErrorMessage(error))
      };
    }

    return {
      ok: false,
      status: response.status,
      messages: [safeServiceErrorMessage(payload.error) || `Save failed (${response.status}).`]
    };
  } catch {
    return {
      ok: false,
      status: 0,
      messages: ['Network error while saving.']
    };
  }
}

export async function deleteSessionFromServer(
  sessionId: string
): Promise<{ ok: true } | { ok: false; status: number; message: string }> {
  try {
    const response = await fetch(`/api/sessions/${encodeURIComponent(sessionId)}`, {
      method: 'DELETE'
    });

    if (response.ok) {
      return { ok: true };
    }

    const payload = await readErrorPayload(response);
    return {
      ok: false,
      status: response.status,
      message: safeServiceErrorMessage(payload.error) || `Delete failed (${response.status}).`
    };
  } catch {
    return {
      ok: false,
      status: 0,
      message: 'Network error while deleting.'
    };
  }
}

export async function reorderSessionsOnServer(
  sessionIds: string[]
): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    const response = await fetch('/api/sessions/order', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_ids: sessionIds })
    });

    if (response.ok) {
      return { ok: true };
    }

    const payload = await readErrorPayload(response);
    return {
      ok: false,
      message: safeServiceErrorMessage(payload.error) || `Order save failed (${response.status}).`
    };
  } catch {
    return {
      ok: false,
      message: 'Network error while saving order.'
    };
  }
}
