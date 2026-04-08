import { notFound } from 'next/navigation';
import { AdjustScreen } from '@/components/AdjustScreen';
import { findExerciseInSession } from '@/lib/session-apply';
import { getSession } from '@/lib/session-repository';

export default async function EditExercisePage({
  params,
  searchParams
}: {
  params: Promise<{ sessionId: string; exerciseId: string }>;
  searchParams: Promise<{ returnStep?: string }>;
}): Promise<JSX.Element> {
  const { sessionId, exerciseId } = await params;
  const { returnStep: returnStepRaw } = await searchParams;
  const session = await getSession(sessionId);

  if (!session) {
    notFound();
  }

  const exercise = findExerciseInSession(session, exerciseId);

  if (!exercise) {
    notFound();
  }

  const parsed = returnStepRaw != null ? Number.parseInt(returnStepRaw, 10) : NaN;
  const resumeStepIndex =
    Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;

  return (
    <AdjustScreen
      sessionId={sessionId}
      session={session}
      exercise={exercise}
      resumeStepIndex={resumeStepIndex}
    />
  );
}
