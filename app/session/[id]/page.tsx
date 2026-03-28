import { notFound } from 'next/navigation';
import { SessionDetail } from '@/components/SessionDetail';
import { getSession } from '@/lib/session-repository';

export default async function SessionPage({ params }: { params: Promise<{ id: string }> }): Promise<JSX.Element> {
  const { id } = await params;
  const session = await getSession(id);

  if (!session) {
    notFound();
  }

  return <SessionDetail session={session} />;
}
