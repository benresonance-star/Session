import { CollapseButton, EditorField, NumberInput, TextAreaInput, TextInput } from '@/components/session-builder/BuilderFields';
import {
  getExerciseCollapseKey
} from '@/components/session-builder/collapsed-state';
import {
  updateExerciseCoach,
  updateExerciseEquipmentKind,
  updateExerciseLink,
  updateExerciseLoadValue,
  updateExercisePrescriptionMode,
  updateExercisePrescriptionValue,
  updateExerciseRest,
  updateExerciseTitle,
  type AnyExercisePath
} from '@/lib/session-builder';
import type { Exercise, SessionDefinition } from '@/types/session';

export function ExerciseEditor({
  exercise,
  path,
  collapsed,
  onToggleCollapse,
  applyUpdate,
  equipmentOptions,
  options
}: {
  exercise: Exercise;
  path: AnyExercisePath;
  collapsed: boolean;
  onToggleCollapse: () => void;
  applyUpdate: (updater: (current: SessionDefinition) => SessionDefinition) => void;
  equipmentOptions: readonly Exercise['equipment']['kind'][];
  options?: {
    titlePrefix?: string;
    heading?: string;
    actions?: JSX.Element;
  };
}): JSX.Element {
  const isLoadBearing = 'load' in exercise.equipment;
  const loadValue = 'load' in exercise.equipment ? exercise.equipment.load?.value : undefined;
  const displayTitle = exercise.title.trim() || 'Untitled exercise';
  const title = options?.titlePrefix ? `${options.titlePrefix}: ${displayTitle}` : displayTitle;

  return (
    <div className="skin-panel rounded-[var(--radius-panel)] border border-border/70 bg-surface/40 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          {options?.heading ? (
            <div className="text-xs uppercase tracking-wide-ui text-muted">{options.heading}</div>
          ) : null}
          <div className="mt-1 text-base font-medium text-text">{title}</div>
        </div>
        <div className="flex flex-wrap gap-px">
          <CollapseButton
            collapsed={collapsed}
            onToggle={onToggleCollapse}
            label={`exercise ${getExerciseCollapseKey(exercise.exercise_id)}`}
          />
          {options?.actions}
        </div>
      </div>

      {!collapsed ? (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <EditorField label={options?.titlePrefix ? `${options.titlePrefix} title` : 'exercise title'}>
            <TextInput
              value={exercise.title}
              onChange={(value) => applyUpdate((current) => updateExerciseTitle(current, path, value))}
              placeholder="Untitled exercise"
            />
          </EditorField>

          <EditorField label="equipment">
            <select
              value={exercise.equipment.kind}
              onChange={(event) =>
                applyUpdate((current) =>
                  updateExerciseEquipmentKind(current, path, event.target.value as Exercise['equipment']['kind'])
                )
              }
              className="skin-control w-full rounded-[var(--radius-control)] border border-border bg-[var(--input-bg)] px-3 py-2 text-sm text-text outline-none transition-colors focus:border-accent"
            >
              {equipmentOptions.map((option) => (
                <option key={option} value={option}>
                  {option.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </EditorField>

          <EditorField label="prescription type">
            <select
              value={exercise.prescription.mode}
              onChange={(event) =>
                applyUpdate((current) =>
                  updateExercisePrescriptionMode(current, path, event.target.value as Exercise['prescription']['mode'])
                )
              }
              className="skin-control w-full rounded-[var(--radius-control)] border border-border bg-[var(--input-bg)] px-3 py-2 text-sm text-text outline-none transition-colors focus:border-accent"
            >
              <option value="reps">reps</option>
              <option value="rep_range">rep range</option>
              <option value="time">time</option>
            </select>
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
            <EditorField label="coach / form cue">
              <TextAreaInput
                value={exercise.coach ?? ''}
                onChange={(value) => applyUpdate((current) => updateExerciseCoach(current, path, value))}
                placeholder="Form, tempo, hold timing (e.g. hold 3s at the bottom)"
                rows={3}
              />
            </EditorField>
          </div>

          <div className="lg:col-span-2 grid gap-4 md:grid-cols-2">
            <EditorField label="exercise link URL">
              <TextInput
                value={exercise.link?.url ?? ''}
                onChange={(value) =>
                  applyUpdate((current) =>
                    updateExerciseLink(
                      current,
                      path,
                      value.trim()
                        ? {
                            url: value.trim(),
                            label: exercise.link?.label?.trim() || undefined
                          }
                        : undefined
                    )
                  )
                }
                placeholder="https://…"
              />
            </EditorField>
            <EditorField label="exercise link label (optional)">
              <TextInput
                value={exercise.link?.label ?? ''}
                onChange={(value) =>
                  applyUpdate((current) => {
                    const url = exercise.link?.url?.trim();
                    if (!url) {
                      return current;
                    }
                    return updateExerciseLink(current, path, {
                      url,
                      label: value.trim() || undefined
                    });
                  })
                }
                placeholder="Shown instead of hostname"
              />
            </EditorField>
          </div>
        </div>
      ) : null}
    </div>
  );
}
