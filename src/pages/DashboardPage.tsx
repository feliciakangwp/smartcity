import { Link, useNavigate } from 'react-router-dom';
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
    ['Shared systems', s.totals.sharedSystems],
    ['Published journeys', s.totals.publishedJourneys],
    ['Broken data links', s.totals.brokenLinks],
  ] as const;
  return (
    <div className="h-full overflow-y-auto">
      <div className="page-wide py-8">
        <div className="eyebrow">ICT landscape</div>
        <h1 className="mt-1 text-3xl font-bold text-heading">Port Nexus Overview</h1>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-7">
          {kpis.map(([label, value]) => {
            const alert = label === 'Broken data links' && value > 0;
            const tile = (
              <div className={`h-full rounded-[10px] border px-4 py-3 ${alert ? 'border-red-200 bg-red-50' : 'border-ink-200 bg-surface'}`}>
                <div className={`text-xs ${alert ? 'text-red-700' : 'text-ink-500'}`}>{label}</div>
                <div className={`num font-display text-3xl font-bold ${alert ? 'text-red-700' : 'text-heading'}`}>{value}</div>
              </div>
            );
            return label === 'Broken data links' ? (
              <Link key={label} to="/systems" className="block rounded-[10px] focus-visible:ring-2" title="Open Systems to fix broken links">
                {tile}
              </Link>
            ) : (
              <div key={label}>{tile}</div>
            );
          })}
        </div>
        <div className="mt-8">
          <DashboardContent onHighlight={() => navigate('/world')} onFocusSystem={(id) => navigate(`/world?focus=system:${id}`)} />
        </div>
      </div>
    </div>
  );
}
