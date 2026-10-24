// Brings saved or imported landscapes up to the current data model without
// losing anything the user changed. Safe to run more than once.
import type { LandscapeData, System, Zone } from '@/types/domain';
import { SHARED_DEMO_SYSTEM_ID, SHARED_HUB_PLOT_ID, sharedDemoSystem, sharedHubZone } from './seed';

export function upgradeLandscape<T extends Partial<LandscapeData>>(data: T): T {
  const zones: Zone[] = (data.zones ?? []).map((z) => ({ ...z, kind: z.kind ?? (z.theme === 'shared' ? 'shared' : 'division') }));
  const isDivision = (id: string | null | undefined) => !!id && zones.some((z) => z.id === id && z.kind === 'division');

  // v1 had one zone per system: it becomes the display zone, and the owner and
  // first user when that zone is a division. Existing ownership is never overwritten.
  const systems: System[] = (data.systems ?? []).map((s) => {
    const owningZoneId = s.owningZoneId !== undefined ? s.owningZoneId : isDivision(s.zoneId) ? s.zoneId : null;
    const usingZoneIds = Array.isArray(s.usingZoneIds) ? [...new Set(s.usingZoneIds)] : owningZoneId ? [owningZoneId] : [];
    return { ...s, owningZoneId, usingZoneIds };
  });

  // Open the central plot and add the Shared Services Hub if there is no shared zone yet.
  const plots = (data.plots ?? []).map((p) => (p.id === SHARED_HUB_PLOT_ID ? { ...p, ring: 0 } : p));
  const hasShared = zones.some((z) => z.kind === 'shared' && !z.archived);
  const plotFree = !zones.some((z) => z.plotId === SHARED_HUB_PLOT_ID && !z.archived);
  if (!hasShared && plotFree && plots.some((p) => p.id === SHARED_HUB_PLOT_ID)) {
    const hub = sharedHubZone();
    if (!zones.some((z) => z.id === hub.id)) {
      zones.push({ ...hub, sortOrder: Math.max(0, ...zones.map((z) => z.sortOrder)) + 1 });
      // The illustrative shared system comes with the hub, but only if its divisions still exist.
      const demo = sharedDemoSystem();
      const usersExist = demo.usingZoneIds.every((id) => zones.some((z) => z.id === id));
      if (usersExist && !systems.some((s) => s.id === SHARED_DEMO_SYSTEM_ID || s.acronym === demo.acronym)) systems.push(demo);
    }
  }

  return { ...data, zones, systems, plots };
}
