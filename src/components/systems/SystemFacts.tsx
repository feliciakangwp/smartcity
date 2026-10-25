// Read-only facts about a system shared by the Port World panel and the Systems page:
// its age and lifecycle, and its input / output data with the tally check.
import { AlertTriangle, ArrowDownLeft, ArrowUpRight, CheckCircle2 } from 'lucide-react';
import { LEGACY_AGE_YEARS, type System } from '@/types/domain';
import { ageBaseYear, buildState } from '@/lib/systemAge';
import { brokenReason, dataFlowPairs, flowsFor, type DataFlowPair } from '@/lib/dataFlows';
import { Chip } from '@/components/ui';

export function BuildSummary({ system }: { system: System }) {
  const b = buildState(system);
  const base = ageBaseYear(system);
  if (b.developing)
    return (
      <div className="flex flex-col gap-1.5" aria-label="Build progress">
        <div className="flex justify-between text-sm">
          <span className="font-semibold">{b.progress === 0 ? 'Not started' : 'Under development'}</span>
          <span className="num text-ink-700">
            {b.progress}% developed{system.yearIntroduced ? ` · target ${system.yearIntroduced}` : ''}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-ink-100" role="progressbar" aria-valuenow={b.progress} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full rounded-full bg-harbor-500" style={{ width: `${b.progress}%` }} />
        </div>
      </div>
    );
  return (
    <div className="flex flex-col gap-1.5 text-sm text-ink-700">
      <p className="flex flex-wrap items-center gap-1.5">
        {system.yearOriginated ? (
          <span>
            Originated <b>{system.yearOriginated}</b>
          </span>
        ) : (
          <span className="text-ink-500">Year originated not recorded</span>
        )}
        {b.age !== null && (
          <span>
            · <b className="num">{b.age}</b> year{b.age === 1 ? '' : 's'}
            {base?.from === 'revamp' ? ` since the ${base.year} revamp` : ''}
          </span>
        )}
      </p>
      <p className="flex flex-wrap gap-1.5">
        {b.decommissioned ? (
          <Chip color="#b45309">Decommission{system.decommissionYear ? ` · ${system.decommissionYear}` : ''}</Chip>
        ) : b.legacy ? (
          <Chip color="#9a6b4f">Old infrastructure (over {LEGACY_AGE_YEARS} years) · fully built</Chip>
        ) : b.age !== null ? (
          <Chip color="#22c3e6">New · fully built</Chip>
        ) : (
          <Chip>Fully built</Chip>
        )}
      </p>
      {(system.revamps?.length ?? 0) > 0 && (
        <ul className="flex flex-col gap-0.5 text-xs" aria-label="Revamps">
          {[...system.revamps!]
            .sort((a, b) => b.year - a.year)
            .map((r) => (
              <li key={r.id}>
                <b className="num">Revamped {r.year}</b>
                {r.areas ? ` · ${r.areas}` : ''}
                {r.useForAge ? <span className="text-ink-500"> (used for the years of the system)</span> : null}
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}

/** Input and output data for one system, each with its tally status. */
export function DataFlowList({
  system,
  systems,
  onSelect,
}: {
  system: System;
  /** Active systems, including `system`. */
  systems: System[];
  onSelect?: (id: string) => void;
}) {
  const pairs = dataFlowPairs(systems);
  const { incoming, outgoing } = flowsFor(system.id, pairs);
  const byId = new Map(systems.map((s) => [s.id, s]));
  const name = (id: string) => byId.get(id)?.acronym ?? 'Unknown';
  const broken = [...incoming, ...outgoing].filter((p) => p.status !== 'ok').length;

  const item = (p: DataFlowPair, dir: 'in' | 'out') => {
    const other = dir === 'in' ? p.fromId : p.toId;
    const items = dir === 'in' ? (p.inputs.length ? p.inputs : p.outputs) : p.outputs.length ? p.outputs : p.inputs;
    const ok = p.status === 'ok';
    return (
      <li key={`${p.fromId}>${p.toId}`}>
        <button
          type="button"
          disabled={!onSelect}
          onClick={() => onSelect?.(other)}
          className="flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left text-sm enabled:hover:bg-harbor-50"
        >
          {dir === 'in' ? <ArrowDownLeft className="mt-0.5 h-4 w-4 shrink-0 text-ink-500" aria-hidden /> : <ArrowUpRight className="mt-0.5 h-4 w-4 shrink-0 text-ink-500" aria-hidden />}
          <span className="min-w-0 flex-1">
            <span className="block font-medium">{items.join(', ')}</span>
            <span className="block text-xs text-ink-500">
              {dir === 'in' ? 'from' : 'to'} <b className="font-semibold text-ink-700">{name(other)}</b>
            </span>
            {!ok && <span className="mt-0.5 block text-xs font-semibold text-red-700">Broken link. {brokenReason(p, name)}</span>}
          </span>
          {ok ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-label="Tally matches" />
          ) : (
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" aria-label="Broken link" />
          )}
        </button>
      </li>
    );
  };

  return (
    <section className="flex flex-col gap-2" aria-label="Input and output data">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold">Input and output data</h3>
        {broken > 0 ? <Chip color="#dc2626">{broken} broken link{broken === 1 ? '' : 's'}</Chip> : incoming.length + outgoing.length > 0 ? <Chip color="#1f9d55">Tally matches</Chip> : null}
      </div>
      <div>
        <h4 className="text-xs font-semibold text-ink-500">Input data ({incoming.length})</h4>
        {incoming.length ? <ul>{incoming.map((p) => item(p, 'in'))}</ul> : <p className="px-2 py-1 text-sm text-ink-500">None recorded.</p>}
      </div>
      <div>
        <h4 className="text-xs font-semibold text-ink-500">Output data ({outgoing.length})</h4>
        {outgoing.length ? <ul>{outgoing.map((p) => item(p, 'out'))}</ul> : <p className="px-2 py-1 text-sm text-ink-500">None recorded.</p>}
      </div>
    </section>
  );
}
