// Normalises imported landscapes to the current data model (zone kinds,
// ownership/usage, modules, port assignments). Safe to run more than once.
import type { LandscapeData, System, Zone } from '@/types/domain';
import { PORTS } from './layout';

export function upgradeLandscape<T extends Partial<LandscapeData>>(data: T): T {
  const zones: Zone[] = (data.zones ?? []).map((z) => ({ ...z, kind: z.kind ?? (z.theme === 'shared' ? 'shared' : 'division') }));
  const isDivision = (id: string | null | undefined) => !!id && zones.some((z) => z.id === id && z.kind === 'division');

  // Older records had one zone per system: it becomes the display zone, and the owner and
  // first user when that zone is a division. Existing ownership is never overwritten.
  const systems: System[] = (data.systems ?? []).map((s) => {
    const owningZoneId = s.owningZoneId !== undefined ? s.owningZoneId : isDivision(s.zoneId) ? s.zoneId : null;
    const usingZoneIds = Array.isArray(s.usingZoneIds) ? [...new Set(s.usingZoneIds)] : owningZoneId ? [owningZoneId] : [];
    return { ...s, owningZoneId, usingZoneIds, modules: Array.isArray(s.modules) ? s.modules : undefined };
  });

  const portIds = new Set(PORTS.map((p) => p.id));
  const berths = (data.berths ?? []).map((b, i) => (portIds.has(b.portId) ? b : { ...b, portId: PORTS[i % PORTS.length].id }));
  const ships = (data.ships ?? []).map((s, i) => (portIds.has(s.portId) ? s : { ...s, portId: PORTS[i % PORTS.length].id }));

  return { ...data, zones, systems, berths, ships };
}
