'use client';

import { DndContext, PointerSensor, type DragEndEvent, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type ChangeEvent } from 'react';
import { SessionListSettingsMenu } from '@/components/session-list/SessionListSettingsMenu';
import { SessionPasteImportModal } from '@/components/session-list/SessionPasteImportModal';
import { SessionRows } from '@/components/session-list/SessionRows';
import { usePausedSessions } from '@/components/session-list/usePausedSessions';
import { LcdRule } from '@/components/ui/LcdChrome';
import { PageShell } from '@/components/ui/PageShell';
import { useSkin } from '@/components/providers/SkinProvider';
import { LcdTuningPanel } from '@/components/ui/LcdTuningPanel';
import { reorderSessionsOnServer, saveSessionToServer } from '@/lib/session-api-client';
import { parseImportedSession } from '@/lib/session-validation';
import sessionDefinitionSchema from '@/schema/session-definition.schema.json';
import type { SessionDefinition } from '@/types/session';

const SCHEMA_COPY_SUCCESS = 'JSON schema copied';

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

  const { pausedBySession, resumePausedSession, cancelPausedSession } = usePausedSessions(items);

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

  async function handleDragEnd(event: DragEndEvent): Promise<void> {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = items.findIndex((session) => session.session_id === active.id);
    const newIndex = items.findIndex((session) => session.session_id === over.id);
    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    const previous = items;
    const next = arrayMove(items, oldIndex, newIndex);
    setItems(next);
    setOrderError(null);

    const result = await reorderSessionsOnServer(next.map((session) => session.session_id));
    if (!result.ok) {
      setItems(previous);
      setOrderError(result.message);
      return;
    }

    router.refresh();
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

      const saveResult = await saveSessionToServer(result.session);
      if (!saveResult.ok) {
        setImportError(
          saveResult.status === 503
            ? 'Import to the list requires Supabase. Use the session builder settings menu to import JSON into a local draft.'
            : saveResult.messages.join('; ')
        );
        return;
      }

      router.refresh();
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

      const saveResult = await saveSessionToServer(result.session);
      if (!saveResult.ok) {
        setPasteErrors(
          saveResult.status === 503
            ? ['Import to the list requires Supabase. Use the session builder settings menu to import JSON into a local draft.']
            : saveResult.messages
        );
        return;
      }

      closePasteModal();
      router.refresh();
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
        onChange={(event) => void handleImportJSON(event)}
      />
      <div className="mx-auto max-w-xl">
        <div className="mb-10 flex items-center justify-between">
          <h1 className="skin-display skin-display-heading skin-display-live skin-ghost text-display">sessions</h1>
          <div className="relative z-[200]" ref={settingsMenuRef}>
            <SessionListSettingsMenu
              open={settingsMenuOpen}
              disabled={importing || pasteSubmitting}
              importing={importing}
              showLcdTuning={skin === 'retro-lcd'}
              onToggle={() => setSettingsMenuOpen((open) => !open)}
              onCreateSession={() => {
                setSettingsMenuOpen(false);
                router.push('/builder/new');
              }}
              onImportJson={() => {
                setSettingsMenuOpen(false);
                importInputRef.current?.click();
              }}
              onPasteJson={() => {
                setSettingsMenuOpen(false);
                setPasteText('');
                setPasteErrors([]);
                setPasteModalOpen(true);
              }}
              onCopySchema={() => {
                setSettingsMenuOpen(false);
                void copySessionSchema();
              }}
              onOpenLcdTuning={() => {
                setSettingsMenuOpen(false);
                setLcdTuningOpen(true);
              }}
              onCloseMenu={() => setSettingsMenuOpen(false)}
            />
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
          <SessionRows
            items={items}
            persistOrder={persistOrder}
            hydrated={isHydrated}
            sensors={sensors}
            pausedBySession={pausedBySession}
            onResumePaused={(sessionId, at) => resumePausedSession(sessionId, at, (href) => router.push(href))}
            onCancelPause={cancelPausedSession}
            onDragEnd={handleDragEnd}
          />
        </div>
      </div>

      <SessionPasteImportModal
        open={pasteModalOpen}
        pasteText={pasteText}
        pasteErrors={pasteErrors}
        pasteSubmitting={pasteSubmitting}
        onChangeText={(value) => {
          setPasteText(value);
          setPasteErrors([]);
        }}
        onClose={closePasteModal}
        onImport={() => void handlePasteImport()}
      />
      <LcdTuningPanel open={lcdTuningOpen} onClose={closeLcdTuning} />
    </PageShell>
  );
}
