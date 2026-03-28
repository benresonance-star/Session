import type {
  Block,
  BlockType,
  CircuitRoundsBlock,
  CircuitTimeBlock,
  EmomBlock,
  Exercise,
  ExerciseLink,
  FlowBlock,
  SessionDefinition,
  Stage,
  StageId,
  StraightSetsBlock,
  SupersetBlock,
  Section
} from '@/types/session';

export interface SectionPath {
  stageIndex: number;
  sectionIndex: number;
}

export interface BlockPath extends SectionPath {
  blockIndex: number;
}

export interface ExercisePath extends BlockPath {
  exerciseIndex: number;
}

export interface SupersetExercisePath extends BlockPath {
  pairIndex: number;
  pairExerciseIndex: 0 | 1;
}

export type AnyExercisePath = ExercisePath | SupersetExercisePath;

const STAGE_SEQUENCE: StageId[] = ['warmup', 'main', 'cooldown'];

function clone<T>(value: T): T {
  return structuredClone(value);
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || 'item';
}

function createId(prefix: string): string {
  return `${slugify(prefix)}-${Math.random().toString(36).slice(2, 7)}`;
}

function clampInteger(value: number, minimum: number): number {
  return Math.max(minimum, Math.round(Number.isFinite(value) ? value : minimum));
}

function clampOptionalInteger(value: number | undefined, minimum: number): number | undefined {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return undefined;
  }

  return clampInteger(value, minimum);
}

function moveItem<T>(items: T[], fromIndex: number, direction: -1 | 1): void {
  const toIndex = fromIndex + direction;
  if (fromIndex < 0 || fromIndex >= items.length || toIndex < 0 || toIndex >= items.length) {
    return;
  }

  const [item] = items.splice(fromIndex, 1);
  items.splice(toIndex, 0, item);
}

function getSection(stage: Stage, sectionIndex: number): Section | undefined {
  return stage.sections?.[sectionIndex];
}

function getBlock(session: SessionDefinition, path: BlockPath): Block | undefined {
  return session.stages[path.stageIndex]?.sections?.[path.sectionIndex]?.blocks[path.blockIndex];
}

function getSupersetExercise(block: SupersetBlock, path: SupersetExercisePath): Exercise | undefined {
  return block.exercise_pairs[path.pairIndex]?.[path.pairExerciseIndex];
}

function getExerciseFromBlock(block: Block, path: AnyExercisePath): Exercise | undefined {
  if (block.block_type === 'superset') {
    if (!('pairIndex' in path)) {
      return undefined;
    }

    return getSupersetExercise(block, path);
  }

  if (!('exerciseIndex' in path)) {
    return undefined;
  }

  return block.exercises[path.exerciseIndex];
}

function blockExercises(block: Block): Exercise[] {
  if (block.block_type === 'superset') {
    return block.exercise_pairs.flatMap((pair) => pair);
  }

  return block.exercises;
}

function cloneExercise(exercise: Exercise): Exercise {
  return structuredClone(exercise);
}

function createExercisePair(seed = 'Pair'): [Exercise, Exercise] {
  return [
    createEmptyExercise(`${seed} A`),
    createEmptyExercise(`${seed} B`)
  ];
}

function ensureAtLeastExercises(exercises: Exercise[], count: number, seed: string): Exercise[] {
  const next = exercises.map((exercise) => cloneExercise(exercise));
  while (next.length < count) {
    next.push(createEmptyExercise(seed));
  }
  return next;
}

function defaultBlockValues(blockType: BlockType, titleOverride?: string): Block {
  const title = titleOverride || BLOCK_TYPE_LABELS[blockType];
  const blockId = createId(title);

  switch (blockType) {
    case 'flow':
      return { block_id: blockId, block_type: 'flow', title, rounds: 1, exercises: [createEmptyExercise()] };
    case 'straight_sets':
      return { block_id: blockId, block_type: 'straight_sets', title, sets: 3, exercises: [createEmptyExercise()] };
    case 'circuit_rounds':
      return { block_id: blockId, block_type: 'circuit_rounds', title, rounds: 3, exercises: [createEmptyExercise()] };
    case 'circuit_time':
      return { block_id: blockId, block_type: 'circuit_time', title, duration_seconds: 300, rest_as_needed: true, exercises: [createEmptyExercise()] };
    case 'superset':
      return { block_id: blockId, block_type: 'superset', title, sets: 3, exercise_pairs: [createExercisePair(title)] };
    case 'emom':
      return { block_id: blockId, block_type: 'emom', title, minutes: 10, exercises: [createEmptyExercise()] };
  }
}

function convertBlock(block: Block, nextType: BlockType): Block {
  if (block.block_type === nextType) {
    return clone(block);
  }

  const sourceExercises = ensureAtLeastExercises(blockExercises(block), 2, 'Exercise');
  const base = {
    block_id: block.block_id,
    title: block.title,
    notes: block.notes
  };

  switch (nextType) {
    case 'flow':
      return {
        ...base,
        block_type: 'flow',
        rounds: block.block_type === 'circuit_rounds' ? block.rounds : 1,
        exercises: ensureAtLeastExercises(sourceExercises, 1, 'Exercise')
      } satisfies FlowBlock;
    case 'straight_sets':
      return {
        ...base,
        block_type: 'straight_sets',
        sets: block.block_type === 'superset' || block.block_type === 'straight_sets' ? block.sets : 3,
        exercises: ensureAtLeastExercises(sourceExercises, 1, 'Exercise')
      } satisfies StraightSetsBlock;
    case 'circuit_rounds':
      return {
        ...base,
        block_type: 'circuit_rounds',
        rounds: block.block_type === 'flow' && block.rounds ? block.rounds : 3,
        exercises: ensureAtLeastExercises(sourceExercises, 1, 'Exercise')
      } satisfies CircuitRoundsBlock;
    case 'circuit_time':
      return {
        ...base,
        block_type: 'circuit_time',
        duration_seconds: block.block_type === 'emom' ? block.minutes * 60 : 300,
        rest_as_needed: true,
        exercises: ensureAtLeastExercises(sourceExercises, 1, 'Exercise')
      } satisfies CircuitTimeBlock;
    case 'superset':
      return {
        ...base,
        block_type: 'superset',
        sets: block.block_type === 'straight_sets' ? block.sets : 3,
        exercise_pairs: [[cloneExercise(sourceExercises[0]), cloneExercise(sourceExercises[1])]]
      } satisfies SupersetBlock;
    case 'emom':
      return {
        ...base,
        block_type: 'emom',
        minutes: block.block_type === 'circuit_time' ? Math.max(1, Math.round(block.duration_seconds / 60)) : 10,
        exercises: [cloneExercise(sourceExercises[0])]
      } satisfies EmomBlock;
  }
}

export const BLOCK_TYPE_LABELS: Record<BlockType, string> = {
  flow: 'Flow',
  straight_sets: 'Straight Sets',
  circuit_rounds: 'Circuit Rounds',
  circuit_time: 'Timed Circuit',
  superset: 'Superset',
  emom: 'EMOM'
};

export function createEmptyExercise(seed = 'New Exercise'): Exercise {
  return {
    exercise_id: createId(seed),
    title: seed,
    equipment: { kind: 'bodyweight' },
    prescription: { mode: 'reps', reps: 10 }
  };
}

export function createEmptyBlock(title = 'New Block', blockType: BlockType = 'flow'): Block {
  return defaultBlockValues(blockType, title);
}

export function createEmptySection(title = 'New Section'): Section {
  return {
    section_id: createId(title),
    title,
    blocks: [createEmptyBlock()]
  };
}

export function createEmptyStage(title = 'Main', stageId: StageId = 'main'): Stage {
  return {
    stage_id: stageId,
    title,
    sections: [createEmptySection()]
  };
}

export function createEmptySession(seed = 'Untitled Session'): SessionDefinition {
  return {
    schema_version: '1.1',
    session_id: createId(seed),
    title: seed,
    tags: ['draft'],
    stages: [createEmptyStage('Main', 'main')]
  };
}

export function updateSessionTitle(session: SessionDefinition, title: string): SessionDefinition {
  const next = clone(session);
  next.title = title || 'Untitled Session';
  return next;
}

export function updateSessionId(session: SessionDefinition, sessionId: string): SessionDefinition {
  const next = clone(session);
  next.session_id = slugify(sessionId) || createId('session');
  return next;
}

export function updateSessionDescription(session: SessionDefinition, description: string): SessionDefinition {
  const next = clone(session);
  next.description = description || undefined;
  return next;
}

export function updateSessionDuration(session: SessionDefinition, durationMinutes: number | undefined): SessionDefinition {
  const next = clone(session);
  next.duration_minutes = clampOptionalInteger(durationMinutes, 1);
  return next;
}

export function updateSessionTags(session: SessionDefinition, tags: string[]): SessionDefinition {
  const next = clone(session);
  next.tags = tags.map((tag) => tag.trim()).filter(Boolean);
  return next;
}

export function addStage(session: SessionDefinition, stageId?: StageId): SessionDefinition {
  const next = clone(session);
  const candidate = stageId ?? STAGE_SEQUENCE.find((item) => !next.stages.some((stage) => stage.stage_id === item)) ?? 'main';
  const title = candidate === 'warmup' ? 'Warm-up' : candidate === 'cooldown' ? 'Cool Down' : 'Main';
  next.stages.push(createEmptyStage(title, candidate));
  return next;
}

export function updateStageTitle(session: SessionDefinition, stageIndex: number, title: string): SessionDefinition {
  const next = clone(session);
  const stage = next.stages[stageIndex];
  if (!stage) return next;
  stage.title = title || 'Untitled Stage';
  return next;
}

export function updateStageId(session: SessionDefinition, stageIndex: number, stageId: StageId): SessionDefinition {
  const next = clone(session);
  const stage = next.stages[stageIndex];
  if (!stage) return next;
  stage.stage_id = stageId;
  return next;
}

export function removeStage(session: SessionDefinition, stageIndex: number): SessionDefinition {
  if (session.stages.length <= 1) {
    return session;
  }

  const next = clone(session);
  next.stages.splice(stageIndex, 1);
  return next;
}

export function moveStage(session: SessionDefinition, stageIndex: number, direction: -1 | 1): SessionDefinition {
  const next = clone(session);
  moveItem(next.stages, stageIndex, direction);
  return next;
}

export function addSection(session: SessionDefinition, stageIndex: number): SessionDefinition {
  const next = clone(session);
  const stage = next.stages[stageIndex];
  if (!stage) return next;
  stage.sections = stage.sections ?? [];
  stage.sections.push(createEmptySection());
  return next;
}

export function updateSectionTitle(session: SessionDefinition, path: SectionPath, title: string): SessionDefinition {
  const next = clone(session);
  const section = getSection(next.stages[path.stageIndex], path.sectionIndex);
  if (!section) return next;
  section.title = title || 'Untitled Section';
  return next;
}

export function updateSectionRest(session: SessionDefinition, path: SectionPath, seconds: number | undefined): SessionDefinition {
  const next = clone(session);
  const section = getSection(next.stages[path.stageIndex], path.sectionIndex);
  if (!section) return next;
  section.rest_after_section_seconds = clampOptionalInteger(seconds, 0);
  return next;
}

export function removeSection(session: SessionDefinition, path: SectionPath): SessionDefinition {
  const stage = session.stages[path.stageIndex];
  if (!stage?.sections || stage.sections.length <= 1) {
    return session;
  }

  const next = clone(session);
  next.stages[path.stageIndex].sections?.splice(path.sectionIndex, 1);
  return next;
}

export function moveSection(session: SessionDefinition, path: SectionPath, direction: -1 | 1): SessionDefinition {
  const next = clone(session);
  const sections = next.stages[path.stageIndex]?.sections;
  if (!sections) return next;
  moveItem(sections, path.sectionIndex, direction);
  return next;
}

export function addBlock(session: SessionDefinition, path: SectionPath, blockType: BlockType = 'flow'): SessionDefinition {
  const next = clone(session);
  const section = getSection(next.stages[path.stageIndex], path.sectionIndex);
  if (!section) return next;
  section.blocks.push(createEmptyBlock('New Block', blockType));
  return next;
}

export function updateBlockTitle(session: SessionDefinition, path: BlockPath, title: string): SessionDefinition {
  const next = clone(session);
  const block = getBlock(next, path);
  if (!block) return next;
  block.title = title || 'Untitled Block';
  return next;
}

export function updateBlockType(session: SessionDefinition, path: BlockPath, blockType: BlockType): SessionDefinition {
  const next = clone(session);
  const section = getSection(next.stages[path.stageIndex], path.sectionIndex);
  if (!section) return next;
  const block = section.blocks[path.blockIndex];
  if (!block) return next;
  section.blocks[path.blockIndex] = convertBlock(block, blockType);
  return next;
}

export function updateBlockSetting(
  session: SessionDefinition,
  path: BlockPath,
  field:
    | 'rounds'
    | 'sets'
    | 'minutes'
    | 'duration_seconds'
    | 'rest_between_rounds_seconds'
    | 'rest_between_sets_seconds'
    | 'time_cap_seconds'
    | 'rest_as_needed',
  value: number | boolean | undefined
): SessionDefinition {
  const next = clone(session);
  const block = getBlock(next, path);
  if (!block) return next;

  switch (field) {
    case 'rounds':
      if (block.block_type === 'flow' || block.block_type === 'circuit_rounds') {
        block.rounds = clampInteger(Number(value), 1);
      }
      break;
    case 'sets':
      if (block.block_type === 'straight_sets' || block.block_type === 'superset') {
        block.sets = clampInteger(Number(value), 1);
      }
      break;
    case 'minutes':
      if (block.block_type === 'emom') {
        block.minutes = clampInteger(Number(value), 1);
      }
      break;
    case 'duration_seconds':
      if (block.block_type === 'circuit_time') {
        block.duration_seconds = clampInteger(Number(value), 1);
      }
      break;
    case 'rest_between_rounds_seconds':
      if (block.block_type === 'flow' || block.block_type === 'circuit_rounds') {
        block.rest_between_rounds_seconds = clampOptionalInteger(
          value === undefined ? undefined : Number(value),
          0
        );
      }
      break;
    case 'rest_between_sets_seconds':
      if (block.block_type === 'straight_sets' || block.block_type === 'superset') {
        block.rest_between_sets_seconds = clampOptionalInteger(
          value === undefined ? undefined : Number(value),
          0
        );
      }
      break;
    case 'time_cap_seconds':
      if (block.block_type === 'flow') {
        block.time_cap_seconds = clampOptionalInteger(value === undefined ? undefined : Number(value), 1);
      }
      break;
    case 'rest_as_needed':
      if (block.block_type === 'circuit_time') {
        block.rest_as_needed = Boolean(value);
      }
      break;
  }

  return next;
}

export function removeBlock(session: SessionDefinition, path: BlockPath): SessionDefinition {
  const section = session.stages[path.stageIndex]?.sections?.[path.sectionIndex];
  if (!section || section.blocks.length <= 1) {
    return session;
  }

  const next = clone(session);
  next.stages[path.stageIndex].sections?.[path.sectionIndex].blocks.splice(path.blockIndex, 1);
  return next;
}

export function moveBlock(session: SessionDefinition, path: BlockPath, direction: -1 | 1): SessionDefinition {
  const next = clone(session);
  const blocks = next.stages[path.stageIndex]?.sections?.[path.sectionIndex]?.blocks;
  if (!blocks) return next;
  moveItem(blocks, path.blockIndex, direction);
  return next;
}

export function addExercise(session: SessionDefinition, path: BlockPath): SessionDefinition {
  const next = clone(session);
  const block = getBlock(next, path);
  if (!block || block.block_type === 'superset') return next;
  block.exercises.push(createEmptyExercise());
  return next;
}

export function removeExercise(session: SessionDefinition, path: ExercisePath): SessionDefinition {
  const block = getBlock(session, path);
  if (!block || block.block_type === 'superset' || block.exercises.length <= 1) {
    return session;
  }

  const next = clone(session);
  const nextBlock = getBlock(next, path);
  if (!nextBlock || nextBlock.block_type === 'superset') return next;
  nextBlock.exercises.splice(path.exerciseIndex, 1);
  return next;
}

export function moveExercise(session: SessionDefinition, path: ExercisePath, direction: -1 | 1): SessionDefinition {
  const next = clone(session);
  const block = getBlock(next, path);
  if (!block || block.block_type === 'superset') return next;
  moveItem(block.exercises, path.exerciseIndex, direction);
  return next;
}

export function addExercisePair(session: SessionDefinition, path: BlockPath): SessionDefinition {
  const next = clone(session);
  const block = getBlock(next, path);
  if (!block || block.block_type !== 'superset') return next;
  block.exercise_pairs.push(createExercisePair('Pair'));
  return next;
}

export function removeExercisePair(session: SessionDefinition, path: BlockPath, pairIndex: number): SessionDefinition {
  const block = getBlock(session, path);
  if (!block || block.block_type !== 'superset' || block.exercise_pairs.length <= 1) {
    return session;
  }

  const next = clone(session);
  const nextBlock = getBlock(next, path);
  if (!nextBlock || nextBlock.block_type !== 'superset') return next;
  nextBlock.exercise_pairs.splice(pairIndex, 1);
  return next;
}

export function moveExercisePair(session: SessionDefinition, path: BlockPath, pairIndex: number, direction: -1 | 1): SessionDefinition {
  const next = clone(session);
  const block = getBlock(next, path);
  if (!block || block.block_type !== 'superset') return next;
  moveItem(block.exercise_pairs, pairIndex, direction);
  return next;
}

export function updateExerciseTitle(session: SessionDefinition, path: AnyExercisePath, title: string): SessionDefinition {
  const next = clone(session);
  const block = getBlock(next, path);
  if (!block) return next;
  const exercise = getExerciseFromBlock(block, path);
  if (!exercise) return next;
  exercise.title = title;
  return next;
}

export function updateExercisePrescriptionMode(
  session: SessionDefinition,
  path: AnyExercisePath,
  mode: Exercise['prescription']['mode']
): SessionDefinition {
  const next = clone(session);
  const block = getBlock(next, path);
  if (!block) return next;
  const exercise = getExerciseFromBlock(block, path);
  if (!exercise) return next;

  switch (mode) {
    case 'reps':
      exercise.prescription = { mode: 'reps', reps: 10 };
      break;
    case 'rep_range':
      exercise.prescription = { mode: 'rep_range', min_reps: 8, max_reps: 12 };
      break;
    case 'time':
      exercise.prescription = { mode: 'time', seconds: 60 };
      break;
  }

  return next;
}

export function updateExercisePrescriptionValue(
  session: SessionDefinition,
  path: AnyExercisePath,
  field: 'reps' | 'min_reps' | 'max_reps' | 'seconds',
  value: number
): SessionDefinition {
  const next = clone(session);
  const block = getBlock(next, path);
  if (!block) return next;
  const exercise = getExerciseFromBlock(block, path);
  if (!exercise) return next;

  if (exercise.prescription.mode === 'reps' && field === 'reps') {
    exercise.prescription.reps = clampInteger(value, 1);
  }

  if (exercise.prescription.mode === 'rep_range') {
    if (field === 'min_reps') {
      exercise.prescription.min_reps = clampInteger(value, 1);
      exercise.prescription.max_reps = Math.max(exercise.prescription.max_reps, exercise.prescription.min_reps);
    }
    if (field === 'max_reps') {
      exercise.prescription.max_reps = clampInteger(value, exercise.prescription.min_reps);
    }
  }

  if (exercise.prescription.mode === 'time' && field === 'seconds') {
    exercise.prescription.seconds = clampInteger(value, 1);
  }

  return next;
}

export function updateExerciseEquipmentKind(
  session: SessionDefinition,
  path: AnyExercisePath,
  equipmentKind: Exercise['equipment']['kind']
): SessionDefinition {
  const next = clone(session);
  const block = getBlock(next, path);
  if (!block) return next;
  const exercise = getExerciseFromBlock(block, path);
  if (!exercise) return next;

  switch (equipmentKind) {
    case 'bodyweight':
      exercise.equipment = { kind: 'bodyweight' };
      break;
    case 'kettlebell':
    case 'dumbbell':
    case 'barbell':
      exercise.equipment = {
        kind: equipmentKind,
        load: { unit: 'kg', value: 10 }
      };
      break;
    case 'resistance_band':
      exercise.equipment = {
        kind: 'resistance_band',
        band: { color: 'yellow', style: 'loop' }
      };
      break;
    case 'machine':
      exercise.equipment = { kind: 'machine', machine_name: 'Machine' };
      break;
    case 'other':
      exercise.equipment = { kind: 'other', label: 'Equipment' };
      break;
  }

  return next;
}

export function updateExerciseLoadValue(session: SessionDefinition, path: AnyExercisePath, value: number): SessionDefinition {
  const next = clone(session);
  const block = getBlock(next, path);
  if (!block) return next;
  const exercise = getExerciseFromBlock(block, path);
  if (!exercise) return next;

  if ('load' in exercise.equipment) {
    exercise.equipment.load = {
      unit: exercise.equipment.load?.unit ?? 'kg',
      value: Math.max(0.5, Math.round(value * 10) / 10)
    };
  }

  return next;
}

export function updateExerciseRest(session: SessionDefinition, path: AnyExercisePath, seconds: number | undefined): SessionDefinition {
  const next = clone(session);
  const block = getBlock(next, path);
  if (!block) return next;
  const exercise = getExerciseFromBlock(block, path);
  if (!exercise) return next;
  exercise.rest_after_seconds = clampOptionalInteger(seconds, 0);
  return next;
}

export function updateExerciseLink(session: SessionDefinition, path: AnyExercisePath, link: ExerciseLink | undefined): SessionDefinition {
  const next = clone(session);
  const block = getBlock(next, path);
  if (!block) return next;
  const exercise = getExerciseFromBlock(block, path);
  if (!exercise) return next;
  exercise.link = link?.url ? link : undefined;
  return next;
}

export function updateExerciseCoach(session: SessionDefinition, path: AnyExercisePath, coach: string): SessionDefinition {
  const next = clone(session);
  const block = getBlock(next, path);
  if (!block) return next;
  const exercise = getExerciseFromBlock(block, path);
  if (!exercise) return next;
  const t = coach.trim();
  exercise.coach = t ? t : undefined;
  return next;
}
