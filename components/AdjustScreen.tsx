'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { LcdLabel, LcdRule, LcdTransportButton } from '@/components/ui/LcdChrome';
import { PageShell } from '@/components/ui/PageShell';
import { applyExerciseAdjustments, type ExerciseAdjustPatch } from '@/lib/session-apply';
import { safeServiceErrorMessage } from '@/lib/safe-service-error';
import { validateSessionDefinition } from '@/lib/session-validation';
import type { Exercise, SessionDefinition } from '@/types/session';

function initialReps(exercise: Exercise): number {
  if (exercise.prescription.mode === 'reps') {
    return exercise.prescription.reps;
  }
  if (exercise.prescription.mode === 'rep_range') {
    return exercise.prescription.min_reps;
  }
  return 10;
}

export function AdjustScreen({
  sessionId,
  session,
  exercise,
  resumeStepIndex
}: {
  sessionId: string;
  session: SessionDefinition;
  exercise: Exercise;
  /** Playback step index to return to after done (from `returnStep` query). */
  resumeStepIndex?: number;
}): JSX.Element {
  const router = useRouter();
  const [reps, setReps] = useState(() => initialReps(exercise));
  const [seconds, setSeconds] = useState(
    () => (exercise.prescription.mode === 'time' ? exercise.prescription.seconds : 30)
  );
  const [load, setLoad] = useState(
    () => ('load' in exercise.equipment && exercise.equipment.load ? exercise.equipment.load.value : 0)
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const unit = 'load' in exercise.equipment && exercise.equipment.load ? exercise.equipment.load.unit : 'kg';

  const playHref = useMemo(() => {
    const base = `/play/${sessionId}`;
    if (resumeStepIndex != null && Number.isFinite(resumeStepIndex) && resumeStepIndex >= 0) {
      return `${base}?at=${resumeStepIndex}`;
    }
    return base;
  }, [sessionId, resumeStepIndex]);

  function buildPatch(): ExerciseAdjustPatch {
    const patch: ExerciseAdjustPatch = {};
    if (exercise.prescription.mode === 'time') {
      patch.seconds = seconds;
    } else {
      patch.reps = reps;
    }
    if ('load' in exercise.equipment && exercise.equipment.load) {
      patch.loadValue = load;
    }
    return patch;
  }

  async function handleDone(): Promise<void> {
    setError(null);
    const patch = buildPatch();
    const updated = applyExerciseAdjustments(session, exercise.exercise_id, patch);
    const validation = validateSessionDefinition(updated);
    if (!validation.isValid) {
      setError(validation.errors[0] ?? 'Validation failed.');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/sessions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });
      const contentType = response.headers.get('content-type') ?? '';
      let payload: { errors?: string[]; error?: string } = {};
      if (contentType.includes('application/json')) {
        payload = (await response.json().catch(() => ({}))) as typeof payload;
      }

      if (response.status === 503) {
        setError(
          safeServiceErrorMessage(payload.error) ||
            'Supabase is not configured; changes were not saved. Returning to play.'
        );
        router.push(playHref);
        return;
      }

      if (!response.ok) {
        if (payload.errors?.length) {
          setError(safeServiceErrorMessage(payload.errors[0]) || 'Save failed.');
        } else {
          setError(safeServiceErrorMessage(payload.error) || `Save failed (${response.status}).`);
        }
        return;
      }

      router.push(playHref);
    } catch {
      setError('Network error while saving.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageShell width="max-w-3xl">
        <Link href={playHref} className="skin-label text-[11px] text-muted hover:text-text">
          ← back
        </Link>

        <h1 className="skin-display mt-10 text-display">{exercise.title}</h1>

        {error ? <p className="mt-6 text-sm text-red-500/90">{error}</p> : null}

        <LcdRule className="mt-8" />
        <div className="mt-12 space-y-12">
          {exercise.prescription.mode !== 'time' ? (
            <div>
              <LcdLabel className="text-adjust">reps</LcdLabel>
              <div className="skin-digit mt-4 flex items-center gap-8 text-6xl leading-none">
                <button type="button" onClick={() => setReps((v) => Math.max(1, v - 1))} className="skin-display">
                  −
                </button>
                <div>{reps}</div>
                <button type="button" onClick={() => setReps((v) => v + 1)} className="skin-display">
                  +
                </button>
              </div>
            </div>
          ) : (
            <div>
              <LcdLabel className="text-adjust">time</LcdLabel>
              <div className="skin-digit mt-4 flex items-center gap-8 text-6xl leading-none">
                <button type="button" onClick={() => setSeconds((v) => Math.max(5, v - 5))} className="skin-display">
                  −
                </button>
                <div>{seconds}s</div>
                <button type="button" onClick={() => setSeconds((v) => v + 5)} className="skin-display">
                  +
                </button>
              </div>
            </div>
          )}

          {'load' in exercise.equipment && exercise.equipment.load ? (
            <div>
              <LcdLabel className="text-adjust">weight</LcdLabel>
              <div className="skin-digit mt-4 flex items-center gap-8 text-6xl leading-none">
                <button type="button" onClick={() => setLoad((v) => Math.max(1, v - 1))} className="skin-display">
                  −
                </button>
                <div>
                  {load} {unit}
                </div>
                <button type="button" onClick={() => setLoad((v) => v + 1)} className="skin-display">
                  +
                </button>
              </div>
            </div>
          ) : null}
        </div>

        <LcdRule className="mt-10" />
        <div className="mt-8 flex justify-center">
          <LcdTransportButton type="button" disabled={saving} onClick={() => void handleDone()}>
            {saving ? 'saving' : 'done'}
          </LcdTransportButton>
        </div>
    </PageShell>
  );
}
