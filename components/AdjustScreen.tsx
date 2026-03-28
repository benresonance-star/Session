'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { Exercise } from '@/types/session';

export function AdjustScreen({ sessionId, exercise }: { sessionId: string; exercise: Exercise }): JSX.Element {
  const [reps, setReps] = useState(exercise.prescription.mode === 'reps' ? exercise.prescription.reps : 10);
  const [seconds, setSeconds] = useState(exercise.prescription.mode === 'time' ? exercise.prescription.seconds : 30);
  const [load, setLoad] = useState('load' in exercise.equipment && exercise.equipment.load ? exercise.equipment.load.value : 0);
  const unit = 'load' in exercise.equipment && exercise.equipment.load ? exercise.equipment.load.unit : 'kg';

  return (
    <main className="min-h-screen bg-bg text-text px-6 py-10 sm:px-10">
      <div className="mx-auto max-w-xl">
        <Link href={`/play/${sessionId}`} className="text-sm text-muted hover:text-text">← back</Link>

        <h1 className="mt-10 text-display">{exercise.title}</h1>

        <div className="mt-12 space-y-12">
          {exercise.prescription.mode !== 'time' ? (
            <div>
              <div className="text-sm uppercase tracking-wide-ui text-adjust">reps</div>
              <div className="mt-4 flex items-center gap-8 text-5xl">
                <button onClick={() => setReps((v) => Math.max(1, v - 1))}>−</button>
                <div>{reps}</div>
                <button onClick={() => setReps((v) => v + 1)}>+</button>
              </div>
            </div>
          ) : (
            <div>
              <div className="text-sm uppercase tracking-wide-ui text-adjust">time</div>
              <div className="mt-4 flex items-center gap-8 text-5xl">
                <button onClick={() => setSeconds((v) => Math.max(5, v - 5))}>−</button>
                <div>{seconds}s</div>
                <button onClick={() => setSeconds((v) => v + 5)}>+</button>
              </div>
            </div>
          )}

          {'load' in exercise.equipment && exercise.equipment.load ? (
            <div>
              <div className="text-sm uppercase tracking-wide-ui text-adjust">weight</div>
              <div className="mt-4 flex items-center gap-8 text-5xl">
                <button onClick={() => setLoad((v) => Math.max(1, v - 1))}>−</button>
                <div>{load} {unit}</div>
                <button onClick={() => setLoad((v) => v + 1)}>+</button>
              </div>
            </div>
          ) : null}
        </div>

        <Link href={`/play/${sessionId}`} className="mt-16 inline-block text-2xl text-text">[ done ]</Link>
      </div>
    </main>
  );
}
