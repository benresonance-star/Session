import Ajv2020 from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
import schema from '@/schema/session-definition.schema.json';
import { forEachExercise } from '@/lib/session-tree';
import type { SessionDefinition } from '@/types/session';

const DEFAULT_EXERCISE_TITLE_FOR_PERSISTENCE = 'Untitled Exercise';

/** Deep clone; replaces whitespace-only exercise titles so JSON schema `minLength: 1` passes on save/export. */
export function normalizeEmptyExerciseTitlesForPersistence(session: SessionDefinition): SessionDefinition {
  const next = structuredClone(session);
  forEachExercise(next, (exercise) => {
    if (!exercise.title.trim()) {
      exercise.title = DEFAULT_EXERCISE_TITLE_FOR_PERSISTENCE;
    }
  });
  return next;
}

export function sessionHasCoach(session: SessionDefinition): boolean {
  let hasCoach = false;
  forEachExercise(session, (exercise) => {
    if (exercise.coach?.trim()) {
      hasCoach = true;
    }
  });
  return hasCoach;
}

/** Normalize titles for schema, then emit `schema_version` 1.2 iff any exercise has `coach`; otherwise keep existing version. */
export function prepareSessionForPersistence(session: SessionDefinition): SessionDefinition {
  const next = normalizeEmptyExerciseTitlesForPersistence(session);
  next.schema_version = sessionHasCoach(next) ? '1.2' : next.schema_version;
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
