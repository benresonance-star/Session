import { notFound } from 'next/navigation';
import { PlayScreen } from '@/components/PlayScreen';
import { compilePlaybackPlan } from '@/lib/playback-compiler';
import { getSession } from '@/lib/session-repository';

export default async function PlayPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ at?: string }>;
}): Promise<JSX.Element> {
  const { id } = await params;
  const { at } = await searchParams;
  const session = await getSession(id);

  if (!session) {
    notFound();
  }

  const plan = compilePlaybackPlan(session);
  const parsed = at != null ? Number.parseInt(at, 10) : NaN;
  const last = Math.max(0, plan.steps.length - 1);
  const initialStepIndex =
    Number.isFinite(parsed) && parsed >= 0 ? Math.min(parsed, last) : 0;

  const restoreTimers = at != null && String(at).length > 0;

  return (
    <PlayScreen plan={plan} initialStepIndex={initialStepIndex} restoreTimers={restoreTimers} />
  );
}
