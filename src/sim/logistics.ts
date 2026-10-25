// Road logistics on a fixed timetable: container shuttles between the two ports
// on the port highway, and delivery trucks from the ports to towns across the
// island (stock going out to traders). Ambient and simulated, like shipping.
import { PORTS, ROAD_NODES, TOWNS, YARD_ROAD_DZ, portById, roadPath, type PortSite, type V2 } from '@/data/layout';
import { CONTAINER_COLORS, type MaritimeSim } from './maritime';

export type TripKind = 'shuttle' | 'delivery';

export interface RoadTruck {
  id: number;
  active: boolean;
  kind: TripKind;
  path: V2[];
  seg: number;
  /** Distance along the current segment. */
  along: number;
  x: number;
  z: number;
  heading: number;
  carrying: number | null;
  phase: 'outbound' | 'unloading' | 'returning';
  timer: number;
  from: PortSite;
  to: PortSite | null;
  destName: string;
  /** Path back to the port after a delivery. */
  back: V2[];
}

export interface Departure {
  at: number;
  kind: TripKind;
  from: string;
  to: string;
}

export interface LogisticsSim {
  trucks: RoadTruck[];
  time: number;
  /** Next departures, soonest first. */
  upcoming: Departure[];
  delivered: number;
  shuttled: number;
  step: (dt: number) => void;
}

const SPEED = 16;
const LANE = 1.8;
const SHUTTLE_EVERY = 9;
const DELIVERY_EVERY = 4.5;
const POOL = 28;

/** Driving on the left: shift each segment to the left of travel. */
function laneOffset(a: V2, b: V2): V2 {
  const dx = b[0] - a[0];
  const dz = b[1] - a[1];
  const l = Math.hypot(dx, dz) || 1;
  return [(dz / l) * LANE, (-dx / l) * LANE];
}

/** Start inside the terminal on the yard road, then out of the gate. */
function terminalPoint(p: PortSite, k: number): V2 {
  const z = p.quayZ + YARD_ROAD_DZ;
  return [p.minX + 20 + ((k * 37) % Math.max(1, p.maxX - p.minX - 40)), z];
}

export function createLogisticsSim(maritime: () => MaritimeSim): LogisticsSim {
  const trucks: RoadTruck[] = Array.from({ length: POOL }, (_, id) => ({
    id,
    active: false,
    kind: 'delivery',
    path: [],
    seg: 0,
    along: 0,
    x: 0,
    z: 0,
    heading: 0,
    carrying: null,
    phase: 'outbound',
    timer: 0,
    from: PORTS[0],
    to: null,
    destName: '',
    back: [],
  }));

  // Deterministic timetable: shuttles alternate direction; deliveries rotate through
  // towns in proportion to their weight and alternate source port.
  const townCycle = TOWNS.flatMap((t) => Array.from({ length: t.weight }, () => t));
  let nextShuttle = 1;
  let nextDelivery = 0.5;
  let shuttleN = 0;
  let deliveryN = 0;
  let serial = 0;

  const shuttleRoute = (n: number) => (n % 2 === 0 ? [PORTS[0], PORTS[1]] : [PORTS[1], PORTS[0]]);
  const deliveryRoute = (n: number) => {
    const town = townCycle[(n * 7) % townCycle.length];
    let from = PORTS[n % PORTS.length];
    // A port does not deliver to its own town; the other port serves it.
    if (from.name.startsWith(town.name)) from = PORTS.find((p) => p !== from) ?? from;
    return { from, town };
  };

  const sim: LogisticsSim = {
    trucks,
    time: 0,
    upcoming: [],
    delivered: 0,
    shuttled: 0,
    step(dt) {
      if (dt <= 0) return;
      sim.time += dt;
      const m = maritime();

      while (sim.time >= nextShuttle) {
        const [from, to] = shuttleRoute(shuttleN++);
        nextShuttle += SHUTTLE_EVERY;
        const t = trucks.find((x) => !x.active);
        if (!t) continue;
        const yard = m.yards[from.id];
        const has = yard && yard.count > 0;
        if (has) {
          yard.count--;
          yard.version++;
        }
        launch(t, 'shuttle', from, to.name, [terminalPoint(from, serial), ...roadPath(from.gate, to.gate), terminalPoint(to, serial + 3)], to, has);
      }
      while (sim.time >= nextDelivery) {
        const { from, town } = deliveryRoute(deliveryN++);
        nextDelivery += DELIVERY_EVERY;
        const t = trucks.find((x) => !x.active);
        if (!t) continue;
        const out = [terminalPoint(from, serial), ...roadPath(from.gate, town.node)];
        launch(t, 'delivery', from, town.name, out, null, true);
      }

      for (const t of trucks) if (t.active) drive(t, dt, m);

      // Refresh the upcoming list for the schedule panel.
      const list: Departure[] = [];
      for (let i = 0; i < 3; i++) {
        const [f, to] = shuttleRoute(shuttleN + i);
        list.push({ at: nextShuttle + i * SHUTTLE_EVERY, kind: 'shuttle', from: f.name, to: to.name });
      }
      for (let i = 0; i < 4; i++) {
        const { from, town } = deliveryRoute(deliveryN + i);
        list.push({ at: nextDelivery + i * DELIVERY_EVERY, kind: 'delivery', from: from.name, to: town.name });
      }
      sim.upcoming = list.sort((a, b) => a.at - b.at);
    },
  };

  function launch(t: RoadTruck, kind: TripKind, from: PortSite, destName: string, path: V2[], to: PortSite | null, loaded: boolean) {
    serial++;
    Object.assign(t, {
      active: true,
      kind,
      path,
      seg: 0,
      along: 0,
      x: path[0][0],
      z: path[0][1],
      carrying: loaded ? CONTAINER_COLORS[serial % CONTAINER_COLORS.length] : null,
      phase: 'outbound',
      timer: 0,
      from,
      to,
      destName,
      back: kind === 'delivery' ? [...path].reverse() : [],
    });
  }

  function drive(t: RoadTruck, dt: number, m: MaritimeSim) {
    if (t.phase === 'unloading') {
      t.timer -= dt;
      if (t.timer <= 0) {
        t.carrying = null;
        t.phase = 'returning';
        t.path = t.back;
        t.seg = 0;
        t.along = 0;
      }
      return;
    }
    let move = SPEED * dt;
    while (move > 0 && t.seg < t.path.length - 1) {
      const a = t.path[t.seg];
      const b = t.path[t.seg + 1];
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const left = len - t.along;
      if (move < left) {
        t.along += move;
        move = 0;
      } else {
        move -= left;
        t.seg++;
        t.along = 0;
      }
    }
    if (t.seg >= t.path.length - 1) {
      const end = t.path[t.path.length - 1];
      t.x = end[0];
      t.z = end[1];
      if (t.kind === 'delivery' && t.phase === 'outbound') {
        sim.delivered++;
        t.phase = 'unloading';
        t.timer = 2.5;
        return;
      }
      if (t.kind === 'shuttle' && t.to && t.carrying !== null) {
        const yard = m.yards[t.to.id];
        if (yard) {
          yard.count = Math.min(yard.capacity, yard.count + 1);
          yard.version++;
        }
        sim.shuttled++;
      }
      t.active = false;
      return;
    }
    const a = t.path[t.seg];
    const b = t.path[t.seg + 1];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const f = t.along / len;
    const [ox, oz] = laneOffset(a, b);
    t.x = a[0] + (b[0] - a[0]) * f + ox;
    t.z = a[1] + (b[1] - a[1]) * f + oz;
    t.heading = Math.atan2(-(b[1] - a[1]), b[0] - a[0]);
  }

  return sim;
}

export const portName = (id: string) => portById(id).name;
export const nodePosition = (node: string) => ROAD_NODES[node];
