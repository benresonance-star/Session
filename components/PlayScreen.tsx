'use client';

import Link from 'next/link';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { CircuitTimePlayStep, PlaybackPlan, RestStep } from '@/types/playback';
import type { Exercise } from '@/types/session';

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
          <PlayModeNav sessionId={sessionId} canGoBack={canGoBack} onBack={onBack} />
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
    <main className="min-h-screen bg-bg text-text px-6 py-10 sm:px-10">
      <div className="mx-auto max-w-xl">
        <div className="flex items-start justify-between gap-4 text-sm text-muted">
          <PlayModeNav sessionId={sessionId} canGoBack={canGoBack} onBack={onBack} />
          <div className="text-right">
            <div className="text-xs uppercase tracking-wide-ui">circuit time</div>
            <div className="mt-1 text-3xl font-semibold tabular-nums text-text">{formatBlockCountdown(blockRemaining)}</div>
            {blockTimeUp ? <div className="mt-1 text-xs text-adjust">time up — finish this step</div> : null}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          {!started ? (
            <button type="button" onClick={() => setStarted(true)} className="text-lg text-text">
              [ start ]
            </button>
          ) : (
            <button type="button" onClick={() => setPaused((p) => !p)} className="text-lg text-text">
              {paused ? '[ resume ]' : '[ pause ]'}
            </button>
          )}
        </div>

        {phase === 'rest' ? (
          <>
            <div className="mt-16 text-center text-sm uppercase tracking-wide-ui text-muted">rest</div>
            <div className="mt-4 text-center text-6xl font-semibold tabular-nums tracking-tight">
              {formatRestCountdown(restRemaining)}
            </div>
            <button type="button" onClick={handleSkipRest} className="mt-10 text-lg text-text">
              [ skip ]
            </button>
          </>
        ) : (
          <>
            <div className="mt-12 text-center text-xs uppercase tracking-wide-ui text-muted">
              {step.stage_title?.toUpperCase()} — {step.section_title?.toUpperCase()}
            </div>
            <div className="mt-6">
              <h1 className="text-display">{currentExercise.title}</h1>
              <Link
                href={`/edit/${sessionId}/${currentExercise.exercise_id}?returnStep=${planIndex}`}
                className="mt-4 inline-block text-title text-muted hover:text-adjust transition-colors"
              >
                {prescription}
                {load}
              </Link>
              <div className="mt-3 text-sm text-adjust">tap to adjust</div>
            </div>
            <button type="button" onClick={handleExerciseComplete} className="mt-16 text-2xl text-text">
              [ complete ]
            </button>
          </>
        )}

        <div className="mt-16 border-t border-line pt-6">
          <div className="text-sm uppercase tracking-wide-ui text-next">next</div>
          <div className="mt-3 text-2xl">{nextCycleTitle ?? 'Session complete'}</div>
        </div>
      </div>
    </main>
  );
}

function PlayModeNav({
  sessionId,
  canGoBack,
  onBack
}: {
  sessionId: string;
  canGoBack: boolean;
  onBack: () => void;
}): JSX.Element {
  return (
    <div className="flex flex-col items-start gap-1">
      <Link href={`/exit?sessionId=${sessionId}`} className="hover:text-text">
        ← exit
      </Link>
      {canGoBack ? (
        <button type="button" onClick={onBack} className="text-left hover:text-text">
          ← back
        </button>
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
    <main className="min-h-screen bg-bg text-text px-6 py-10 sm:px-10">
      <div className="mx-auto max-w-xl">
        <div className="flex items-center justify-between text-sm text-muted">
          <PlayModeNav sessionId={sessionId} canGoBack={canGoBack} onBack={onBack} />
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

        <button type="button" onClick={completeAndClear} className="mt-10 text-lg text-text">
          [ skip ]
        </button>
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

  if (!playStorageReady) {
    return <div className="min-h-screen bg-bg" aria-busy="true" />;
  }

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
          <PlayModeNav sessionId={plan.session_id} canGoBack={index > 0} onBack={goBack} />
          <div>{step.stage_title?.toUpperCase()} — {step.section_title?.toUpperCase()}</div>
          <div>
            {step.round_index && step.round_total ? `round ${step.round_index} / ${step.round_total}` : ''}
            {step.set_index && step.set_total ? `set ${step.set_index} / ${step.set_total}` : ''}
          </div>
        </div>

        <div className="mt-24">
          <h1 className="text-display">{step.exercise.title}</h1>
          <Link
            href={`/edit/${plan.session_id}/${step.exercise.exercise_id}?returnStep=${index}`}
            className="mt-4 inline-block text-title text-muted hover:text-adjust transition-colors"
          >
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
