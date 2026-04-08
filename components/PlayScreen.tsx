'use client';

import Link from 'next/link';
import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import {
  CircuitTimePanel,
  ExercisePanel,
  RestPanel,
  TimedExercisePanel
} from '@/components/playback/PlaybackPanels';
import { LcdRule } from '@/components/ui/LcdChrome';
import { getNextExerciseTitle } from '@/lib/playback-display';
import { clearPlayTimerStorage } from '@/lib/playback-timer-storage';
import { clearPausedSession } from '@/lib/session-pause-storage';
import type { PlaybackPlan } from '@/types/playback';

export function PlayScreen({
  plan,
  initialStepIndex = 0,
  restoreTimers
}: {
  plan: PlaybackPlan;
  initialStepIndex?: number;
  /** True when URL had `at` (e.g. return from adjust); skip clearing sessionStorage snapshots. */
  restoreTimers: boolean;
}): JSX.Element {
  const [playStorageReady, setPlayStorageReady] = useState(false);

  useLayoutEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    if (!restoreTimers) {
      clearPlayTimerStorage(plan.session_id);
    }
    queueMicrotask(() => {
      setPlayStorageReady(true);
    });
  }, [plan.session_id, restoreTimers]);

  const [index, setIndex] = useState(() => initialStepIndex);
  const step = plan.steps[index];
  const nextTitle = useMemo(() => getNextExerciseTitle(plan.steps, index), [plan.steps, index]);

  const advancePlanStep = useCallback(() => {
    setIndex((current) => current + 1);
  }, []);

  const goBack = useCallback(() => {
    setIndex((current) => Math.max(0, current - 1));
  }, []);

  useEffect(() => {
    if (plan.steps.length === 0 || index < plan.steps.length) {
      return;
    }
    clearPausedSession(plan.session_id);
  }, [plan.session_id, plan.steps.length, index]);

  if (!playStorageReady) {
    return <div className="skin-page min-h-screen" aria-busy="true" />;
  }

  if (!step) {
    const empty = plan.steps.length === 0;
    return (
      <Link
        href="/home"
        className="skin-page flex min-h-screen w-full cursor-pointer items-center justify-center px-6 py-10 text-center text-text"
      >
        <div className="skin-screen w-full max-w-3xl py-16">
          {empty ? (
            <>
              <h1 className="skin-display skin-display-heading skin-display-live skin-ghost text-display">Nothing to play</h1>
              <LcdRule className="mt-8" />
              <p className="mt-8 text-2xl text-muted">Tap anywhere to return home</p>
            </>
          ) : (
            <>
              <h1 className="skin-display skin-display-heading skin-display-live skin-ghost text-display">Congratulations</h1>
              <LcdRule className="mt-8" />
              <p className="skin-digit skin-digit-live skin-ghost mt-8 text-6xl leading-none text-text sm:text-7xl">clear</p>
              <p className="mt-8 text-2xl text-muted">Tap anywhere to continue</p>
            </>
          )}
        </div>
      </Link>
    );
  }

  if (step.type === 'rest') {
    return (
      <RestPanel
        key={`${index}-${step.step_id}`}
        step={step}
        sessionId={plan.session_id}
        planIndex={index}
        restoreTimers={restoreTimers}
        nextTitle={nextTitle}
        onComplete={advancePlanStep}
        canGoBack={index > 0}
        onBack={goBack}
      />
    );
  }

  if (step.type === 'circuit_time_play') {
    return (
      <CircuitTimePanel
        key={`${index}-${step.step_id}`}
        step={step}
        sessionId={plan.session_id}
        plan={plan}
        planIndex={index}
        restoreTimers={restoreTimers}
        onAdvancePlan={advancePlanStep}
        canGoBack={index > 0}
        onBack={goBack}
      />
    );
  }

  if (step.exercise.prescription.mode === 'time') {
    return (
      <TimedExercisePanel
        key={`${index}-${step.step_id}-time-${step.exercise.prescription.seconds}`}
        step={step}
        sessionId={plan.session_id}
        planIndex={index}
        restoreTimers={restoreTimers}
        nextTitle={nextTitle}
        onComplete={advancePlanStep}
        canGoBack={index > 0}
        onBack={goBack}
        sessionLink={plan.session_link}
      />
    );
  }

  return (
    <ExercisePanel
      step={step}
      sessionId={plan.session_id}
      planIndex={index}
      nextTitle={nextTitle}
      onComplete={advancePlanStep}
      canGoBack={index > 0}
      onBack={goBack}
      sessionLink={plan.session_link}
    />
  );
}
