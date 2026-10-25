// Changi Airport on a timetable: aircraft land on the western runway, taxi to a
// gate, disembark passengers who walk through the Traveller Checkpoint, then
// depart from the eastern runway. Simulated activity only.
import { AIRPORT, type V2 } from '@/data/layout';

export type PlaneState = 'approach' | 'rollout' | 'taxiIn' | 'parked' | 'taxiOut' | 'takeoff' | 'gone';

export interface PlaneSim {
  id: number;
  flight: string;
  state: PlaneState;
  x: number;
  y: number;
  z: number;
  heading: number;
  pitch: number;
  speed: number;
  path: V2[];
  gate: number;
  timer: number;
  livery: string;
}

export interface TravellerSim {
  active: boolean;
  x: number;
  z: number;
  path: V2[];
  seg: number;
  speed: number;
  wait: number;
  /** Index of the waypoint where the traveller stops at a checkpoint counter. */
  counterAt: number;
  color: number;
}

export interface Arrival {
  at: number;
  flight: string;
}

export interface CheckpointSpot {
  /** World centre and size of the checkpoint zone, used to route travellers. */
  x: number;
  z: number;
  width: number;
  depth: number;
}

export interface AirportSim {
  planes: PlaneSim[];
  travellers: TravellerSim[];
  upcoming: Arrival[];
  processed: number;
  time: number;
  step: (dt: number) => void;
  setCheckpoint: (c: CheckpointSpot | null) => void;
}

const ARRIVAL_EVERY = 22;
const PARK_TIME = 28;
const PAX = 10;
const LIVERIES = ['#1f4ea3', '#c8102e', '#0f7a6a', '#e98b1a', '#5b2c83'];
const AIRLINES = ['SQ', 'TR', 'MI', 'QF', 'EK', 'CX', 'MH', 'GA'];
const SHIRTS = [0xe9b414, 0x2f7fe0, 0xe0413f, 0x23a35a, 0x7c5ce0, 0xec7a1c, 0x2bb3c8, 0xf3f6f9];

export function createAirportSim(): AirportSim {
  const landing = AIRPORT.runways[0];
  const takeoff = AIRPORT.runways[1];
  const taxiX = (landing.x + AIRPORT.gates[0].x) / 2 - 2;
  const planes: PlaneSim[] = Array.from({ length: 6 }, (_, id) => ({
    id, flight: '', state: 'gone', x: 0, y: 0, z: 0, heading: Math.PI / 2, pitch: 0, speed: 0, path: [], gate: -1, timer: 0, livery: LIVERIES[id % LIVERIES.length],
  }));
  const travellers: TravellerSim[] = Array.from({ length: 160 }, () => ({ active: false, x: 0, z: 0, path: [], seg: 0, speed: 2.4, wait: 0, counterAt: -1, color: 0 }));
  const gateBusy = AIRPORT.gates.map(() => false);
  let checkpoint: CheckpointSpot | null = null;
  let nextArrival = 2;
  let flightN = 0;
  const flightName = (n: number) => `${AIRLINES[n % AIRLINES.length]} ${100 + ((n * 137) % 800)}`;

  const sim: AirportSim = {
    planes,
    travellers,
    upcoming: [],
    processed: 0,
    time: 0,
    setCheckpoint: (c) => (checkpoint = c),
    step(dt) {
      if (dt <= 0) return;
      sim.time += dt;

      // Timetabled arrivals; an arrival waits (holds) until a gate and an aircraft are free.
      if (sim.time >= nextArrival) {
        const gate = gateBusy.findIndex((b) => !b);
        const plane = planes.find((p) => p.state === 'gone');
        if (gate >= 0 && plane) {
          gateBusy[gate] = true;
          Object.assign(plane, {
            flight: flightName(flightN++),
            state: 'approach',
            x: landing.x,
            y: 70,
            z: landing.south + 380,
            heading: Math.PI / 2,
            pitch: -0.06,
            speed: 34,
            gate,
            timer: 0,
          });
          nextArrival += ARRIVAL_EVERY;
        } else nextArrival += 3;
      }
      sim.upcoming = [0, 1, 2].map((i) => ({ at: nextArrival + i * ARRIVAL_EVERY, flight: flightName(flightN + i) }));

      for (const p of planes) stepPlane(p, dt);
      for (const t of travellers) if (t.active) stepTraveller(t, dt);
    },
  };

  function moveAlong(p: PlaneSim, dt: number) {
    const target = p.path[0];
    if (!target) return true;
    const dx = target[0] - p.x;
    const dz = target[1] - p.z;
    const d = Math.hypot(dx, dz);
    const step = p.speed * dt;
    if (d <= step) {
      p.x = target[0];
      p.z = target[1];
      p.path.shift();
      return p.path.length === 0;
    }
    p.x += (dx / d) * step;
    p.z += (dz / d) * step;
    p.heading = Math.atan2(-dz, dx);
    return false;
  }

  function stepPlane(p: PlaneSim, dt: number) {
    switch (p.state) {
      case 'approach': {
        // Straight-in glide to the runway threshold.
        const remaining = p.z - landing.south;
        p.z -= p.speed * dt;
        p.y = Math.max(0, (remaining / 380) * 70);
        if (p.z <= landing.south) {
          p.z = landing.south;
          p.y = 0;
          p.pitch = 0;
          p.state = 'rollout';
        }
        break;
      }
      case 'rollout': {
        p.speed = Math.max(7, p.speed - 9 * dt);
        p.z -= p.speed * dt;
        if (p.z <= landing.north + 30) {
          const g = AIRPORT.gates[p.gate];
          p.state = 'taxiIn';
          p.speed = 7;
          p.path = [[taxiX, p.z], [taxiX, g.z], [g.x, g.z]];
        }
        break;
      }
      case 'taxiIn': {
        if (moveAlong(p, dt)) {
          p.state = 'parked';
          p.heading = Math.PI; // nose towards the terminal (west)
          p.timer = PARK_TIME;
          disembark(p);
        }
        break;
      }
      case 'parked': {
        p.timer -= dt;
        if (p.timer <= 0) {
          gateBusy[p.gate] = false;
          const g = AIRPORT.gates[p.gate];
          p.state = 'taxiOut';
          p.speed = 7;
          p.path = [[g.x + 10, g.z], [taxiX, g.z], [taxiX, takeoff.south + 6], [takeoff.x, takeoff.south + 6], [takeoff.x, takeoff.south]];
        }
        break;
      }
      case 'taxiOut': {
        if (moveAlong(p, dt)) {
          p.state = 'takeoff';
          p.heading = Math.PI / 2;
          p.speed = 8;
        }
        break;
      }
      case 'takeoff': {
        p.speed = Math.min(60, p.speed + 14 * dt);
        p.z -= p.speed * dt;
        if (p.z < takeoff.north + 40) {
          p.y += p.speed * 0.22 * dt;
          p.pitch = Math.min(0.18, p.pitch + dt * 0.2);
        }
        if (p.z < -620) p.state = 'gone';
        break;
      }
    }
  }

  function disembark(p: PlaneSim) {
    const g = AIRPORT.gates[p.gate];
    const t = AIRPORT.terminal;
    for (let i = 0; i < PAX; i++) {
      const tr = travellers.find((x) => !x.active);
      if (!tr) return;
      const lane = (i % 4) - 1.5;
      const path: V2[] = [
        [g.x - 4, g.z + lane * 0.8],
        [t.x + t.w / 2 - 2, g.z + lane * 0.8],
        [t.x - t.w / 2 - 3, t.z + lane * 1.6],
      ];
      let counterAt = -1;
      if (checkpoint) {
        // Into the checkpoint from the airport side, through one of four counters, out the far side.
        const c = checkpoint;
        const counterZ = c.z + c.depth / 2 - 8;
        const counterX = c.x + (c.width - 4) * 0.18 + (i % 4) * 3.2;
        path.push([c.x + c.width / 2 + 3, counterZ + 1.8 + lane * 0.5]);
        path.push([counterX + 1.6, counterZ + 1.8]);
        counterAt = path.length - 1;
        path.push([c.x - c.width / 2 + 2, counterZ + 2.2 + lane * 0.6]);
        path.push([c.x - c.width / 2 - 6, counterZ + 6 + lane]);
      }
      Object.assign(tr, {
        active: true,
        x: g.x,
        z: g.z,
        path,
        seg: 0,
        speed: 2.2 + ((i * 13) % 7) * 0.12,
        // Stagger exits from the aircraft door.
        wait: i * 0.7,
        counterAt,
        color: SHIRTS[(p.id + i) % SHIRTS.length],
      });
    }
  }

  function stepTraveller(t: TravellerSim, dt: number) {
    if (t.wait > 0) {
      t.wait -= dt;
      return;
    }
    const target = t.path[t.seg];
    if (!target) {
      t.active = false;
      sim.processed++;
      return;
    }
    const dx = target[0] - t.x;
    const dz = target[1] - t.z;
    const d = Math.hypot(dx, dz);
    const step = t.speed * dt;
    if (d <= step) {
      t.x = target[0];
      t.z = target[1];
      if (t.seg === t.counterAt) t.wait = 1.4; // declaration and GST check at the counter
      t.seg++;
      return;
    }
    t.x += (dx / d) * step;
    t.z += (dz / d) * step;
  }

  return sim;
}
