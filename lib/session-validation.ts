import Ajv2020 from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
import schema from '@/schema/session-definition.schema.json';
import type { Block, SessionDefinition, Stage } from '@/types/session';

const DEFAULT_EXERCISE_TITLE_FOR_PERSISTENCE = 'Untitled Exercise';

function blocksForStage(stage: Stage): Block[] {
  const fromSections = (stage.sections ?? []).flatMap((s) => s.blocks);
  const fromStage = stage.blocks ?? [];
  if (fromSections.length > 0 && fromStage.length > 0) {
    return [...fromSections, ...fromStage];
  }
  return fromSections.length > 0 ? fromSections : fromStage;
}

/** Deep clone; replaces whitespace-only exercise titles so JSON schema `minLength: 1` passes on save/export. */
export function normalizeEmptyExerciseTitlesForPersistence(session: SessionDefinition): SessionDefinition {
  const next = structuredClone(session);
  for (const stage of next.stages) {
    for (const block of blocksForStage(stage)) {
      if (block.block_type === 'superset') {
        for (const pair of block.exercise_pairs) {
          for (const ex of pair) {
            if (!ex.title.trim()) {
              ex.title = DEFAULT_EXERCISE_TITLE_FOR_PERSISTENCE;
            }
          }
        }
      } else {
        for (const ex of block.exercises) {
          if (!ex.title.trim()) {
            ex.title = DEFAULT_EXERCISE_TITLE_FOR_PERSISTENCE;
          }
        }
      }
    }
  }
  return next;
}

export interface SessionValidationResult {
  isValid: boolean;
  errors: string[];
}

const ajv = new Ajv2020({
  allErrors: true,
  strict: false
});

addFormats(ajv);

const validate = ajv.compile(schema);

function formatPath(path: string): string {
  return path.replace(/\//g, '.').replace(/^\./, '') || 'session';
}

export function validateSessionDefinition(candidate: unknown): SessionValidationResult {
  const isValid = validate(candidate);

  if (isValid) {
    return {
      isValid: true,
      errors: []
    };
  }

  return {
    isValid: false,
    errors: (validate.errors ?? []).map((error) => {
      const path = formatPath(error.instancePath);
      const suffix = error.message ? ` ${error.message}` : '';
      return `${path}:${suffix}`.trim();
    })
  };
}

export function parseImportedSession(source: string): { session?: SessionDefinition; errors: string[] } {
  try {
    const candidate = JSON.parse(source) as unknown;
    const result = validateSessionDefinition(candidate);

    if (!result.isValid) {
      return { errors: result.errors };
    }

    return {
      session: candidate as SessionDefinition,
      errors: []
    };
  } catch (error) {
    return {
      errors: [
        error instanceof Error ? error.message : 'Unable to parse JSON.'
      ]
    };
  }
}

export function exportSessionDefinition(session: SessionDefinition): string {
  return `${JSON.stringify(session, null, 2)}\n`;
}
