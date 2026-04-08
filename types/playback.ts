import type { BlockType, Exercise, ExerciseLink, StageId } from './session';

export type PlaybackStepType =
  | 'stage_start'
  | 'section_start'
  | 'block_start'
  | 'exercise'
  | 'rest'
  | 'circuit_time_play'
  | 'block_end'
  | 'section_end'
  | 'stage_end'
  | 'session_complete';

export type RestReason =
  | 'exercise_rest'
  | 'set_rest'
  | 'round_rest'
  | 'section_rest'
  | 'manual_rest';

export interface PlaybackPlan {
  session_id: string;
  session_title: string;
  /** Session-level reference URL; shown in play UI during active work only. */
  session_link?: ExerciseLink;
  estimated_duration_seconds?: number;
  steps: PlaybackStep[];
}

export interface PlaybackStepBase {
  step_id: string;
  type: PlaybackStepType;
  session_id: string;
  stage_id?: StageId;
  stage_title?: string;
  section_id?: string;
  section_title?: string;
  block_id?: string;
  block_title?: string;
  block_type?: BlockType;
  step_index: number;
}

export interface StageStartStep extends PlaybackStepBase {
  type: 'stage_start';
}

export interface SectionStartStep extends PlaybackStepBase {
  type: 'section_start';
}

export interface BlockStartStep extends PlaybackStepBase {
  type: 'block_start';
}

export interface ExerciseStep extends PlaybackStepBase {
  type: 'exercise';
  exercise: Exercise;
  round_index?: number;
  round_total?: number;
  set_index?: number;
  set_total?: number;
  pair_index?: number;
  pair_total?: number;
  minute_index?: number;
  minute_total?: number;
  cluster_index?: number;
  cluster_total?: number;
}

export interface RestStep extends PlaybackStepBase {
  type: 'rest';
  reason: RestReason;
  duration_seconds: number;
  round_index?: number;
  round_total?: number;
  set_index?: number;
  set_total?: number;
  minute_index?: number;
  minute_total?: number;
}

/** Single play step for a timed circuit: AMRAP-style loop until duration elapses (handled in UI). */
export interface CircuitTimePlayStep extends PlaybackStepBase {
  type: 'circuit_time_play';
  duration_seconds: number;
  exercises: Exercise[];
  rest_as_needed?: boolean;
}

export interface BlockEndStep extends PlaybackStepBase {
  type: 'block_end';
}

export interface SectionEndStep extends PlaybackStepBase {
  type: 'section_end';
}

export interface StageEndStep extends PlaybackStepBase {
  type: 'stage_end';
}

export interface SessionCompleteStep extends PlaybackStepBase {
  type: 'session_complete';
}

export type PlaybackStep =
  | StageStartStep
  | SectionStartStep
  | BlockStartStep
  | ExerciseStep
  | RestStep
  | CircuitTimePlayStep
  | BlockEndStep
  | SectionEndStep
  | StageEndStep
  | SessionCompleteStep;

export type PlaybackStatus = 'idle' | 'ready' | 'playing' | 'paused' | 'completed';

export interface PlaybackState {
  status: PlaybackStatus;
  plan: PlaybackPlan | null;
  current_step_index: number;
  current_step_elapsed_seconds: number;
  is_timer_running: boolean;
}
