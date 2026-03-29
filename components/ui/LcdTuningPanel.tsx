'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { ActionButton } from '@/components/ui/ActionButton';
import { useSkin } from '@/components/providers/SkinProvider';
import {
  getLcdTuningControl,
  getLcdTuningControlsBySection,
  type LcdTuningKey,
  type LcdTuningSection as LcdTuningSectionId
} from '@/lib/ui-skin';

function LcdTuningSlider({
  tuningKey,
  value,
  onChange
}: {
  tuningKey: LcdTuningKey;
  value: number;
  onChange: (nextValue: number) => void;
}): JSX.Element {
  const control = getLcdTuningControl(tuningKey);

  return (
    <label className="block space-y-2">
      <div className="flex items-start justify-between gap-3">
        <span className="min-w-0">
          <span className="skin-display block text-sm text-text">{control.label}</span>
          <span className="mt-1 block text-xs text-muted">{control.description}</span>
        </span>
        <span className="skin-label shrink-0 text-[11px] text-adjust">{control.formatValue(value)}</span>
      </div>
      <input
        type="range"
        min={control.min}
        max={control.max}
        step={control.step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full accent-[rgb(var(--color-accent))]"
      />
    </label>
  );
}

function LcdTuningSectionBlock({
  title,
  description,
  section,
  values,
  onChange
}: {
  title: string;
  description: string;
  section: LcdTuningSectionId;
  values: Record<LcdTuningKey, number>;
  onChange: (key: LcdTuningKey, value: number) => void;
}): JSX.Element {
  const controls = getLcdTuningControlsBySection(section);

  return (
    <section className="space-y-4">
      <div>
        <h3 className="skin-display text-base text-text">{title}</h3>
        <p className="mt-1 text-xs text-muted">{description}</p>
      </div>
      <div className="space-y-5">
        {controls.map((control) => (
          <LcdTuningSlider
            key={control.key}
            tuningKey={control.key}
            value={values[control.key]}
            onChange={(nextValue) => onChange(control.key, nextValue)}
          />
        ))}
      </div>
    </section>
  );
}

export function LcdTuningPanel({
  open,
  onClose
}: {
  open: boolean;
  onClose: () => void;
}): JSX.Element | null {
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const {
    skin,
    lcdTuning,
    hasCustomLcdTuning,
    setLcdTuningValue,
    resetLcdTuning
  } = useSkin();

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!mounted || !open || skin !== 'retro-lcd') {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[90] flex items-start justify-end bg-[rgb(27_34_17_/_0.14)] px-4 py-6 sm:px-6"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="lcd-tuning-title"
        className="skin-panel-solid w-full max-w-lg rounded-[var(--radius-panel)] border border-line bg-[var(--panel-solid-bg)] shadow-none"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-line px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 id="lcd-tuning-title" className="skin-display text-lg text-text">
                LCD tuning
              </h2>
              <p className="mt-2 text-sm text-muted">
                Changes apply live to the home screen and sync across devices when Supabase is available.
              </p>
            </div>
            <ActionButton variant="ghost" type="button" onClick={onClose}>
              close
            </ActionButton>
          </div>
        </div>

        <div className="max-h-[75vh] overflow-auto px-5 py-4">
          <div className="space-y-8">
            <LcdTuningSectionBlock
              title="Primary"
              description="Main live motion controls for shimmer, scan, text, digits, and ghosting."
              section="primary"
              values={lcdTuning}
              onChange={setLcdTuningValue}
            />
            <div className="border-t border-line pt-5">
              <LcdTuningSectionBlock
                title="Advanced"
                description="Secondary feel controls for screen breathing, grid visibility, and transport movement."
                section="secondary"
                values={lcdTuning}
                onChange={setLcdTuningValue}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-4">
          <p className="text-xs text-muted">Retro LCD only. Switch skins to compare instantly.</p>
          <div className="flex flex-wrap gap-3">
            <ActionButton variant="ghost" type="button" disabled={!hasCustomLcdTuning} onClick={resetLcdTuning}>
              reset to default
            </ActionButton>
            <ActionButton variant="primary" type="button" onClick={onClose}>
              done
            </ActionButton>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
