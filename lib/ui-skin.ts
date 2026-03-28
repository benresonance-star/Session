export const UI_SKIN_STORAGE_KEY = 'workout-ui-skin';

export const UI_SKINS = [
  {
    id: 'minimal-dark',
    label: 'Minimal dark',
    description: 'Current dark instrument look'
  },
  {
    id: 'retro-lcd',
    label: 'Retro LCD',
    description: 'Monochrome handheld timer look'
  }
] as const;

export type UiSkinId = (typeof UI_SKINS)[number]['id'];

export const DEFAULT_UI_SKIN: UiSkinId = 'minimal-dark';

const UI_SKIN_IDS = UI_SKINS.map((skin) => skin.id);

export function isUiSkinId(value: unknown): value is UiSkinId {
  return typeof value === 'string' && UI_SKIN_IDS.includes(value as UiSkinId);
}

export function resolveUiSkin(value: unknown): UiSkinId {
  return isUiSkinId(value) ? value : DEFAULT_UI_SKIN;
}

export function getUiSkinInitScript(): string {
  const storageKey = JSON.stringify(UI_SKIN_STORAGE_KEY);
  const fallbackSkin = JSON.stringify(DEFAULT_UI_SKIN);
  const validSkins = JSON.stringify(UI_SKIN_IDS);

  return `(() => {
    const fallback = ${fallbackSkin};
    const apply = (value) => {
      const valid = ${validSkins};
      const next = typeof value === 'string' && valid.includes(value) ? value : fallback;
      document.documentElement.dataset.skin = next;
    };

    try {
      apply(window.localStorage.getItem(${storageKey}));
    } catch {
      apply(fallback);
    }
  })();`;
}
