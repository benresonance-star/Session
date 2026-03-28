import type { NormalizedSessionDefinition, Section, SessionDefinition } from '@/types/session';

export function normalizeSession(session: SessionDefinition): NormalizedSessionDefinition {
  return {
    ...session,
    tags: session.tags ?? [],
    stages: session.stages.map((stage) => ({
      stage_id: stage.stage_id,
      title: stage.title,
      notes: stage.notes,
      sections: stage.sections ?? [
        {
          section_id: `${stage.stage_id}-default`,
          title: stage.title,
          notes: stage.notes,
          blocks: stage.blocks ?? []
        } satisfies Section
      ]
    }))
  };
}
