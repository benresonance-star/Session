import type { Block, Exercise, NormalizedSessionDefinition } from '@/types/session';
import type { PlaybackPlan, PlaybackStep } from '@/types/playback';
import { normalizeSession } from './normalize';

function pushStep(steps: PlaybackStep[], step: Record<string, unknown>): void {
  steps.push({ ...step, step_index: steps.length } as PlaybackStep);
}

function compileExercise(
  steps: PlaybackStep[],
  sessionId: string,
  context: {
    stage_id: string;
    stage_title: string;
    section_id: string;
    section_title: string;
    block_id: string;
    block_title: string;
    block_type: Block['block_type'];
  },
  exercise: Exercise,
  extras?: Partial<PlaybackStep>
): void {
  pushStep(steps, {
    type: 'exercise',
    step_id: `${context.block_id}-${exercise.exercise_id}-${steps.length}`,
    session_id: sessionId,
    stage_id: context.stage_id as any,
    stage_title: context.stage_title,
    section_id: context.section_id,
    section_title: context.section_title,
    block_id: context.block_id,
    block_title: context.block_title,
    block_type: context.block_type,
    exercise,
    ...extras
  });

  if (exercise.rest_after_seconds) {
    pushStep(steps, {
      type: 'rest',
      step_id: `${context.block_id}-${exercise.exercise_id}-rest-${steps.length}`,
      session_id: sessionId,
      stage_id: context.stage_id as any,
      stage_title: context.stage_title,
      section_id: context.section_id,
      section_title: context.section_title,
      block_id: context.block_id,
      block_title: context.block_title,
      block_type: context.block_type,
      reason: 'exercise_rest',
      duration_seconds: exercise.rest_after_seconds,
      ...extras
    });
  }
}

function compileBlock(steps: PlaybackStep[], session: NormalizedSessionDefinition, context: {
  stage_id: string; stage_title: string; section_id: string; section_title: string;
}, block: Block): void {
  const base = {
    session_id: session.session_id,
    stage_id: context.stage_id as any,
    stage_title: context.stage_title,
    section_id: context.section_id,
    section_title: context.section_title,
    block_id: block.block_id,
    block_title: block.title,
    block_type: block.block_type
  };

  pushStep(steps, { type: 'block_start', step_id: `${block.block_id}-start`, ...base });

  switch (block.block_type) {
    case 'flow':
    case 'circuit_rounds': {
      const totalRounds = block.block_type === 'flow' ? block.rounds ?? 1 : block.rounds;
      for (let round = 1; round <= totalRounds; round += 1) {
        for (const exercise of block.exercises) {
          compileExercise(steps, session.session_id, {
            ...base,
            block_id: block.block_id,
            block_title: block.title,
            block_type: block.block_type
          }, exercise, { round_index: round, round_total: totalRounds });
        }
        const rest = block.rest_between_rounds_seconds;
        if (rest && round < totalRounds) {
          pushStep(steps, {
            type: 'rest',
            step_id: `${block.block_id}-round-rest-${round}`,
            ...base,
            reason: 'round_rest',
            duration_seconds: rest,
            round_index: round,
            round_total: totalRounds
          });
        }
      }
      break;
    }
    case 'straight_sets': {
      for (let set = 1; set <= block.sets; set += 1) {
        for (const exercise of block.exercises) {
          compileExercise(steps, session.session_id, {
            ...base,
            block_id: block.block_id,
            block_title: block.title,
            block_type: block.block_type
          }, exercise, { set_index: set, set_total: block.sets });
        }
        const rest = block.rest_between_sets_seconds;
        if (rest && set < block.sets) {
          pushStep(steps, {
            type: 'rest',
            step_id: `${block.block_id}-set-rest-${set}`,
            ...base,
            reason: 'set_rest',
            duration_seconds: rest,
            set_index: set,
            set_total: block.sets
          });
        }
      }
      break;
    }
    case 'emom': {
      const exercise = block.exercises[0];
      if (exercise) {
        for (let minute = 1; minute <= block.minutes; minute += 1) {
          compileExercise(steps, session.session_id, {
            ...base,
            block_id: block.block_id,
            block_title: block.title,
            block_type: block.block_type
          }, exercise, { minute_index: minute, minute_total: block.minutes });
        }
      }
      break;
    }
    case 'circuit_time': {
      for (const exercise of block.exercises) {
        compileExercise(steps, session.session_id, {
          ...base,
          block_id: block.block_id,
          block_title: block.title,
          block_type: block.block_type
        }, exercise);
      }
      break;
    }
    case 'superset': {
      for (let set = 1; set <= block.sets; set += 1) {
        for (const [a, b] of block.exercise_pairs) {
          compileExercise(steps, session.session_id, { ...base, block_id: block.block_id, block_title: block.title, block_type: block.block_type }, a, { set_index: set, set_total: block.sets });
          compileExercise(steps, session.session_id, { ...base, block_id: block.block_id, block_title: block.title, block_type: block.block_type }, b, { set_index: set, set_total: block.sets });
        }
        const rest = block.rest_between_sets_seconds;
        if (rest && set < block.sets) {
          pushStep(steps, {
            type: 'rest',
            step_id: `${block.block_id}-set-rest-${set}`,
            ...base,
            reason: 'set_rest',
            duration_seconds: rest,
            set_index: set,
            set_total: block.sets
          });
        }
      }
      break;
    }
  }

  pushStep(steps, { type: 'block_end', step_id: `${block.block_id}-end`, ...base });
}

export function compilePlaybackPlan(sessionDef: import('@/types/session').SessionDefinition): PlaybackPlan {
  const session = normalizeSession(sessionDef);
  const steps: PlaybackStep[] = [];

  for (const stage of session.stages) {
    pushStep(steps, {
      type: 'stage_start',
      step_id: `${stage.stage_id}-start`,
      session_id: session.session_id,
      stage_id: stage.stage_id,
      stage_title: stage.title
    });

    for (const section of stage.sections) {
      pushStep(steps, {
        type: 'section_start',
        step_id: `${section.section_id}-start`,
        session_id: session.session_id,
        stage_id: stage.stage_id,
        stage_title: stage.title,
        section_id: section.section_id,
        section_title: section.title
      });

      for (const block of section.blocks) {
        compileBlock(steps, session, {
          stage_id: stage.stage_id,
          stage_title: stage.title,
          section_id: section.section_id,
          section_title: section.title
        }, block);
      }

      if (section.rest_after_section_seconds) {
        pushStep(steps, {
          type: 'rest',
          step_id: `${section.section_id}-rest`,
          session_id: session.session_id,
          stage_id: stage.stage_id,
          stage_title: stage.title,
          section_id: section.section_id,
          section_title: section.title,
          reason: 'section_rest',
          duration_seconds: section.rest_after_section_seconds
        });
      }

      pushStep(steps, {
        type: 'section_end',
        step_id: `${section.section_id}-end`,
        session_id: session.session_id,
        stage_id: stage.stage_id,
        stage_title: stage.title,
        section_id: section.section_id,
        section_title: section.title
      });
    }

    pushStep(steps, {
      type: 'stage_end',
      step_id: `${stage.stage_id}-end`,
      session_id: session.session_id,
      stage_id: stage.stage_id,
      stage_title: stage.title
    });
  }

  pushStep(steps, {
    type: 'session_complete',
    step_id: 'session-complete',
    session_id: session.session_id
  });

  return {
    session_id: session.session_id,
    session_title: session.title,
    steps
  };
}
