import { CogIcon } from '@/components/ui/CogIcon';
import { SkinMenuSection } from '@/components/ui/SkinMenuSection';

export function SessionListSettingsMenu({
  open,
  disabled,
  importing,
  showLcdTuning,
  onToggle,
  onCreateSession,
  onImportJson,
  onPasteJson,
  onCopySchema,
  onOpenLcdTuning,
  onCloseMenu
}: {
  open: boolean;
  disabled: boolean;
  importing: boolean;
  showLcdTuning: boolean;
  onToggle: () => void;
  onCreateSession: () => void;
  onImportJson: () => void;
  onPasteJson: () => void;
  onCopySchema: () => void;
  onOpenLcdTuning: () => void;
  onCloseMenu: () => void;
}): JSX.Element {
  return (
    <>
      <button
        type="button"
        disabled={disabled}
        className="skin-control inline-flex items-center justify-center rounded-[var(--radius-control)] border border-border p-2 text-muted transition-colors hover:border-text/30 hover:text-text disabled:pointer-events-none disabled:opacity-40"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Session list settings"
        onClick={onToggle}
      >
        <CogIcon />
      </button>
      {open ? (
        <div
          role="menu"
          className="skin-panel-solid absolute right-0 z-[201] mt-1 min-w-[16rem] rounded-[var(--radius-panel)] border border-line bg-[var(--panel-solid-bg)] py-1 text-sm shadow-none"
        >
          <button
            type="button"
            role="menuitem"
            className="skin-control flex w-full rounded-[var(--radius-control)] px-3 py-2 text-left text-muted transition-colors hover:bg-bg hover:text-text"
            onClick={onCreateSession}
          >
            create new session
          </button>
          <button
            type="button"
            role="menuitem"
            disabled={importing}
            className="skin-control flex w-full rounded-[var(--radius-control)] px-3 py-2 text-left text-muted transition-colors hover:bg-bg hover:text-text disabled:pointer-events-none disabled:opacity-40"
            onClick={onImportJson}
          >
            {importing ? 'importing…' : 'import JSON'}
          </button>
          <button
            type="button"
            role="menuitem"
            disabled={disabled}
            className="skin-control flex w-full rounded-[var(--radius-control)] px-3 py-2 text-left text-muted transition-colors hover:bg-bg hover:text-text disabled:pointer-events-none disabled:opacity-40"
            onClick={onPasteJson}
          >
            paste JSON
          </button>
          <button
            type="button"
            role="menuitem"
            className="skin-control flex w-full rounded-[var(--radius-control)] px-3 py-2 text-left text-muted transition-colors hover:bg-bg hover:text-text"
            onClick={onCopySchema}
          >
            copy JSON schema
          </button>
          {showLcdTuning ? (
            <button
              type="button"
              role="menuitem"
              disabled={disabled}
              className="skin-control flex w-full rounded-[var(--radius-control)] px-3 py-2 text-left text-muted transition-colors hover:bg-bg hover:text-text disabled:pointer-events-none disabled:opacity-40"
              onClick={onOpenLcdTuning}
            >
              LCD tuning...
            </button>
          ) : null}
          <SkinMenuSection
            disabled={disabled}
            onSelect={onCloseMenu}
          />
        </div>
      ) : null}
    </>
  );
}
