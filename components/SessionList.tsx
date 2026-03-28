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
import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { CogIcon } from '@/components/ui/CogIcon';
import { safeServiceErrorMessage } from '@/lib/safe-service-error';
import { parseImportedSession } from '@/lib/session-validation';
import sessionDefinitionSchema from '@/schema/session-definition.schema.json';
import type { SessionDefinition } from '@/types/session';

const SCHEMA_COPY_SUCCESS = 'JSON schema copied';

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

function SortableSessionRow({ session }: { session: SessionDefinition }): JSX.Element {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: session.session_id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-start gap-3 border-b border-line pb-6 ${isDragging ? 'z-10 opacity-60' : ''}`}
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
      <Link href={`/session/${session.session_id}`} className="min-w-0 flex-1 block">
        <div className="text-xl font-medium">{session.title}</div>
        <div className="mt-2 text-sm text-muted">
          {session.duration_minutes != null ? `${session.duration_minutes} min` : '—'}
          {(session.tags ?? []).length ? ` · ${(session.tags ?? []).join(' · ')}` : ''}
        </div>
      </Link>
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
  const router = useRouter();
  const [items, setItems] = useState(sessions);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [settingsMenuOpen, setSettingsMenuOpen] = useState(false);
  const [schemaCopyNotice, setSchemaCopyNotice] = useState<string | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const settingsMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setItems(sessions);
  }, [sessions]);

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

      const response = await fetch('/api/sessions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(result.session)
      });
      const contentType = response.headers.get('content-type') ?? '';
      let payload: { errors?: string[]; error?: string } = {};
      if (contentType.includes('application/json')) {
        payload = (await response.json().catch(() => ({}))) as typeof payload;
      }

      if (!response.ok) {
        if (payload.errors?.length) {
          setImportError(payload.errors.map((e) => safeServiceErrorMessage(e)).join('; '));
        } else {
          setImportError(
            safeServiceErrorMessage(payload.error) ||
              (response.status === 503
                ? 'Import to the list requires Supabase. Use the session builder settings menu to import JSON into a local draft.'
                : `Import failed (${response.status}).`)
          );
        }
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

  async function copySessionSchema(): Promise<void> {
    try {
      await navigator.clipboard.writeText(JSON.stringify(sessionDefinitionSchema, null, 2));
      setSchemaCopyNotice(SCHEMA_COPY_SUCCESS);
    } catch {
      setSchemaCopyNotice('Could not copy to clipboard.');
    }
  }

  return (
    <main className="min-h-screen bg-bg text-text px-6 py-10 sm:px-10">
      <input
        ref={importInputRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={(e) => void handleImportJSON(e)}
      />
      <div className="mx-auto max-w-xl">
        <div className="mb-10 flex items-center justify-between">
          <h1 className="text-3xl font-semibold tracking-tight">sessions</h1>
          <div className="relative" ref={settingsMenuRef}>
            <button
              type="button"
              disabled={importing}
              className="inline-flex items-center justify-center rounded-md border border-border p-2 text-muted transition-colors hover:border-text/30 hover:text-text disabled:pointer-events-none disabled:opacity-40"
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
                className="absolute right-0 z-40 mt-1 min-w-[11rem] rounded-md border border-line bg-panel py-1 text-sm shadow-none"
              >
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full px-3 py-2 text-left text-muted transition-colors hover:bg-bg hover:text-text"
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
                  className="flex w-full px-3 py-2 text-left text-muted transition-colors hover:bg-bg hover:text-text disabled:pointer-events-none disabled:opacity-40"
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
                  className="flex w-full px-3 py-2 text-left text-muted transition-colors hover:bg-bg hover:text-text"
                  onClick={() => {
                    setSettingsMenuOpen(false);
                    void copySessionSchema();
                  }}
                >
                  copy JSON schema
                </button>
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

        <div className="space-y-8">
          {items.length === 0 ? (
            <p className="text-sm text-muted">
              No sessions yet. Create one in the builder and save to Supabase, or configure env to use the bundled sample.
            </p>
          ) : persistOrder ? (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => void handleDragEnd(e)}>
              <SortableContext items={items.map((s) => s.session_id)} strategy={verticalListSortingStrategy}>
                {items.map((session) => (
                  <SortableSessionRow key={session.session_id} session={session} />
                ))}
              </SortableContext>
            </DndContext>
          ) : (
            items.map((session) => (
              <Link key={session.session_id} href={`/session/${session.session_id}`} className="block border-b border-line pb-6">
                <div className="text-xl font-medium">{session.title}</div>
                <div className="mt-2 text-sm text-muted">
                  {session.duration_minutes != null ? `${session.duration_minutes} min` : '—'}
                  {(session.tags ?? []).length ? ` · ${(session.tags ?? []).join(' · ')}` : ''}
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
