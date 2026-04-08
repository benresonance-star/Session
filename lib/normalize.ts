import { sectionsForStage } from '@/lib/session-tree';
import type { NormalizedSessionDefinition, SessionDefinition } from '@/types/session';

export function normalizeSession(session: SessionDefinition): NormalizedSessionDefinition {
  const stages = session.stages ?? [];

  return {
    ...session,
    tags: session.tags ?? [],
    stages: stages.map((stage) => {
      return {
        stage_id: stage.stage_id,
        title: stage.title,
        notes: stage.notes,
        sections: sectionsForStage(stage)
      };
    })
  };
}
