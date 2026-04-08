import type { CircuitTimePlayStep, ExerciseStep, RestStep } from '@/types/playback';
import type { Exercise } from '@/types/session';

const PLAY_TIMER_PREFIX = 'playTimer:';
const CIRCUIT_SNAPSHOT_V = 1 as const;
const REST_SNAPSHOT_V = 1 as const;
const EXERCISE_TIME_SNAPSHOT_V = 1 as const;

export interface CircuitTimerSnapshot {
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

export interface RestTimerSnapshot {
  v: typeof REST_SNAPSHOT_V;
  durationSeconds: number;
  remaining: number;
}

export interface ExerciseTimeTimerSnapshot {
  v: typeof EXERCISE_TIME_SNAPSHOT_V;
  durationSeconds: number;
  remaining: number;
  started: boolean;
  paused: boolean;
}

export function playTimerKey(sessionId: string, planIndex: number, stepId: string): string {
  return `${PLAY_TIMER_PREFIX}${sessionId}:${planIndex}:${stepId}`;
}

export function clearPlayTimerStorage(sessionId: string): void {
  if (typeof window === 'undefined') {
    return;
  }
  const prefix = `${PLAY_TIMER_PREFIX}${sessionId}:`;
  for (let i = sessionStorage.length - 1; i >= 0; i -= 1) {
    const key = sessionStorage.key(i);
    if (key?.startsWith(prefix)) {
      sessionStorage.removeItem(key);
    }
  }
}

export function clearTimerSnapshot(storageKey: string): void {
  try {
    sessionStorage.removeItem(storageKey);
  } catch {
    /* ignore */
  }
}

function maxCircuitRestSeconds(exercises: Exercise[]): number {
  let maxRest = 0;
  for (const exercise of exercises) {
    const rest = exercise.rest_after_seconds ?? 0;
    if (rest > maxRest) {
      maxRest = rest;
    }
  }
  return Math.max(maxRest, 1);
}

export function parseCircuitTimerSnapshot(
  raw: string,
  step: CircuitTimePlayStep,
  exercises: Exercise[]
): Omit<CircuitTimerSnapshot, 'v'> | null {
  try {
    const value = JSON.parse(raw) as unknown;
    if (!value || typeof value !== 'object') {
      return null;
    }
    const snapshot = value as Record<string, unknown>;
    if (snapshot.v !== CIRCUIT_SNAPSHOT_V) {
      return null;
    }
    if (typeof snapshot.blockDurationSeconds !== 'number' || snapshot.blockDurationSeconds !== step.duration_seconds) {
      return null;
    }
    if (typeof snapshot.blockRemaining !== 'number' || snapshot.blockRemaining < 0 || snapshot.blockRemaining > step.duration_seconds) {
      return null;
    }
    if (typeof snapshot.exerciseIndex !== 'number' || snapshot.exerciseIndex < 0 || snapshot.exerciseIndex >= exercises.length) {
      return null;
    }
    if (snapshot.phase !== 'exercise' && snapshot.phase !== 'rest') {
      return null;
    }
    const maxRest = maxCircuitRestSeconds(exercises);
    if (typeof snapshot.restRemaining !== 'number' || snapshot.restRemaining < 0 || snapshot.restRemaining > maxRest) {
      return null;
    }
    if (
      typeof snapshot.started !== 'boolean' ||
      typeof snapshot.paused !== 'boolean' ||
      typeof snapshot.blockTimeExpired !== 'boolean'
    ) {
      return null;
    }
    return {
      blockDurationSeconds: snapshot.blockDurationSeconds,
      started: snapshot.started,
      paused: snapshot.paused,
      blockRemaining: snapshot.blockRemaining,
      blockTimeExpired: snapshot.blockTimeExpired,
      phase: snapshot.phase,
      exerciseIndex: snapshot.exerciseIndex,
      restRemaining: snapshot.restRemaining
    };
  } catch {
    return null;
  }
}

export function parseRestTimerSnapshot(raw: string, step: RestStep): number | null {
  try {
    const value = JSON.parse(raw) as unknown;
    if (!value || typeof value !== 'object') {
      return null;
    }
    const snapshot = value as Record<string, unknown>;
    if (snapshot.v !== REST_SNAPSHOT_V) {
      return null;
    }
    if (typeof snapshot.durationSeconds !== 'number' || snapshot.durationSeconds !== step.duration_seconds) {
      return null;
    }
    if (typeof snapshot.remaining !== 'number' || snapshot.remaining <= 0 || snapshot.remaining > step.duration_seconds) {
      return null;
    }
    return snapshot.remaining;
  } catch {
    return null;
  }
}

export function parseExerciseTimeSnapshot(raw: string, step: ExerciseStep): ExerciseTimeTimerSnapshot | null {
  if (step.exercise.prescription.mode !== 'time') {
    return null;
  }
  const expected = step.exercise.prescription.seconds;
  try {
    const value = JSON.parse(raw) as unknown;
    if (!value || typeof value !== 'object') {
      return null;
    }
    const snapshot = value as Record<string, unknown>;
    if (snapshot.v !== EXERCISE_TIME_SNAPSHOT_V) {
      return null;
    }
    if (typeof snapshot.durationSeconds !== 'number' || snapshot.durationSeconds !== expected) {
      return null;
    }
    if (typeof snapshot.remaining !== 'number' || snapshot.remaining < 0 || snapshot.remaining > expected) {
      return null;
    }
    if (typeof snapshot.started !== 'boolean' || typeof snapshot.paused !== 'boolean') {
      return null;
    }
    return {
      v: EXERCISE_TIME_SNAPSHOT_V,
      durationSeconds: snapshot.durationSeconds,
      remaining: snapshot.remaining,
      started: snapshot.started,
      paused: snapshot.paused
    };
  } catch {
    return null;
  }
}

export function createRestTimerSnapshot(step: RestStep, remaining: number): RestTimerSnapshot {
  return {
    v: REST_SNAPSHOT_V,
    durationSeconds: step.duration_seconds,
    remaining
  };
}

export function createExerciseTimeSnapshot(
  durationSeconds: number,
  remaining: number,
  started: boolean,
  paused: boolean
): ExerciseTimeTimerSnapshot {
  return {
    v: EXERCISE_TIME_SNAPSHOT_V,
    durationSeconds,
    remaining,
    started,
    paused
  };
}

export function createCircuitTimerSnapshot(
  step: CircuitTimePlayStep,
  state: Omit<CircuitTimerSnapshot, 'v' | 'blockDurationSeconds'>
): CircuitTimerSnapshot {
  return {
    v: CIRCUIT_SNAPSHOT_V,
    blockDurationSeconds: step.duration_seconds,
    ...state
  };
}
