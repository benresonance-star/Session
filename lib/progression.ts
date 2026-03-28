import type { PlaybackPlan } from '@/types/playback';
import type { SessionMutationProposal } from '@/types/session-mutation';
import type { SessionRun } from '@/types/session-run';

export function generateMutationProposal(
  plan: PlaybackPlan,
  run: SessionRun
): SessionMutationProposal {
  const changes = run.step_overrides.flatMap((override) => {
    const step = plan.steps.find((s) => s.step_id === override.step_id);
    if (!step || step.type !== 'exercise') return [];
    if (step.exercise.prescription.mode === 'reps' && override.difficulty === 'easy') {
      return [{
        step_id: step.step_id,
        field: 'reps' as const,
        old_value: step.exercise.prescription.reps,
        new_value: step.exercise.prescription.reps + 2,
        reason: 'easy' as const
      }];
    }
    return [];
  });

  return {
    session_id: run.session_id,
    changes,
    summary: {
      progressed: changes.length,
      maintained: 0,
      regressed: 0
    }
  };
}
