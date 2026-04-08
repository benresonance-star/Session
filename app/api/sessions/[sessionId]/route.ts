import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';

import {
  deleteStoredSession,
  isSessionStoreUnavailableError,
  sessionStoreErrorMessage
} from '@/lib/session-store';

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ sessionId: string }> }
): Promise<NextResponse> {
  const { sessionId: rawId } = await context.params;
  const sessionId = rawId?.trim() ?? '';
  if (!sessionId) {
    return NextResponse.json({ error: 'Missing session id.' }, { status: 400 });
  }

  try {
    await deleteStoredSession(sessionId);
  } catch (error) {
    const message = sessionStoreErrorMessage(error);
    const status = isSessionStoreUnavailableError(error) ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }

  revalidatePath('/home');
  revalidatePath('/');

  return NextResponse.json({ ok: true });
}
