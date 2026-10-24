// Data Journey Explorer: the ordered steps and branches of each journey.
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, GitBranch, Play } from 'lucide-react';
import { useLandscape } from '@/store/landscape';
import { DATA_TYPE_COLORS, type Integration } from '@/types/domain';
import { Button, Chip, Empty, ZoneSwatch } from '@/components/ui';

export default function JourneysPage() {
  const journeys = useLandscape((s) => s.journeys).filter((j) => !j.archived);
  const integrations = useLandscape((s) => s.integrations);
  const systems = useLandscape((s) => s.systems);
  const zones = useLandscape((s) => s.zones);
  const [params] = useSearchParams();
  const systemFilter = params.get('system');

  const intById = new Map(integrations.map((i) => [i.id, i]));
  const sysById = new Map(systems.map((s) => [s.id, s]));
  const zoneColor = (sid: string) => zones.find((z) => z.id === sysById.get(sid)?.zoneId)?.color ?? '#999';
  const touches = (i?: Integration) => !!i && (i.sourceId === systemFilter || i.destinationId === systemFilter || i.via.includes(systemFilter ?? ''));
  const shown = systemFilter
    ? journeys.filter((j) => [...j.steps.map((s) => s.integrationId), ...j.branches.map((b) => b.integrationId)].some((id) => touches(intById.get(id))))
    : journeys;
  const filterSys = systemFilter ? sysById.get(systemFilter) : undefined;

  const SysTag = ({ id }: { id: string }) => {
    const s = sysById.get(id);
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-semibold ${id === systemFilter ? 'border-nexus-400 bg-nexus-100' : 'border-ink-200 bg-white'}`}>
        <ZoneSwatch color={zoneColor(id)} className="h-2.5 w-2.5" />
        {s?.acronym ?? '?'}
      </span>
    );
  };

  const Hop = ({ i }: { i: Integration }) => (
    <div className="flex flex-wrap items-center gap-2">
      <SysTag id={i.sourceId} />
      {i.via.map((v) => (
        <span key={v} className="flex items-center gap-2">
          <ArrowRight className="h-3.5 w-3.5 text-ink-300" />
          <SysTag id={v} />
        </span>
      ))}
      <ArrowRight className="h-3.5 w-3.5" style={{ color: DATA_TYPE_COLORS[i.dataType] }} />
      <SysTag id={i.destinationId} />
      <span className="text-xs text-ink-500">
        {i.mechanism} · <span style={{ color: DATA_TYPE_COLORS[i.dataType] }}>{i.dataType}</span>
      </span>
    </div>
  );

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="eyebrow">Data journey explorer</div>
        <h1 className="mt-1 text-3xl font-bold text-navy-900">How information moves between systems</h1>
        <p className="mt-1 max-w-[65ch] text-sm text-ink-700">
          Each journey is an ordered set of integrations, with conditional branches where the outcome depends on the data. These are illustrative journeys built on placeholder systems.
        </p>
        {filterSys && (
          <p className="mt-3 text-sm">
            Showing journeys that involve <b>{filterSys.acronym}</b> · {filterSys.name}.{' '}
            <Link to="/journeys" className="font-semibold text-harbor-500 hover:underline">Show all</Link>
          </p>
        )}

        <div className="mt-6 flex flex-col gap-4">
          {shown.length === 0 && <Empty>No journeys include this system yet.</Empty>}
          {shown.map((j) => (
            <article key={j.id} className="rounded-[10px] border border-ink-200 bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="grid h-7 w-7 place-items-center rounded-md bg-navy-800 font-mono text-sm font-semibold text-white">{j.code}</span>
                    <h2 className="text-lg font-bold text-navy-900">{j.name}</h2>
                    {j.published ? <Chip color="#1f9d55">Published</Chip> : <Chip>Draft</Chip>}
                  </div>
                  <p className="mt-1.5 max-w-[70ch] text-sm text-ink-700">{j.description}</p>
                </div>
                <Button size="sm" icon={Play} disabled title="Animated journey playback arrives in Phase 3">
                  Play in Port World (Phase 3)
                </Button>
              </div>
              <ol className="mt-4 flex flex-col gap-3 border-l-2 border-ink-200 pl-5">
                {j.steps
                  .slice()
                  .sort((a, b) => a.order - b.order)
                  .map((step, n) => {
                    const i = intById.get(step.integrationId);
                    const branches = j.branches.filter((b) => b.afterStepId === step.id);
                    return (
                      <li key={step.id} className="relative">
                        <span className="absolute -left-[31px] top-0 grid h-5 w-5 place-items-center rounded-full border-2 border-ink-200 bg-white font-mono text-[10px] font-semibold text-ink-700">{n + 1}</span>
                        <div className="text-sm font-semibold">{step.label}</div>
                        {i ? <div className="mt-1"><Hop i={i} /></div> : <div className="text-xs text-red-700">Integration missing from the register.</div>}
                        {branches.length > 0 && (
                          <div className="mt-3 flex flex-col gap-2 rounded-md bg-harbor-50 p-3">
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-ink-700">
                              <GitBranch className="h-3.5 w-3.5" /> Then, depending on the outcome
                            </div>
                            {branches.map((b) => {
                              const bi = intById.get(b.integrationId);
                              return (
                                <div key={b.id} className="flex flex-col gap-1">
                                  <span className="text-xs text-ink-500">If {b.condition.toLowerCase()}</span>
                                  {bi && <Hop i={bi} />}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </li>
                    );
                  })}
              </ol>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
