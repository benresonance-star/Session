import { ActionButton } from '@/components/ui/ActionButton';
import { EditorPanel } from '@/components/ui/EditorPanel';
import { BlockEditor } from '@/components/session-builder/BlockEditor';
import { EditorField, NumberInput, RowActions, SelectInput, TextInput } from '@/components/session-builder/BuilderFields';
import { getSectionCollapseKey, getStageCollapseKey } from '@/components/session-builder/collapsed-state';
import {
  addBlock,
  addSection,
  moveSection,
  moveStage,
  removeSection,
  removeStage,
  updateSectionRest,
  updateSectionTitle,
  updateStageId,
  updateStageTitle
} from '@/lib/session-builder';
import type { Exercise, SessionDefinition, Stage, StageId } from '@/types/session';

export function StageEditor({
  stage,
  stageIndex,
  stageOptions,
  equipmentOptions,
  applyUpdate,
  isCollapsed,
  toggleCollapsed
}: {
  stage: Stage;
  stageIndex: number;
  stageOptions: StageId[];
  equipmentOptions: readonly Exercise['equipment']['kind'][];
  applyUpdate: (updater: (current: SessionDefinition) => SessionDefinition) => void;
  isCollapsed: (key: string) => boolean;
  toggleCollapsed: (key: string) => void;
}): JSX.Element {
  const stageCollapseKey = getStageCollapseKey(stage, stageIndex);

  return (
    <EditorPanel
      key={`${stage.stage_id}-${stageIndex}`}
      title={stage.title || `Stage ${stageIndex + 1}`}
      subtitle={`Stage ${stageIndex + 1} · ${stage.stage_id}`}
      collapsible
      collapsed={isCollapsed(stageCollapseKey)}
      onToggleCollapse={() => toggleCollapsed(stageCollapseKey)}
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
                  {section.blocks.map((block, blockIndex) => (
                    <BlockEditor
                      key={block.block_id}
                      block={block}
                      path={{ stageIndex, sectionIndex, blockIndex }}
                      applyUpdate={applyUpdate}
                      isCollapsed={isCollapsed}
                      toggleCollapsed={toggleCollapsed}
                      equipmentOptions={equipmentOptions}
                    />
                  ))}
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
  );
}
