import 'server-only';

import { safeServiceErrorMessage } from '@/lib/safe-service-error';
import {
  DEFAULT_LCD_TUNING_VALUES,
  resolveLcdTuningValues,
  type LcdTuningValues
} from '@/lib/ui-skin';
import { createSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase/admin';

const TABLE = 'lcd_tuning_profiles';
const GLOBAL_PROFILE_KEY = 'global';
const SUPABASE_CONFIG_ERROR =
  'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local.';

export interface GlobalLcdTuningBootstrap {
  values: LcdTuningValues;
  isAuthoritative: boolean;
}

function cloneLcdTuning(values: LcdTuningValues): LcdTuningValues {
  return structuredClone(values);
}

export async function loadGlobalLcdTuningBootstrap(): Promise<GlobalLcdTuningBootstrap> {
  if (!isSupabaseConfigured()) {
    return {
      values: cloneLcdTuning(DEFAULT_LCD_TUNING_VALUES),
      isAuthoritative: false
    };
  }

  const client = createSupabaseAdmin();
  if (!client) {
    return {
      values: cloneLcdTuning(DEFAULT_LCD_TUNING_VALUES),
      isAuthoritative: false
    };
  }

  const { data, error } = await client
    .from(TABLE)
    .select('payload')
    .eq('profile_key', GLOBAL_PROFILE_KEY)
    .maybeSingle();

  if (error) {
    return {
      values: cloneLcdTuning(DEFAULT_LCD_TUNING_VALUES),
      isAuthoritative: false
    };
  }

  return {
    values: resolveLcdTuningValues(data?.payload ?? DEFAULT_LCD_TUNING_VALUES),
    isAuthoritative: true
  };
}

export async function getGlobalLcdTuning(): Promise<LcdTuningValues> {
  const result = await loadGlobalLcdTuningBootstrap();
  return result.values;
}

export async function saveGlobalLcdTuning(
  values: LcdTuningValues
): Promise<{ ok: true; values: LcdTuningValues } | { ok: false; status: number; error: string }> {
  const client = createSupabaseAdmin();
  if (!client) {
    return {
      ok: false,
      status: 503,
      error: SUPABASE_CONFIG_ERROR
    };
  }

  const payload = resolveLcdTuningValues(values);
  const { error } = await client.from(TABLE).upsert(
    {
      profile_key: GLOBAL_PROFILE_KEY,
      payload,
      updated_at: new Date().toISOString()
    },
    { onConflict: 'profile_key' }
  );

  if (error) {
    return {
      ok: false,
      status: 500,
      error: safeServiceErrorMessage(error.message) || 'Supabase request failed.'
    };
  }

  return {
    ok: true,
    values: payload
  };
}
