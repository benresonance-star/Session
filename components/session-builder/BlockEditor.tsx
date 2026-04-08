import { ActionButton } from '@/components/ui/ActionButton';
import { EditorPanel } from '@/components/ui/EditorPanel';
import { EditorField, NumberInput, RowActions, SelectInput, TextInput } from '@/components/session-builder/BuilderFields';
import { getBlockCollapseKey } from '@/components/session-builder/collapsed-state';
import { ExerciseEditor } from '@/components/session-builder/ExerciseEditor';
import {
  addExercise,
  addExercisePair,
  BLOCK_TYPE_LABELS,
  moveBlock,
  moveExercise,
  moveExercisePair,
  removeBlock,
  removeExercise,
  removeExercisePair,
  updateBlockSetting,
  updateBlockTitle,
  updateBlockType,
  type BlockPath,
  type ExercisePath,
  type SupersetExercisePath
} from '@/lib/session-builder';
import type { Block, BlockType, Exercise, SessionDefinition } from '@/types/session';

const blockTypeOptions = Object.keys(BLOCK_TYPE_LABELS) as BlockType[];

function BlockSettings({
  block,
  path,
  applyUpdate
}: {
  block: Block;
  path: BlockPath;
  applyUpdate: (updater: (current: SessionDefinition) => SessionDefinition) => void;
}): JSX.Element | null {
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
          <label className="skin-control flex items-center gap-3 rounded-[var(--radius-control)] border border-border bg-[var(--input-bg)] px-3 py-2 text-sm text-muted">
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

export function BlockEditor({
  block,
  path,
  applyUpdate,
  isCollapsed,
  toggleCollapsed,
  equipmentOptions
}: {
  block: Block;
  path: BlockPath;
  applyUpdate: (updater: (current: SessionDefinition) => SessionDefinition) => void;
  isCollapsed: (key: string) => boolean;
  toggleCollapsed: (key: string) => void;
  equipmentOptions: readonly Exercise['equipment']['kind'][];
}): JSX.Element {
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

        <BlockSettings block={block} path={path} applyUpdate={applyUpdate} />

        <div className="space-y-3">
          {block.block_type === 'superset'
            ? block.exercise_pairs.map((pair, pairIndex) => (
                <div
                  key={`${block.block_id}-pair-${pairIndex}`}
                  className="skin-panel rounded-[var(--radius-panel)] border border-border/60 bg-panel/40 p-4"
                >
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
                        <ExerciseEditor
                          exercise={exercise}
                          path={{
                            ...path,
                            pairIndex,
                            pairExerciseIndex: pairExerciseIndex as 0 | 1
                          } satisfies SupersetExercisePath}
                          collapsed={isCollapsed(`exercise:${exercise.exercise_id}`)}
                          onToggleCollapse={() => toggleCollapsed(`exercise:${exercise.exercise_id}`)}
                          applyUpdate={applyUpdate}
                          equipmentOptions={equipmentOptions}
                          options={{
                            titlePrefix: pairExerciseIndex === 0 ? 'A' : 'B',
                            heading: `pair ${pairIndex + 1}`
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))
            : block.exercises.map((exercise, exerciseIndex) => (
                <div key={exercise.exercise_id}>
                  <ExerciseEditor
                    exercise={exercise}
                    path={{ ...path, exerciseIndex } satisfies ExercisePath}
                    collapsed={isCollapsed(`exercise:${exercise.exercise_id}`)}
                    onToggleCollapse={() => toggleCollapsed(`exercise:${exercise.exercise_id}`)}
                    applyUpdate={applyUpdate}
                    equipmentOptions={equipmentOptions}
                    options={{
                      heading: `exercise ${exerciseIndex + 1}`,
                      actions: (
                        <RowActions
                          onMoveUp={() => applyUpdate((current) => moveExercise(current, { ...path, exerciseIndex }, -1))}
                          onMoveDown={() => applyUpdate((current) => moveExercise(current, { ...path, exerciseIndex }, 1))}
                          onRemove={() => applyUpdate((current) => removeExercise(current, { ...path, exerciseIndex }))}
                          removeLabel="remove exercise"
                        />
                      )
                    }}
                  />
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
