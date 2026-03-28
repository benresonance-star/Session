import { notFound } from 'next/navigation';
import { AdjustScreen } from '@/components/AdjustScreen';
import { getSeedSession } from '@/lib/session-repository';

export default async function EditExercisePage({
  params
}: {
  params: Promise<{ sessionId: string; exerciseId: string }>;
}): Promise<JSX.Element> {
  const { sessionId, exerciseId } = await params;
  const session = getSeedSession(sessionId);

  if (!session) {
    notFound();
  }

  const exercise = session.stages
    .flatMap((stage) => stage.sections ?? [])
    .flatMap((section) => section.blocks)
    .flatMap((block) => ('exercises' in block ? block.exercises : block.exercise_pairs.flatMap((pair) => pair)))
    .find((item) => item.exercise_id === exerciseId);

  if (!exercise) {
    return <main className="min-h-screen bg-bg text-text p-10">Exercise not found.</main>;
  }

  return <AdjustScreen sessionId={sessionId} exercise={exercise} />;
}
