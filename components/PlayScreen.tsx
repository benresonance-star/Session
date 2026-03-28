'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { PlaybackPlan, PlaybackStep } from '@/types/playback';

function getNextExerciseTitle(steps: PlaybackPlan['steps'], startIndex: number): string | null {
  for (let i = startIndex + 1; i < steps.length; i += 1) {
    const step = steps[i];
    if (step.type === 'exercise') return step.exercise.title;
  }
  return null;
}

export function PlayScreen({ plan }: { plan: PlaybackPlan }): JSX.Element {
  const [index, setIndex] = useState(0);
  const step = plan.steps[index];
  const nextTitle = useMemo(() => getNextExerciseTitle(plan.steps, index), [plan.steps, index]);

  if (!step) return <main className="min-h-screen bg-bg text-text p-10">No step found.</main>;

  if (step.type === 'rest') {
    return (
      <main className="min-h-screen bg-bg text-text px-6 py-10 sm:px-10">
        <div className="mx-auto max-w-xl">
          <div className="flex items-center justify-between text-sm text-muted">
            <Link href={`/exit?sessionId=${plan.session_id}`} className="hover:text-text">← exit</Link>
            <div>rest</div>
            <div />
          </div>

          <div className="mt-24 text-center text-6xl font-semibold tracking-tight">00:{String(step.duration_seconds).padStart(2, '0')}</div>

          <div className="mt-24 border-t border-line pt-6">
            <div className="text-sm uppercase tracking-wide-ui text-next">next</div>
            <div className="mt-3 text-2xl">{nextTitle ?? 'Session complete'}</div>
          </div>

          <button onClick={() => setIndex(index + 1)} className="mt-10 text-lg text-text">[ skip ]</button>
        </div>
      </main>
    );
  }

  if (step.type !== 'exercise') {
    return (
      <main className="min-h-screen bg-bg text-text px-6 py-10 sm:px-10">
        <div className="mx-auto max-w-xl">
          <div className="text-muted">Transition step</div>
          <button onClick={() => setIndex(index + 1)} className="mt-6 text-text">[ next ]</button>
        </div>
      </main>
    );
  }

  const prescription = step.exercise.prescription.mode === 'reps'
    ? `${step.exercise.prescription.reps} reps`
    : step.exercise.prescription.mode === 'rep_range'
      ? `${step.exercise.prescription.min_reps}-${step.exercise.prescription.max_reps} reps`
      : `${step.exercise.prescription.seconds}s`;

  const load = 'load' in step.exercise.equipment && step.exercise.equipment.load
    ? ` @ ${step.exercise.equipment.load.value} ${step.exercise.equipment.load.unit}`
    : '';

  return (
    <main className="min-h-screen bg-bg text-text px-6 py-10 sm:px-10">
      <div className="mx-auto max-w-xl">
        <div className="flex items-center justify-between text-sm text-muted">
          <Link href={`/exit?sessionId=${plan.session_id}`} className="hover:text-text">← exit</Link>
          <div>{step.stage_title?.toUpperCase()} — {step.section_title?.toUpperCase()}</div>
          <div>
            {step.round_index && step.round_total ? `round ${step.round_index} / ${step.round_total}` : ''}
            {step.set_index && step.set_total ? `set ${step.set_index} / ${step.set_total}` : ''}
          </div>
        </div>

        <div className="mt-24">
          <h1 className="text-display">{step.exercise.title}</h1>
          <Link href={`/edit/${plan.session_id}/${step.exercise.exercise_id}`} className="mt-4 inline-block text-title text-muted hover:text-adjust transition-colors">
            {prescription}{load}
          </Link>
          <div className="mt-3 text-sm text-adjust">tap to adjust</div>
        </div>

        <button onClick={() => setIndex(index + 1)} className="mt-20 text-2xl text-text">[ complete ]</button>

        <div className="mt-24 border-t border-line pt-6">
          <div className="text-sm uppercase tracking-wide-ui text-next">next</div>
          <div className="mt-3 text-2xl">{nextTitle ?? 'Session complete'}</div>
        </div>
      </div>
    </main>
  );
}
