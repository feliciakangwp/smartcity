import { useNavigate } from 'react-router-dom';
import { DashboardContent } from '@/components/dashboard/DashboardContent';
import { useSummary } from '@/components/dashboard/useSummary';

export default function DashboardPage() {
  const navigate = useNavigate();
  const s = useSummary();
  const kpis = [
    ['Zones', s.totals.zones],
    ['Systems', s.totals.systems],
    ['Integrations', s.totals.integrations],
    ['Cross-division integrations', s.totals.crossDivision],
    ['Published journeys', s.totals.publishedJourneys],
  ] as const;
  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="eyebrow">ICT dashboard</div>
        <h1 className="mt-1 text-3xl font-bold text-navy-900">The landscape in numbers</h1>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {kpis.map(([label, value]) => (
            <div key={label} className="rounded-[10px] border border-ink-200 bg-white px-4 py-3">
              <div className="text-xs text-ink-500">{label}</div>
              <div className="num font-display text-3xl font-bold text-navy-900">{value}</div>
            </div>
          ))}
        </div>
        <div className="mt-8">
          <DashboardContent onHighlight={() => navigate('/')} />
        </div>
      </div>
    </div>
  );
}
