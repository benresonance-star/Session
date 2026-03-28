import type { SessionDefinition } from '@/types/session';
import type { SessionMutationProposal } from '@/types/session-mutation';

export function applyMutationToSession(
  session: SessionDefinition,
  proposal: SessionMutationProposal
): SessionDefinition {
  const next = structuredClone(session);
  for (const stage of next.stages) {
    const sections = stage.sections ?? [];
    for (const section of sections) {
      for (const block of section.blocks) {
        const exercises = block.block_type === 'superset'
          ? block.exercise_pairs.flatMap((pair) => pair)
          : block.exercises;
        for (const exercise of exercises) {
          const change = proposal.changes.find(
            (item) => item.field === 'reps' && item.step_id.includes(exercise.exercise_id)
          );
          if (change && exercise.prescription.mode === 'reps') {
            exercise.prescription.reps = change.new_value as number;
          }
        }
      }
    }
  }
  return next;
}
