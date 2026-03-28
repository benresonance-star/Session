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
import { useEffect, useState } from 'react';
import type { SessionDefinition } from '@/types/session';

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

  useEffect(() => {
    setItems(sessions);
  }, [sessions]);

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

  return (
    <main className="min-h-screen bg-bg text-text px-6 py-10 sm:px-10">
      <div className="mx-auto max-w-xl">
        <div className="mb-10 flex items-center justify-between">
          <h1 className="text-3xl font-semibold tracking-tight">sessions</h1>
          <button className="text-sm text-muted hover:text-text transition-colors">import JSON</button>
        </div>

        {orderError ? <p className="mb-4 text-sm text-red-500/90">{orderError}</p> : null}

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

        <Link href="/builder/new" className="mt-10 inline-block text-lg text-muted hover:text-text transition-colors">
          + create new session
        </Link>
      </div>
    </main>
  );
}
