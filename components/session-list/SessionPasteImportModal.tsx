import { ActionButton } from '@/components/ui/ActionButton';

export function SessionPasteImportModal({
  open,
  pasteText,
  pasteErrors,
  pasteSubmitting,
  onChangeText,
  onClose,
  onImport
}: {
  open: boolean;
  pasteText: string;
  pasteErrors: string[];
  pasteSubmitting: boolean;
  onChangeText: (value: string) => void;
  onClose: () => void;
  onImport: () => void;
}): JSX.Element | null {
  if (!open) {
    return null;
  }

  return (
    <div
      className="skin-overlay fixed inset-0 z-50 flex items-center justify-center bg-[var(--overlay-bg)] px-4 py-8"
      role="presentation"
      onClick={() => {
        if (!pasteSubmitting) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="paste-json-title"
        className="skin-panel-solid flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-[var(--radius-panel)] border border-line bg-[var(--panel-solid-bg)] shadow-none"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="paste-json-title" className="skin-label border-b border-line px-6 py-4 text-sm text-text">
          Paste session JSON
        </h2>
        <p className="px-6 pt-3 text-sm text-muted">
          Paste a full session definition. The app validates it, then uploads to Supabase when configured. Each error below includes the JSON path or field so you can fix it.
        </p>
        <div className="min-h-0 flex-1 overflow-auto px-6 py-3">
          <label htmlFor="paste-json-textarea" className="sr-only">
            Session JSON
          </label>
          <textarea
            id="paste-json-textarea"
            value={pasteText}
            onChange={(e) => onChangeText(e.target.value)}
            spellCheck={false}
            placeholder="{ … }"
            className="skin-control min-h-[14rem] w-full resize-y rounded-[var(--radius-control)] border border-border bg-[var(--input-bg)] px-3 py-2 font-mono text-xs leading-relaxed text-text outline-none transition-colors focus:border-accent"
          />
        </div>
        {pasteErrors.length ? (
          <div className="border-t border-line px-6 py-3">
            <p className="text-sm font-medium text-red-500/90">Validation or save failed:</p>
            <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-red-500/90">
              {pasteErrors.map((err, i) => (
                <li key={i} className="break-words">
                  {err}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <div className="flex flex-wrap justify-end gap-3 border-t border-line px-6 py-4">
          <ActionButton variant="ghost" type="button" disabled={pasteSubmitting} onClick={onClose}>
            cancel
          </ActionButton>
          <ActionButton variant="primary" type="button" disabled={pasteSubmitting} onClick={onImport}>
            {pasteSubmitting ? 'importing…' : 'import'}
          </ActionButton>
        </div>
      </div>
    </div>
  );
}
