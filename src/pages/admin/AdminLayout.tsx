// Port Management Studio shell with sidebar navigation.
import { NavLink, Outlet } from 'react-router-dom';
import { Anchor, Boxes, Cable, LayoutGrid, Map, Route, Settings } from 'lucide-react';
import { supabaseConfigured } from '@/lib/datasource';
import { cx } from '@/components/ui';

const ITEMS = [
  { to: '/admin', label: 'Overview', icon: LayoutGrid, end: true },
  { to: '/admin/zones', label: 'Zones', icon: Map },
  { to: '/admin/systems', label: 'System Registry', icon: Boxes },
  { to: '/admin/integrations', label: 'Integrations', icon: Cable },
  { to: '/admin/journeys', label: 'Journey Builder', icon: Route },
  { to: '/admin/maritime', label: 'Maritime', icon: Anchor },
  { to: '/admin/settings', label: 'Settings', icon: Settings },
];

export default function AdminLayout() {
  return (
    <div className="flex h-full flex-col md:flex-row">
      <aside className="shrink-0 border-b border-ink-200 bg-surface md:w-60 md:border-b-0 md:border-r">
        <div className="hidden px-4 pb-2 pt-5 md:block">
          <div className="eyebrow">Port Management Studio</div>
        </div>
        <nav className="flex gap-1 overflow-x-auto p-2 md:flex-col md:overflow-visible" aria-label="Studio">
          {ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cx('flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold', isActive ? 'bg-harbor-100 text-heading' : 'text-ink-700 hover:bg-ink-100')
              }
            >
              <Icon className="h-4 w-4" aria-hidden /> {label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="min-h-0 min-w-0 flex-1 overflow-y-auto">
        <div className="border-b border-amber-200 bg-amber-50 px-6 py-2 text-xs text-amber-900">
          <b>Demo Mode.</b> Changes are saved in this browser only and are not shared. Administrator sign-in and the shared Supabase database arrive in Phase 4
          {supabaseConfigured ? ' (credentials detected).' : '.'}
        </div>
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

export function PageHead({ eyebrow, title, children, actions }: { eyebrow: string; title: string; children?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1 className="mt-1 text-2xl font-bold text-heading">{title}</h1>
        {children && <p className="mt-1 max-w-[70ch] text-sm text-ink-700">{children}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function PhaseNote({ phase, children }: { phase: number; children: React.ReactNode }) {
  return (
    <div className="mb-4 rounded-md border border-harbor-300 bg-harbor-50 px-4 py-3 text-sm text-ink-700">
      <b className="text-heading">Phase {phase}.</b> {children}
    </div>
  );
}
