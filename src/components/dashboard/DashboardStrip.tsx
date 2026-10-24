// Compact KPI strip across the top of the Port World.
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useWorld } from '@/store/world';
import { STATUS_COLORS } from '@/lib/metrics';
import { useSummary } from './useSummary';

export function DashboardStrip() {
  const s = useSummary();
  const expanded = useWorld((x) => x.dashboardExpanded);
  const setExpanded = useWorld((x) => x.setDashboardExpanded);
  const kpis = [
    { label: 'Zones', value: s.totals.zones },
    { label: 'Systems', value: s.totals.systems },
    { label: 'Shared systems', value: s.totals.sharedSystems },
    { label: 'Integrations', value: s.totals.integrations },
    { label: 'Published journeys', value: s.totals.publishedJourneys },
  ];
  const statuses = s.byStatus.filter((d) => d.value > 0);
  const total = Math.max(1, s.totals.systems);

  return (
    <div className="panel pointer-events-auto flex max-w-full items-stretch gap-0 overflow-x-auto">
      {kpis.map((k) => (
        <div key={k.label} className="flex shrink-0 flex-col justify-center border-r border-ink-200 px-4 py-2">
          <span className="text-[11px] font-medium text-ink-500">{k.label}</span>
          <span className="num font-display text-xl font-bold leading-tight text-navy-900">{k.value}</span>
        </div>
      ))}
      <div className="flex min-w-[220px] flex-1 flex-col justify-center gap-1.5 px-4 py-2">
        <span className="text-[11px] font-medium text-ink-500">Systems by status</span>
        <div className="flex h-2.5 gap-[2px]" role="img" aria-label={statuses.map((d) => `${d.name}: ${d.value}`).join(', ')}>
          {statuses.map((d) => (
            <span
              key={d.name}
              title={`${d.name}: ${d.value}`}
              className="h-full first:rounded-l last:rounded-r"
              style={{ width: `${(d.value / total) * 100}%`, background: STATUS_COLORS[d.name] }}
            />
          ))}
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-ink-700">
          {statuses.map((d) => (
            <span key={d.name} className="num inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-sm" style={{ background: STATUS_COLORS[d.name] }} />
              {d.name} {d.value}
            </span>
          ))}
        </div>
      </div>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex shrink-0 items-center gap-1 border-l border-ink-200 px-4 text-sm font-semibold text-navy-700 hover:bg-harbor-50"
        aria-expanded={expanded}
      >
        {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        {expanded ? 'Collapse' : 'Expand dashboard'}
      </button>
    </div>
  );
}
