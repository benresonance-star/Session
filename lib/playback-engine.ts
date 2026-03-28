import type { PlaybackPlan, PlaybackState } from '@/types/playback';

export function createInitialPlaybackState(plan: PlaybackPlan): PlaybackState {
  return {
    status: 'ready',
    plan,
    current_step_index: 0,
    current_step_elapsed_seconds: 0,
    is_timer_running: false
  };
}

export function nextStep(state: PlaybackState): PlaybackState {
  if (!state.plan) return state;
  const nextIndex = state.current_step_index + 1;
  if (nextIndex >= state.plan.steps.length) {
    return { ...state, status: 'completed', is_timer_running: false };
  }
  return {
    ...state,
    current_step_index: nextIndex,
    current_step_elapsed_seconds: 0
  };
}
