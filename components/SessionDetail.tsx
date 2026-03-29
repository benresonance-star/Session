import Link from 'next/link';
import { LcdLabel, LcdRule, LcdTransportLink } from '@/components/ui/LcdChrome';
import { PageShell } from '@/components/ui/PageShell';
import type { Block, SessionDefinition } from '@/types/session';

function formatRounds(n: number): string {
  return `${n} ${n === 1 ? 'round' : 'rounds'}`;
}

function formatSets(n: number): string {
  return `${n} ${n === 1 ? 'set' : 'sets'}`;
}

/** Short hint for how many times the block repeats (rounds, sets, minutes, etc.). */
function blockStructureHint(block: Block): string | null {
  switch (block.block_type) {
    case 'circuit_rounds':
      return formatRounds(block.rounds);
    case 'flow': {
      const r = block.rounds ?? 1;
      return r > 1 ? formatRounds(r) : null;
    }
    case 'straight_sets':
      return formatSets(block.sets);
    case 'superset':
      return formatSets(block.sets);
    case 'emom':
      return `${block.minutes} ${block.minutes === 1 ? 'minute' : 'minutes'} EMOM`;
    case 'circuit_time': {
      const s = block.duration_seconds;
      if (s >= 60 && s % 60 === 0) return `${s / 60} min timed circuit`;
      return `${s}s timed circuit`;
    }
    default:
      return null;
  }
}

export function SessionDetail({ session }: { session: SessionDefinition }): JSX.Element {
  return (
    <PageShell width="max-w-3xl">
        <Link href="/home" className="skin-label text-[11px] text-muted hover:text-text">← sessions</Link>

        <h1 className="skin-display skin-display-heading skin-display-live skin-ghost mt-6 text-display">{session.title}</h1>
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xl text-muted">
          <span>{session.duration_minutes} min</span>
          {(session.tags ?? []).map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>

        {session.description?.trim() ? (
          <p className="mt-8 max-w-prose whitespace-pre-wrap text-2xl leading-relaxed text-text">{session.description.trim()}</p>
        ) : null}

        <LcdRule className="mt-10" />
        <div className="mt-10 space-y-10">
          {session.stages.map((stage) => (
            <section key={stage.stage_id}>
              <LcdLabel>{stage.title}</LcdLabel>
              <div className="mt-4 space-y-6">
                {(stage.sections ?? []).map((section) => (
                  <div key={section.section_id} className="space-y-3">
                    <div className="skin-display text-2xl text-text">{section.title}</div>
                    {section.blocks.map((block) => {
                      const structureHint = blockStructureHint(block);
                      return (
                      <div key={block.block_id} className="skin-rule-y space-y-2 border-l pl-4">
                        <div className="text-sm">
                          <span className="text-muted">{block.title}</span>
                          {structureHint ? (
                            <span className="text-text"> · {structureHint}</span>
                          ) : null}
                        </div>
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
                    );
                    })}
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        <LcdRule className="mt-10" />
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <LcdTransportLink href={`/play/${session.session_id}`}>start</LcdTransportLink>
          <Link href={`/builder/${session.session_id}`} className="skin-label text-[11px] text-adjust">
            edit
          </Link>
          <button className="skin-label text-[11px] text-muted">duplicate</button>
        </div>
    </PageShell>
  );
}
