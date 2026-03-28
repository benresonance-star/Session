import type { Block, Exercise, SessionDefinition, Stage } from '@/types/session';
import type { SessionMutationProposal } from '@/types/session-mutation';

/** Values edited from play-mode AdjustScreen (only fields the UI exposes). */
export interface ExerciseAdjustPatch {
  reps?: number;
  seconds?: number;
  loadValue?: number;
}

function blocksForStage(stage: Stage): Block[] {
  const fromSections = (stage.sections ?? []).flatMap((s) => s.blocks);
  const fromStage = stage.blocks ?? [];
  if (fromSections.length > 0 && fromStage.length > 0) {
    return [...fromSections, ...fromStage];
  }
  return fromSections.length > 0 ? fromSections : fromStage;
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
  for (const stage of next.stages) {
    for (const block of blocksForStage(stage)) {
      if (block.block_type === 'superset') {
        for (const pair of block.exercise_pairs) {
          for (const exercise of pair) {
            applyPatchToExercise(exercise, exerciseId, patch);
          }
        }
      } else if ('exercises' in block && block.exercises) {
        for (const exercise of block.exercises) {
          applyPatchToExercise(exercise, exerciseId, patch);
        }
      }
    }
  }
  return next;
}

export function findExerciseInSession(
  session: SessionDefinition,
  exerciseId: string
): Exercise | undefined {
  for (const stage of session.stages) {
    for (const block of blocksForStage(stage)) {
      if (block.block_type === 'superset') {
        for (const pair of block.exercise_pairs) {
          for (const ex of pair) {
            if (ex.exercise_id === exerciseId) {
              return ex;
            }
          }
        }
      } else if ('exercises' in block && block.exercises) {
        const hit = block.exercises.find((ex) => ex.exercise_id === exerciseId);
        if (hit) {
          return hit;
        }
      }
    }
  }
  return undefined;
}

export function applyMutationToSession(
  session: SessionDefinition,
  proposal: SessionMutationProposal
): SessionDefinition {
  const next = structuredClone(session);
  for (const stage of next.stages) {
    const sections = stage.sections ?? [];
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
