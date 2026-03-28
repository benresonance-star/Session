'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PlaybackPlan, RestStep } from '@/types/playback';

function formatRestCountdown(totalSeconds: number): string {
  const safe = Math.max(0, totalSeconds);
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function RestPanel({
  step,
  sessionId,
  nextTitle,
  onComplete
}: {
  step: RestStep;
  sessionId: string;
  nextTitle: string | null;
  onComplete: () => void;
}): JSX.Element {
  const [remaining, setRemaining] = useState(() =>
    Math.max(0, step.duration_seconds)
  );
  const finishedRef = useRef(false);

  useEffect(() => {
    if (remaining <= 0) {
      if (!finishedRef.current) {
        finishedRef.current = true;
        queueMicrotask(() => {
          onComplete();
        });
      }
      return;
    }
    const t = window.setTimeout(() => {
      setRemaining((r) => r - 1);
    }, 1000);
    return () => window.clearTimeout(t);
  }, [remaining, onComplete]);

  return (
    <main className="min-h-screen bg-bg text-text px-6 py-10 sm:px-10">
      <div className="mx-auto max-w-xl">
        <div className="flex items-center justify-between text-sm text-muted">
          <Link href={`/exit?sessionId=${sessionId}`} className="hover:text-text">← exit</Link>
          <div>rest</div>
          <div />
        </div>

        <div className="mt-24 text-center text-6xl font-semibold tracking-tight">
          {formatRestCountdown(remaining)}
        </div>

        <div className="mt-24 border-t border-line pt-6">
          <div className="text-sm uppercase tracking-wide-ui text-next">next</div>
          <div className="mt-3 text-2xl">{nextTitle ?? 'Session complete'}</div>
        </div>

        <button type="button" onClick={onComplete} className="mt-10 text-lg text-text">
          [ skip ]
        </button>
      </div>
    </main>
  );
}

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
  const advanceAfterRest = useCallback(() => {
    setIndex((i) => i + 1);
  }, []);

  if (!step) {
    const empty = plan.steps.length === 0;
    return (
      <Link
        href="/home"
        className="flex min-h-screen w-full cursor-pointer flex-col items-center justify-center bg-bg px-6 py-10 text-center text-text"
      >
        {empty ? (
          <>
            <h1 className="text-display">Nothing to play</h1>
            <p className="mt-6 text-title text-muted">Tap anywhere to return home</p>
          </>
        ) : (
          <>
            <h1 className="text-display">CONGRATULATIONS</h1>
            <p className="mt-6 text-2xl font-medium tracking-tight text-text">Session completed</p>
            <p className="mt-10 text-sm text-muted">Tap anywhere to continue</p>
          </>
        )}
      </Link>
    );
  }

  if (step.type === 'rest') {
    return (
      <RestPanel
        key={`${index}-${step.step_id}`}
        step={step}
        sessionId={plan.session_id}
        nextTitle={nextTitle}
        onComplete={advanceAfterRest}
      />
    );
  }

  if (step.type !== 'exercise') {
    throw new Error(`Unexpected playback step type: ${step.type}`);
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
