import { NextResponse } from 'next/server';

import {
  isSessionStoreUnavailableError,
  sessionStoreErrorMessage,
  upsertStoredSession
} from '@/lib/session-store';
import { validateSessionDefinition } from '@/lib/session-validation';
import type { SessionDefinition } from '@/types/session';

export async function PUT(request: Request): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const validation = validateSessionDefinition(body);
  if (!validation.isValid) {
    return NextResponse.json({ errors: validation.errors }, { status: 400 });
  }

  try {
    await upsertStoredSession(body as SessionDefinition);
  } catch (error) {
    const message = sessionStoreErrorMessage(error);
    const status = isSessionStoreUnavailableError(error) ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }

  return NextResponse.json({ ok: true });
}
