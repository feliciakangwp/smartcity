// Where zones and system buildings sit in the world. Pure functions so the
// scene, camera and integration lines all agree on positions.
import type { System, Zone, ZonePlot } from '@/types/domain';

export interface ZoneLayout {
  zone: Zone;
  plot: ZonePlot;
  width: number;
  depth: number;
  /** Local-space depth of the front strip kept for zone landmarks. */
  frontStrip: number;
}

export interface SystemPlacement {
  system: System;
  zoneId: string;
  x: number;
  z: number;
  footprint: number;
  slot: number;
}

export const FRONT_STRIP = 12;
const COLS = 3;

export function layoutZones(zones: Zone[], plots: ZonePlot[], rings: number): ZoneLayout[] {
  const byId = new Map(plots.map((p) => [p.id, p]));
  return zones
    .filter((z) => !z.archived && z.visible)
    .map((zone) => {
      const plot = byId.get(zone.plotId);
      if (!plot || plot.ring > rings) return null;
      return { zone, plot, width: plot.width * zone.scale, depth: plot.depth * zone.scale, frontStrip: FRONT_STRIP * zone.scale };
    })
    .filter((x): x is ZoneLayout => x !== null)
    .sort((a, b) => a.zone.sortOrder - b.zone.sortOrder);
}

export function slotGrid(count: number, layout: ZoneLayout) {
  const rows = Math.max(2, Math.ceil(count / COLS));
  const areaW = layout.width - 6;
  const areaD = layout.depth - layout.frontStrip - 4;
  const cellW = areaW / COLS;
  const cellD = areaD / rows;
  return {
    rows,
    capacity: rows * COLS,
    footprint: Math.min(cellW, cellD) * 0.78,
    center(slot: number) {
      const c = slot % COLS;
      const r = Math.floor(slot / COLS);
      return {
        x: -areaW / 2 + cellW * (c + 0.5),
        z: -layout.depth / 2 + 2 + cellD * (r + 0.5),
      };
    },
  };
}

export function placeSystems(layouts: ZoneLayout[], systems: System[]): Map<string, SystemPlacement> {
  const out = new Map<string, SystemPlacement>();
  for (const l of layouts) {
    const list = systems.filter((s) => s.zoneId === l.zone.id && !s.archived);
    // A lone system with modules gets the whole build area for its campus.
    if (list.length === 1 && (list[0].modules?.length ?? 0) > 0) {
      const areaW = l.width - 6;
      const areaD = l.depth - l.frontStrip - 4;
      out.set(list[0].id, { system: list[0], zoneId: l.zone.id, x: l.plot.x, z: l.plot.z - l.depth / 2 + 2 + areaD / 2, footprint: Math.min(areaW, areaD) * 0.92, slot: 0 });
      continue;
    }
    const grid = slotGrid(list.length, l);
    const taken = new Set<number>();
    // Explicit slots first, then fill the gaps in registration order.
    const ordered = [...list].sort((a, b) => (a.slot ?? 1e9) - (b.slot ?? 1e9));
    for (const s of ordered) {
      let slot = s.slot !== undefined && s.slot < grid.capacity && !taken.has(s.slot) ? s.slot : -1;
      if (slot < 0) {
        slot = 0;
        while (taken.has(slot)) slot++;
      }
      taken.add(slot);
      const c = grid.center(slot);
      out.set(s.id, { system: s, zoneId: l.zone.id, x: l.plot.x + c.x, z: l.plot.z + c.z, footprint: grid.footprint, slot });
    }
  }
  return out;
}

/** Plots that a zone may move to: open, and not used by another active zone. */
export function availablePlots(plots: ZonePlot[], zones: Zone[], rings: number, forZoneId?: string) {
  const used = new Set(zones.filter((z) => !z.archived && z.id !== forZoneId).map((z) => z.plotId));
  return plots.filter((p) => p.ring <= rings && !used.has(p.id));
}
