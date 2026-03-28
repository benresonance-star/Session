import { ExitSheet } from '@/components/ExitSheet';

export default async function ExitPage({
  searchParams
}: {
  searchParams: Promise<{ sessionId?: string }>;
}): Promise<JSX.Element> {
  const params = await searchParams;
  return <ExitSheet sessionId={params.sessionId ?? 'posterior-chain-alpha'} />;
}
