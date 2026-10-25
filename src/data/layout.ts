// World geometry shared by the 3D scene and the simulations: a stylised
// Singapore traced from a reference map. Map pixels (px, py) convert to world
// units with W(); north is -z and the Singapore Strait is +z (towards the camera).
import type { ZonePlot } from '@/types/domain';

export const LAND_Y = 1.5;
export const SEA_LEVEL = 0;

/** World units per map pixel. */
export const MAP_SCALE = 1.6;
export type V2 = [number, number];
export const W = (px: number, py: number): V2 => [(px - 300) * MAP_SCALE, (py - 200) * MAP_SCALE];

// ---------- Coastline (map pixels, clockwise from Tuas) ----------
/** Straight south-coast quays: Tuas (west) and Queenstown / Pasir Panjang. */
const TUAS_QUAY_PY = 268;
const QT_QUAY_PY = 290;

const MAINLAND_PX: V2[] = [
  [38, 245], [40, TUAS_QUAY_PY], [125, TUAS_QUAY_PY], [135, 276], [150, 282], [170, 288], [195, 291], [212, 291],
  [222, QT_QUAY_PY], [308, QT_QUAY_PY], [318, 283], [330, 274], [345, 269], [360, 266], [380, 262], [400, 258],
  [430, 252], [460, 246], [490, 239], [520, 233], [548, 228], [562, 210], [566, 190], [558, 168], [540, 153],
  [515, 146], [490, 147], [470, 143], [440, 140], [410, 132], [385, 124], [365, 117], [345, 110], [325, 99],
  [300, 92], [275, 88], [250, 92], [228, 100], [205, 115], [180, 128], [160, 138], [135, 150], [110, 165],
  [88, 182], [60, 196], [38, 213],
];
export const MAINLAND: V2[] = MAINLAND_PX.map(([x, y]) => W(x, y));

/** Offshore islands for a recognisable outline (Jurong Island, Sentosa, Ubin, Tekong). */
export const ISLANDS: V2[][] = [
  [[150, 306], [168, 302], [182, 310], [178, 322], [158, 324]],
  [[336, 286], [356, 283], [372, 289], [366, 298], [342, 297]],
  [[440, 126], [470, 122], [492, 128], [484, 134], [450, 135]],
  [[506, 120], [532, 118], [544, 130], [536, 140], [512, 138]],
].map((poly) => poly.map(([x, y]) => W(x, y)));

export function pointInPolygon([x, z]: V2, poly: V2[]) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i];
    const [xj, zj] = poly[j];
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}

// ---------- Container ports ----------
export const CRANE = {
  seaLegZ: -3,
  landLegZ: -21,
  boomTipZ: 27,
  backreachZ: -30,
  height: 30,
  /** Offsets below are relative to the port's quay line (z = quayZ). */
  bufferZ: -12,
  bufferOffsets: [-16, -8, 8, 16],
  gantryRange: 30,
};
export const TERMINAL_ROAD_DZ = -30;
export const YARD_DZ = { min: -66, max: -38 };
export const YARD_ROAD_DZ = -72;
export const CONTAINER = { length: 6, width: 2.4, height: 2.6 };

export interface PortSite {
  id: string;
  name: string;
  quayZ: number;
  minX: number;
  maxX: number;
  /** Road node where trucks leave the terminal. */
  gate: string;
  anchorages: V2[];
  entry: V2[];
  exit: V2[];
}

const [tuasMin, tuasQuay] = W(40, TUAS_QUAY_PY);
const [tuasMax] = W(125, TUAS_QUAY_PY);
const [qtMin, qtQuay] = W(222, QT_QUAY_PY);
const [qtMax] = W(308, QT_QUAY_PY);

export const PORTS: PortSite[] = [
  {
    id: 'tuas',
    name: 'Tuas Port',
    quayZ: tuasQuay,
    minX: tuasMin,
    maxX: tuasMax,
    gate: 'TUAS_GATE',
    anchorages: [[-470, 238], [-395, 262], [-320, 240]],
    entry: [[-760, 640], [-560, 400]],
    exit: [[-262, 262], [-210, 460], [-280, 820]],
  },
  {
    id: 'queenstown',
    name: 'Queenstown Port',
    quayZ: qtQuay,
    minX: qtMin,
    maxX: qtMax,
    gate: 'QT_GATE',
    anchorages: [[-110, 292], [-30, 312], [50, 292]],
    entry: [[-140, 760], [-80, 430]],
    exit: [[60, 214], [190, 420], [320, 820]],
  },
];
export const portById = (id: string) => PORTS.find((p) => p.id === id) ?? PORTS[0];
export const dockZ = (beam: number, quayZ: number) => quayZ + 3 + beam / 2;
export const portYard = (p: PortSite) => ({ minX: p.minX + 10, maxX: p.maxX - 10, minZ: p.quayZ + YARD_DZ.min, maxZ: p.quayZ + YARD_DZ.max });

// ---------- Changi Airport ----------
export const AIRPORT = {
  /** Landing runway (north–south), threshold at the south end. */
  runways: [
    { x: 372, south: 36, north: -68 },
    { x: 392, south: 36, north: -68 },
  ],
  terminal: { x: 334, z: -20, w: 18, d: 46 },
  gates: [-36, -22, -8, 6].map((z) => ({ x: 352, z })),
  apron: { minX: 343, maxX: 362, minZ: -46, maxZ: 16 },
};

// ---------- Road network ----------
const NODES_PX: Record<string, V2> = {
  TUAS_GATE: [128, 223],
  TUAS_N: [110, 190],
  PIONEER: [140, 245],
  JURONG: [205, 247],
  QT_GATE: [220, 245],
  QUEENSTOWN: [240, 225],
  BT_S: [225, 190],
  BUKIT_TIMAH: [205, 150],
  CHOA_CHU_KANG: [140, 160],
  BKE: [235, 118],
  SEMBAWANG: [255, 100],
  WOODLANDS: [300, 108],
  TOA_PAYOH: [295, 150],
  CTE_S: [342, 205],
  MARINA_W: [315, 228],
  CBD: [322, 262],
  SERANGOON: [345, 165],
  PUNGGOL: [368, 128],
  PAYA_LEBAR: [395, 200],
  BEDOK: [430, 240],
  ECP_E: [488, 236],
  TAMPINES: [440, 180],
  CHANGI: [515, 187],
};
export const ROAD_NODES: Record<string, V2> = Object.fromEntries(Object.entries(NODES_PX).map(([k, [x, y]]) => [k, W(x, y)]));

/** Expressways between nodes. The first chain is the Tuas–Queenstown port highway. */
export const ROAD_EDGES: [string, string][] = [
  ['TUAS_GATE', 'PIONEER'], ['PIONEER', 'JURONG'], ['JURONG', 'QT_GATE'],
  ['TUAS_GATE', 'TUAS_N'], ['TUAS_N', 'CHOA_CHU_KANG'], ['CHOA_CHU_KANG', 'BUKIT_TIMAH'],
  ['QT_GATE', 'QUEENSTOWN'], ['QUEENSTOWN', 'BT_S'], ['BT_S', 'BUKIT_TIMAH'],
  ['BUKIT_TIMAH', 'BKE'], ['BKE', 'SEMBAWANG'], ['SEMBAWANG', 'WOODLANDS'],
  ['BUKIT_TIMAH', 'TOA_PAYOH'], ['TOA_PAYOH', 'WOODLANDS'], ['TOA_PAYOH', 'SERANGOON'],
  ['TOA_PAYOH', 'CTE_S'], ['CTE_S', 'CBD'], ['QUEENSTOWN', 'MARINA_W'], ['MARINA_W', 'CBD'],
  ['SERANGOON', 'PUNGGOL'], ['SERANGOON', 'PAYA_LEBAR'], ['PAYA_LEBAR', 'BEDOK'], ['SERANGOON', 'TAMPINES'],
  ['CBD', 'BEDOK'], ['BEDOK', 'ECP_E'], ['ECP_E', 'CHANGI'], ['TAMPINES', 'CHANGI'],
];
export const PORT_HIGHWAY = ['TUAS_GATE', 'PIONEER', 'JURONG', 'QT_GATE'];

/** Where distribution trucks deliver to, with the name shown on the map. */
export const TOWNS: { node: string; name: string; weight: number }[] = [
  { node: 'QUEENSTOWN', name: 'Queenstown', weight: 3 },
  { node: 'BUKIT_TIMAH', name: 'Bukit Timah', weight: 2 },
  { node: 'SERANGOON', name: 'Serangoon', weight: 2 },
  { node: 'WOODLANDS', name: 'Woodlands', weight: 2 },
  { node: 'SEMBAWANG', name: 'Sembawang', weight: 1 },
  { node: 'CHOA_CHU_KANG', name: 'Choa Chu Kang', weight: 1 },
  { node: 'TOA_PAYOH', name: 'Toa Payoh', weight: 1 },
  { node: 'PUNGGOL', name: 'Punggol', weight: 1 },
  { node: 'TAMPINES', name: 'Tampines', weight: 1 },
  { node: 'PAYA_LEBAR', name: 'Paya Lebar', weight: 1 },
  { node: 'BEDOK', name: 'Bedok', weight: 1 },
  { node: 'CBD', name: 'CBD', weight: 2 },
  { node: 'JURONG', name: 'Jurong', weight: 1 },
  { node: 'CHANGI', name: 'Changi', weight: 1 },
];
export const PLACE_LABELS: { name: string; at: V2 }[] = [
  ...TOWNS.map((t) => ({ name: t.name, at: ROAD_NODES[t.node] })),
  { name: 'Tuas', at: W(70, 236) },
  { name: 'Pioneer', at: W(172, 262) },
];

/** Dijkstra over the expressway graph; returns world points from `from` to `to`. */
export function roadPath(from: string, to: string): V2[] {
  const dist = new Map<string, number>([[from, 0]]);
  const prev = new Map<string, string>();
  const open = new Set(Object.keys(ROAD_NODES));
  while (open.size) {
    let u: string | null = null;
    for (const n of open) if (dist.has(n) && (u === null || dist.get(n)! < dist.get(u)!)) u = n;
    if (u === null || u === to) break;
    open.delete(u);
    for (const [a, b] of ROAD_EDGES) {
      const v = a === u ? b : b === u ? a : null;
      if (!v || !open.has(v)) continue;
      const d = dist.get(u)! + Math.hypot(ROAD_NODES[v][0] - ROAD_NODES[u][0], ROAD_NODES[v][1] - ROAD_NODES[u][1]);
      if (!dist.has(v) || d < dist.get(v)!) {
        dist.set(v, d);
        prev.set(v, u);
      }
    }
  }
  const out: string[] = [to];
  while (out[0] !== from && prev.has(out[0])) out.unshift(prev.get(out[0])!);
  return out[0] === from ? out.map((n) => ROAD_NODES[n]) : [ROAD_NODES[from], ROAD_NODES[to]];
}

// ---------- Zone plots ----------
export const PLOT_W = 46;
export const PLOT_D = 42;

const plot = (n: number, label: string, px: number, py: number, ring: number, width = PLOT_W, depth = PLOT_D): ZonePlot => {
  const [x, z] = W(px, py);
  return { id: `10000000-0000-4000-8000-${String(100 + n).padStart(12, '0')}`, label, x, z, width, depth, ring };
};

/** Predefined plots at real areas. Ring 0 is the initial port; ring 1 opens with "Expand port map". */
export const DEFAULT_PLOTS: ZonePlot[] = [
  plot(1, 'Pioneer West', 155, 220, 0),
  plot(2, 'Pioneer East', 190, 220, 0),
  plot(3, 'Bukit Timah–Serangoon', 255, 195, 0),
  plot(4, 'Shared Centre (beside Trade)', 298, 198, 0, 58, 50),
  plot(5, 'Marina / CBD', 360, 228, 0),
  plot(6, 'Changi', 470, 205, 0),
  plot(7, 'Jurong West', 175, 182, 1),
  plot(8, 'Sembawang', 270, 130, 1),
  plot(9, 'Ang Mo Kio', 325, 135, 1),
  plot(10, 'Pasir Ris', 445, 160, 1),
];

export const NAV_MARKERS: { x: number; z: number; color: 'red' | 'green' }[] = [
  { x: -440, z: 170, color: 'green' },
  { x: -300, z: 190, color: 'red' },
  { x: -150, z: 230, color: 'green' },
  { x: 10, z: 230, color: 'red' },
  { x: 140, z: 250, color: 'green' },
];
