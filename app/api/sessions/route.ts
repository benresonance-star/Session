import { NextResponse } from 'next/server';

import { safeServiceErrorMessage } from '@/lib/safe-service-error';
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

  const { data: existing } = await client.from(TABLE).select('sort_order').eq('session_id', session.session_id).maybeSingle();

  let sortOrder: number;
  if (existing && typeof existing.sort_order === 'number') {
    sortOrder = existing.sort_order;
  } else {
    const { data: maxRow } = await client
      .from(TABLE)
      .select('sort_order')
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle();
    sortOrder = (typeof maxRow?.sort_order === 'number' ? maxRow.sort_order : -1) + 1;
  }

  const { error } = await client.from(TABLE).upsert(
    {
      session_id: session.session_id,
      title: session.title,
      payload: session,
      sort_order: sortOrder,
      updated_at: new Date().toISOString()
    },
    { onConflict: 'session_id' }
  );

  if (error) {
    return NextResponse.json({ error: safeServiceErrorMessage(error.message) || 'Supabase request failed.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
