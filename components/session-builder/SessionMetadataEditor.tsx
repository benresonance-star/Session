import { EditorPanel } from '@/components/ui/EditorPanel';
import { EditorField, NumberInput, TextAreaInput, TextInput } from '@/components/session-builder/BuilderFields';
import {
  updateSessionDescription,
  updateSessionDuration,
  updateSessionId,
  updateSessionLink,
  updateSessionTags,
  updateSessionTitle
} from '@/lib/session-builder';
import type { SessionDefinition } from '@/types/session';

export function SessionMetadataEditor({
  session,
  applyUpdate
}: {
  session: SessionDefinition;
  applyUpdate: (updater: (current: SessionDefinition) => SessionDefinition) => void;
}): JSX.Element {
  return (
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
          <EditorField label="session description">
            <TextAreaInput
              value={session.description ?? ''}
              onChange={(value) => applyUpdate((current) => updateSessionDescription(current, value))}
              placeholder="What this session targets (goals, focus, equipment, notes for yourself or AI)"
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
        <div className="lg:col-span-2 grid gap-4 md:grid-cols-2">
          <EditorField label="session link URL">
            <TextInput
              value={session.link?.url ?? ''}
              onChange={(value) =>
                applyUpdate((current) =>
                  updateSessionLink(
                    current,
                    value.trim()
                      ? {
                          url: value.trim(),
                          label: current.link?.label?.trim() || undefined
                        }
                      : undefined
                  )
                )
              }
              placeholder="https://youtube.com/watch?v=… or any reference"
            />
          </EditorField>
          <EditorField label="session link label (optional)">
            <TextInput
              value={session.link?.label ?? ''}
              onChange={(value) =>
                applyUpdate((current) => {
                  const url = current.link?.url?.trim();
                  if (!url) {
                    return current;
                  }
                  return updateSessionLink(current, {
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
    </EditorPanel>
  );
}
