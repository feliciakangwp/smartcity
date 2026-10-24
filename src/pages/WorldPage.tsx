// Port World: the 3D port with its overlays.
import { Component, useEffect, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { X } from 'lucide-react';
import { PortScene } from '@/world/PortScene';
import { useWorld, type SelectionKind } from '@/store/world';
import { DashboardStrip } from '@/components/dashboard/DashboardStrip';
import { DashboardContent } from '@/components/dashboard/DashboardContent';
import { DataTypeLegend, SimControls, SystemsViewFilter, WorldSearch, WorldToolbar } from '@/components/world/WorldControls';
import { InfoPanel } from '@/components/world/InfoPanel';
import { AddSystemDialog } from '@/components/world/AddSystemDialog';

class SceneBoundary extends Component<{ children: ReactNode }, { error: boolean }> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  render() {
    if (this.state.error)
      return (
        <div className="grid h-full place-items-center bg-harbor-100 p-6 text-center">
          <div className="max-w-md">
            <h2 className="text-lg font-bold text-navy-900">The 3D port could not start</h2>
            <p className="mt-2 text-sm text-ink-700">This browser or device did not provide WebGL. Try a current version of Chrome, Edge, Firefox or Safari with hardware acceleration turned on. The Dashboard, Systems and Studio pages still work.</p>
          </div>
        </div>
      );
    return this.props.children;
  }
}

export default function WorldPage() {
  const [params, setParams] = useSearchParams();
  const select = useWorld((s) => s.select);
  const expanded = useWorld((s) => s.dashboardExpanded);
  const setExpanded = useWorld((s) => s.setDashboardExpanded);

  // Deep links such as /?focus=system:<id> from the System Directory. The camera
  // rig picks up the pending focus request when the scene mounts.
  useEffect(() => {
    const f = params.get('focus');
    if (!f) return;
    const [kind, id] = f.split(':');
    if (id && (kind === 'zone' || kind === 'system' || kind === 'ship')) select({ kind: kind as SelectionKind, id }, true);
    setParams({}, { replace: true });
  }, [params, select, setParams]);

  return (
    <div className="absolute inset-0 overflow-hidden">
      <SceneBoundary>
        <PortScene />
      </SceneBoundary>

      <div className="pointer-events-none absolute inset-0 flex flex-col gap-3 p-3 sm:p-4">
        <div className="flex justify-center">
          <DashboardStrip />
        </div>
        <div className="relative flex min-h-0 flex-1 gap-3">
          <div className="flex min-h-0 flex-col items-start gap-3">
            <WorldSearch />
            <WorldToolbar />
          </div>
          <div className="flex-1" />
          <div className="flex min-h-0 items-start justify-end">
            <InfoPanel />
          </div>
          {expanded && (
            <div className="panel pointer-events-auto absolute inset-x-0 top-0 z-20 mx-auto max-h-full w-full max-w-6xl overflow-y-auto p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <div className="eyebrow">Executive dashboard</div>
                  <h2 className="text-xl font-bold text-navy-900">ICT landscape at a glance</h2>
                </div>
                <button type="button" onClick={() => setExpanded(false)} aria-label="Collapse dashboard" className="rounded-md p-1.5 text-ink-500 hover:bg-ink-100">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <DashboardContent
                onHighlight={() => setExpanded(false)}
                onFocusSystem={(id) => {
                  setExpanded(false);
                  select({ kind: 'system', id }, true);
                }}
              />
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <SimControls />
          <SystemsViewFilter />
          <DataTypeLegend />
        </div>
      </div>
      <AddSystemDialog />
    </div>
  );
}
