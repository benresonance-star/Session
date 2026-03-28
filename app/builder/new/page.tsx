import { SessionBuilder } from '@/components/SessionBuilder';
import { createNewSessionDraft } from '@/lib/session-draft';

export default function NewBuilderPage(): JSX.Element {
  return <SessionBuilder initialSession={createNewSessionDraft()} backHref="/home" />;
}
