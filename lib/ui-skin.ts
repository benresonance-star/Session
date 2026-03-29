export const UI_SKIN_STORAGE_KEY = 'workout-ui-skin';
export const LCD_TUNING_STORAGE_KEY = 'workout-lcd-tuning';

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

export const LCD_TUNING_CONTROLS = [
  {
    section: 'primary',
    key: 'pixelShimmerStrength',
    label: 'Pixel shimmer',
    description: 'Pixel flicker intensity',
    min: 0,
    max: 0.22,
    step: 0.01,
    defaultValue: 0.08,
    formatValue: (value: number) => value.toFixed(2)
  },
  {
    section: 'primary',
    key: 'pixelShimmerSpeed',
    label: 'Shimmer speed',
    description: 'Pixel flicker cycle',
    min: 2.5,
    max: 14,
    step: 0.1,
    defaultValue: 8.5,
    formatValue: (value: number) => `${value.toFixed(1)}s`
  },
  {
    section: 'primary',
    key: 'scanDriftDistance',
    label: 'Scan drift',
    description: 'Overlay movement distance',
    min: 0,
    max: 5,
    step: 0.1,
    defaultValue: 2,
    formatValue: (value: number) => `${value.toFixed(1)}px`
  },
  {
    section: 'primary',
    key: 'scanDriftSpeed',
    label: 'Scan speed',
    description: 'Overlay movement cycle',
    min: 2,
    max: 16,
    step: 0.1,
    defaultValue: 10,
    formatValue: (value: number) => `${value.toFixed(1)}s`
  },
  {
    section: 'primary',
    key: 'textJitterDistance',
    label: 'Text jitter',
    description: 'Heading wobble distance',
    min: 0,
    max: 2,
    step: 0.05,
    defaultValue: 0.6,
    formatValue: (value: number) => `${value.toFixed(2)}px`
  },
  {
    section: 'primary',
    key: 'textJitterSpeed',
    label: 'Text cadence',
    description: 'Heading wobble timing',
    min: 1.5,
    max: 10,
    step: 0.1,
    defaultValue: 5.5,
    formatValue: (value: number) => `${value.toFixed(1)}s`
  },
  {
    section: 'primary',
    key: 'digitPulseStrength',
    label: 'Digit pulse',
    description: 'Timer pulse intensity',
    min: 0,
    max: 0.2,
    step: 0.01,
    defaultValue: 0.08,
    formatValue: (value: number) => value.toFixed(2)
  },
  {
    section: 'primary',
    key: 'digitPulseSpeed',
    label: 'Digit pulse speed',
    description: 'Timer pulse timing',
    min: 1.2,
    max: 7,
    step: 0.1,
    defaultValue: 2.8,
    formatValue: (value: number) => `${value.toFixed(1)}s`
  },
  {
    section: 'primary',
    key: 'ghostOffsetStrength',
    label: 'Ghost offset',
    description: 'Chromatic refraction amount',
    min: 0,
    max: 1.8,
    step: 0.05,
    defaultValue: 0.6,
    formatValue: (value: number) => `${value.toFixed(2)}px`
  },
  {
    section: 'secondary',
    key: 'screenBreatheStrength',
    label: 'Screen breathe',
    description: 'Overall display brightening pulse',
    min: 0,
    max: 0.12,
    step: 0.005,
    defaultValue: 0.03,
    formatValue: (value: number) => value.toFixed(3)
  },
  {
    section: 'secondary',
    key: 'screenBreatheSpeed',
    label: 'Breathe speed',
    description: 'Display pulse cycle',
    min: 2,
    max: 12,
    step: 0.1,
    defaultValue: 6.5,
    formatValue: (value: number) => `${value.toFixed(1)}s`
  },
  {
    section: 'secondary',
    key: 'pixelGridOpacity',
    label: 'Grid contrast',
    description: 'Pixel grid visibility',
    min: 0,
    max: 0.35,
    step: 0.01,
    defaultValue: 0.16,
    formatValue: (value: number) => value.toFixed(2)
  },
  {
    section: 'secondary',
    key: 'transportHoverLift',
    label: 'Button lift',
    description: 'Transport hover movement',
    min: -3,
    max: 0,
    step: 0.1,
    defaultValue: -1,
    formatValue: (value: number) => `${value.toFixed(1)}px`
  }
] as const;

export type LcdTuningKey = (typeof LCD_TUNING_CONTROLS)[number]['key'];
export type LcdTuningSection = (typeof LCD_TUNING_CONTROLS)[number]['section'];

export type LcdTuningValues = {
  [K in LcdTuningKey]: number;
};

const LCD_TUNING_CONTROL_MAP = Object.fromEntries(
  LCD_TUNING_CONTROLS.map((control) => [control.key, control])
) as Record<LcdTuningKey, (typeof LCD_TUNING_CONTROLS)[number]>;

export const DEFAULT_LCD_TUNING_VALUES = Object.fromEntries(
  LCD_TUNING_CONTROLS.map((control) => [control.key, control.defaultValue])
) as LcdTuningValues;

export function isUiSkinId(value: unknown): value is UiSkinId {
  return typeof value === 'string' && UI_SKIN_IDS.includes(value as UiSkinId);
}

export function resolveUiSkin(value: unknown): UiSkinId {
  return isUiSkinId(value) ? value : DEFAULT_UI_SKIN;
}

function clampLcdTuningValue(key: LcdTuningKey, value: unknown): number {
  const control = LCD_TUNING_CONTROL_MAP[key];
  const numeric = typeof value === 'number' ? value : Number(value);

  if (!Number.isFinite(numeric)) {
    return control.defaultValue;
  }

  return Math.min(control.max, Math.max(control.min, numeric));
}

export function resolveLcdTuningValues(value: unknown): LcdTuningValues {
  const source = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  const next = {} as LcdTuningValues;

  for (const control of LCD_TUNING_CONTROLS) {
    next[control.key] = clampLcdTuningValue(control.key, source[control.key]);
  }

  return next;
}

export function getLcdTuningControl(key: LcdTuningKey): (typeof LCD_TUNING_CONTROLS)[number] {
  return LCD_TUNING_CONTROL_MAP[key];
}

export function getLcdTuningControlsBySection(section: LcdTuningSection): readonly (typeof LCD_TUNING_CONTROLS)[number][] {
  return LCD_TUNING_CONTROLS.filter((control) => control.section === section);
}

export function hasCustomLcdTuning(values: LcdTuningValues): boolean {
  return LCD_TUNING_CONTROLS.some((control) => {
    const next = values[control.key];
    const base = DEFAULT_LCD_TUNING_VALUES[control.key];
    return Math.abs(next - base) > 0.0001;
  });
}

export function getLcdTuningCssVariables(values: LcdTuningValues): Record<string, string> {
  return {
    '--pixel-grid-opacity': values.pixelGridOpacity.toFixed(3),
    '--pixel-shimmer-strength': values.pixelShimmerStrength.toFixed(3),
    '--pixel-shimmer-speed': `${values.pixelShimmerSpeed.toFixed(2)}s`,
    '--scan-drift-distance': `${values.scanDriftDistance.toFixed(2)}px`,
    '--scan-drift-speed': `${values.scanDriftSpeed.toFixed(2)}s`,
    '--screen-breathe-strength': values.screenBreatheStrength.toFixed(3),
    '--screen-breathe-speed': `${values.screenBreatheSpeed.toFixed(2)}s`,
    '--text-jitter-distance': `${values.textJitterDistance.toFixed(2)}px`,
    '--text-jitter-speed': `${values.textJitterSpeed.toFixed(2)}s`,
    '--digit-pulse-strength': values.digitPulseStrength.toFixed(3),
    '--digit-pulse-speed': `${values.digitPulseSpeed.toFixed(2)}s`,
    '--ghost-offset-x': `${values.ghostOffsetStrength.toFixed(2)}px`,
    '--ghost-offset-y': `${(values.ghostOffsetStrength * 0.58).toFixed(2)}px`,
    '--transport-hover-lift': `${values.transportHoverLift.toFixed(2)}px`
  };
}

export interface UiSkinInitScriptOptions {
  initialLcdTuning?: LcdTuningValues;
  preferInitialLcdTuning?: boolean;
}

export function getUiSkinInitScript(options: UiSkinInitScriptOptions = {}): string {
  const storageKey = JSON.stringify(UI_SKIN_STORAGE_KEY);
  const lcdStorageKey = JSON.stringify(LCD_TUNING_STORAGE_KEY);
  const fallbackSkin = JSON.stringify(DEFAULT_UI_SKIN);
  const validSkins = JSON.stringify(UI_SKIN_IDS);
  const initialLcdValues = JSON.stringify(resolveLcdTuningValues(options.initialLcdTuning ?? DEFAULT_LCD_TUNING_VALUES));
  const preferInitialLcdTuning = JSON.stringify(Boolean(options.preferInitialLcdTuning));

  return `(() => {
    const fallback = ${fallbackSkin};
    const lcdDefaults = ${initialLcdValues};
    const preferInitialLcd = ${preferInitialLcdTuning};
    const apply = (value) => {
      const valid = ${validSkins};
      const next = typeof value === 'string' && valid.includes(value) ? value : fallback;
      document.documentElement.dataset.skin = next;
    };
    const applyLcd = (raw) => {
      const source = raw && typeof raw === 'object' ? raw : {};
      const values = {
        pixelGridOpacity: Number.isFinite(source.pixelGridOpacity) ? source.pixelGridOpacity : lcdDefaults.pixelGridOpacity,
        pixelShimmerStrength: Number.isFinite(source.pixelShimmerStrength) ? source.pixelShimmerStrength : lcdDefaults.pixelShimmerStrength,
        pixelShimmerSpeed: Number.isFinite(source.pixelShimmerSpeed) ? source.pixelShimmerSpeed : lcdDefaults.pixelShimmerSpeed,
        scanDriftDistance: Number.isFinite(source.scanDriftDistance) ? source.scanDriftDistance : lcdDefaults.scanDriftDistance,
        scanDriftSpeed: Number.isFinite(source.scanDriftSpeed) ? source.scanDriftSpeed : lcdDefaults.scanDriftSpeed,
        screenBreatheStrength: Number.isFinite(source.screenBreatheStrength) ? source.screenBreatheStrength : lcdDefaults.screenBreatheStrength,
        screenBreatheSpeed: Number.isFinite(source.screenBreatheSpeed) ? source.screenBreatheSpeed : lcdDefaults.screenBreatheSpeed,
        textJitterDistance: Number.isFinite(source.textJitterDistance) ? source.textJitterDistance : lcdDefaults.textJitterDistance,
        textJitterSpeed: Number.isFinite(source.textJitterSpeed) ? source.textJitterSpeed : lcdDefaults.textJitterSpeed,
        digitPulseStrength: Number.isFinite(source.digitPulseStrength) ? source.digitPulseStrength : lcdDefaults.digitPulseStrength,
        digitPulseSpeed: Number.isFinite(source.digitPulseSpeed) ? source.digitPulseSpeed : lcdDefaults.digitPulseSpeed,
        ghostOffsetStrength: Number.isFinite(source.ghostOffsetStrength) ? source.ghostOffsetStrength : lcdDefaults.ghostOffsetStrength,
        transportHoverLift: Number.isFinite(source.transportHoverLift) ? source.transportHoverLift : lcdDefaults.transportHoverLift
      };
      const root = document.documentElement.style;
      root.setProperty('--pixel-grid-opacity', values.pixelGridOpacity.toFixed(3));
      root.setProperty('--pixel-shimmer-strength', values.pixelShimmerStrength.toFixed(3));
      root.setProperty('--pixel-shimmer-speed', values.pixelShimmerSpeed.toFixed(2) + 's');
      root.setProperty('--scan-drift-distance', values.scanDriftDistance.toFixed(2) + 'px');
      root.setProperty('--scan-drift-speed', values.scanDriftSpeed.toFixed(2) + 's');
      root.setProperty('--screen-breathe-strength', values.screenBreatheStrength.toFixed(3));
      root.setProperty('--screen-breathe-speed', values.screenBreatheSpeed.toFixed(2) + 's');
      root.setProperty('--text-jitter-distance', values.textJitterDistance.toFixed(2) + 'px');
      root.setProperty('--text-jitter-speed', values.textJitterSpeed.toFixed(2) + 's');
      root.setProperty('--digit-pulse-strength', values.digitPulseStrength.toFixed(3));
      root.setProperty('--digit-pulse-speed', values.digitPulseSpeed.toFixed(2) + 's');
      root.setProperty('--ghost-offset-x', values.ghostOffsetStrength.toFixed(2) + 'px');
      root.setProperty('--ghost-offset-y', (values.ghostOffsetStrength * 0.58).toFixed(2) + 'px');
      root.setProperty('--transport-hover-lift', values.transportHoverLift.toFixed(2) + 'px');
    };

    try {
      apply(window.localStorage.getItem(${storageKey}));
      const lcdRaw = preferInitialLcd ? null : window.localStorage.getItem(${lcdStorageKey});
      applyLcd(lcdRaw ? JSON.parse(lcdRaw) : lcdDefaults);
    } catch {
      apply(fallback);
      applyLcd(lcdDefaults);
    }
  })();`;
}
