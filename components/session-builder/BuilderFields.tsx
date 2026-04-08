import { ArrowDown, ArrowUp, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { ActionButton } from '@/components/ui/ActionButton';

function parseOptionalNumber(value: string, minimum = 0): number | undefined {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  if (Number.isNaN(parsed)) return undefined;
  return Math.max(minimum, parsed);
}

export function EditorField({
  label,
  children
}: {
  label: string;
  children: JSX.Element;
}): JSX.Element {
  return (
    <label className="flex flex-col gap-2 text-sm text-muted">
      <span className="uppercase tracking-wide-ui">{label}</span>
      {children}
    </label>
  );
}

export function TextInput({
  value,
  onChange,
  placeholder,
  className = ''
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}): JSX.Element {
  return (
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className={`skin-control w-full rounded-[var(--radius-control)] border border-border bg-[var(--input-bg)] px-3 py-2 text-sm text-text outline-none transition-colors placeholder:text-muted/60 focus:border-accent ${className}`.trim()}
    />
  );
}

export function TextAreaInput({
  value,
  onChange,
  placeholder,
  rows = 5
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}): JSX.Element {
  return (
    <textarea
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="skin-control min-h-[6rem] w-full resize-y rounded-[var(--radius-control)] border border-border bg-[var(--input-bg)] px-3 py-2 text-sm leading-relaxed text-text outline-none transition-colors placeholder:text-muted/60 focus:border-accent"
    />
  );
}

export function NumberInput({
  value,
  onChange,
  minimum = 0
}: {
  value?: number;
  onChange: (value: number | undefined) => void;
  minimum?: number;
}): JSX.Element {
  return (
    <input
      type="number"
      value={value ?? ''}
      min={minimum}
      onChange={(event) => onChange(parseOptionalNumber(event.target.value, minimum))}
      className="skin-control w-full rounded-[var(--radius-control)] border border-border bg-[var(--input-bg)] px-3 py-2 text-sm text-text outline-none transition-colors placeholder:text-muted/60 focus:border-accent"
    />
  );
}

export function SelectInput({
  value,
  onChange,
  options
}: {
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}): JSX.Element {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="skin-control w-full rounded-[var(--radius-control)] border border-border bg-[var(--input-bg)] px-3 py-2 text-sm text-text outline-none transition-colors focus:border-accent"
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

export function RowActions({
  onMoveUp,
  onMoveDown,
  onRemove,
  removeLabel
}: {
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
  removeLabel: string;
}): JSX.Element {
  return (
    <div className="flex flex-wrap gap-px">
      <ActionButton variant="ghost" className="!p-0 size-9 shrink-0" aria-label="move up" onClick={onMoveUp}>
        <ArrowUp className="h-4 w-4 shrink-0" aria-hidden />
      </ActionButton>
      <ActionButton variant="ghost" className="!p-0 size-9 shrink-0" aria-label="move down" onClick={onMoveDown}>
        <ArrowDown className="h-4 w-4 shrink-0" aria-hidden />
      </ActionButton>
      <ActionButton variant="danger" className="!p-0 size-9 shrink-0" aria-label={removeLabel} onClick={onRemove}>
        <Trash2 className="h-4 w-4 shrink-0" aria-hidden />
      </ActionButton>
    </div>
  );
}

export function CollapseButton({
  collapsed,
  onToggle,
  label
}: {
  collapsed: boolean;
  onToggle: () => void;
  label: string;
}): JSX.Element {
  return (
    <ActionButton
      variant="ghost"
      className="!p-0 size-9 shrink-0"
      aria-expanded={!collapsed}
      aria-label={collapsed ? `Expand ${label}` : `Collapse ${label}`}
      onClick={onToggle}
    >
      {collapsed ? (
        <ChevronDown className="h-4 w-4 shrink-0" aria-hidden />
      ) : (
        <ChevronUp className="h-4 w-4 shrink-0" aria-hidden />
      )}
    </ActionButton>
  );
}
