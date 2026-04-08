import { notFound } from 'next/navigation';
import { ExitSheet } from '@/components/ExitSheet';

export default async function ExitPage({
  searchParams
}: {
  searchParams: Promise<{ sessionId?: string; at?: string }>;
}): Promise<JSX.Element> {
  const params = await searchParams;
  const sessionId = params.sessionId?.trim();
  if (!sessionId) {
    notFound();
  }
  return (
    <ExitSheet sessionId={sessionId} atParam={params.at} />
  );
}
