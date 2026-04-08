import type { PlaybackPlan } from '@/types/playback';

export function formatRestCountdown(totalSeconds: number): string {
  const safe = Math.max(0, totalSeconds);
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function formatBlockCountdown(totalSeconds: number): string {
  const safe = Math.max(0, totalSeconds);
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function getNextExerciseTitle(steps: PlaybackPlan['steps'], startIndex: number): string | null {
  for (let i = startIndex + 1; i < steps.length; i += 1) {
    const step = steps[i];
    if (step.type === 'exercise') {
      return step.exercise.title;
    }
    if (step.type === 'circuit_time_play' && step.exercises[0]) {
      return step.exercises[0].title;
    }
  }
  return null;
}
