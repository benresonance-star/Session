'use client';

import { useSkin } from '@/components/providers/SkinProvider';

export function SkinMenuSection({
  disabled = false,
  onSelect
}: {
  disabled?: boolean;
  onSelect?: () => void;
}): JSX.Element {
  const { skin, skins, setSkin } = useSkin();

  return (
    <div className="border-t border-line px-1 py-1.5">
      <div className="px-2 pb-1 text-[11px] uppercase tracking-wide-ui text-muted">skins</div>
      {skins.map((option) => {
        const selected = option.id === skin;

        return (
          <button
            key={option.id}
            type="button"
            role="menuitemradio"
            aria-checked={selected}
            disabled={disabled}
            className={`skin-control flex w-full items-center justify-between gap-3 rounded-[var(--radius-control)] px-2 py-2 text-left text-muted transition-colors hover:bg-bg/70 hover:text-text disabled:pointer-events-none disabled:opacity-40 ${
              selected ? 'bg-bg/80 text-text' : ''
            }`.trim()}
            onClick={() => {
              setSkin(option.id);
              onSelect?.();
            }}
          >
            <span className="min-w-0">
              <span className="skin-display block text-sm">{option.label}</span>
              <span className="mt-1 block text-xs text-muted">{option.description}</span>
            </span>
            <span
              className={`mt-0.5 inline-flex h-2.5 w-2.5 shrink-0 border ${
                selected ? 'border-accent bg-accent' : 'border-line'
              }`}
              aria-hidden
            />
          </button>
        );
      })}
    </div>
  );
}
