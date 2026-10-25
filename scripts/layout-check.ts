// Sanity checks for the Singapore layout: plots on land and clear of roads, ports
// and the airport; ship waypoints in open water. Run: npm run layout:check
import { AIRPORT, DEFAULT_PLOTS, ISLANDS, MAINLAND, PORTS, ROAD_EDGES, ROAD_NODES, pointInPolygon, type V2 } from '../src/data/layout';

let problems = 0;
const fail = (msg: string) => { problems++; console.log('  ✗ ' + msg); };
const segDist = (p: V2, a: V2, b: V2) => {
  const [px, pz] = p, [ax, az] = a, [bx, bz] = b;
  const l2 = (bx - ax) ** 2 + (bz - az) ** 2;
  const t = Math.max(0, Math.min(1, ((px - ax) * (bx - ax) + (pz - az) * (bz - az)) / l2));
  return Math.hypot(px - (ax + t * (bx - ax)), pz - (az + t * (bz - az)));
};
const onLand = (p: V2) => pointInPolygon(p, MAINLAND);
const inWater = (p: V2) => !onLand(p) && !ISLANDS.some((i) => pointInPolygon(p, i));

console.log('Plots');
for (const pl of DEFAULT_PLOTS) {
  const corners: V2[] = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sz]) => [pl.x + (sx * pl.width) / 2, pl.z + (sz * pl.depth) / 2]);
  if (!corners.every(onLand)) fail(`${pl.label} is not fully on land`);
  // Road clearance: sample the plot edges against every road segment (road half-width 3.5 + 1 margin).
  for (const [a, b] of ROAD_EDGES) {
    for (let i = 0; i <= 20; i++)
      for (let k = 0; k < 4; k++) {
        const c0 = corners[k], c1 = corners[(k + 1) % 4];
        const p: V2 = [c0[0] + ((c1[0] - c0[0]) * i) / 20, c0[1] + ((c1[1] - c0[1]) * i) / 20];
        if (segDist(p, ROAD_NODES[a], ROAD_NODES[b]) < 4.5) { fail(`${pl.label} touches road ${a}–${b}`); i = 99; break; }
      }
    // Road crossing the interior.
    const mid: V2 = [(ROAD_NODES[a][0] + ROAD_NODES[b][0]) / 2, (ROAD_NODES[a][1] + ROAD_NODES[b][1]) / 2];
    if (Math.abs(mid[0] - pl.x) < pl.width / 2 && Math.abs(mid[1] - pl.z) < pl.depth / 2) fail(`${pl.label} has road ${a}–${b} through it`);
  }
  for (const port of PORTS) if (pl.x + pl.width / 2 > port.minX && pl.x - pl.width / 2 < port.maxX && pl.z + pl.depth / 2 > port.quayZ - 80) fail(`${pl.label} overlaps ${port.name}`);
  if (pl.x + pl.width / 2 > AIRPORT.terminal.x - AIRPORT.terminal.w && Math.abs(pl.z) < 80) fail(`${pl.label} overlaps the airport`);
  for (const o of DEFAULT_PLOTS) if (o !== pl && Math.abs(o.x - pl.x) < (o.width + pl.width) / 2 + 2 && Math.abs(o.z - pl.z) < (o.depth + pl.depth) / 2 + 2) fail(`${pl.label} overlaps ${o.label}`);
}
console.log('Roads on land');
for (const [a, b] of ROAD_EDGES) for (let i = 0; i <= 10; i++) {
  const p: V2 = [ROAD_NODES[a][0] + ((ROAD_NODES[b][0] - ROAD_NODES[a][0]) * i) / 10, ROAD_NODES[a][1] + ((ROAD_NODES[b][1] - ROAD_NODES[a][1]) * i) / 10];
  if (!onLand(p)) { fail(`road ${a}–${b} leaves the island`); break; }
}
console.log('Ports, airport and shipping');
for (const port of PORTS) {
  for (const [x, z] of [[port.minX + 2, port.quayZ - 2], [port.maxX - 2, port.quayZ - 2], [port.minX + 2, port.quayZ - 78], [port.maxX - 2, port.quayZ - 78]] as V2[])
    if (!onLand([x, z])) fail(`${port.name} terminal corner (${x.toFixed(0)}, ${z.toFixed(0)}) is in the sea`);
  for (const p of [...port.anchorages, ...port.entry, ...port.exit]) if (!inWater(p)) fail(`${port.name} waypoint ${p} is on land`);
  if (!inWater([(port.minX + port.maxX) / 2, port.quayZ + 12])) fail(`${port.name} berths are not in water`);
}
for (const r of AIRPORT.runways) for (const z of [r.south, r.north]) if (!onLand([r.x, z])) fail(`runway end (${r.x}, ${z}) is off the island`);
console.log(problems ? `${problems} problem(s)` : 'All layout checks passed');
process.exit(problems ? 1 : 0);
