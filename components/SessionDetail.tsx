import Link from 'next/link';
import type { SessionDefinition } from '@/types/session';

export function SessionDetail({ session }: { session: SessionDefinition }): JSX.Element {
  return (
    <main className="min-h-screen bg-bg text-text px-6 py-10 sm:px-10">
      <div className="mx-auto max-w-2xl">
        <Link href="/home" className="text-sm text-muted hover:text-text">← sessions</Link>

        <h1 className="mt-6 text-display">{session.title}</h1>
        <div className="mt-3 text-sm text-muted">{session.duration_minutes} min · {(session.tags ?? []).join(' · ')}</div>

        <div className="mt-12 space-y-10">
          {session.stages.map((stage) => (
            <section key={stage.stage_id}>
              <h2 className="text-sm uppercase tracking-wide-ui text-muted">{stage.title}</h2>
              <div className="mt-4 space-y-6">
                {(stage.sections ?? []).map((section) => (
                  <div key={section.section_id} className="space-y-3">
                    <div className="text-base text-text">{section.title}</div>
                    {section.blocks.map((block) => (
                      <div key={block.block_id} className="space-y-2 pl-4 border-l border-line">
                        <div className="text-sm text-muted">{block.title}</div>
                        {'exercises' in block ? block.exercises.map((exercise) => (
                          <div key={exercise.exercise_id} className="flex items-baseline justify-between gap-6 text-sm">
                            <span>{exercise.title}</span>
                            <span className="text-muted">
                              {exercise.prescription.mode === 'reps' && `${exercise.prescription.reps} reps`}
                              {exercise.prescription.mode === 'rep_range' && `${exercise.prescription.min_reps}-${exercise.prescription.max_reps} reps`}
                              {exercise.prescription.mode === 'time' && `${exercise.prescription.seconds}s`}
                              {'load' in exercise.equipment && exercise.equipment.load ? ` @ ${exercise.equipment.load.value} ${exercise.equipment.load.unit}` : ''}
                            </span>
                          </div>
                        )) : null}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-12 flex items-center gap-8">
          <Link href={`/play/${session.session_id}`} className="text-xl text-text">[ start session ]</Link>
          <Link href={`/builder/${session.session_id}`} className="text-base text-adjust">edit</Link>
          <button className="text-base text-muted">duplicate</button>
        </div>
      </div>
    </main>
  );
}
