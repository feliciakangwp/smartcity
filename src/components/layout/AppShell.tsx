// Top navigation shared by every page, with the data-mode badge.
import { NavLink, Outlet } from 'react-router-dom';
import { Anchor, Database, LayoutDashboard, Route, Settings2, Ship } from 'lucide-react';
import { useLandscape } from '@/store/landscape';
import { dataMode, supabaseConfigured } from '@/lib/datasource';
import { cx } from '@/components/ui';

const NAV = [
  { to: '/', label: 'Port World', icon: Ship, end: true },
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/systems', label: 'Systems', icon: Database },
  { to: '/journeys', label: 'Journeys', icon: Route },
  { to: '/admin', label: 'Studio', icon: Settings2 },
];

export function AppShell() {
  const platform = useLandscape((s) => s.platform);
  return (
    <div className="flex h-full flex-col">
      <header className="z-20 flex shrink-0 items-center gap-4 border-b border-navy-900 bg-navy-900 px-4 py-2 text-white">
        <NavLink to="/" className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-md bg-gradient-to-br from-harbor-500 to-nexus-400">
            <Anchor className="h-4 w-4 text-navy-950" aria-hidden />
          </span>
          <span className="leading-tight">
            <span className="block font-display text-[15px] font-bold tracking-[0.14em]">{platform.name}</span>
            <span className="hidden text-[11px] text-harbor-300 sm:block">{platform.tagline}</span>
          </span>
        </NavLink>
        <nav className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto" aria-label="Main">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cx(
                  'flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold transition-colors',
                  isActive ? 'bg-white/10 text-white shadow-[inset_0_-2px_0_#22c3e6]' : 'text-harbor-300 hover:bg-white/5 hover:text-white',
                )
              }
            >
              <Icon className="h-4 w-4" aria-hidden />
              <span className="hidden md:inline">{label}</span>
            </NavLink>
          ))}
        </nav>
        <DataModeBadge />
      </header>
      <main className="relative min-h-0 flex-1">
        <Outlet />
      </main>
    </div>
  );
}

export function DataModeBadge() {
  const demo = dataMode === 'demo';
  return (
    <span
      className={cx(
        'hidden shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold sm:inline-flex',
        demo ? 'border-amber-300/50 bg-amber-300/15 text-amber-200' : 'border-emerald-300/50 bg-emerald-300/15 text-emerald-200',
      )}
      title={
        demo
          ? `Demo Mode: seed data and changes are stored in this browser only, not shared with other users.${supabaseConfigured ? ' Supabase credentials were found; the shared database adapter arrives in Phase 4.' : ''}`
          : 'Connected to the shared Supabase database.'
      }
    >
      <span className={cx('h-1.5 w-1.5 rounded-full', demo ? 'bg-amber-300' : 'bg-emerald-300')} />
      {demo ? 'Demo Mode · this browser only' : 'Shared database'}
    </span>
  );
}
