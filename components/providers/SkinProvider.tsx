'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from 'react';
import {
  DEFAULT_UI_SKIN,
  resolveUiSkin,
  UI_SKINS,
  UI_SKIN_STORAGE_KEY,
  type UiSkinId
} from '@/lib/ui-skin';

interface SkinContextValue {
  skin: UiSkinId;
  skins: typeof UI_SKINS;
  setSkin: (skin: UiSkinId) => void;
}

const SkinContext = createContext<SkinContextValue | null>(null);

function applySkinToDocument(skin: UiSkinId): void {
  document.documentElement.dataset.skin = skin;
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

export function SkinProvider({ children }: { children: ReactNode }): JSX.Element {
  const [skin, setSkinState] = useState<UiSkinId>(readInitialSkin);

  useEffect(() => {
    applySkinToDocument(skin);
  }, [skin]);

  useEffect(() => {
    function handleStorage(event: StorageEvent): void {
      if (event.key !== UI_SKIN_STORAGE_KEY) {
        return;
      }

      const next = resolveUiSkin(event.newValue);
      setSkinState(next);
      applySkinToDocument(next);
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

  const value = useMemo<SkinContextValue>(() => ({
    skin,
    skins: UI_SKINS,
    setSkin
  }), [skin, setSkin]);

  return <SkinContext.Provider value={value}>{children}</SkinContext.Provider>;
}

export function useSkin(): SkinContextValue {
  const value = useContext(SkinContext);
  if (!value) {
    throw new Error('useSkin must be used within SkinProvider');
  }

  return value;
}
