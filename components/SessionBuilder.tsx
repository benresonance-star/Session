'use client';

import Link from 'next/link';
import { useMemo, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { ActionButton } from '@/components/ui/ActionButton';
import { EditorPanel } from '@/components/ui/EditorPanel';
import { PageShell } from '@/components/ui/PageShell';
import {
  addBlock,
  addExercise,
  addExercisePair,
  addSection,
  addStage,
  BLOCK_TYPE_LABELS,
  moveBlock,
  moveExercise,
  moveExercisePair,
  moveSection,
  moveStage,
  removeBlock,
  removeExercise,
  removeExercisePair,
  removeSection,
  removeStage,
  updateBlockSetting,
  updateBlockTitle,
  updateBlockType,
  updateExerciseEquipmentKind,
  updateExerciseLink,
  updateExerciseLoadValue,
  updateExercisePrescriptionMode,
  updateExercisePrescriptionValue,
  updateExerciseRest,
  updateExerciseTitle,
  updateSectionRest,
  updateSectionTitle,
  updateSessionDescription,
  updateSessionDuration,
  updateSessionId,
  updateSessionTags,
  updateSessionTitle,
  updateStageId,
  updateStageTitle
} from '@/lib/session-builder';
import { exportSessionDefinition, parseImportedSession, validateSessionDefinition } from '@/lib/session-validation';
import type {
  AnyExercisePath,
  BlockPath,
  ExercisePath,
  SupersetExercisePath
} from '@/lib/session-builder';
import type { Block, BlockType, Exercise, SessionDefinition, Stage, StageId } from '@/types/session';

const stageOptions: StageId[] = ['warmup', 'main', 'cooldown'];
const blockTypeOptions = Object.keys(BLOCK_TYPE_LABELS) as BlockType[];
const equipmentOptions = [
  'bodyweight',
  'kettlebell',
  'dumbbell',
  'barbell',
  'resistance_band',
  'machine',
  'other'
] as const;

function parseOptionalNumber(value: string, minimum = 0): number | undefined {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  if (Number.isNaN(parsed)) return undefined;
  return Math.max(minimum, parsed);
}

function EditorField({
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

function TextInput({
  value,
  onChange,
  placeholder
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}): JSX.Element {
  return (
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="w-full rounded-md border border-border bg-panel px-3 py-2 text-sm text-text outline-none transition-colors focus:border-accent"
    />
  );
}

function NumberInput({
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
      min={minimum}
      value={value ?? ''}
      onChange={(event) => onChange(parseOptionalNumber(event.target.value, minimum))}
      className="w-full rounded-md border border-border bg-panel px-3 py-2 text-sm text-text outline-none transition-colors focus:border-accent"
    />
  );
}

function SelectInput({
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
      className="w-full rounded-md border border-border bg-panel px-3 py-2 text-sm text-text outline-none transition-colors focus:border-accent"
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

function RowActions({
  onMoveUp,
  onMoveDown,
  onRemove,
  removeLabel
}: {
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onRemove?: () => void;
  removeLabel: string;
}): JSX.Element {
  return (
    <div className="flex flex-wrap gap-2">
      {onMoveUp ? <ActionButton onClick={onMoveUp}>up</ActionButton> : null}
      {onMoveDown ? <ActionButton onClick={onMoveDown}>down</ActionButton> : null}
      {onRemove ? <ActionButton variant="danger" onClick={onRemove}>{removeLabel}</ActionButton> : null}
    </div>
  );
}

function getStageCollapseKey(stage: Stage, stageIndex: number): string {
  const anchorSectionId = stage.sections?.[0]?.section_id;
  return `stage:${anchorSectionId ?? `${stage.stage_id}-${stageIndex}`}`;
}

function getSectionCollapseKey(sectionId: string): string {
  return `section:${sectionId}`;
}

function getBlockCollapseKey(blockId: string): string {
  return `block:${blockId}`;
}

function getExerciseCollapseKey(exerciseId: string): string {
  return `exercise:${exerciseId}`;
}

function buildCollapsedState(session: SessionDefinition): Record<string, boolean> {
  const entries: Record<string, boolean> = {};

  session.stages.forEach((stage, stageIndex) => {
    entries[getStageCollapseKey(stage, stageIndex)] = true;

    (stage.sections ?? []).forEach((section) => {
      entries[getSectionCollapseKey(section.section_id)] = true;

      section.blocks.forEach((block) => {
        entries[getBlockCollapseKey(block.block_id)] = true;

        if (block.block_type === 'superset') {
          block.exercise_pairs.forEach((pair) => {
            pair.forEach((exercise) => {
              entries[getExerciseCollapseKey(exercise.exercise_id)] = true;
            });
          });
          return;
        }

        block.exercises.forEach((exercise) => {
          entries[getExerciseCollapseKey(exercise.exercise_id)] = true;
        });
      });
    });
  });

  return entries;
}

function syncCollapsedState(
  current: Record<string, boolean>,
  session: SessionDefinition
): Record<string, boolean> {
  const nextKeys = buildCollapsedState(session);
  const nextState: Record<string, boolean> = {};

  Object.keys(nextKeys).forEach((key) => {
    nextState[key] = key in current ? current[key] : true;
  });

  return nextState;
}

function SessionBuilder({
  initialSession,
  backHref
}: {
  initialSession: SessionDefinition;
  backHref: string;
}): JSX.Element {
  const [session, setSession] = useState<SessionDefinition>(initialSession);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [collapsedItems, setCollapsedItems] = useState<Record<string, boolean>>(() => buildCollapsedState(initialSession));
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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
    const result = validateSessionDefinition(session);
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

    const payload = exportSessionDefinition(session);
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${session.session_id || 'session'}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function handleSaveToSupabase(): Promise<void> {
    const validation = validateSessionDefinition(session);
    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      setNotice(null);
      return;
    }

    setValidationErrors([]);
    setSaving(true);
    try {
      const response = await fetch('/api/sessions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(session)
      });
      const payload = (await response.json().catch(() => ({}))) as {
        errors?: string[];
        error?: string;
      };

      if (!response.ok) {
        if (payload.errors?.length) {
          setValidationErrors(payload.errors);
        } else {
          setValidationErrors([payload.error ?? `Save failed (${response.status}).`]);
        }
        setNotice(null);
        return;
      }

      setNotice('Saved to Supabase.');
    } catch {
      setValidationErrors(['Network error while saving.']);
      setNotice(null);
    } finally {
      setSaving(false);
    }
  }

  function renderExerciseEditor(
    exercise: Exercise,
    path: AnyExercisePath,
    options?: {
      titlePrefix?: string;
      heading?: string;
      actions?: JSX.Element;
    }
  ): JSX.Element {
    const isLoadBearing = 'load' in exercise.equipment;
    const loadValue = 'load' in exercise.equipment ? exercise.equipment.load?.value : undefined;
    const collapseKey = getExerciseCollapseKey(exercise.exercise_id);
    const collapsed = isCollapsed(collapseKey);
    const title = options?.titlePrefix ? `${options.titlePrefix}: ${exercise.title}` : exercise.title;

    return (
      <div className="rounded-lg border border-border/70 bg-surface/40 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            {options?.heading ? (
              <div className="text-xs uppercase tracking-wide-ui text-muted">{options.heading}</div>
            ) : null}
            <div className="mt-1 text-base font-medium text-text">{title}</div>
          </div>
          <div className="flex flex-wrap gap-2">
            <ActionButton variant="ghost" onClick={() => toggleCollapsed(collapseKey)}>
              {collapsed ? 'expand' : 'collapse'}
            </ActionButton>
            {options?.actions}
          </div>
        </div>

        {!collapsed ? (
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <EditorField label={options?.titlePrefix ? `${options.titlePrefix} title` : 'exercise title'}>
              <TextInput
                value={exercise.title}
                onChange={(value) => applyUpdate((current) => updateExerciseTitle(current, path, value))}
                placeholder="Exercise title"
              />
            </EditorField>

            <EditorField label="equipment">
              <SelectInput
                value={exercise.equipment.kind}
                onChange={(value) => applyUpdate((current) => updateExerciseEquipmentKind(current, path, value as Exercise['equipment']['kind']))}
                options={equipmentOptions.map((option) => ({
                  value: option,
                  label: option.replace(/_/g, ' ')
                }))}
              />
            </EditorField>

            <EditorField label="prescription type">
              <SelectInput
                value={exercise.prescription.mode}
                onChange={(value) => applyUpdate((current) => updateExercisePrescriptionMode(current, path, value as Exercise['prescription']['mode']))}
                options={[
                  { value: 'reps', label: 'reps' },
                  { value: 'rep_range', label: 'rep range' },
                  { value: 'time', label: 'time' }
                ]}
              />
            </EditorField>

            {exercise.prescription.mode === 'reps' ? (
              <EditorField label="reps">
                <NumberInput
                  value={exercise.prescription.reps}
                  onChange={(value) => applyUpdate((current) => updateExercisePrescriptionValue(current, path, 'reps', value ?? 10))}
                  minimum={1}
                />
              </EditorField>
            ) : null}

            {exercise.prescription.mode === 'rep_range' ? (
              <>
                <EditorField label="min reps">
                  <NumberInput
                    value={exercise.prescription.min_reps}
                    onChange={(value) => applyUpdate((current) => updateExercisePrescriptionValue(current, path, 'min_reps', value ?? 8))}
                    minimum={1}
                  />
                </EditorField>
                <EditorField label="max reps">
                  <NumberInput
                    value={exercise.prescription.max_reps}
                    onChange={(value) => applyUpdate((current) => updateExercisePrescriptionValue(current, path, 'max_reps', value ?? 12))}
                    minimum={1}
                  />
                </EditorField>
              </>
            ) : null}

            {exercise.prescription.mode === 'time' ? (
              <EditorField label="seconds">
                <NumberInput
                  value={exercise.prescription.seconds}
                  onChange={(value) => applyUpdate((current) => updateExercisePrescriptionValue(current, path, 'seconds', value ?? 60))}
                  minimum={1}
                />
              </EditorField>
            ) : null}

            {isLoadBearing ? (
              <EditorField label="load">
                <NumberInput
                  value={loadValue}
                  onChange={(value) => applyUpdate((current) => updateExerciseLoadValue(current, path, value ?? 10))}
                  minimum={0}
                />
              </EditorField>
            ) : null}

            <EditorField label="rest after">
              <NumberInput
                value={exercise.rest_after_seconds}
                onChange={(value) => applyUpdate((current) => updateExerciseRest(current, path, value))}
                minimum={0}
              />
            </EditorField>

            <div className="lg:col-span-2">
              <EditorField label="reference link">
                <TextInput
                  value={exercise.link?.url ?? ''}
                  onChange={(value) => applyUpdate((current) => updateExerciseLink(current, path, value ? { url: value } : undefined))}
                  placeholder="https://example.com/exercise"
                />
              </EditorField>
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  function renderBlockSettings(block: Block, path: BlockPath): JSX.Element | null {
    switch (block.block_type) {
      case 'flow':
        return (
          <div className="grid gap-4 md:grid-cols-3">
            <EditorField label="rounds">
              <NumberInput
                value={block.rounds ?? 1}
                onChange={(value) => applyUpdate((current) => updateBlockSetting(current, path, 'rounds', value ?? 1))}
                minimum={1}
              />
            </EditorField>
            <EditorField label="time cap">
              <NumberInput
                value={block.time_cap_seconds}
                onChange={(value) => applyUpdate((current) => updateBlockSetting(current, path, 'time_cap_seconds', value))}
                minimum={1}
              />
            </EditorField>
            <EditorField label="rest between rounds">
              <NumberInput
                value={block.rest_between_rounds_seconds}
                onChange={(value) => applyUpdate((current) => updateBlockSetting(current, path, 'rest_between_rounds_seconds', value))}
                minimum={0}
              />
            </EditorField>
          </div>
        );
      case 'straight_sets':
        return (
          <div className="grid gap-4 md:grid-cols-2">
            <EditorField label="sets">
              <NumberInput
                value={block.sets}
                onChange={(value) => applyUpdate((current) => updateBlockSetting(current, path, 'sets', value ?? 1))}
                minimum={1}
              />
            </EditorField>
            <EditorField label="rest between sets">
              <NumberInput
                value={block.rest_between_sets_seconds}
                onChange={(value) => applyUpdate((current) => updateBlockSetting(current, path, 'rest_between_sets_seconds', value))}
                minimum={0}
              />
            </EditorField>
          </div>
        );
      case 'circuit_rounds':
        return (
          <div className="grid gap-4 md:grid-cols-2">
            <EditorField label="rounds">
              <NumberInput
                value={block.rounds}
                onChange={(value) => applyUpdate((current) => updateBlockSetting(current, path, 'rounds', value ?? 1))}
                minimum={1}
              />
            </EditorField>
            <EditorField label="rest between rounds">
              <NumberInput
                value={block.rest_between_rounds_seconds}
                onChange={(value) => applyUpdate((current) => updateBlockSetting(current, path, 'rest_between_rounds_seconds', value))}
                minimum={0}
              />
            </EditorField>
          </div>
        );
      case 'circuit_time':
        return (
          <div className="grid gap-4 md:grid-cols-2">
            <EditorField label="duration">
              <NumberInput
                value={block.duration_seconds}
                onChange={(value) => applyUpdate((current) => updateBlockSetting(current, path, 'duration_seconds', value ?? 60))}
                minimum={1}
              />
            </EditorField>
            <label className="flex items-center gap-3 rounded-md border border-border bg-panel px-3 py-2 text-sm text-muted">
              <input
                type="checkbox"
                checked={Boolean(block.rest_as_needed)}
                onChange={(event) => applyUpdate((current) => updateBlockSetting(current, path, 'rest_as_needed', event.target.checked))}
              />
              Rest as needed
            </label>
          </div>
        );
      case 'superset':
        return (
          <div className="grid gap-4 md:grid-cols-2">
            <EditorField label="sets">
              <NumberInput
                value={block.sets}
                onChange={(value) => applyUpdate((current) => updateBlockSetting(current, path, 'sets', value ?? 1))}
                minimum={1}
              />
            </EditorField>
            <EditorField label="rest between sets">
              <NumberInput
                value={block.rest_between_sets_seconds}
                onChange={(value) => applyUpdate((current) => updateBlockSetting(current, path, 'rest_between_sets_seconds', value))}
                minimum={0}
              />
            </EditorField>
          </div>
        );
      case 'emom':
        return (
          <div className="grid gap-4 md:grid-cols-1">
            <EditorField label="minutes">
              <NumberInput
                value={block.minutes}
                onChange={(value) => applyUpdate((current) => updateBlockSetting(current, path, 'minutes', value ?? 1))}
                minimum={1}
              />
            </EditorField>
          </div>
        );
    }
  }

  function renderBlockEditor(block: Block, path: BlockPath): JSX.Element {
    const blockCollapseKey = getBlockCollapseKey(block.block_id);

    return (
      <EditorPanel
        key={block.block_id}
        title={block.title || `Block ${path.blockIndex + 1}`}
        subtitle={`Block ${path.blockIndex + 1} · ${BLOCK_TYPE_LABELS[block.block_type]}`}
        collapsible
        collapsed={isCollapsed(blockCollapseKey)}
        onToggleCollapse={() => toggleCollapsed(blockCollapseKey)}
        actions={
          <RowActions
            onMoveUp={() => applyUpdate((current) => moveBlock(current, path, -1))}
            onMoveDown={() => applyUpdate((current) => moveBlock(current, path, 1))}
            onRemove={() => applyUpdate((current) => removeBlock(current, path))}
            removeLabel="remove block"
          />
        }
      >
        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <EditorField label="block title">
              <TextInput
                value={block.title}
                onChange={(value) => applyUpdate((current) => updateBlockTitle(current, path, value))}
                placeholder="Block title"
              />
            </EditorField>

            <EditorField label="block type">
              <SelectInput
                value={block.block_type}
                onChange={(value) => applyUpdate((current) => updateBlockType(current, path, value as BlockType))}
                options={blockTypeOptions.map((option) => ({
                  value: option,
                  label: BLOCK_TYPE_LABELS[option]
                }))}
              />
            </EditorField>
          </div>

          {renderBlockSettings(block, path)}

          <div className="space-y-3">
            {block.block_type === 'superset'
              ? block.exercise_pairs.map((pair, pairIndex) => (
                  <div key={`${block.block_id}-pair-${pairIndex}`} className="rounded-lg border border-border/60 bg-panel/40 p-4">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                      <div className="text-sm uppercase tracking-wide-ui text-muted">pair {pairIndex + 1}</div>
                      <RowActions
                        onMoveUp={() => applyUpdate((current) => moveExercisePair(current, path, pairIndex, -1))}
                        onMoveDown={() => applyUpdate((current) => moveExercisePair(current, path, pairIndex, 1))}
                        onRemove={() => applyUpdate((current) => removeExercisePair(current, path, pairIndex))}
                        removeLabel="remove pair"
                      />
                    </div>
                    <div className="grid gap-4 xl:grid-cols-2">
                      {pair.map((exercise, pairExerciseIndex) => (
                        <div key={exercise.exercise_id}>
                          {renderExerciseEditor(exercise, {
                            ...path,
                            pairIndex,
                            pairExerciseIndex: pairExerciseIndex as 0 | 1
                          } satisfies SupersetExercisePath, {
                            titlePrefix: pairExerciseIndex === 0 ? 'A' : 'B',
                            heading: `pair ${pairIndex + 1}`
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              : block.exercises.map((exercise, exerciseIndex) => (
                  <div key={exercise.exercise_id}>
                    {renderExerciseEditor(exercise, { ...path, exerciseIndex } satisfies ExercisePath, {
                      heading: `exercise ${exerciseIndex + 1}`,
                      actions: (
                        <RowActions
                          onMoveUp={() => applyUpdate((current) => moveExercise(current, { ...path, exerciseIndex }, -1))}
                          onMoveDown={() => applyUpdate((current) => moveExercise(current, { ...path, exerciseIndex }, 1))}
                          onRemove={() => applyUpdate((current) => removeExercise(current, { ...path, exerciseIndex }))}
                          removeLabel="remove exercise"
                        />
                      )
                    })}
                  </div>
                ))}
          </div>

          <div className="flex flex-wrap gap-3">
            {block.block_type === 'superset' ? (
              <ActionButton onClick={() => applyUpdate((current) => addExercisePair(current, path))}>+ add pair</ActionButton>
            ) : (
              <ActionButton onClick={() => applyUpdate((current) => addExercise(current, path))}>+ add exercise</ActionButton>
            )}
          </div>
        </div>
      </EditorPanel>
    );
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

      <Link href={backHref} className="text-sm text-muted hover:text-text">
        ← {backHref === '/home' ? 'sessions' : 'session'}
      </Link>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-display">{session.title}</h1>
          {summary ? <div className="mt-2 text-sm text-muted">{summary}</div> : null}
        </div>
        <div className="flex flex-wrap gap-3">
          <ActionButton variant="ghost" onClick={() => fileInputRef.current?.click()}>
            import JSON
          </ActionButton>
          <ActionButton variant="primary" onClick={validateCurrentSession}>
            validate
          </ActionButton>
          <ActionButton variant="primary" disabled={saving} onClick={() => void handleSaveToSupabase()}>
            {saving ? 'saving…' : 'save to Supabase'}
          </ActionButton>
          <ActionButton variant="primary" onClick={handleExport}>
            export JSON
          </ActionButton>
        </div>
      </div>

      {notice ? (
        <div className="mt-4 rounded-md border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
          {notice}
        </div>
      ) : null}

      {validationErrors.length > 0 ? (
        <div className="mt-4 rounded-md border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
          <div className="font-medium text-text">Validation issues</div>
          <ul className="mt-2 space-y-1">
            {validationErrors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-8 grid gap-6">
        <EditorPanel title="Session metadata" subtitle="High-level information used for authoring and export.">
          <div className="grid gap-4 lg:grid-cols-2">
            <EditorField label="session title">
              <TextInput value={session.title} onChange={(value) => applyUpdate((current) => updateSessionTitle(current, value))} />
            </EditorField>
            <EditorField label="session id">
              <TextInput
                value={session.session_id}
                onChange={(value) => applyUpdate((current) => updateSessionId(current, value))}
                placeholder="session-id"
              />
            </EditorField>
            <div className="lg:col-span-2">
              <EditorField label="description">
                <TextInput
                  value={session.description ?? ''}
                  onChange={(value) => applyUpdate((current) => updateSessionDescription(current, value))}
                  placeholder="What this session is for"
                />
              </EditorField>
            </div>
            <EditorField label="duration minutes">
              <NumberInput
                value={session.duration_minutes}
                onChange={(value) => applyUpdate((current) => updateSessionDuration(current, value))}
                minimum={1}
              />
            </EditorField>
            <EditorField label="tags">
              <TextInput
                value={(session.tags ?? []).join(', ')}
                onChange={(value) => applyUpdate((current) => updateSessionTags(current, value.split(',').map((tag) => tag.trim())))}
                placeholder="strength, mobility"
              />
            </EditorField>
          </div>
        </EditorPanel>

        {session.stages.map((stage, stageIndex) => (
          <EditorPanel
            key={`${stage.stage_id}-${stageIndex}`}
            title={stage.title || `Stage ${stageIndex + 1}`}
            subtitle={`Stage ${stageIndex + 1} · ${stage.stage_id}`}
            collapsible
            collapsed={isCollapsed(getStageCollapseKey(stage, stageIndex))}
            onToggleCollapse={() => toggleCollapsed(getStageCollapseKey(stage, stageIndex))}
            actions={
              <RowActions
                onMoveUp={() => applyUpdate((current) => moveStage(current, stageIndex, -1))}
                onMoveDown={() => applyUpdate((current) => moveStage(current, stageIndex, 1))}
                onRemove={() => applyUpdate((current) => removeStage(current, stageIndex))}
                removeLabel="remove stage"
              />
            }
          >
            <div className="space-y-5">
              <div className="grid gap-4 lg:grid-cols-2">
                <EditorField label="stage title">
                  <TextInput
                    value={stage.title}
                    onChange={(value) => applyUpdate((current) => updateStageTitle(current, stageIndex, value))}
                    placeholder="Stage title"
                  />
                </EditorField>
                <EditorField label="stage id">
                  <SelectInput
                    value={stage.stage_id}
                    onChange={(value) => applyUpdate((current) => updateStageId(current, stageIndex, value as StageId))}
                    options={stageOptions.map((option) => ({ value: option, label: option }))}
                  />
                </EditorField>
              </div>

              <div className="space-y-4">
                {(stage.sections ?? []).map((section, sectionIndex) => (
                  <EditorPanel
                    key={section.section_id}
                    title={section.title || `Section ${sectionIndex + 1}`}
                    subtitle={`Section ${sectionIndex + 1}`}
                    className="bg-surface/20"
                    collapsible
                    collapsed={isCollapsed(getSectionCollapseKey(section.section_id))}
                    onToggleCollapse={() => toggleCollapsed(getSectionCollapseKey(section.section_id))}
                    actions={
                      <RowActions
                        onMoveUp={() => applyUpdate((current) => moveSection(current, { stageIndex, sectionIndex }, -1))}
                        onMoveDown={() => applyUpdate((current) => moveSection(current, { stageIndex, sectionIndex }, 1))}
                        onRemove={() => applyUpdate((current) => removeSection(current, { stageIndex, sectionIndex }))}
                        removeLabel="remove section"
                      />
                    }
                  >
                    <div className="space-y-4">
                      <div className="grid gap-4 lg:grid-cols-2">
                        <EditorField label="section title">
                          <TextInput
                            value={section.title}
                            onChange={(value) => applyUpdate((current) => updateSectionTitle(current, { stageIndex, sectionIndex }, value))}
                            placeholder="Section title"
                          />
                        </EditorField>
                        <EditorField label="rest after section">
                          <NumberInput
                            value={section.rest_after_section_seconds}
                            onChange={(value) => applyUpdate((current) => updateSectionRest(current, { stageIndex, sectionIndex }, value))}
                            minimum={0}
                          />
                        </EditorField>
                      </div>

                      <div className="space-y-4">
                        {section.blocks.map((block, blockIndex) => renderBlockEditor(block, {
                          stageIndex,
                          sectionIndex,
                          blockIndex
                        }))}
                      </div>

                      <div className="flex flex-wrap gap-3">
                        <ActionButton onClick={() => applyUpdate((current) => addBlock(current, { stageIndex, sectionIndex }))}>
                          + add block
                        </ActionButton>
                      </div>
                    </div>
                  </EditorPanel>
                ))}
              </div>

              <ActionButton onClick={() => applyUpdate((current) => addSection(current, stageIndex))}>
                + add section
              </ActionButton>
            </div>
          </EditorPanel>
        ))}

        <div className="flex flex-wrap gap-3">
          <ActionButton onClick={() => applyUpdate((current) => addStage(current))}>+ add stage</ActionButton>
        </div>
      </div>
    </PageShell>
  );
}

export { SessionBuilder };
