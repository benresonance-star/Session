import { NextResponse } from 'next/server';

import { getGlobalLcdTuning, saveGlobalLcdTuning } from '@/lib/lcd-tuning-repository';
import { resolveLcdTuningValues } from '@/lib/ui-skin';

export async function GET(): Promise<NextResponse> {
  const values = await getGlobalLcdTuning();
  return NextResponse.json(values);
}

export async function PUT(request: Request): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const values = resolveLcdTuningValues(body);
  const result = await saveGlobalLcdTuning(values);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(result.values);
}
