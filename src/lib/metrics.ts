// Dashboard figures, all derived from stored records. Nothing here is operational telemetry.
import type { Integration, Journey, System, Zone } from '@/types/domain';
import { CRITICALITIES, MECHANISMS, SYSTEM_CATEGORIES, SYSTEM_STATUSES } from '@/types/domain';

export interface Landscape {
  zones: Zone[];
  systems: System[];
  integrations: Integration[];
  journeys: Journey[];
}

export const activeZones = (zones: Zone[]) => zones.filter((z) => !z.archived).sort((a, b) => a.sortOrder - b.sortOrder);
export const activeSystems = (systems: System[], zones: Zone[]) => {
  const ids = new Set(activeZones(zones).map((z) => z.id));
  return systems.filter((s) => !s.archived && ids.has(s.zoneId));
};
export const activeIntegrations = (ints: Integration[], systems: System[]) => {
  const ids = new Set(systems.map((s) => s.id));
  return ints.filter((i) => !i.archived && ids.has(i.sourceId) && ids.has(i.destinationId));
};

// ---------- ownership and usage ----------
export const divisionZones = (zones: Zone[]) => activeZones(zones).filter((z) => z.kind === 'division');

/** Using divisions that are still active divisions. */
export function usingDivisions(s: System, zones: Zone[]) {
  const ok = new Set(divisionZones(zones).map((z) => z.id));
  return s.usingZoneIds.filter((id) => ok.has(id));
}
/** Owning division if it is still an active division, otherwise null (unassigned). */
export function owningDivision(s: System, zones: Zone[]) {
  return s.owningZoneId && divisionZones(zones).some((z) => z.id === s.owningZoneId) ? s.owningZoneId : null;
}
/** Derived, never stored: a system is shared when two or more divisions use it. */
export const isShared = (s: System, zones: Zone[]) => usingDivisions(s, zones).length >= 2;
export const inSharedZone = (s: System, zones: Zone[]) => zones.some((z) => z.id === s.zoneId && z.kind === 'shared');

export type SystemFilter = 'all' | 'owned' | 'shared' | 'unassigned';
export function matchesFilter(s: System, zones: Zone[], f: SystemFilter) {
  if (f === 'owned') return owningDivision(s, zones) !== null;
  if (f === 'unassigned') return owningDivision(s, zones) === null;
  if (f === 'shared') return isShared(s, zones) || inSharedZone(s, zones);
  return true;
}

const countBy = <T,>(items: T[], key: (t: T) => string, order: readonly string[]) =>
  order.map((name) => ({ name, value: items.filter((i) => key(i) === name).length }));

export function summarise(l: Landscape) {
  const zones = activeZones(l.zones);
  const systems = activeSystems(l.systems, l.zones);
  const integrations = activeIntegrations(l.integrations, systems);
  const zoneOf = new Map(systems.map((s) => [s.id, s.zoneId]));
  const journeys = l.journeys.filter((j) => !j.archived);

  const degree = new Map<string, { in: number; out: number }>();
  for (const s of systems) degree.set(s.id, { in: 0, out: 0 });
  for (const i of integrations) {
    degree.get(i.sourceId)!.out++;
    degree.get(i.destinationId)!.in++;
  }

  const divisions = divisionZones(l.zones);
  const shared = systems.filter((s) => isShared(s, l.zones) || inSharedZone(s, l.zones));
  const multiUse = systems.filter((s) => isShared(s, l.zones));
  // Usage by a division other than the owner (unassigned owners count every user).
  const crossUsage = systems.flatMap((s) => usingDivisions(s, l.zones).filter((z) => z !== owningDivision(s, l.zones)).map((z) => ({ system: s, zoneId: z })));

  return {
    zones,
    systems,
    integrations,
    journeys,
    shared,
    multiUse,
    byOwner: [
      ...divisions.map((z) => ({ name: z.name, value: systems.filter((s) => owningDivision(s, l.zones) === z.id).length, color: z.color })),
      { name: 'Unassigned', value: systems.filter((s) => owningDivision(s, l.zones) === null).length, color: '#94a3b8' },
    ],
    crossUsageByDivision: divisions
      .map((z) => ({ name: z.name, value: crossUsage.filter((c) => c.zoneId === z.id).length, color: z.color }))
      .filter((d) => d.value > 0),
    totals: {
      sharedSystems: shared.length,
      multiDivision: multiUse.length,
      crossDivisionUsage: crossUsage.length,
      zones: zones.length,
      systems: systems.length,
      integrations: integrations.length,
      publishedJourneys: journeys.filter((j) => j.published).length,
      crossDivision: integrations.filter((i) => zoneOf.get(i.sourceId) !== zoneOf.get(i.destinationId)).length,
    },
    byZone: zones.map((z) => ({ name: z.name, value: systems.filter((s) => s.zoneId === z.id).length, color: z.color })),
    byCategory: countBy(systems, (s) => s.category, SYSTEM_CATEGORIES).filter((d) => d.value > 0),
    byStatus: countBy(systems, (s) => s.status, SYSTEM_STATUSES),
    byCriticality: countBy(systems, (s) => s.criticality, CRITICALITIES),
    byMechanism: countBy(integrations, (i) => i.mechanism, MECHANISMS).filter((d) => d.value > 0),
    mostConnected: systems
      .map((s) => ({ system: s, ...degree.get(s.id)!, total: degree.get(s.id)!.in + degree.get(s.id)!.out }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 6),
  };
}

export const STATUS_COLORS: Record<string, string> = {
  Planned: '#94a3b8',
  'In Development': '#3b9cf0',
  Live: '#1f9d55',
  Enhancement: '#22c3e6',
  Sunsetting: '#e0a21a',
  Retired: '#64748b',
};

/** Upstream = everything that feeds this system; downstream = everything it feeds (transitively). */
export function impactOf(systemId: string, integrations: Integration[]) {
  const walk = (dir: 'up' | 'down') => {
    const seen = new Map<string, number>();
    let frontier = [systemId];
    let depth = 0;
    while (frontier.length) {
      depth++;
      const next: string[] = [];
      for (const id of frontier) {
        for (const i of integrations) {
          const links: [string, string][] = [[i.sourceId, i.destinationId]];
          if (i.direction === 'bidirectional') links.push([i.destinationId, i.sourceId]);
          for (const [from, to] of links) {
            const hit = dir === 'down' ? (from === id ? to : null) : to === id ? from : null;
            if (hit && hit !== systemId && !seen.has(hit)) {
              seen.set(hit, depth);
              next.push(hit);
            }
          }
        }
      }
      frontier = next;
    }
    return seen;
  };
  return { upstream: walk('up'), downstream: walk('down') };
}

export function integrationsFor(systemId: string, integrations: Integration[]) {
  return {
    incoming: integrations.filter((i) => i.destinationId === systemId || (i.direction === 'bidirectional' && i.sourceId === systemId)),
    outgoing: integrations.filter((i) => i.sourceId === systemId || (i.direction === 'bidirectional' && i.destinationId === systemId)),
  };
}
