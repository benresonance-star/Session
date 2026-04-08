'use client';

import Link from 'next/link';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { LcdLabel, LcdRule, LcdTransportButton, LcdTransportLink } from '@/components/ui/LcdChrome';
import { clearPausedSession } from '@/lib/session-pause-storage';
import { ExternalResourceLink } from '@/components/ui/ExternalResourceLink';
import type { CircuitTimePlayStep, ExerciseStep, PlaybackPlan, RestStep } from '@/types/playback';
import type { Exercise, ExerciseLink } from '@/types/session';

const PLAY_TIMER_PREFIX = 'playTimer:';

function playTimerKey(sessionId: string, planIndex: number, stepId: string): string {
  return `${PLAY_TIMER_PREFIX}${sessionId}:${planIndex}:${stepId}`;
}

function clearPlayTimerStorage(sessionId: string): void {
  if (typeof window === 'undefined') {
    return;
  }
  const prefix = `${PLAY_TIMER_PREFIX}${sessionId}:`;
  for (let i = sessionStorage.length - 1; i >= 0; i -= 1) {
    const k = sessionStorage.key(i);
    if (k?.startsWith(prefix)) {
      sessionStorage.removeItem(k);
    }
  }
}

const CIRCUIT_SNAPSHOT_V = 1 as const;

interface CircuitTimerSnapshot {
  v: typeof CIRCUIT_SNAPSHOT_V;
  blockDurationSeconds: number;
  started: boolean;
  paused: boolean;
  blockRemaining: number;
  blockTimeExpired: boolean;
  phase: 'exercise' | 'rest';
  exerciseIndex: number;
  restRemaining: number;
}

function maxCircuitRestSeconds(exercises: Exercise[]): number {
  let m = 0;
  for (const ex of exercises) {
    const r = ex.rest_after_seconds ?? 0;
    if (r > m) {
      m = r;
    }
  }
  return Math.max(m, 1);
}

function parseCircuitTimerSnapshot(
  raw: string,
  step: CircuitTimePlayStep,
  exercises: Exercise[]
): Omit<CircuitTimerSnapshot, 'v'> | null {
  try {
    const o = JSON.parse(raw) as unknown;
    if (!o || typeof o !== 'object') {
      return null;
    }
    const s = o as Record<string, unknown>;
    if (s.v !== CIRCUIT_SNAPSHOT_V) {
      return null;
    }
    if (typeof s.blockDurationSeconds !== 'number' || s.blockDurationSeconds !== step.duration_seconds) {
      return null;
    }
    if (typeof s.blockRemaining !== 'number' || s.blockRemaining < 0 || s.blockRemaining > step.duration_seconds) {
      return null;
    }
    if (typeof s.exerciseIndex !== 'number' || s.exerciseIndex < 0 || s.exerciseIndex >= exercises.length) {
      return null;
    }
    if (s.phase !== 'exercise' && s.phase !== 'rest') {
      return null;
    }
    const maxRest = maxCircuitRestSeconds(exercises);
    if (typeof s.restRemaining !== 'number' || s.restRemaining < 0 || s.restRemaining > maxRest) {
      return null;
    }
    if (typeof s.started !== 'boolean' || typeof s.paused !== 'boolean' || typeof s.blockTimeExpired !== 'boolean') {
      return null;
    }
    return {
      blockDurationSeconds: s.blockDurationSeconds,
      started: s.started,
      paused: s.paused,
      blockRemaining: s.blockRemaining,
      blockTimeExpired: s.blockTimeExpired,
      phase: s.phase,
      exerciseIndex: s.exerciseIndex,
      restRemaining: s.restRemaining
    };
  } catch {
    return null;
  }
}

const REST_SNAPSHOT_V = 1 as const;

interface RestTimerSnapshot {
  v: typeof REST_SNAPSHOT_V;
  durationSeconds: number;
  remaining: number;
}

function parseRestTimerSnapshot(raw: string, step: RestStep): number | null {
  try {
    const o = JSON.parse(raw) as unknown;
    if (!o || typeof o !== 'object') {
      return null;
    }
    const s = o as Record<string, unknown>;
    if (s.v !== REST_SNAPSHOT_V) {
      return null;
    }
    if (typeof s.durationSeconds !== 'number' || s.durationSeconds !== step.duration_seconds) {
      return null;
    }
    if (typeof s.remaining !== 'number' || s.remaining <= 0 || s.remaining > step.duration_seconds) {
      return null;
    }
    return s.remaining;
  } catch {
    return null;
  }
}

const EXERCISE_TIME_SNAPSHOT_V = 1 as const;

interface ExerciseTimeTimerSnapshot {
  v: typeof EXERCISE_TIME_SNAPSHOT_V;
  durationSeconds: number;
  remaining: number;
  started: boolean;
  paused: boolean;
}

function parseExerciseTimeSnapshot(raw: string, step: ExerciseStep): ExerciseTimeTimerSnapshot | null {
  if (step.exercise.prescription.mode !== 'time') {
    return null;
  }
  const expected = step.exercise.prescription.seconds;
  try {
    const o = JSON.parse(raw) as unknown;
    if (!o || typeof o !== 'object') {
      return null;
    }
    const s = o as Record<string, unknown>;
    if (s.v !== EXERCISE_TIME_SNAPSHOT_V) {
      return null;
    }
    if (typeof s.durationSeconds !== 'number' || s.durationSeconds !== expected) {
      return null;
    }
    if (typeof s.remaining !== 'number' || s.remaining < 0 || s.remaining > expected) {
      return null;
    }
    if (typeof s.started !== 'boolean' || typeof s.paused !== 'boolean') {
      return null;
    }
    return {
      v: EXERCISE_TIME_SNAPSHOT_V,
      durationSeconds: s.durationSeconds,
      remaining: s.remaining,
      started: s.started,
      paused: s.paused
    };
  } catch {
    return null;
  }
}

function formatRestCountdown(totalSeconds: number): string {
  const safe = Math.max(0, totalSeconds);
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatBlockCountdown(totalSeconds: number): string {
  const s = Math.max(0, totalSeconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

function exercisePrescriptionLine(exercise: Exercise): { prescription: string; load: string } {
  const prescription =
    exercise.prescription.mode === 'reps'
      ? `${exercise.prescription.reps} reps`
      : exercise.prescription.mode === 'rep_range'
        ? `${exercise.prescription.min_reps}-${exercise.prescription.max_reps} reps`
        : `${exercise.prescription.seconds}s`;
  const load =
    'load' in exercise.equipment && exercise.equipment.load
      ? ` @ ${exercise.equipment.load.value} ${exercise.equipment.load.unit}`
      : '';
  return { prescription, load };
}

function exerciseCoachBlock(exercise: Exercise): JSX.Element | null {
  const c = exercise.coach?.trim();
  if (!c) {
    return null;
  }
  return <p className="mt-4 max-w-prose whitespace-pre-wrap text-xl leading-relaxed text-muted">{c}</p>;
}

/** Session-level URL during active work steps only (not on rest). */
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

function formatTargetMetric(exercise: Exercise): string {
  if (exercise.prescription.mode === 'reps') {
    return String(exercise.prescription.reps);
  }
  if (exercise.prescription.mode === 'rep_range') {
    return `${exercise.prescription.min_reps}-${exercise.prescription.max_reps}`;
  }
  return `${exercise.prescription.seconds}s`;
}

function formatSetMetric(setIndex?: number, setTotal?: number): string {
  if (setIndex && setTotal) {
    return `${setIndex}/${setTotal}`;
  }
  return '--';
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

function getNextExerciseTitle(steps: PlaybackPlan['steps'], startIndex: number): string | null {
  for (let i = startIndex + 1; i < steps.length; i += 1) {
    const s = steps[i];
    if (s.type === 'exercise') return s.exercise.title;
    if (s.type === 'circuit_time_play' && s.exercises[0]) return s.exercises[0].title;
  }
  return null;
}

function CircuitTimePanel({
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

  const clearTimerStorage = useCallback(() => {
    try {
      sessionStorage.removeItem(storageKey);
    } catch {
      /* ignore */
    }
  }, [storageKey]);

  const advanceAndClear = useCallback(() => {
    clearTimerStorage();
    onAdvancePlan();
  }, [clearTimerStorage, onAdvancePlan]);

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
  }, [restoreTimers, storageKey, step, exercises]);

  useEffect(() => {
    if (typeof window === 'undefined' || !circuitPersistReadyRef.current) {
      return;
    }
    const snap: CircuitTimerSnapshot = {
      v: CIRCUIT_SNAPSHOT_V,
      blockDurationSeconds: step.duration_seconds,
      started,
      paused,
      blockRemaining,
      blockTimeExpired,
      phase,
      exerciseIndex,
      restRemaining
    };
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(snap));
    } catch {
      /* ignore */
    }
  }, [
    storageKey,
    step.duration_seconds,
    started,
    paused,
    blockRemaining,
    blockTimeExpired,
    phase,
    exerciseIndex,
    restRemaining
  ]);

  const blockTimeUp = blockTimeExpired || (started && blockRemaining <= 0);

  useEffect(() => {
    if (!started || paused || blockRemaining <= 0) return;
    const t = window.setTimeout(() => {
      setBlockRemaining((r) => {
        if (r <= 1) {
          queueMicrotask(() => setBlockTimeExpired(true));
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => window.clearTimeout(t);
  }, [started, paused, blockRemaining]);

  const afterRest = useCallback(() => {
    const timeUp = blockTimeExpired || (started && blockRemaining <= 0);
    if (timeUp) {
      advanceAndClear();
      return;
    }
    setPhase('exercise');
    setExerciseIndex((i) => (i + 1) % exercises.length);
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
    const t = window.setTimeout(() => {
      setRestRemaining((x) => x - 1);
    }, 1000);
    return () => window.clearTimeout(t);
  }, [phase, paused, restRemaining, afterRest]);

  const handleExerciseComplete = () => {
    if (!started) return;
    if (blockTimeUp) {
      advanceAndClear();
      return;
    }
    const ex = exercises[exerciseIndex];
    const restSec = ex.rest_after_seconds ?? 0;
    if (restSec > 0) {
      restDoneRef.current = false;
      setPhase('rest');
      setRestRemaining(restSec);
      return;
    }
    setExerciseIndex((i) => (i + 1) % exercises.length);
  };

  const handleSkipRest = () => {
    if (blockTimeUp) {
      advanceAndClear();
      return;
    }
    setPhase('exercise');
    setExerciseIndex((i) => (i + 1) % exercises.length);
  };

  const nextCycleTitle = useMemo(() => {
    const timeUp = blockTimeExpired || (started && blockRemaining <= 0);
    if (timeUp) {
      return getNextExerciseTitle(plan.steps, planIndex);
    }
    if (exercises.length === 0) return getNextExerciseTitle(plan.steps, planIndex);
    const nextIdx = (exerciseIndex + 1) % exercises.length;
    return exercises[nextIdx]?.title ?? null;
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
  const { prescription, load } = exercisePrescriptionLine(currentExercise);

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
            <LcdTransportButton type="button" onClick={() => setPaused((p) => !p)}>
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
                {prescription}
                {load}
              </Link>
              <div className="mt-3 text-lg text-adjust">tap to adjust</div>
              {exerciseCoachBlock(currentExercise)}
              <ExerciseReferenceLink exercise={currentExercise} />
            </div>
            <LcdRule className="mt-8" />
            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <LcdMetric label={currentExercise.prescription.mode === 'time' ? 'Target' : 'Reps'} value={formatTargetMetric(currentExercise)} />
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

function RestPanel({
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

  const [remaining, setRemaining] = useState(() =>
    Math.max(0, step.duration_seconds)
  );
  const finishedRef = useRef(false);

  const clearTimerStorage = useCallback(() => {
    try {
      sessionStorage.removeItem(storageKey);
    } catch {
      /* ignore */
    }
  }, [storageKey]);

  const completeAndClear = useCallback(() => {
    clearTimerStorage();
    onComplete();
  }, [clearTimerStorage, onComplete]);

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
    const r = parseRestTimerSnapshot(raw, step);
    if (r != null) {
      queueMicrotask(() => {
        setRemaining(r);
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
    const snap: RestTimerSnapshot = {
      v: REST_SNAPSHOT_V,
      durationSeconds: step.duration_seconds,
      remaining
    };
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(snap));
    } catch {
      /* ignore */
    }
  }, [storageKey, step.duration_seconds, remaining]);

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
    const t = window.setTimeout(() => {
      setRemaining((r) => r - 1);
    }, 1000);
    return () => window.clearTimeout(t);
  }, [remaining, completeAndClear]);

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

function TimedExercisePanel({
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
  const { prescription, load } = exercisePrescriptionLine(step.exercise);

  const [remaining, setRemaining] = useState(() => Math.max(0, durationSeconds));
  const [started, setStarted] = useState(false);
  const [paused, setPaused] = useState(false);
  const finishedRef = useRef(false);

  const clearTimerStorage = useCallback(() => {
    try {
      sessionStorage.removeItem(storageKey);
    } catch {
      /* ignore */
    }
  }, [storageKey]);

  const completeAndClear = useCallback(() => {
    clearTimerStorage();
    onComplete();
  }, [clearTimerStorage, onComplete]);

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
    const snap = parseExerciseTimeSnapshot(raw, step);
    if (snap) {
      queueMicrotask(() => {
        setRemaining(snap.remaining);
        setStarted(snap.started);
        setPaused(snap.paused);
        finishedRef.current = false;
        timePersistReadyRef.current = true;
      });
      return;
    }
    timePersistReadyRef.current = true;
  }, [restoreTimers, storageKey, step]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    if (restoreTimers && !timePersistReadyRef.current) {
      return;
    }
    const snap: ExerciseTimeTimerSnapshot = {
      v: EXERCISE_TIME_SNAPSHOT_V,
      durationSeconds,
      remaining,
      started,
      paused
    };
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(snap));
    } catch {
      /* ignore */
    }
  }, [restoreTimers, storageKey, durationSeconds, remaining, started, paused]);

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
  }, [remaining, started, paused, restoreTimers, completeAndClear]);

  useEffect(() => {
    if (remaining <= 0 || !started || paused) {
      return;
    }
    if (restoreTimers && !timePersistReadyRef.current) {
      return;
    }
    const t = window.setTimeout(() => {
      setRemaining((r) => Math.max(0, r - 1));
    }, 1000);
    return () => window.clearTimeout(t);
  }, [remaining, started, paused, restoreTimers]);

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
            {prescription}
            {load}
          </Link>
          <div className="mt-3 text-lg text-adjust">tap to adjust</div>
          {exerciseCoachBlock(step.exercise)}
          <ExerciseReferenceLink exercise={step.exercise} />
        </div>

        <LcdRule className="mt-8" />
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <LcdMetric label="Target" value={formatTargetMetric(step.exercise)} />
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
            <LcdTransportButton type="button" onClick={() => setPaused((p) => !p)}>
              {paused ? 'resume' : 'pause'}
            </LcdTransportButton>
          )}
          <LcdTransportButton type="button" onClick={() => completeAndClear()}>
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
  const advanceAfterRest = useCallback(() => {
    setIndex((i) => i + 1);
  }, []);

  const advancePlanStep = useCallback(() => {
    setIndex((i) => i + 1);
  }, []);

  const goBack = useCallback(() => {
    setIndex((i) => Math.max(0, i - 1));
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
        onComplete={advanceAfterRest}
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

  if (step.type !== 'exercise') {
    throw new Error(`Unexpected playback step type: ${step.type}`);
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

  const prescription =
    step.exercise.prescription.mode === 'reps'
      ? `${step.exercise.prescription.reps} reps`
      : `${step.exercise.prescription.min_reps}-${step.exercise.prescription.max_reps} reps`;

  const load = 'load' in step.exercise.equipment && step.exercise.equipment.load
    ? ` @ ${step.exercise.equipment.load.value} ${step.exercise.equipment.load.unit}`
    : '';

  return (
    <main className="skin-page min-h-screen px-6 py-10 sm:px-10">
      <div className="skin-screen mx-auto max-w-3xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <PlayModeNav sessionId={plan.session_id} planIndex={index} canGoBack={index > 0} onBack={goBack} />
          <LcdLabel>
            {step.stage_title?.toUpperCase()} {step.section_title ? `· ${step.section_title.toUpperCase()}` : ''}
          </LcdLabel>
        </div>
        <PlaySessionReferenceLink link={plan.session_link} />

        <div className="mt-8 text-center">
          <h1 className="skin-display skin-display-heading skin-display-live skin-ghost text-display leading-tight">{step.exercise.title}</h1>
          <Link
            href={`/edit/${plan.session_id}/${step.exercise.exercise_id}?returnStep=${index}`}
            className="skin-display skin-display-live mt-5 inline-block text-title text-muted transition-colors hover:text-adjust"
          >
            {prescription}{load}
          </Link>
          <div className="mt-3 text-lg text-adjust">tap to adjust</div>
          {exerciseCoachBlock(step.exercise)}
          <ExerciseReferenceLink exercise={step.exercise} />
        </div>

        <LcdRule className="mt-8" />
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <LcdMetric label="Reps" value={formatTargetMetric(step.exercise)} />
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
          <LcdTransportButton type="button" onClick={() => setIndex(index + 1)}>
            complete
          </LcdTransportButton>
        </div>
      </div>
    </main>
  );
}
