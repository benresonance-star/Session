import { NextResponse } from 'next/server';

import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { validateSessionDefinition } from '@/lib/session-validation';
import type { SessionDefinition } from '@/types/session';

const TABLE = 'session_definitions';

export async function PUT(request: Request): Promise<NextResponse> {
  const client = createSupabaseAdmin();
  if (!client) {
    return NextResponse.json({ error: 'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local.' }, { status: 503 });
  }

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

  const session = body as SessionDefinition;
  const { error } = await client.from(TABLE).upsert(
    {
      session_id: session.session_id,
      title: session.title,
      payload: session,
      updated_at: new Date().toISOString()
    },
    { onConflict: 'session_id' }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
