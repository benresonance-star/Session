'use client';

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors
} from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type ChangeEvent } from 'react';
import { ActionButton } from '@/components/ui/ActionButton';
import { CogIcon } from '@/components/ui/CogIcon';
import { LcdRule } from '@/components/ui/LcdChrome';
import { PageShell } from '@/components/ui/PageShell';
import { useSkin } from '@/components/providers/SkinProvider';
import { LcdTuningPanel } from '@/components/ui/LcdTuningPanel';
import { SkinMenuSection } from '@/components/ui/SkinMenuSection';
import { safeServiceErrorMessage } from '@/lib/safe-service-error';
import { parseImportedSession } from '@/lib/session-validation';
import {
  clearPausedSession,
  getPausedStep,
  sessionPauseStorageKeyPrefix
} from '@/lib/session-pause-storage';
import sessionDefinitionSchema from '@/schema/session-definition.schema.json';
import type { SessionDefinition } from '@/types/session';

const SCHEMA_COPY_SUCCESS = 'JSON schema copied';

function SessionPauseControls({
  sessionId,
  pausedAt,
  onResume,
  onCancelPause
}: {
  sessionId: string;
  pausedAt: number | null;
  onResume: (sessionId: string, at: number) => void;
  onCancelPause: (sessionId: string) => void;
}): JSX.Element | null {
  if (pausedAt == null) {
    return null;
  }
  return (
    <span className="inline-flex shrink-0 items-center gap-2 text-sm">
      <button
        type="button"
        className="text-accent transition-colors hover:text-text"
        onClick={() => onResume(sessionId, pausedAt)}
      >
        Paused
      </button>
      <button
        type="button"
        className="text-muted transition-colors hover:text-text"
        onClick={() => onCancelPause(sessionId)}
      >
        cancel
      </button>
    </span>
  );
}

function GripIcon(): JSX.Element {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden className="text-current">
      <circle cx="6" cy="4.5" r="1.25" fill="currentColor" />
      <circle cx="12" cy="4.5" r="1.25" fill="currentColor" />
      <circle cx="6" cy="9" r="1.25" fill="currentColor" />
      <circle cx="12" cy="9" r="1.25" fill="currentColor" />
      <circle cx="6" cy="13.5" r="1.25" fill="currentColor" />
      <circle cx="12" cy="13.5" r="1.25" fill="currentColor" />
    </svg>
  );
}

function SortableSessionRow({
  session,
  pausedAt,
  onResumePaused,
  onCancelPause
}: {
  session: SessionDefinition;
  pausedAt: number | null;
  onResumePaused: (sessionId: string, at: number) => void;
  onCancelPause: (sessionId: string) => void;
}): JSX.Element {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: session.session_id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`skin-rule flex items-start gap-3 border-b pb-6 ${isDragging ? 'z-10 opacity-60' : ''}`}
    >
      <button
        type="button"
        className="mt-1 shrink-0 cursor-grab touch-none text-muted hover:text-text active:cursor-grabbing"
        aria-label="Drag to reorder"
        {...attributes}
        {...listeners}
      >
        <GripIcon />
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <Link href={`/session/${session.session_id}`} className="skin-display min-w-0 text-2xl text-text hover:text-next">
            {session.title}
          </Link>
          <SessionPauseControls
            sessionId={session.session_id}
            pausedAt={pausedAt}
            onResume={onResumePaused}
            onCancelPause={onCancelPause}
          />
        </div>
        <Link href={`/session/${session.session_id}`} className="mt-2 block text-lg text-muted hover:text-text/80">
          {session.duration_minutes != null ? `${session.duration_minutes} min` : '—'}
          {(session.tags ?? []).length ? ` · ${(session.tags ?? []).join(' · ')}` : ''}
        </Link>
      </div>
    </div>
  );
}

export function SessionList({
  sessions,
  persistOrder = false
}: {
  sessions: SessionDefinition[];
  persistOrder?: boolean;
}): JSX.Element {
  const isHydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const router = useRouter();
  const { skin } = useSkin();
  const [items, setItems] = useState(sessions);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [settingsMenuOpen, setSettingsMenuOpen] = useState(false);
  const [lcdTuningOpen, setLcdTuningOpen] = useState(false);
  const [schemaCopyNotice, setSchemaCopyNotice] = useState<string | null>(null);
  const [pasteModalOpen, setPasteModalOpen] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [pasteErrors, setPasteErrors] = useState<string[]>([]);
  const [pasteSubmitting, setPasteSubmitting] = useState(false);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const settingsMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setItems(sessions);
  }, [sessions]);

  const [pausedBySession, setPausedBySession] = useState<Record<string, number>>({});

  const syncPausedFromStorage = useCallback(() => {
    const next: Record<string, number> = {};
    for (const s of items) {
      const at = getPausedStep(s.session_id);
      if (at != null) {
        next[s.session_id] = at;
      }
    }
    setPausedBySession(next);
  }, [items]);

  useEffect(() => {
    syncPausedFromStorage();
  }, [syncPausedFromStorage]);

  useEffect(() => {
    function onStorage(event: StorageEvent): void {
      if (!event.key?.startsWith(sessionPauseStorageKeyPrefix())) {
        return;
      }
      syncPausedFromStorage();
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [syncPausedFromStorage]);

  const handleResumePaused = useCallback(
    (sessionId: string, at: number): void => {
      clearPausedSession(sessionId);
      setPausedBySession((prev) => {
        const next = { ...prev };
        delete next[sessionId];
        return next;
      });
      router.push(`/play/${encodeURIComponent(sessionId)}?at=${at}`);
    },
    [router]
  );

  const handleCancelPause = useCallback((sessionId: string): void => {
    clearPausedSession(sessionId);
    setPausedBySession((prev) => {
      const next = { ...prev };
      delete next[sessionId];
      return next;
    });
  }, []);

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

  useEffect(() => {
    if (!schemaCopyNotice) {
      return;
    }
    const timer = window.setTimeout(() => setSchemaCopyNotice(null), 3000);
    return () => window.clearTimeout(timer);
  }, [schemaCopyNotice]);

  const closePasteModal = useCallback(() => {
    setPasteModalOpen(false);
    setPasteText('');
    setPasteErrors([]);
  }, []);

  const closeLcdTuning = useCallback(() => {
    setLcdTuningOpen(false);
  }, []);

  useEffect(() => {
    if (!pasteModalOpen) {
      return;
    }
    function handlePasteModalKey(event: KeyboardEvent): void {
      if (event.key !== 'Escape' || pasteSubmitting) {
        return;
      }
      event.preventDefault();
      closePasteModal();
    }
    document.addEventListener('keydown', handlePasteModalKey);
    return () => document.removeEventListener('keydown', handlePasteModalKey);
  }, [pasteModalOpen, pasteSubmitting, closePasteModal]);

  useEffect(() => {
    if (skin !== 'retro-lcd' && lcdTuningOpen) {
      setLcdTuningOpen(false);
    }
  }, [skin, lcdTuningOpen]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 }
    })
  );

  async function persistOrderToServer(next: SessionDefinition[]): Promise<boolean> {
    const res = await fetch('/api/sessions/order', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_ids: next.map((s) => s.session_id) })
    });
    if (!res.ok) {
      return false;
    }
    router.refresh();
    return true;
  }

  async function handleDragEnd(event: DragEndEvent): Promise<void> {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = items.findIndex((s) => s.session_id === active.id);
    const newIndex = items.findIndex((s) => s.session_id === over.id);
    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    const previous = items;
    const next = arrayMove(items, oldIndex, newIndex);
    setItems(next);
    setOrderError(null);

    const ok = await persistOrderToServer(next);
    if (!ok) {
      setItems(previous);
      setOrderError('Could not save order.');
    }
  }

  async function putSessionToSupabase(
    session: SessionDefinition
  ): Promise<{ ok: true } | { ok: false; messages: string[] }> {
    try {
      const response = await fetch('/api/sessions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(session)
      });
      const contentType = response.headers.get('content-type') ?? '';
      let payload: { errors?: string[]; error?: string } = {};
      if (contentType.includes('application/json')) {
        payload = (await response.json().catch(() => ({}))) as typeof payload;
      }

      if (!response.ok) {
        if (payload.errors?.length) {
          return { ok: false, messages: payload.errors.map((e) => safeServiceErrorMessage(e)) };
        }
        return {
          ok: false,
          messages: [
            safeServiceErrorMessage(payload.error) ||
              (response.status === 503
                ? 'Import to the list requires Supabase. Use the session builder settings menu to import JSON into a local draft.'
                : `Import failed (${response.status}).`)
          ]
        };
      }

      return { ok: true };
    } catch {
      return { ok: false, messages: ['Network error while importing.'] };
    }
  }

  async function handleImportJSON(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setImportError(null);
    setImporting(true);

    try {
      const source = await file.text();
      const result = parseImportedSession(source);

      if (!result.session) {
        setImportError(result.errors.length ? result.errors.join('; ') : 'Invalid session file.');
        return;
      }

      const put = await putSessionToSupabase(result.session);
      if (!put.ok) {
        setImportError(put.messages.join('; '));
        return;
      }

      router.refresh();
    } catch {
      setImportError('Network error while importing.');
    } finally {
      setImporting(false);
      event.target.value = '';
    }
  }

  async function handlePasteImport(): Promise<void> {
    setPasteErrors([]);
    setPasteSubmitting(true);

    try {
      const result = parseImportedSession(pasteText);

      if (!result.session) {
        setPasteErrors(result.errors.length ? result.errors : ['Invalid session JSON (could not parse or validate).']);
        return;
      }

      const put = await putSessionToSupabase(result.session);
      if (!put.ok) {
        setPasteErrors(put.messages);
        return;
      }

      closePasteModal();
      router.refresh();
    } catch {
      setPasteErrors(['Network error while importing.']);
    } finally {
      setPasteSubmitting(false);
    }
  }

  async function copySessionSchema(): Promise<void> {
    try {
      await navigator.clipboard.writeText(JSON.stringify(sessionDefinitionSchema, null, 2));
      setSchemaCopyNotice(SCHEMA_COPY_SUCCESS);
    } catch {
      setSchemaCopyNotice('Could not copy to clipboard.');
    }
  }

  return (
    <PageShell width="max-w-3xl">
      <input
        ref={importInputRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={(e) => void handleImportJSON(e)}
      />
      <div className="mx-auto max-w-xl">
        <div className="mb-10 flex items-center justify-between">
          <h1 className="skin-display skin-display-live skin-ghost text-display">sessions</h1>
          <div className="relative" ref={settingsMenuRef}>
            <button
              type="button"
              disabled={importing || pasteSubmitting}
              className="skin-control inline-flex items-center justify-center rounded-[var(--radius-control)] border border-border p-2 text-muted transition-colors hover:border-text/30 hover:text-text disabled:pointer-events-none disabled:opacity-40"
              aria-expanded={settingsMenuOpen}
              aria-haspopup="menu"
              aria-label="Session list settings"
              onClick={() => setSettingsMenuOpen((open) => !open)}
            >
              <CogIcon />
            </button>
            {settingsMenuOpen ? (
              <div
                role="menu"
                className="skin-panel-solid absolute right-0 z-40 mt-1 min-w-[16rem] rounded-[var(--radius-panel)] border border-line bg-[var(--panel-solid-bg)] py-1 text-sm shadow-none"
              >
                <button
                  type="button"
                  role="menuitem"
                  className="skin-control flex w-full rounded-[var(--radius-control)] px-3 py-2 text-left text-muted transition-colors hover:bg-bg hover:text-text"
                  onClick={() => {
                    setSettingsMenuOpen(false);
                    router.push('/builder/new');
                  }}
                >
                  create new session
                </button>
                <button
                  type="button"
                  role="menuitem"
                  disabled={importing}
                  className="skin-control flex w-full rounded-[var(--radius-control)] px-3 py-2 text-left text-muted transition-colors hover:bg-bg hover:text-text disabled:pointer-events-none disabled:opacity-40"
                  onClick={() => {
                    setSettingsMenuOpen(false);
                    importInputRef.current?.click();
                  }}
                >
                  {importing ? 'importing…' : 'import JSON'}
                </button>
                <button
                  type="button"
                  role="menuitem"
                  disabled={importing || pasteSubmitting}
                  className="skin-control flex w-full rounded-[var(--radius-control)] px-3 py-2 text-left text-muted transition-colors hover:bg-bg hover:text-text disabled:pointer-events-none disabled:opacity-40"
                  onClick={() => {
                    setSettingsMenuOpen(false);
                    setPasteText('');
                    setPasteErrors([]);
                    setPasteModalOpen(true);
                  }}
                >
                  paste JSON
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="skin-control flex w-full rounded-[var(--radius-control)] px-3 py-2 text-left text-muted transition-colors hover:bg-bg hover:text-text"
                  onClick={() => {
                    setSettingsMenuOpen(false);
                    void copySessionSchema();
                  }}
                >
                  copy JSON schema
                </button>
                {skin === 'retro-lcd' ? (
                  <button
                    type="button"
                    role="menuitem"
                    disabled={importing || pasteSubmitting}
                    className="skin-control flex w-full rounded-[var(--radius-control)] px-3 py-2 text-left text-muted transition-colors hover:bg-bg hover:text-text disabled:pointer-events-none disabled:opacity-40"
                    onClick={() => {
                      setSettingsMenuOpen(false);
                      setLcdTuningOpen(true);
                    }}
                  >
                    LCD tuning...
                  </button>
                ) : null}
                <SkinMenuSection
                  disabled={importing || pasteSubmitting}
                  onSelect={() => {
                    setSettingsMenuOpen(false);
                  }}
                />
              </div>
            ) : null}
          </div>
        </div>

        {orderError ? <p className="mb-4 text-sm text-red-500/90">{orderError}</p> : null}
        {importError ? <p className="mb-4 text-sm text-red-500/90">{importError}</p> : null}
        {schemaCopyNotice ? (
          <p
            className={`mb-4 text-sm ${schemaCopyNotice === SCHEMA_COPY_SUCCESS ? 'text-accent' : 'text-red-500/90'}`}
            role="status"
          >
            {schemaCopyNotice}
          </p>
        ) : null}

        <LcdRule className="mb-8" />
        <div className="space-y-8">
          {items.length === 0 ? (
            <p className="text-xl text-muted">
              No sessions yet. Create one in the builder and save to Supabase, or configure env to use the bundled sample.
            </p>
          ) : persistOrder && isHydrated ? (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => void handleDragEnd(e)}>
              <SortableContext items={items.map((s) => s.session_id)} strategy={verticalListSortingStrategy}>
                {items.map((session) => (
                  <SortableSessionRow
                    key={session.session_id}
                    session={session}
                    pausedAt={pausedBySession[session.session_id] ?? null}
                    onResumePaused={handleResumePaused}
                    onCancelPause={handleCancelPause}
                  />
                ))}
              </SortableContext>
            </DndContext>
          ) : (
            items.map((session) => (
              <div key={session.session_id} className="skin-rule border-b pb-6">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <Link href={`/session/${session.session_id}`} className="skin-display text-2xl text-text hover:text-next">
                    {session.title}
                  </Link>
                  <SessionPauseControls
                    sessionId={session.session_id}
                    pausedAt={pausedBySession[session.session_id] ?? null}
                    onResume={handleResumePaused}
                    onCancelPause={handleCancelPause}
                  />
                </div>
                <Link href={`/session/${session.session_id}`} className="mt-2 block text-lg text-muted hover:text-text/80">
                  {session.duration_minutes != null ? `${session.duration_minutes} min` : '—'}
                  {(session.tags ?? []).length ? ` · ${(session.tags ?? []).join(' · ')}` : ''}
                </Link>
              </div>
            ))
          )}
        </div>
      </div>

      {pasteModalOpen ? (
        <div
          className="skin-overlay fixed inset-0 z-50 flex items-center justify-center bg-[var(--overlay-bg)] px-4 py-8"
          role="presentation"
          onClick={() => {
            if (!pasteSubmitting) {
              closePasteModal();
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
                onChange={(e) => {
                  setPasteText(e.target.value);
                  setPasteErrors([]);
                }}
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
              <ActionButton variant="ghost" type="button" disabled={pasteSubmitting} onClick={closePasteModal}>
                cancel
              </ActionButton>
              <ActionButton variant="primary" type="button" disabled={pasteSubmitting} onClick={() => void handlePasteImport()}>
                {pasteSubmitting ? 'importing…' : 'import'}
              </ActionButton>
            </div>
          </div>
        </div>
      ) : null}
      <LcdTuningPanel open={lcdTuningOpen} onClose={closeLcdTuning} />
    </PageShell>
  );
}
