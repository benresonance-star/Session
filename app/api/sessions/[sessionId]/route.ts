import { NextResponse } from 'next/server';

import { safeServiceErrorMessage } from '@/lib/safe-service-error';
import { createSupabaseAdmin } from '@/lib/supabase/admin';

const TABLE = 'session_definitions';

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ sessionId: string }> }
): Promise<NextResponse> {
  const { sessionId: rawId } = await context.params;
  const sessionId = rawId?.trim() ?? '';
  if (!sessionId) {
    return NextResponse.json({ error: 'Missing session id.' }, { status: 400 });
  }

  const client = createSupabaseAdmin();
  if (!client) {
    return NextResponse.json(
      { error: 'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local.' },
      { status: 503 }
    );
  }

  const { error } = await client.from(TABLE).delete().eq('session_id', sessionId);

  if (error) {
    return NextResponse.json(
      { error: safeServiceErrorMessage(error.message) || 'Supabase request failed.' },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
