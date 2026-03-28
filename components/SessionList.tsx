'use client';

import Link from 'next/link';
import sessions from '@/data/sample-session.json';

const sessionItems = [sessions];

export function SessionList(): JSX.Element {
  return (
    <main className="min-h-screen bg-bg text-text px-6 py-10 sm:px-10">
      <div className="mx-auto max-w-xl">
        <div className="mb-10 flex items-center justify-between">
          <h1 className="text-3xl font-semibold tracking-tight">sessions</h1>
          <button className="text-sm text-muted hover:text-text transition-colors">import JSON</button>
        </div>

        <div className="space-y-8">
          {sessionItems.map((session) => (
            <Link key={session.session_id} href={`/session/${session.session_id}`} className="block border-b border-line pb-6">
              <div className="text-xl font-medium">{session.title}</div>
              <div className="mt-2 text-sm text-muted">
                {session.duration_minutes} min · {(session.tags ?? []).join(' · ')}
              </div>
            </Link>
          ))}
        </div>

        <Link href="/builder/new" className="mt-10 inline-block text-lg text-muted hover:text-text transition-colors">+ new session</Link>
      </div>
    </main>
  );
}
