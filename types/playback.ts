import type { BlockType, Exercise, ExerciseLink, StageId } from './session';

export type PlaybackStepType = 'exercise' | 'rest' | 'circuit_time_play';

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

export type PlaybackStep =
  | ExerciseStep
  | RestStep
  | CircuitTimePlayStep;
