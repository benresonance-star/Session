import { findExercise, forEachExercise, sectionsForStage } from '@/lib/session-tree';
import type { Exercise, SessionDefinition } from '@/types/session';
import type { SessionMutationProposal } from '@/types/session-mutation';

/** Values edited from play-mode AdjustScreen (only fields the UI exposes). */
export interface ExerciseAdjustPatch {
  reps?: number;
  seconds?: number;
  loadValue?: number;
}

function applyPatchToExercise(exercise: Exercise, exerciseId: string, patch: ExerciseAdjustPatch): void {
  if (exercise.exercise_id !== exerciseId) {
    return;
  }
  if (patch.reps !== undefined) {
    if (exercise.prescription.mode === 'reps') {
      exercise.prescription.reps = patch.reps;
    } else if (exercise.prescription.mode === 'rep_range') {
      exercise.prescription.min_reps = patch.reps;
      exercise.prescription.max_reps = patch.reps;
    }
  }
  if (patch.seconds !== undefined && exercise.prescription.mode === 'time') {
    exercise.prescription.seconds = patch.seconds;
  }
  if (
    patch.loadValue !== undefined &&
    'load' in exercise.equipment &&
    exercise.equipment.load
  ) {
    exercise.equipment.load.value = patch.loadValue;
  }
}

/** Returns a cloned session with the given exercise updated wherever it appears (including supersets). */
export function applyExerciseAdjustments(
  session: SessionDefinition,
  exerciseId: string,
  patch: ExerciseAdjustPatch
): SessionDefinition {
  const next = structuredClone(session);
  forEachExercise(next, (exercise) => {
    applyPatchToExercise(exercise, exerciseId, patch);
  });
  return next;
}

export function findExerciseInSession(
  session: SessionDefinition,
  exerciseId: string
): Exercise | undefined {
  return findExercise(session, (exercise) => exercise.exercise_id === exerciseId);
}

export function applyMutationToSession(
  session: SessionDefinition,
  proposal: SessionMutationProposal
): SessionDefinition {
  const next = structuredClone(session);
  for (const stage of next.stages) {
    const sections = sectionsForStage(stage);
    for (const section of sections) {
      for (const block of section.blocks) {
        const exercises = block.block_type === 'superset'
          ? block.exercise_pairs.flatMap((pair) => pair)
          : block.exercises;
        for (const exercise of exercises) {
          const change = proposal.changes.find(
            (item) => item.field === 'reps' && item.step_id.includes(exercise.exercise_id)
          );
          if (change && exercise.prescription.mode === 'reps') {
            exercise.prescription.reps = change.new_value as number;
          }
        }
      }
    }
  }
  return next;
}
