// World geometry shared by the 3D scene and the simulation. Units are metres-ish.
// Land sits at y = LAND_Y; the quay edge runs along z = 0 and the sea is z > 0.
import type { ZonePlot } from '@/types/domain';

export const LAND_Y = 1.5;
export const SEA_LEVEL = 0;

export const TERMINAL = { minX: -4, maxX: 222, minZ: -80, maxZ: 0 };

export const CRANE = {
  seaLegZ: -3,
  landLegZ: -21,
  boomTipZ: 27,
  backreachZ: -30,
  height: 30,
  /** Where the crane sets containers down on the quay apron. */
  bufferZ: -12,
  bufferOffsets: [-16, -8, 8, 16],
  gantryRange: 30,
};

export const YARD = { minX: 24, maxX: 206, minZ: -66, maxZ: -38 };
export const TERMINAL_ROAD_Z = -30;
export const YARD_ROAD_Z = -72;

export const CONTAINER = { length: 6, width: 2.4, height: 2.6 };

export const PLOT_W = 46;
export const PLOT_D = 42;

const plot = (n: number, x: number, z: number, ring: number): ZonePlot => ({
  id: `10000000-0000-4000-8000-${String(n).padStart(12, '0')}`,
  label: `Plot ${n}`,
  x,
  z,
  width: PLOT_W,
  depth: PLOT_D,
  ring,
});

/** Predefined plots. Ring 0 is the initial port; rings 1–2 open as the map expands. */
export const DEFAULT_PLOTS: ZonePlot[] = [
  plot(1, -150, -34, 0),
  plot(2, -95, -34, 0),
  plot(3, -40, -34, 0),
  plot(4, -150, -86, 0),
  plot(5, -95, -86, 0),
  plot(6, -40, -86, 0),
  plot(7, -150, -138, 1),
  plot(8, -95, -138, 1),
  plot(9, -40, -138, 1),
  // Central plot behind the container yard, open from the start for the Shared Services Hub.
  plot(10, 45, -104, 0),
  plot(11, 110, -104, 1),
  plot(12, 175, -104, 1),
  plot(13, -205, -34, 2),
  plot(14, -205, -86, 2),
  plot(15, -205, -138, 2),
  plot(16, 45, -156, 2),
  plot(17, 110, -156, 2),
  plot(18, 175, -156, 2),
];

export interface Rect {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export function landBounds(plots: ZonePlot[], rings: number): Rect {
  const r: Rect = { ...TERMINAL };
  for (const p of plots) {
    if (p.ring > rings) continue;
    r.minX = Math.min(r.minX, p.x - p.width / 2 - 10);
    r.maxX = Math.max(r.maxX, p.x + p.width / 2 + 10);
    r.minZ = Math.min(r.minZ, p.z - p.depth / 2 - 10);
  }
  r.maxZ = 0;
  return r;
}

export interface RoadSegment {
  from: [number, number];
  to: [number, number];
  width: number;
}

/** Roads follow the gaps between open plots plus the fixed terminal roads. */
export function roadNetwork(plots: ZonePlot[], rings: number): RoadSegment[] {
  const open = plots.filter((p) => p.ring <= rings);
  const b = landBounds(plots, rings);
  const roads: RoadSegment[] = [
    { from: [b.minX + 4, -8], to: [-4, -8], width: 7 },
    { from: [-4, TERMINAL_ROAD_Z], to: [TERMINAL.maxX - 4, TERMINAL_ROAD_Z], width: 7 },
    { from: [-12, YARD_ROAD_Z], to: [TERMINAL.maxX - 4, YARD_ROAD_Z], width: 7 },
    { from: [-12, -8], to: [-12, b.minZ + 4], width: 7 },
  ];
  const xs = new Set<number>();
  const zs = new Set<number>();
  for (const p of open) {
    if (p.x < 0) xs.add(p.x - p.width / 2 - 4.5);
    zs.add(p.z - p.depth / 2 - 5);
  }
  for (const x of xs) roads.push({ from: [x, -8], to: [x, b.minZ + 4], width: 6 });
  for (const z of zs) {
    // Rows level with the container yard stop at the terminal gate road.
    const east = z > YARD_ROAD_Z ? -12 : b.maxX - 4;
    roads.push({ from: [b.minX + 4, z], to: [east, z], width: 6 });
  }
  return roads;
}

// ---------- Water routes ----------
export type V2 = [number, number];

export const ENTRY_LANE: V2[] = [
  [-760, 380],
  [-420, 230],
  [-200, 150],
];
export const EXIT_LANE: V2[] = [
  [330, 120],
  [520, 230],
  [820, 380],
];
/** One waiting spot per ship, spaced so berthing routes never cross another anchorage. */
export const ANCHORAGES: V2[] = [
  [-60, 112],
  [-130, 112],
  [-200, 112],
];

export const dockZ = (beam: number) => 3 + beam / 2;

export const NAV_MARKERS: { x: number; z: number; color: 'red' | 'green' }[] = [
  { x: -150, z: 60, color: 'green' },
  { x: -60, z: 52, color: 'green' },
  { x: 30, z: 48, color: 'green' },
  { x: -120, z: 170, color: 'red' },
  { x: 0, z: 150, color: 'red' },
  { x: 250, z: 80, color: 'red' },
  { x: 260, z: 30, color: 'green' },
];
