'use client';

import { DndContext, type DragEndEvent, closestCenter } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import Link from 'next/link';
import type { SessionDefinition } from '@/types/session';

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

function SessionRowBody({
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
  return (
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
      <SessionRowBody
        session={session}
        pausedAt={pausedAt}
        onResumePaused={onResumePaused}
        onCancelPause={onCancelPause}
      />
    </div>
  );
}

export function SessionRows({
  items,
  persistOrder,
  hydrated,
  sensors,
  pausedBySession,
  onResumePaused,
  onCancelPause,
  onDragEnd
}: {
  items: SessionDefinition[];
  persistOrder: boolean;
  hydrated: boolean;
  sensors: Parameters<typeof DndContext>[0]['sensors'];
  pausedBySession: Record<string, number>;
  onResumePaused: (sessionId: string, at: number) => void;
  onCancelPause: (sessionId: string) => void;
  onDragEnd: (event: DragEndEvent) => void | Promise<void>;
}): JSX.Element {
  if (items.length === 0) {
    return (
      <p className="text-xl text-muted">
        No sessions yet. Create one in the builder and save to Supabase, or configure env to use the bundled sample.
      </p>
    );
  }

  if (persistOrder && hydrated) {
    return (
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(event) => void onDragEnd(event)}>
        <SortableContext items={items.map((session) => session.session_id)} strategy={verticalListSortingStrategy}>
          {items.map((session) => (
            <SortableSessionRow
              key={session.session_id}
              session={session}
              pausedAt={pausedBySession[session.session_id] ?? null}
              onResumePaused={onResumePaused}
              onCancelPause={onCancelPause}
            />
          ))}
        </SortableContext>
      </DndContext>
    );
  }

  return (
    <>
      {items.map((session) => (
        <div key={session.session_id} className="skin-rule border-b pb-6">
          <SessionRowBody
            session={session}
            pausedAt={pausedBySession[session.session_id] ?? null}
            onResumePaused={onResumePaused}
            onCancelPause={onCancelPause}
          />
        </div>
      ))}
    </>
  );
}
