import type { WeightUnit } from './session';

export type DifficultyFlag = 'easy' | 'good' | 'hard';

export interface StepRunOverride {
  step_id: string;
  actual_reps?: number;
  actual_time_seconds?: number;
  actual_load?: {
    unit: WeightUnit;
    value: number;
  };
  difficulty?: DifficultyFlag;
  note?: string;
}

export interface SessionRun {
  run_id: string;
  session_id: string;
  started_at: string;
  completed_at?: string;
  step_overrides: StepRunOverride[];
  session_note?: string;
}
