import { SessionList } from '@/components/SessionList';
import { listSessions } from '@/lib/session-repository';

export const dynamic = 'force-dynamic';

export default async function HomePage(): Promise<JSX.Element> {
  const sessions = await listSessions();
  return <SessionList sessions={sessions} />;
}
