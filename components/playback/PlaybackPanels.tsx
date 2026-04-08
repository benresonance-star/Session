'use client';

import Link from 'next/link';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ExternalResourceLink } from '@/components/ui/ExternalResourceLink';
import { LcdLabel, LcdRule, LcdTransportButton, LcdTransportLink } from '@/components/ui/LcdChrome';
import { formatBlockCountdown, formatRestCountdown, getNextExerciseTitle } from '@/lib/playback-display';
import {
  clearTimerSnapshot,
  createCircuitTimerSnapshot,
  createExerciseTimeSnapshot,
  createRestTimerSnapshot,
  parseCircuitTimerSnapshot,
  parseExerciseTimeSnapshot,
  parseRestTimerSnapshot,
  playTimerKey
} from '@/lib/playback-timer-storage';
import {
  exerciseLoadText,
  exercisePrescriptionText,
  exerciseTargetMetric,
  formatSetMetric
} from '@/lib/session-display';
import type { CircuitTimePlayStep, ExerciseStep, PlaybackPlan, RestStep } from '@/types/playback';
import type { Exercise, ExerciseLink } from '@/types/session';

function exerciseCoachBlock(exercise: Exercise): JSX.Element | null {
  const coach = exercise.coach?.trim();
  if (!coach) {
    return null;
  }
  return <p className="mt-4 max-w-prose whitespace-pre-wrap text-xl leading-relaxed text-muted">{coach}</p>;
}

function LcdMetric({
  label,
  value
}: {
  label: string;
  value: string;
}): JSX.Element {
  return (
    <div className="min-w-0">
      <LcdLabel>{label}</LcdLabel>
      <div className="skin-digit skin-digit-live skin-ghost mt-1 text-4xl leading-none text-text sm:text-5xl">{value}</div>
    </div>
  );
}

function LcdInfoRow({
  label,
  value
}: {
  label: string;
  value: string;
}): JSX.Element {
  return (
    <div className="flex items-start gap-4 text-xl sm:text-2xl">
      <div className="skin-label w-20 shrink-0 text-[11px] text-muted sm:w-24">{label}</div>
      <div className="skin-display skin-display-live min-w-0 flex-1 text-text">{value}</div>
    </div>
  );
}

function PlaySessionReferenceLink({ link }: { link?: ExerciseLink }): JSX.Element | null {
  if (!link?.url?.trim()) {
    return null;
  }
  return (
    <div className="mt-3 flex justify-center px-2">
      <ExternalResourceLink
        link={link}
        className="skin-label max-w-full truncate text-center text-[11px] uppercase tracking-wide text-accent underline-offset-4 hover:underline"
      />
    </div>
  );
}

function ExerciseReferenceLink({ exercise }: { exercise: Exercise }): JSX.Element | null {
  if (!exercise.link?.url?.trim()) {
    return null;
  }
  return (
    <div className="mt-4 flex justify-center px-2">
      <ExternalResourceLink
        link={exercise.link}
        className="skin-label max-w-full truncate text-center text-[13px] text-muted underline-offset-4 hover:underline"
      />
    </div>
  );
}

function PlayModeNav({
  sessionId,
  planIndex,
  canGoBack,
  onBack
}: {
  sessionId: string;
  planIndex: number;
  canGoBack: boolean;
  onBack: () => void;
}): JSX.Element {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <LcdTransportLink href={`/exit?sessionId=${encodeURIComponent(sessionId)}&at=${planIndex}`}>
        exit
      </LcdTransportLink>
      {canGoBack ? (
        <LcdTransportButton type="button" onClick={onBack}>
          back
        </LcdTransportButton>
      ) : null}
    </div>
  );
}

export function RestPanel({
  step,
  sessionId,
  planIndex,
  restoreTimers,
  nextTitle,
  onComplete,
  canGoBack,
  onBack
}: {
  step: RestStep;
  sessionId: string;
  planIndex: number;
  restoreTimers: boolean;
  nextTitle: string | null;
  onComplete: () => void;
  canGoBack: boolean;
  onBack: () => void;
}): JSX.Element {
  const storageKey = playTimerKey(sessionId, planIndex, step.step_id);
  const [remaining, setRemaining] = useState(() => Math.max(0, step.duration_seconds));
  const finishedRef = useRef(false);

  const completeAndClear = useCallback(() => {
    clearTimerSnapshot(storageKey);
    onComplete();
  }, [onComplete, storageKey]);

  const restHydratedKeyRef = useRef<string | null>(null);
  const restPersistReadyRef = useRef(!restoreTimers);
  useLayoutEffect(() => {
    if (typeof window === 'undefined') {
      restPersistReadyRef.current = true;
      return;
    }
    if (!restoreTimers) {
      restPersistReadyRef.current = true;
      return;
    }
    if (restHydratedKeyRef.current === storageKey) {
      restPersistReadyRef.current = true;
      return;
    }
    restHydratedKeyRef.current = storageKey;
    const raw = sessionStorage.getItem(storageKey);
    if (!raw) {
      restPersistReadyRef.current = true;
      return;
    }
    const parsed = parseRestTimerSnapshot(raw, step);
    if (parsed != null) {
      queueMicrotask(() => {
        setRemaining(parsed);
        finishedRef.current = false;
        restPersistReadyRef.current = true;
      });
      return;
    }
    restPersistReadyRef.current = true;
  }, [restoreTimers, storageKey, step]);

  useEffect(() => {
    if (typeof window === 'undefined' || remaining <= 0 || !restPersistReadyRef.current) {
      return;
    }
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(createRestTimerSnapshot(step, remaining)));
    } catch {
      /* ignore */
    }
  }, [remaining, step, storageKey]);

  useEffect(() => {
    if (remaining <= 0) {
      if (!finishedRef.current) {
        finishedRef.current = true;
        queueMicrotask(() => {
          completeAndClear();
        });
      }
      return;
    }
    const timeout = window.setTimeout(() => {
      setRemaining((current) => current - 1);
    }, 1000);
    return () => window.clearTimeout(timeout);
  }, [completeAndClear, remaining]);

  return (
    <main className="skin-page min-h-screen px-6 py-10 sm:px-10">
      <div className="skin-screen mx-auto max-w-3xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <PlayModeNav sessionId={sessionId} planIndex={planIndex} canGoBack={canGoBack} onBack={onBack} />
          <LcdLabel>Rest</LcdLabel>
        </div>

        <div className="skin-digit skin-digit-live skin-ghost mt-10 text-center text-[5.5rem] leading-none text-text sm:text-[7rem]">
          {formatRestCountdown(remaining)}
        </div>

        <LcdRule className="mt-8" />
        <div className="mt-6">
          <LcdInfoRow label="Phase" value="REST" />
          <div className="mt-4">
            <LcdInfoRow label="Next" value={(nextTitle ?? 'SESSION COMPLETE').toUpperCase()} />
          </div>
        </div>

        <div className="mt-8 flex justify-center">
          <LcdTransportButton type="button" onClick={completeAndClear}>
            skip
          </LcdTransportButton>
        </div>
      </div>
    </main>
  );
}

export function TimedExercisePanel({
  step,
  sessionId,
  planIndex,
  restoreTimers,
  nextTitle,
  onComplete,
  canGoBack,
  onBack,
  sessionLink
}: {
  step: ExerciseStep;
  sessionId: string;
  planIndex: number;
  restoreTimers: boolean;
  nextTitle: string | null;
  onComplete: () => void;
  canGoBack: boolean;
  onBack: () => void;
  sessionLink?: ExerciseLink;
}): JSX.Element {
  if (step.exercise.prescription.mode !== 'time') {
    throw new Error('TimedExercisePanel requires time prescription');
  }

  const durationSeconds = step.exercise.prescription.seconds;
  const storageKey = playTimerKey(sessionId, planIndex, step.step_id);

  const [remaining, setRemaining] = useState(() => Math.max(0, durationSeconds));
  const [started, setStarted] = useState(false);
  const [paused, setPaused] = useState(false);
  const finishedRef = useRef(false);

  const completeAndClear = useCallback(() => {
    clearTimerSnapshot(storageKey);
    onComplete();
  }, [onComplete, storageKey]);

  const timeHydratedKeyRef = useRef<string | null>(null);
  const timePersistReadyRef = useRef(!restoreTimers);
  useLayoutEffect(() => {
    if (typeof window === 'undefined') {
      timePersistReadyRef.current = true;
      return;
    }
    if (!restoreTimers) {
      timePersistReadyRef.current = true;
      return;
    }
    if (timeHydratedKeyRef.current === storageKey) {
      timePersistReadyRef.current = true;
      return;
    }
    timeHydratedKeyRef.current = storageKey;
    const raw = sessionStorage.getItem(storageKey);
    if (!raw) {
      timePersistReadyRef.current = true;
      return;
    }
    const parsed = parseExerciseTimeSnapshot(raw, step);
    if (parsed) {
      queueMicrotask(() => {
        setRemaining(parsed.remaining);
        setStarted(parsed.started);
        setPaused(parsed.paused);
        finishedRef.current = false;
        timePersistReadyRef.current = true;
      });
      return;
    }
    timePersistReadyRef.current = true;
  }, [restoreTimers, storageKey, step]);

  useEffect(() => {
    if (typeof window === 'undefined' || (restoreTimers && !timePersistReadyRef.current)) {
      return;
    }
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(createExerciseTimeSnapshot(durationSeconds, remaining, started, paused)));
    } catch {
      /* ignore */
    }
  }, [durationSeconds, paused, remaining, restoreTimers, started, storageKey]);

  useEffect(() => {
    if (remaining > 0 || !started || paused) {
      return;
    }
    if (restoreTimers && !timePersistReadyRef.current) {
      return;
    }
    if (!finishedRef.current) {
      finishedRef.current = true;
      queueMicrotask(() => {
        completeAndClear();
      });
    }
  }, [completeAndClear, paused, remaining, restoreTimers, started]);

  useEffect(() => {
    if (remaining <= 0 || !started || paused) {
      return;
    }
    if (restoreTimers && !timePersistReadyRef.current) {
      return;
    }
    const timeout = window.setTimeout(() => {
      setRemaining((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearTimeout(timeout);
  }, [paused, remaining, restoreTimers, started]);

  return (
    <main className="skin-page min-h-screen px-6 py-10 sm:px-10">
      <div className="skin-screen mx-auto max-w-3xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <PlayModeNav sessionId={sessionId} planIndex={planIndex} canGoBack={canGoBack} onBack={onBack} />
          <LcdLabel>
            {step.stage_title?.toUpperCase()} {step.section_title ? `· ${step.section_title.toUpperCase()}` : ''}
          </LcdLabel>
        </div>
        <PlaySessionReferenceLink link={sessionLink} />

        <div className="mt-8 text-center">
          <h1 className="skin-display skin-display-heading skin-display-live skin-ghost text-display leading-tight">{step.exercise.title}</h1>
          <Link
            href={`/edit/${sessionId}/${step.exercise.exercise_id}?returnStep=${planIndex}`}
            className="skin-display skin-display-live mt-5 inline-block text-title text-muted transition-colors hover:text-adjust"
          >
            {exercisePrescriptionText(step.exercise)}
            {exerciseLoadText(step.exercise)}
          </Link>
          <div className="mt-3 text-lg text-adjust">tap to adjust</div>
          {exerciseCoachBlock(step.exercise)}
          <ExerciseReferenceLink exercise={step.exercise} />
        </div>

        <LcdRule className="mt-8" />
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <LcdMetric label="Target" value={exerciseTargetMetric(step.exercise)} />
          <LcdMetric label="Set" value={formatSetMetric(step.set_index, step.set_total)} />
        </div>
        <div className="skin-digit skin-digit-live skin-ghost mt-8 text-center text-[5.5rem] leading-none text-text sm:text-[7rem]">
          {formatRestCountdown(remaining)}
        </div>
        {remaining <= 0 && started ? (
          <div className="mt-3 text-center text-lg text-adjust">time up</div>
        ) : null}

        <LcdRule className="mt-8" />
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {!started ? (
            <LcdTransportButton type="button" onClick={() => setStarted(true)}>
              start
            </LcdTransportButton>
          ) : (
            <LcdTransportButton type="button" onClick={() => setPaused((value) => !value)}>
              {paused ? 'resume' : 'pause'}
            </LcdTransportButton>
          )}
          <LcdTransportButton type="button" onClick={completeAndClear}>
            complete
          </LcdTransportButton>
        </div>

        <LcdRule className="mt-8" />
        <div className="mt-6">
          <LcdInfoRow label="Phase" value={started && !paused ? 'WORK' : 'READY'} />
          <div className="mt-4">
            <LcdInfoRow label="Next" value={(nextTitle ?? 'SESSION COMPLETE').toUpperCase()} />
          </div>
        </div>
      </div>
    </main>
  );
}

export function CircuitTimePanel({
  step,
  sessionId,
  plan,
  planIndex,
  onAdvancePlan,
  canGoBack,
  onBack,
  restoreTimers
}: {
  step: CircuitTimePlayStep;
  sessionId: string;
  plan: PlaybackPlan;
  planIndex: number;
  onAdvancePlan: () => void;
  canGoBack: boolean;
  onBack: () => void;
  restoreTimers: boolean;
}): JSX.Element {
  const exercises = step.exercises;
  const storageKey = playTimerKey(sessionId, planIndex, step.step_id);

  const [started, setStarted] = useState(false);
  const [paused, setPaused] = useState(false);
  const [blockRemaining, setBlockRemaining] = useState(() => Math.max(0, step.duration_seconds));
  const [blockTimeExpired, setBlockTimeExpired] = useState(false);
  const [phase, setPhase] = useState<'exercise' | 'rest'>('exercise');
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [restRemaining, setRestRemaining] = useState(0);
  const restDoneRef = useRef(false);

  const advanceAndClear = useCallback(() => {
    clearTimerSnapshot(storageKey);
    onAdvancePlan();
  }, [onAdvancePlan, storageKey]);

  const circuitHydratedKeyRef = useRef<string | null>(null);
  const circuitPersistReadyRef = useRef(!restoreTimers);
  useLayoutEffect(() => {
    if (typeof window === 'undefined') {
      circuitPersistReadyRef.current = true;
      return;
    }
    if (!restoreTimers) {
      circuitPersistReadyRef.current = true;
      return;
    }
    if (circuitHydratedKeyRef.current === storageKey) {
      circuitPersistReadyRef.current = true;
      return;
    }
    circuitHydratedKeyRef.current = storageKey;
    const raw = sessionStorage.getItem(storageKey);
    if (!raw) {
      circuitPersistReadyRef.current = true;
      return;
    }
    const parsed = parseCircuitTimerSnapshot(raw, step, exercises);
    if (!parsed) {
      circuitPersistReadyRef.current = true;
      return;
    }
    queueMicrotask(() => {
      setStarted(parsed.started);
      setPaused(parsed.paused);
      setBlockRemaining(parsed.blockRemaining);
      setBlockTimeExpired(parsed.blockTimeExpired);
      setPhase(parsed.phase);
      setExerciseIndex(parsed.exerciseIndex);
      setRestRemaining(parsed.restRemaining);
      restDoneRef.current = false;
      circuitPersistReadyRef.current = true;
    });
  }, [exercises, restoreTimers, step, storageKey]);

  useEffect(() => {
    if (typeof window === 'undefined' || !circuitPersistReadyRef.current) {
      return;
    }
    try {
      sessionStorage.setItem(
        storageKey,
        JSON.stringify(
          createCircuitTimerSnapshot(step, {
            started,
            paused,
            blockRemaining,
            blockTimeExpired,
            phase,
            exerciseIndex,
            restRemaining
          })
        )
      );
    } catch {
      /* ignore */
    }
  }, [blockRemaining, blockTimeExpired, exerciseIndex, paused, phase, restRemaining, started, step, storageKey]);

  const blockTimeUp = blockTimeExpired || (started && blockRemaining <= 0);

  useEffect(() => {
    if (!started || paused || blockRemaining <= 0) return;
    const timeout = window.setTimeout(() => {
      setBlockRemaining((remaining) => {
        if (remaining <= 1) {
          queueMicrotask(() => setBlockTimeExpired(true));
          return 0;
        }
        return remaining - 1;
      });
    }, 1000);
    return () => window.clearTimeout(timeout);
  }, [blockRemaining, paused, started]);

  const afterRest = useCallback(() => {
    const timeUp = blockTimeExpired || (started && blockRemaining <= 0);
    if (timeUp) {
      advanceAndClear();
      return;
    }
    setPhase('exercise');
    setExerciseIndex((index) => (index + 1) % exercises.length);
  }, [advanceAndClear, blockRemaining, blockTimeExpired, exercises.length, started]);

  useEffect(() => {
    if (phase !== 'rest') return;
    if (paused) return;
    if (restRemaining <= 0) {
      if (!restDoneRef.current) {
        restDoneRef.current = true;
        queueMicrotask(() => {
          afterRest();
        });
      }
      return;
    }
    const timeout = window.setTimeout(() => {
      setRestRemaining((remaining) => remaining - 1);
    }, 1000);
    return () => window.clearTimeout(timeout);
  }, [afterRest, paused, phase, restRemaining]);

  const handleExerciseComplete = () => {
    if (!started) return;
    if (blockTimeUp) {
      advanceAndClear();
      return;
    }
    const exercise = exercises[exerciseIndex];
    const restSeconds = exercise.rest_after_seconds ?? 0;
    if (restSeconds > 0) {
      restDoneRef.current = false;
      setPhase('rest');
      setRestRemaining(restSeconds);
      return;
    }
    setExerciseIndex((index) => (index + 1) % exercises.length);
  };

  const handleSkipRest = () => {
    if (blockTimeUp) {
      advanceAndClear();
      return;
    }
    setPhase('exercise');
    setExerciseIndex((index) => (index + 1) % exercises.length);
  };

  const nextCycleTitle = useMemo(() => {
    if (blockTimeExpired || (started && blockRemaining <= 0)) {
      return getNextExerciseTitle(plan.steps, planIndex);
    }
    if (exercises.length === 0) {
      return getNextExerciseTitle(plan.steps, planIndex);
    }
    const nextIndex = (exerciseIndex + 1) % exercises.length;
    return exercises[nextIndex]?.title ?? null;
  }, [blockRemaining, blockTimeExpired, exerciseIndex, exercises, plan.steps, planIndex, started]);

  if (exercises.length === 0) {
    return (
      <main className="min-h-screen bg-bg text-text px-6 py-10 sm:px-10">
        <div className="mx-auto max-w-xl">
          <PlayModeNav sessionId={sessionId} planIndex={planIndex} canGoBack={canGoBack} onBack={onBack} />
          <p className="mt-12 text-muted">This timed circuit has no exercises.</p>
          <button type="button" onClick={advanceAndClear} className="mt-8 text-text">
            [ continue ]
          </button>
        </div>
      </main>
    );
  }

  const currentExercise = exercises[exerciseIndex];

  return (
    <main className="skin-page min-h-screen px-6 py-10 sm:px-10">
      <div className="skin-screen mx-auto max-w-3xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <PlayModeNav sessionId={sessionId} planIndex={planIndex} canGoBack={canGoBack} onBack={onBack} />
          <LcdLabel className="text-right">Circuit time</LcdLabel>
        </div>
        <div className="skin-digit skin-digit-live skin-ghost mt-8 text-center text-[5.5rem] leading-none text-text sm:text-[7rem]">
          {formatBlockCountdown(blockRemaining)}
        </div>
        {blockTimeUp ? (
          <div className="mt-3 text-center text-lg text-adjust">Time up. Finish this step.</div>
        ) : null}

        <LcdRule className="mt-8" />
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          {!started ? (
            <LcdTransportButton type="button" onClick={() => setStarted(true)}>
              start
            </LcdTransportButton>
          ) : (
            <LcdTransportButton type="button" onClick={() => setPaused((value) => !value)}>
              {paused ? 'resume' : 'pause'}
            </LcdTransportButton>
          )}
        </div>

        {phase === 'rest' ? (
          <>
            <LcdRule className="mt-8" />
            <div className="mt-8 text-center">
              <LcdLabel>Rest</LcdLabel>
            </div>
            <div className="skin-digit skin-digit-live skin-ghost mt-5 text-center text-[4.75rem] leading-none text-text sm:text-[6rem]">
              {formatRestCountdown(restRemaining)}
            </div>
            <div className="mt-8 flex justify-center">
              <LcdTransportButton type="button" onClick={handleSkipRest}>
                skip
              </LcdTransportButton>
            </div>
          </>
        ) : (
          <>
            <LcdRule className="mt-8" />
            <div className="mt-8 text-center">
              <LcdLabel>
                {step.stage_title?.toUpperCase()} {step.section_title ? `· ${step.section_title.toUpperCase()}` : ''}
              </LcdLabel>
            </div>
            <PlaySessionReferenceLink link={plan.session_link} />
            <div className="mt-6 text-center">
              <h1 className="skin-display skin-display-heading skin-display-live skin-ghost text-display leading-tight">{currentExercise.title}</h1>
              <Link
                href={`/edit/${sessionId}/${currentExercise.exercise_id}?returnStep=${planIndex}`}
                className="skin-display skin-display-live mt-5 inline-block text-title text-muted transition-colors hover:text-adjust"
              >
                {exercisePrescriptionText(currentExercise)}
                {exerciseLoadText(currentExercise)}
              </Link>
              <div className="mt-3 text-lg text-adjust">tap to adjust</div>
              {exerciseCoachBlock(currentExercise)}
              <ExerciseReferenceLink exercise={currentExercise} />
            </div>
            <LcdRule className="mt-8" />
            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <LcdMetric label={currentExercise.prescription.mode === 'time' ? 'Target' : 'Reps'} value={exerciseTargetMetric(currentExercise)} />
              <LcdMetric label="Cycle" value={`${exerciseIndex + 1}/${Math.max(exercises.length, 1)}`} />
            </div>
            <div className="mt-8 flex justify-center">
              <LcdTransportButton type="button" onClick={handleExerciseComplete}>
                complete
              </LcdTransportButton>
            </div>
          </>
        )}

        <LcdRule className="mt-8" />
        <div className="mt-6">
          <LcdInfoRow label="Phase" value={phase === 'rest' ? 'REST' : 'WORK'} />
          <div className="mt-4">
            <LcdInfoRow label="Next" value={(nextCycleTitle ?? 'SESSION COMPLETE').toUpperCase()} />
          </div>
        </div>
      </div>
    </main>
  );
}

export function ExercisePanel({
  step,
  sessionId,
  planIndex,
  nextTitle,
  onComplete,
  canGoBack,
  onBack,
  sessionLink
}: {
  step: ExerciseStep;
  sessionId: string;
  planIndex: number;
  nextTitle: string | null;
  onComplete: () => void;
  canGoBack: boolean;
  onBack: () => void;
  sessionLink?: ExerciseLink;
}): JSX.Element {
  return (
    <main className="skin-page min-h-screen px-6 py-10 sm:px-10">
      <div className="skin-screen mx-auto max-w-3xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <PlayModeNav sessionId={sessionId} planIndex={planIndex} canGoBack={canGoBack} onBack={onBack} />
          <LcdLabel>
            {step.stage_title?.toUpperCase()} {step.section_title ? `· ${step.section_title.toUpperCase()}` : ''}
          </LcdLabel>
        </div>
        <PlaySessionReferenceLink link={sessionLink} />

        <div className="mt-8 text-center">
          <h1 className="skin-display skin-display-heading skin-display-live skin-ghost text-display leading-tight">{step.exercise.title}</h1>
          <Link
            href={`/edit/${sessionId}/${step.exercise.exercise_id}?returnStep=${planIndex}`}
            className="skin-display skin-display-live mt-5 inline-block text-title text-muted transition-colors hover:text-adjust"
          >
            {exercisePrescriptionText(step.exercise)}
            {exerciseLoadText(step.exercise)}
          </Link>
          <div className="mt-3 text-lg text-adjust">tap to adjust</div>
          {exerciseCoachBlock(step.exercise)}
          <ExerciseReferenceLink exercise={step.exercise} />
        </div>

        <LcdRule className="mt-8" />
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <LcdMetric label="Reps" value={exerciseTargetMetric(step.exercise)} />
          <LcdMetric label="Set" value={formatSetMetric(step.set_index, step.set_total)} />
        </div>

        <LcdRule className="mt-8" />
        <div className="mt-6">
          <LcdInfoRow label="Phase" value="WORK" />
          <div className="mt-4">
            <LcdInfoRow label="Next" value={(nextTitle ?? 'SESSION COMPLETE').toUpperCase()} />
          </div>
        </div>

        <div className="mt-8 flex justify-center">
          <LcdTransportButton type="button" onClick={onComplete}>
            complete
          </LcdTransportButton>
        </div>
      </div>
    </main>
  );
}
