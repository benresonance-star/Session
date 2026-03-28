import type { DifficultyFlag } from './session-run';

export type SessionField =
  | 'reps'
  | 'min_reps'
  | 'max_reps'
  | 'seconds'
  | 'load'
  | 'rest_after_seconds';

export interface SessionChange {
  step_id: string;
  field: SessionField;
  old_value: unknown;
  new_value: unknown;
  reason?: DifficultyFlag | 'manual';
}

export interface SessionMutationProposal {
  session_id: string;
  changes: SessionChange[];
  summary?: {
    progressed: number;
    maintained: number;
    regressed: number;
  };
}
