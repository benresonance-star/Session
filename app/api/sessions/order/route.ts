import { NextResponse } from 'next/server';

import { safeServiceErrorMessage } from '@/lib/safe-service-error';
import { createSupabaseAdmin } from '@/lib/supabase/admin';

const TABLE = 'session_definitions';

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

export async function PATCH(request: Request): Promise<NextResponse> {
  const client = createSupabaseAdmin();
  if (!client) {
    return NextResponse.json(
      { error: 'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local.' },
      { status: 503 }
    );
  }

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

  const { data: rows, error: fetchError } = await client.from(TABLE).select('session_id');

  if (fetchError) {
    return NextResponse.json(
      { error: safeServiceErrorMessage(fetchError.message) || 'Supabase request failed.' },
      { status: 500 }
    );
  }

  const dbIds = new Set((rows ?? []).map((r) => r.session_id as string));
  if (sessionIds.length !== dbIds.size) {
    return NextResponse.json({ error: 'session_ids must include every session exactly once.' }, { status: 400 });
  }

  for (const id of sessionIds) {
    if (!dbIds.has(id)) {
      return NextResponse.json({ error: 'Unknown session id.' }, { status: 400 });
    }
  }

  for (const id of dbIds) {
    if (!sessionIds.includes(id)) {
      return NextResponse.json({ error: 'Missing session id.' }, { status: 400 });
    }
  }

  const updates = sessionIds.map((session_id, index) =>
    client.from(TABLE).update({ sort_order: index }).eq('session_id', session_id)
  );

  const results = await Promise.all(updates);
  const failed = results.find((r) => r.error);
  if (failed?.error) {
    return NextResponse.json(
      { error: safeServiceErrorMessage(failed.error.message) || 'Supabase request failed.' },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
