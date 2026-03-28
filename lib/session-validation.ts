import Ajv2020 from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
import schema from '@/schema/session-definition.schema.json';
import type { SessionDefinition } from '@/types/session';

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
