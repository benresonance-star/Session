'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { SessionMetadataEditor } from '@/components/session-builder/SessionMetadataEditor';
import { StageEditor } from '@/components/session-builder/StageEditor';
import {
  buildCollapsedState,
  sessionSnapshot,
  syncCollapsedState
} from '@/components/session-builder/collapsed-state';
import { ActionButton } from '@/components/ui/ActionButton';
import { CogIcon } from '@/components/ui/CogIcon';
import { LcdRule } from '@/components/ui/LcdChrome';
import { PageShell } from '@/components/ui/PageShell';
import { addStage } from '@/lib/session-builder';
import { deleteSessionFromServer, saveSessionToServer } from '@/lib/session-api-client';
import {
  exportSessionDefinition,
  parseImportedSession,
  prepareSessionForPersistence,
  validateSessionDefinition
} from '@/lib/session-validation';
import type { Exercise, SessionDefinition, StageId } from '@/types/session';

const stageOptions: StageId[] = ['warmup', 'main', 'cooldown'];
const equipmentOptions = [
  'bodyweight',
  'kettlebell',
  'dumbbell',
  'barbell',
  'resistance_band',
  'machine',
  'other'
] as const satisfies readonly Exercise['equipment']['kind'][];

function SessionBuilder({
  initialSession,
  backHref,
  allowServerDelete = false
}: {
  initialSession: SessionDefinition;
  backHref: string;
  allowServerDelete?: boolean;
}): JSX.Element {
  const router = useRouter();
  const [session, setSession] = useState<SessionDefinition>(initialSession);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [settingsMenuOpen, setSettingsMenuOpen] = useState(false);
  const [collapsedItems, setCollapsedItems] = useState<Record<string, boolean>>(() => buildCollapsedState(initialSession));
  const [lastSavedJson, setLastSavedJson] = useState(() => sessionSnapshot(initialSession));
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const settingsMenuRef = useRef<HTMLDivElement | null>(null);

  const isDirty = useMemo(() => sessionSnapshot(session) !== lastSavedJson, [session, lastSavedJson]);

  useEffect(() => {
    if (!settingsMenuOpen) {
      return;
    }
    function handlePointerDown(event: MouseEvent): void {
      if (settingsMenuRef.current && !settingsMenuRef.current.contains(event.target as Node)) {
        setSettingsMenuOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') {
        setSettingsMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [settingsMenuOpen]);

  const summary = useMemo(() => {
    const tags = (session.tags ?? []).join(' · ');
    return [session.duration_minutes ? `${session.duration_minutes} min` : null, tags].filter(Boolean).join(' · ');
  }, [session]);

  function applyUpdate(updater: (current: SessionDefinition) => SessionDefinition): void {
    setSession((current) => {
      const next = updater(current);
      setCollapsedItems((collapsed) => syncCollapsedState(collapsed, next));
      return next;
    });
    setValidationErrors([]);
    setNotice(null);
  }

  function isCollapsed(key: string): boolean {
    return Boolean(collapsedItems[key]);
  }

  function toggleCollapsed(key: string): void {
    setCollapsedItems((current) => ({
      ...current,
      [key]: !current[key]
    }));
  }

  function validateCurrentSession(): boolean {
    const prepared = prepareSessionForPersistence(session);
    const result = validateSessionDefinition(prepared);
    setValidationErrors(result.errors);
    setNotice(result.isValid ? 'Session is valid and ready to export.' : null);
    return result.isValid;
  }

  async function handleImport(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.[0];
    if (!file) return;

    const source = await file.text();
    const result = parseImportedSession(source);

    if (!result.session) {
      setValidationErrors(result.errors);
      setNotice(null);
      event.target.value = '';
      return;
    }

    setSession(result.session);
    setCollapsedItems(buildCollapsedState(result.session));
    setValidationErrors([]);
    setNotice(`Imported "${result.session.title}".`);
    event.target.value = '';
  }

  function handleExport(): void {
    if (!validateCurrentSession()) {
      return;
    }

    const payload = exportSessionDefinition(prepareSessionForPersistence(session));
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${session.session_id || 'session'}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function handleSaveToSupabase(): Promise<void> {
    const prepared = prepareSessionForPersistence(session);
    const validation = validateSessionDefinition(prepared);
    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      setNotice(null);
      return;
    }

    setValidationErrors([]);
    setSaving(true);
    try {
      const result = await saveSessionToServer(prepared);
      if (!result.ok) {
        setValidationErrors(result.messages);
        setNotice(null);
        return;
      }

      setNotice('Saved to Supabase.');
      setSession(prepared);
      setLastSavedJson(sessionSnapshot(prepared));
    } finally {
      setSaving(false);
    }
  }

  async function handleConfirmDeleteFromServer(): Promise<void> {
    setDeleting(true);
    setValidationErrors([]);
    setNotice(null);
    try {
      const result = await deleteSessionFromServer(session.session_id);
      if (!result.ok) {
        setDeleteConfirmOpen(false);
        setValidationErrors([result.message]);
        return;
      }
      setDeleteConfirmOpen(false);
      await router.push('/home');
      router.refresh();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <PageShell width="max-w-5xl">
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={handleImport}
      />

      <Link href={backHref} className="skin-label text-[11px] text-muted hover:text-text">
        ← {backHref === '/home' ? 'sessions' : 'session'}
      </Link>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="skin-display skin-display-heading skin-display-live skin-ghost text-display">{session.title}</h1>
          {summary ? <div className="mt-2 text-sm text-muted">{summary}</div> : null}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {isDirty ? (
            <ActionButton variant="primary" disabled={saving} onClick={() => void handleSaveToSupabase()}>
              {saving ? 'saving…' : 'save to Supabase'}
            </ActionButton>
          ) : null}
          <div className="relative z-[200]" ref={settingsMenuRef}>
            <button
              type="button"
              className="skin-control inline-flex items-center justify-center rounded-[var(--radius-control)] border border-border p-2 text-muted transition-colors hover:border-text/30 hover:text-text"
              aria-expanded={settingsMenuOpen}
              aria-haspopup="menu"
              aria-label="Session file and danger actions"
              onClick={() => setSettingsMenuOpen((open) => !open)}
            >
              <CogIcon />
            </button>
            {settingsMenuOpen ? (
              <div
                role="menu"
                className="skin-panel-solid absolute right-0 z-[201] mt-1 min-w-[11rem] rounded-[var(--radius-panel)] border border-line bg-[var(--panel-solid-bg)] py-1 text-sm shadow-none"
              >
                <button
                  type="button"
                  role="menuitem"
                  className="skin-control flex w-full rounded-[var(--radius-control)] px-3 py-2 text-left text-muted transition-colors hover:bg-bg hover:text-text"
                  onClick={() => {
                    setSettingsMenuOpen(false);
                    validateCurrentSession();
                  }}
                >
                  validate
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="skin-control flex w-full rounded-[var(--radius-control)] px-3 py-2 text-left text-muted transition-colors hover:bg-bg hover:text-text"
                  onClick={() => {
                    setSettingsMenuOpen(false);
                    fileInputRef.current?.click();
                  }}
                >
                  import JSON
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="skin-control flex w-full rounded-[var(--radius-control)] px-3 py-2 text-left text-muted transition-colors hover:bg-bg hover:text-text"
                  onClick={() => {
                    setSettingsMenuOpen(false);
                    handleExport();
                  }}
                >
                  export JSON
                </button>
                {allowServerDelete ? (
                  <button
                    type="button"
                    role="menuitem"
                    className="skin-control flex w-full rounded-[var(--radius-control)] px-3 py-2 text-left text-warning transition-colors hover:bg-bg hover:text-text"
                    onClick={() => {
                      setSettingsMenuOpen(false);
                      setDeleteConfirmOpen(true);
                    }}
                  >
                    delete session
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <LcdRule className="mt-8" />

      {deleteConfirmOpen ? (
        <div
          className="skin-overlay fixed inset-0 z-50 flex items-center justify-center bg-[var(--overlay-bg)] px-4"
          role="presentation"
          onClick={() => {
            if (!deleting) {
              setDeleteConfirmOpen(false);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-session-title"
            className="skin-panel-solid max-w-md rounded-[var(--radius-panel)] border border-line bg-[var(--panel-solid-bg)] p-6 shadow-none"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="delete-session-title" className="text-lg font-semibold text-text">
              Delete session?
            </h2>
            <p className="mt-3 text-sm text-muted">
              This will permanently remove this session from Supabase. You cannot undo this.
            </p>
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <ActionButton variant="ghost" type="button" disabled={deleting} onClick={() => setDeleteConfirmOpen(false)}>
                cancel
              </ActionButton>
              <ActionButton
                variant="danger"
                type="button"
                disabled={deleting}
                onClick={() => void handleConfirmDeleteFromServer()}
              >
                {deleting ? 'deleting…' : 'delete'}
              </ActionButton>
            </div>
          </div>
        </div>
      ) : null}

      {notice ? (
        <div className="skin-control mt-4 rounded-[var(--radius-control)] border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
          {notice}
        </div>
      ) : null}

      {validationErrors.length > 0 ? (
        <div className="skin-control mt-4 rounded-[var(--radius-control)] border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
          <div className="font-medium text-text">Validation issues</div>
          <ul className="mt-2 space-y-1">
            {validationErrors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-8 grid gap-6">
        <SessionMetadataEditor session={session} applyUpdate={applyUpdate} />

        {session.stages.map((stage, stageIndex) => (
          <StageEditor
            key={`${stage.stage_id}-${stageIndex}`}
            stage={stage}
            stageIndex={stageIndex}
            stageOptions={stageOptions}
            equipmentOptions={equipmentOptions}
            applyUpdate={applyUpdate}
            isCollapsed={isCollapsed}
            toggleCollapsed={toggleCollapsed}
          />
        ))}

        <div className="flex flex-wrap gap-3">
          <ActionButton onClick={() => applyUpdate((current) => addStage(current))}>+ add stage</ActionButton>
        </div>
      </div>
    </PageShell>
  );
}

export { SessionBuilder };
