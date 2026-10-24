import { lazy, Suspense, useEffect } from 'react';
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { Toaster } from '@/components/ui/Toast';
import { useLandscape } from '@/store/landscape';
import { useWorld } from '@/store/world';

const WorldPage = lazy(() => import('@/pages/WorldPage'));
const DashboardPage = lazy(() => import('@/pages/DashboardPage'));
const SystemsPage = lazy(() => import('@/pages/SystemsPage'));
const JourneysPage = lazy(() => import('@/pages/JourneysPage'));
const AdminLayout = lazy(() => import('@/pages/admin/AdminLayout'));
const AdminHome = lazy(() => import('@/pages/admin/AdminHome'));
const AdminZones = lazy(() => import('@/pages/admin/AdminZones'));
const AdminSystems = lazy(() => import('@/pages/admin/AdminSystems'));
const AdminSettings = lazy(() => import('@/pages/admin/AdminSettings'));
const AdminIntegrations = lazy(() => import('@/pages/admin/AdminReadOnly').then((m) => ({ default: m.AdminIntegrations })));
const AdminJourneys = lazy(() => import('@/pages/admin/AdminReadOnly').then((m) => ({ default: m.AdminJourneys })));
const AdminMaritime = lazy(() => import('@/pages/admin/AdminReadOnly').then((m) => ({ default: m.AdminMaritime })));

function Loading() {
  return <div className="grid h-full place-items-center text-sm font-semibold text-ink-500">Loading Port Nexus…</div>;
}

const page = (el: JSX.Element) => <Suspense fallback={<Loading />}>{el}</Suspense>;

const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { path: '/', element: page(<WorldPage />) },
      { path: '/dashboard', element: page(<DashboardPage />) },
      { path: '/systems', element: page(<SystemsPage />) },
      { path: '/journeys', element: page(<JourneysPage />) },
      {
        path: '/admin',
        element: page(<AdminLayout />),
        children: [
          { index: true, element: page(<AdminHome />) },
          { path: 'zones', element: page(<AdminZones />) },
          { path: 'systems', element: page(<AdminSystems />) },
          { path: 'integrations', element: page(<AdminIntegrations />) },
          { path: 'journeys', element: page(<AdminJourneys />) },
          { path: 'maritime', element: page(<AdminMaritime />) },
          { path: 'settings', element: page(<AdminSettings />) },
        ],
      },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
], { basename: import.meta.env.BASE_URL.replace(/\/$/, '') || '/' });

export default function App() {
  useEffect(() => {
    // Apply stored simulation defaults once on start.
    const { ambientEnabled, defaultSpeed } = useLandscape.getState().simulation;
    useWorld.setState({ showAmbient: ambientEnabled, speed: ([0, 1, 2, 4].includes(defaultSpeed) ? defaultSpeed : 1) as 0 | 1 | 2 | 4 });
  }, []);
  return (
    <>
      <RouterProvider router={router} />
      <Toaster />
    </>
  );
}
