import { Link } from 'react-router-dom';
import { useSummary } from '@/components/dashboard/useSummary';
import { useLandscape } from '@/store/landscape';
import { PageHead } from './AdminLayout';

export default function AdminHome() {
  const s = useSummary();
  const ships = useLandscape((x) => x.ships.length);
  const cards = [
    { to: '/admin/zones', title: 'Zones', value: s.totals.zones, text: 'Add, rename, recolour, move and archive divisions.', state: 'Editable' },
    { to: '/admin/systems', title: 'System Registry', value: s.totals.systems, text: 'Register systems, relocate them between zones, archive them.', state: 'Editable' },
    { to: '/admin/integrations', title: 'Integrations', value: s.totals.integrations, text: 'Source, destination, mechanism and data type of each link.', state: 'View only · editing in Phase 3' },
    { to: '/admin/journeys', title: 'Journey Builder', value: s.journeys.length, text: 'Ordered steps and conditional branches.', state: 'View only · builder in Phase 3' },
    { to: '/admin/maritime', title: 'Maritime', value: ships, text: 'Vessels, berths and ambient simulation.', state: 'Simulation toggles · full editing in Phase 5' },
    { to: '/admin/settings', title: 'Settings', value: null, text: 'Branding, graphics quality, export and import.', state: 'Editable' },
  ];
  return (
    <>
      <PageHead eyebrow="Port Management Studio" title="Manage the port without touching code">
        Every change here is reflected in the Port World and the dashboard straight away.
      </PageHead>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <Link key={c.to} to={c.to} className="flex flex-col gap-1 rounded-[10px] border border-ink-200 bg-white p-4 transition-colors hover:border-harbor-400">
            <div className="flex items-baseline justify-between">
              <h2 className="text-base font-bold text-navy-900">{c.title}</h2>
              {c.value !== null && <span className="num font-display text-2xl font-bold text-navy-800">{c.value}</span>}
            </div>
            <p className="text-sm text-ink-700">{c.text}</p>
            <span className="mt-1 text-xs font-semibold text-ink-500">{c.state}</span>
          </Link>
        ))}
      </div>
    </>
  );
}
