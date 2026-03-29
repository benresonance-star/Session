'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from 'react';
import {
  DEFAULT_LCD_TUNING_VALUES,
  getLcdTuningCssVariables,
  hasCustomLcdTuning,
  LCD_TUNING_STORAGE_KEY,
  resolveLcdTuningValues,
  DEFAULT_UI_SKIN,
  resolveUiSkin,
  UI_SKINS,
  UI_SKIN_STORAGE_KEY,
  type LcdTuningKey,
  type LcdTuningValues,
  type UiSkinId
} from '@/lib/ui-skin';

interface SkinContextValue {
  skin: UiSkinId;
  skins: typeof UI_SKINS;
  lcdTuning: LcdTuningValues;
  hasCustomLcdTuning: boolean;
  setSkin: (skin: UiSkinId) => void;
  setLcdTuningValue: (key: LcdTuningKey, value: number) => void;
  resetLcdTuning: () => void;
}

const SkinContext = createContext<SkinContextValue | null>(null);
const LCD_TUNING_SAVE_DEBOUNCE_MS = 300;

function applySkinToDocument(skin: UiSkinId): void {
  document.documentElement.dataset.skin = skin;
}

function applyLcdTuningToDocument(values: LcdTuningValues): void {
  const root = document.documentElement.style;
  const cssVariables = getLcdTuningCssVariables(values);

  for (const [name, value] of Object.entries(cssVariables)) {
    root.setProperty(name, value);
  }
}

function cacheLcdTuning(values: LcdTuningValues): void {
  try {
    window.localStorage.setItem(LCD_TUNING_STORAGE_KEY, JSON.stringify(values));
  } catch {
    /* ignore storage failures */
  }
}

async function persistLcdTuningToServer(values: LcdTuningValues): Promise<void> {
  try {
    await fetch('/api/lcd-tuning', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values)
    });
  } catch {
    /* ignore sync failures and keep local fallback */
  }
}

function readInitialSkin(): UiSkinId {
  if (typeof window === 'undefined') {
    return DEFAULT_UI_SKIN;
  }

  try {
    return resolveUiSkin(window.localStorage.getItem(UI_SKIN_STORAGE_KEY));
  } catch {
    return resolveUiSkin(document.documentElement.dataset.skin);
  }
}

function readInitialLcdTuning(
  initialValues: LcdTuningValues,
  preferInitialLcdTuning: boolean
): LcdTuningValues {
  const fallback = resolveLcdTuningValues(initialValues);

  if (typeof window === 'undefined') {
    return fallback;
  }

  if (preferInitialLcdTuning) {
    return fallback;
  }

  try {
    const raw = window.localStorage.getItem(LCD_TUNING_STORAGE_KEY);
    return resolveLcdTuningValues(raw ? JSON.parse(raw) : fallback);
  } catch {
    return fallback;
  }
}

export function SkinProvider({
  children,
  initialLcdTuning = DEFAULT_LCD_TUNING_VALUES,
  preferInitialLcdTuning = false
}: {
  children: ReactNode;
  initialLcdTuning?: LcdTuningValues;
  preferInitialLcdTuning?: boolean;
}): JSX.Element {
  const lcdSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shouldSyncLcdRef = useRef(false);
  const [skin, setSkinState] = useState<UiSkinId>(readInitialSkin);
  const [lcdTuning, setLcdTuningState] = useState<LcdTuningValues>(() =>
    readInitialLcdTuning(initialLcdTuning, preferInitialLcdTuning)
  );

  useEffect(() => {
    applySkinToDocument(skin);
  }, [skin]);

  useEffect(() => {
    applyLcdTuningToDocument(lcdTuning);
  }, [lcdTuning]);

  useEffect(() => {
    cacheLcdTuning(lcdTuning);
  }, [lcdTuning]);

  useEffect(() => {
    if (!shouldSyncLcdRef.current) {
      return;
    }

    const nextValues = lcdTuning;
    shouldSyncLcdRef.current = false;

    if (lcdSaveTimerRef.current != null) {
      clearTimeout(lcdSaveTimerRef.current);
    }

    lcdSaveTimerRef.current = setTimeout(() => {
      lcdSaveTimerRef.current = null;
      void persistLcdTuningToServer(nextValues);
    }, LCD_TUNING_SAVE_DEBOUNCE_MS);

    return () => {
      if (lcdSaveTimerRef.current != null) {
        clearTimeout(lcdSaveTimerRef.current);
        lcdSaveTimerRef.current = null;
      }
    };
  }, [lcdTuning]);

  useEffect(() => {
    function handleStorage(event: StorageEvent): void {
      if (event.key === UI_SKIN_STORAGE_KEY) {
        const next = resolveUiSkin(event.newValue);
        setSkinState(next);
        applySkinToDocument(next);
        return;
      }

      if (event.key === LCD_TUNING_STORAGE_KEY) {
        let next = DEFAULT_LCD_TUNING_VALUES;
        try {
          next = resolveLcdTuningValues(event.newValue ? JSON.parse(event.newValue) : DEFAULT_LCD_TUNING_VALUES);
        } catch {
          next = DEFAULT_LCD_TUNING_VALUES;
        }
        setLcdTuningState(next);
        applyLcdTuningToDocument(next);
      }
    }

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const setSkin = useCallback((nextSkin: UiSkinId): void => {
    const next = resolveUiSkin(nextSkin);
    setSkinState(next);
    applySkinToDocument(next);

    try {
      window.localStorage.setItem(UI_SKIN_STORAGE_KEY, next);
    } catch {
      /* ignore storage failures */
    }
  }, []);

  const setLcdTuningValue = useCallback((key: LcdTuningKey, value: number): void => {
    shouldSyncLcdRef.current = true;

    setLcdTuningState((current) => {
      const next = resolveLcdTuningValues({
        ...current,
        [key]: value
      });

      applyLcdTuningToDocument(next);
      return next;
    });
  }, []);

  const resetLcdTuning = useCallback((): void => {
    shouldSyncLcdRef.current = true;
    setLcdTuningState(DEFAULT_LCD_TUNING_VALUES);
    applyLcdTuningToDocument(DEFAULT_LCD_TUNING_VALUES);
  }, []);

  const value = useMemo<SkinContextValue>(() => ({
    skin,
    skins: UI_SKINS,
    lcdTuning,
    hasCustomLcdTuning: hasCustomLcdTuning(lcdTuning),
    setSkin,
    setLcdTuningValue,
    resetLcdTuning
  }), [skin, lcdTuning, setSkin, setLcdTuningValue, resetLcdTuning]);

  return <SkinContext.Provider value={value}>{children}</SkinContext.Provider>;
}

export function useSkin(): SkinContextValue {
  const value = useContext(SkinContext);
  if (!value) {
    throw new Error('useSkin must be used within SkinProvider');
  }

  return value;
}
