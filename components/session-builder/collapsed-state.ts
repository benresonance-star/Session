import type { Section, SessionDefinition, Stage } from '@/types/session';

export function getStageCollapseKey(stage: Stage, stageIndex: number): string {
  return `stage:${stage.stage_id}:${stageIndex}`;
}

export function getSectionCollapseKey(sectionId: string): string {
  return `section:${sectionId}`;
}

export function getBlockCollapseKey(blockId: string): string {
  return `block:${blockId}`;
}

export function getExerciseCollapseKey(exerciseId: string): string {
  return `exercise:${exerciseId}`;
}

export function buildCollapsedState(session: SessionDefinition): Record<string, boolean> {
  const state: Record<string, boolean> = {};
  session.stages.forEach((stage, stageIndex) => {
    state[getStageCollapseKey(stage, stageIndex)] = false;
    (stage.sections ?? []).forEach((section: Section) => {
      state[getSectionCollapseKey(section.section_id)] = false;
      section.blocks.forEach((block) => {
        state[getBlockCollapseKey(block.block_id)] = false;
        if (block.block_type === 'superset') {
          block.exercise_pairs.flat().forEach((exercise) => {
            state[getExerciseCollapseKey(exercise.exercise_id)] = false;
          });
        } else {
          block.exercises.forEach((exercise) => {
            state[getExerciseCollapseKey(exercise.exercise_id)] = false;
          });
        }
      });
    });
  });
  return state;
}

export function sessionSnapshot(session: SessionDefinition): string {
  return JSON.stringify(session);
}

export function syncCollapsedState(
  current: Record<string, boolean>,
  nextSession: SessionDefinition
): Record<string, boolean> {
  const nextKeys = buildCollapsedState(nextSession);
  const nextState: Record<string, boolean> = {};

  Object.keys(nextKeys).forEach((key) => {
    nextState[key] = key in current ? current[key] : true;
  });

  return nextState;
}
