import { notFound } from 'next/navigation';
import { PlayScreen } from '@/components/PlayScreen';
import { compilePlaybackPlan } from '@/lib/playback-compiler';
import { getSession } from '@/lib/session-repository';

export default async function PlayPage({ params }: { params: Promise<{ id: string }> }): Promise<JSX.Element> {
  const { id } = await params;
  const session = await getSession(id);

  if (!session) {
    notFound();
  }

  const plan = compilePlaybackPlan(session);
  return <PlayScreen plan={plan} />;
}
