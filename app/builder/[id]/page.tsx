import { notFound } from 'next/navigation';
import { SessionBuilder } from '@/components/SessionBuilder';
import { getSession } from '@/lib/session-repository';

export default async function BuilderPage({ params }: { params: Promise<{ id: string }> }): Promise<JSX.Element> {
  const { id } = await params;
  const session = await getSession(id);

  if (!session) {
    notFound();
  }

  return (
    <SessionBuilder
      initialSession={session}
      backHref={`/session/${session.session_id}`}
      allowServerDelete
    />
  );
}
