import type { NormalizedSessionDefinition, Section, SessionDefinition } from '@/types/session';

export function normalizeSession(session: SessionDefinition): NormalizedSessionDefinition {
  const stages = session.stages ?? [];

  return {
    ...session,
    tags: session.tags ?? [],
    stages: stages.map((stage) => {
      const sectionList = stage.sections;
      const hasSections = Array.isArray(sectionList) && sectionList.length > 0;

      const sections: Section[] = hasSections
        ? sectionList.map((section) => ({
            ...section,
            blocks: section.blocks ?? []
          }))
        : [
            {
              section_id: `${stage.stage_id ?? 'stage'}-default`,
              title: stage.title,
              notes: stage.notes,
              blocks: stage.blocks ?? []
            } satisfies Section
          ];

      return {
        stage_id: stage.stage_id,
        title: stage.title,
        notes: stage.notes,
        sections
      };
    })
  };
}
