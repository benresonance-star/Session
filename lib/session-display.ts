import { blockExercises, forEachExercise } from '@/lib/session-tree';
import type { Block, Exercise, SessionDefinition } from '@/types/session';

function formatRounds(rounds: number): string {
  return `${rounds} ${rounds === 1 ? 'round' : 'rounds'}`;
}

function formatSets(sets: number): string {
  return `${sets} ${sets === 1 ? 'set' : 'sets'}`;
}

export function blockStructureHint(block: Block): string | null {
  switch (block.block_type) {
    case 'circuit_rounds':
      return formatRounds(block.rounds);
    case 'flow': {
      const rounds = block.rounds ?? 1;
      return rounds > 1 ? formatRounds(rounds) : null;
    }
    case 'straight_sets':
    case 'superset':
      return formatSets(block.sets);
    case 'emom':
      return `${block.minutes} ${block.minutes === 1 ? 'minute' : 'minutes'} EMOM`;
    case 'circuit_time':
      return block.duration_seconds >= 60 && block.duration_seconds % 60 === 0
        ? `${block.duration_seconds / 60} min timed circuit`
        : `${block.duration_seconds}s timed circuit`;
    default:
      return null;
  }
}

export function exercisePrescriptionText(exercise: Exercise): string {
  switch (exercise.prescription.mode) {
    case 'reps':
      return `${exercise.prescription.reps} reps`;
    case 'rep_range':
      return `${exercise.prescription.min_reps}-${exercise.prescription.max_reps} reps`;
    case 'time':
      return `${exercise.prescription.seconds}s`;
  }
}

export function exerciseLoadText(exercise: Exercise): string {
  return 'load' in exercise.equipment && exercise.equipment.load
    ? ` @ ${exercise.equipment.load.value} ${exercise.equipment.load.unit}`
    : '';
}

export function exercisePrescriptionWithLoad(exercise: Exercise): string {
  return `${exercisePrescriptionText(exercise)}${exerciseLoadText(exercise)}`;
}

export function exerciseTargetMetric(exercise: Exercise): string {
  switch (exercise.prescription.mode) {
    case 'reps':
      return String(exercise.prescription.reps);
    case 'rep_range':
      return `${exercise.prescription.min_reps}-${exercise.prescription.max_reps}`;
    case 'time':
      return `${exercise.prescription.seconds}s`;
  }
}

export function formatSetMetric(setIndex?: number, setTotal?: number): string {
  return setIndex && setTotal ? `${setIndex}/${setTotal}` : '--';
}

function isPlaceholderExercise(exercise: Exercise): boolean {
  return (
    exercise.title.trim().toLowerCase() === 'new exercise' &&
    !exercise.movement_type &&
    exercise.rest_after_seconds == null &&
    !exercise.cluster &&
    !exercise.tempo &&
    !exercise.sides &&
    !exercise.notes?.trim() &&
    !exercise.coach?.trim() &&
    !exercise.link?.url?.trim() &&
    exercise.equipment.kind === 'bodyweight' &&
    exercise.prescription.mode === 'reps' &&
    exercise.prescription.reps === 10
  );
}

export function blockHasMeaningfulExercises(block: Block): boolean {
  return blockExercises(block).some((exercise) => !isPlaceholderExercise(exercise));
}

export function sessionHasMeaningfulExercises(session: SessionDefinition): boolean {
  let hasMeaningfulExercise = false;
  forEachExercise(session, (exercise) => {
    if (!isPlaceholderExercise(exercise)) {
      hasMeaningfulExercise = true;
    }
  });
  return hasMeaningfulExercise;
}
