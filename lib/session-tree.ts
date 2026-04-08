import type { Block, Exercise, Section, SessionDefinition, Stage } from '@/types/session';

function cloneSection(section: Section): Section {
  return {
    ...section,
    blocks: section.blocks ?? []
  };
}

export function sectionsForStage(stage: Stage): Section[] {
  const fromSections = (stage.sections ?? []).map(cloneSection);
  const fromStageBlocks = stage.blocks?.length
    ? [
        {
          section_id: `${stage.stage_id ?? 'stage'}-default`,
          title: stage.title,
          notes: stage.notes,
          blocks: stage.blocks ?? []
        } satisfies Section
      ]
    : [];

  if (fromSections.length === 0 && fromStageBlocks.length === 0) {
    return [
      {
        section_id: `${stage.stage_id ?? 'stage'}-default`,
        title: stage.title,
        notes: stage.notes,
        blocks: []
      } satisfies Section
    ];
  }

  return [...fromSections, ...fromStageBlocks];
}

export function blocksForStage(stage: Stage): Block[] {
  return sectionsForStage(stage).flatMap((section) => section.blocks ?? []);
}

export function blockExercises(block: Block): Exercise[] {
  if (block.block_type === 'superset') {
    return block.exercise_pairs.flatMap((pair) => pair);
  }
  return block.exercises ?? [];
}

export function forEachExercise(
  session: Pick<SessionDefinition, 'stages'>,
  visitor: (exercise: Exercise, block: Block, stage: Stage, section: Section) => void
): void {
  for (const stage of session.stages) {
    for (const section of sectionsForStage(stage)) {
      for (const block of section.blocks ?? []) {
        for (const exercise of blockExercises(block)) {
          visitor(exercise, block, stage, section);
        }
      }
    }
  }
}

export function findExercise(
  session: Pick<SessionDefinition, 'stages'>,
  predicate: (exercise: Exercise, block: Block, stage: Stage, section: Section) => boolean
): Exercise | undefined {
  let match: Exercise | undefined;
  forEachExercise(session, (exercise, block, stage, section) => {
    if (!match && predicate(exercise, block, stage, section)) {
      match = exercise;
    }
  });
  return match;
}
