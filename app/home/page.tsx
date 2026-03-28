import { SessionList } from '@/components/SessionList';
import { listSessions } from '@/lib/session-repository';
import { isSupabaseConfigured } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export default async function HomePage(): Promise<JSX.Element> {
  const sessions = await listSessions();
  return <SessionList sessions={sessions} persistOrder={isSupabaseConfigured()} />;
}
