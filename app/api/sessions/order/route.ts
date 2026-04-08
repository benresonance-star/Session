import { NextResponse } from 'next/server';

import {
  isSessionStoreUnavailableError,
  isSessionStoreValidationError,
  reorderStoredSessions,
  sessionStoreErrorMessage
} from '@/lib/session-store';

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

export async function PATCH(request: Request): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  if (!body || typeof body !== 'object' || !('session_ids' in body)) {
    return NextResponse.json({ error: 'Body must include session_ids array.' }, { status: 400 });
  }

  const raw = (body as { session_ids: unknown }).session_ids;
  if (!Array.isArray(raw) || !raw.every(isNonEmptyString)) {
    return NextResponse.json({ error: 'session_ids must be a non-empty array of non-empty strings.' }, { status: 400 });
  }

  const sessionIds = raw as string[];
  if (new Set(sessionIds).size !== sessionIds.length) {
    return NextResponse.json({ error: 'session_ids must not contain duplicates.' }, { status: 400 });
  }

  try {
    await reorderStoredSessions(sessionIds);
  } catch (error) {
    const message = sessionStoreErrorMessage(error);
    const status = isSessionStoreUnavailableError(error)
      ? 503
      : isSessionStoreValidationError(error)
        ? 400
        : 500;
    return NextResponse.json({ error: message }, { status });
  }

  return NextResponse.json({ ok: true });
}
