import Link from 'next/link';
import { ExternalResourceBookmark } from '@/components/ui/ExternalResourceBookmark';
import { LcdLabel, LcdRule, LcdTransportLink } from '@/components/ui/LcdChrome';
import { PageShell } from '@/components/ui/PageShell';
import { blockExercises, sectionsForStage } from '@/lib/session-tree';
import {
  blockStructureHint,
  exercisePrescriptionWithLoad,
  sessionHasMeaningfulExercises
} from '@/lib/session-display';
import type { SessionDefinition } from '@/types/session';

export async function SessionDetail({ session }: { session: SessionDefinition }): Promise<JSX.Element> {
  const isLinkOnlySession = Boolean(session.link?.url?.trim()) && !sessionHasMeaningfulExercises(session);

  return (
    <PageShell width="max-w-3xl">
        <Link href="/home" className="skin-label text-[11px] text-muted hover:text-text">← sessions</Link>

        <h1 className="skin-display skin-display-heading skin-display-live skin-ghost mt-6 text-display">{session.title}</h1>
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xl text-muted">
          <span>{session.duration_minutes != null ? `${session.duration_minutes} min` : '—'}</span>
          {(session.tags ?? []).map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>

        {session.description?.trim() ? (
          <p className="mt-8 max-w-prose whitespace-pre-wrap text-2xl leading-relaxed text-text">{session.description.trim()}</p>
        ) : null}

        <LcdRule className="mt-10" />
        {isLinkOnlySession ? (
          <div className="mt-10">
            <LcdLabel>link</LcdLabel>
            <ExternalResourceBookmark
              link={session.link!}
              className="mt-4"
            />
          </div>
        ) : (
          <div className="mt-10 space-y-10">
            {(session.stages ?? []).map((stage) => (
              <section key={stage.stage_id}>
                <LcdLabel>{stage.title}</LcdLabel>
                <div className="mt-4 space-y-6">
                  {sectionsForStage(stage).map((section) => (
                    <div key={section.section_id} className="space-y-3">
                      <div className="skin-display text-2xl text-text">{section.title}</div>
                      {(section.blocks ?? []).map((block) => {
                        const structureHint = blockStructureHint(block);
                        return (
                        <div key={block.block_id} className="skin-rule-y space-y-2 border-l pl-4">
                          <div className="text-sm">
                            <span className="text-muted">{block.title}</span>
                            {structureHint ? (
                              <span className="text-text"> · {structureHint}</span>
                            ) : null}
                          </div>
                          {blockExercises(block).map((exercise) => (
                            <div key={exercise.exercise_id} className="flex items-baseline justify-between gap-6 text-sm">
                              <span>{exercise.title}</span>
                              <span className="text-muted">{exercisePrescriptionWithLoad(exercise)}</span>
                            </div>
                          ))}
                        </div>
                      );
                      })}
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

        <LcdRule className="mt-10" />
        <div className="mt-8 flex flex-wrap items-center gap-4">
          {!isLinkOnlySession ? <LcdTransportLink href={`/play/${session.session_id}`}>start</LcdTransportLink> : null}
          <Link href={`/builder/${session.session_id}`} className="skin-label text-[11px] text-adjust">
            edit
          </Link>
          <button className="skin-label text-[11px] text-muted">duplicate</button>
        </div>
    </PageShell>
  );
}
