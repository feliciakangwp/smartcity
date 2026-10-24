// Ambient maritime simulation. Plain mutable objects stepped once per frame;
// 3D components read from them. Independent of ICT data-flow animation.
import type { Berth, ShipConfig } from '@/types/domain';
import {
  ANCHORAGES,
  CONTAINER,
  CRANE,
  ENTRY_LANE,
  EXIT_LANE,
  LAND_Y,
  TERMINAL_ROAD_Z,
  YARD,
  dockZ,
  type V2,
} from '@/data/layout';

export const SHIP_STATES = ['APPROACHING', 'WAITING', 'BERTHING', 'DOCKED', 'UNLOADING', 'LOADING', 'DEPARTING', 'AT_SEA'] as const;
export type ShipState = (typeof SHIP_STATES)[number];

export const CONTAINER_COLORS = [0xc0392b, 0x2e6db4, 0xe2a12b, 0x2f8f4e, 0x8d9aa5, 0x7a4b8c, 0xd9d4c7, 0xb5651d, 0x1f9aa8];

export const BAY_PITCH = 6.6;
export const ROW_PITCH = 2.6;
export const DECK_Y = 3.2;
export const HOIST_TOP = 22;

export interface Slot {
  bay: number;
  row: number;
  tier: number;
  color: number | null;
}

export interface ShipSim {
  cfg: ShipConfig;
  index: number;
  state: ShipState;
  stateTime: number;
  x: number;
  z: number;
  heading: number;
  speed: number;
  path: V2[];
  pathIndex: number;
  berth: BerthSim | null;
  length: number;
  beam: number;
  slots: Slot[];
  cargoVersion: number;
  toUnload: number;
  toLoad: number;
  seaTimer: number;
}

export type CargoTag = 'import' | 'export';
export interface BufferSlot {
  x: number;
  z: number;
  color: number | null;
  tag: CargoTag | null;
  reserved: boolean;
}

export type CranePhase =
  | 'idle'
  | 'toPick'
  | 'lowerPick'
  | 'attach'
  | 'hoistPick'
  | 'toDrop'
  | 'lowerDrop'
  | 'release'
  | 'hoistDrop'
  | 'waiting';

export interface CraneSim {
  x: number;
  homeX: number;
  trolleyZ: number;
  hoistY: number;
  carrying: number | null;
  phase: CranePhase;
  mode: 'unload' | 'load' | null;
  remaining: number;
  timer: number;
  pick: { kind: 'ship'; slot: Slot } | { kind: 'buffer'; slot: BufferSlot } | null;
  drop: { kind: 'ship'; slot: Slot } | { kind: 'buffer'; slot: BufferSlot } | null;
}

export interface BerthSim {
  cfg: Berth;
  ship: ShipSim | null;
  crane: CraneSim;
  buffer: BufferSlot[];
}

export interface TruckSim {
  id: number;
  berth: BerthSim;
  state: 'idle' | 'toBuffer' | 'atBuffer' | 'toYard' | 'atYard';
  job: 'import' | 'export' | null;
  x: number;
  z: number;
  heading: number;
  path: V2[];
  pathIndex: number;
  carrying: number | null;
  target: BufferSlot | null;
  timer: number;
  yardX: number;
}

export interface YardSim {
  capacity: number;
  count: number;
  version: number;
}

export interface MaritimeSim {
  ships: ShipSim[];
  berths: BerthSim[];
  trucks: TruckSim[];
  yard: YardSim;
  time: number;
  step: (dt: number) => void;
}

// ---------- geometry helpers ----------
export const shipLength = (cfg: ShipConfig) => cfg.bays * BAY_PITCH + 14;
export const shipBeam = (cfg: ShipConfig) => cfg.rows * ROW_PITCH + 3.4;

/** Local (along, side) offset of a container slot centre on the deck. */
export function slotLocal(ship: ShipSim, s: Slot) {
  const cargoCentre = 2.5;
  return {
    along: cargoCentre + (s.bay - (ship.cfg.bays - 1) / 2) * BAY_PITCH,
    side: (s.row - (ship.cfg.rows - 1) / 2) * ROW_PITCH,
    y: DECK_Y + s.tier * CONTAINER.height + CONTAINER.height / 2,
  };
}

export function slotWorld(ship: ShipSim, s: Slot) {
  const l = slotLocal(ship, s);
  const c = Math.cos(ship.heading);
  const sn = Math.sin(ship.heading);
  return { x: ship.x + l.along * c + l.side * sn, z: ship.z - l.along * sn + l.side * c, y: l.y };
}

const rand = (() => {
  let a = 1234567;
  return () => {
    a = (a * 1664525 + 1013904223) >>> 0;
    return a / 4294967296;
  };
})();
const pickColor = () => CONTAINER_COLORS[Math.floor(rand() * CONTAINER_COLORS.length)];

function fillCargo(ship: ShipSim) {
  ship.slots = [];
  const { bays, rows, tiers } = ship.cfg;
  for (let b = 0; b < bays; b++)
    for (let r = 0; r < rows; r++) {
      const height = 1 + Math.floor(rand() * tiers);
      for (let t = 0; t < tiers; t++) ship.slots.push({ bay: b, row: r, tier: t, color: t < height ? pickColor() : null });
    }
  const filled = ship.slots.filter((s) => s.color !== null).length;
  ship.toUnload = Math.min(ship.cfg.unloadCount, filled);
  ship.toLoad = ship.cfg.loadCount;
  ship.cargoVersion++;
}

const angleLerp = (a: number, b: number, t: number) => {
  let d = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
};

// ---------- factory ----------
export function createMaritimeSim(shipCfgs: ShipConfig[], berthCfgs: Berth[]): MaritimeSim {
  const berths: BerthSim[] = berthCfgs.map((b) => ({
    cfg: b,
    ship: null,
    buffer: CRANE.bufferOffsets.map((o) => ({ x: b.x + o, z: CRANE.bufferZ, color: null, tag: null, reserved: false })),
    crane: {
      x: b.x,
      homeX: b.x,
      trolleyZ: CRANE.bufferZ,
      hoistY: HOIST_TOP,
      carrying: null,
      phase: 'idle',
      mode: null,
      remaining: 0,
      timer: 0,
      pick: null,
      drop: null,
    },
  }));

  const yardCapacity = yardSlotCount();
  const yard: YardSim = { capacity: yardCapacity, count: Math.round(yardCapacity * 0.55), version: 0 };

  const ships: ShipSim[] = shipCfgs.map((cfg, index) => {
    const s: ShipSim = {
      cfg,
      index,
      state: 'AT_SEA',
      stateTime: 0,
      x: ENTRY_LANE[0][0],
      z: ENTRY_LANE[0][1],
      heading: 0,
      speed: 0,
      path: [],
      pathIndex: 0,
      berth: null,
      length: shipLength(cfg),
      beam: shipBeam(cfg),
      slots: [],
      cargoVersion: 0,
      toUnload: 0,
      toLoad: 0,
      seaTimer: 6 + index * 22,
    };
    fillCargo(s);
    return s;
  });

  // Stagger the opening scene: one ship already at a berth unloading, one inbound.
  if (ships[0] && berths[0]) {
    const s = ships[0];
    const b = berths[0];
    b.ship = s;
    s.berth = b;
    s.x = b.cfg.x;
    s.z = dockZ(s.beam);
    s.heading = 0;
    setState(s, 'UNLOADING');
    startCraneTask(b, 'unload', s.toUnload);
  }
  if (ships[1]) {
    const s = ships[1];
    s.x = ENTRY_LANE[1][0];
    s.z = ENTRY_LANE[1][1];
    s.path = [...ENTRY_LANE.slice(2), ANCHORAGES[s.index % ANCHORAGES.length]];
    s.heading = Math.atan2(-(s.path[0][1] - s.z), s.path[0][0] - s.x);
    s.speed = 12;
    setState(s, 'APPROACHING');
  }

  const trucks: TruckSim[] = [];
  berths.forEach((b, bi) => {
    for (let k = 0; k < 2; k++) {
      const yardX = b.cfg.x + (k === 0 ? -18 : 18);
      trucks.push({
        id: bi * 2 + k,
        berth: b,
        state: 'idle',
        job: null,
        x: yardX,
        z: YARD.maxZ + 2.5,
        heading: Math.PI / 2,
        path: [],
        pathIndex: 0,
        carrying: null,
        target: null,
        timer: rand() * 2,
        yardX,
      });
    }
  });

  const sim: MaritimeSim = {
    ships,
    berths,
    trucks,
    yard,
    time: 0,
    step(dt) {
      if (dt <= 0) return;
      sim.time += dt;
      for (const s of ships) stepShip(s, dt, sim);
      for (const b of berths) stepCrane(b, dt, sim);
      for (const t of trucks) stepTruck(t, dt, sim);
    },
  };
  return sim;
}

export function yardSlotCount() {
  return yardSlots().length;
}

/** Container stack positions in the yard (x, z, tier), in fill order. */
export function yardSlots() {
  const out: { x: number; z: number; tier: number }[] = [];
  const blocks: number[] = [];
  for (let x = YARD.minX + 4; x < YARD.maxX - 4; x += 30) blocks.push(x);
  const rowsZ: number[] = [];
  for (let z = YARD.minZ + 2; z < YARD.maxZ - 2; z += CONTAINER.width + 0.4) rowsZ.push(z);
  for (let tier = 0; tier < 4; tier++)
    for (const bx of blocks)
      for (let i = 0; i < 4; i++)
        for (const z of rowsZ) out.push({ x: bx + i * (CONTAINER.length + 0.5), z, tier });
  return out;
}

function setState(s: ShipSim, state: ShipState) {
  s.state = state;
  s.stateTime = 0;
}

// ---------- ships ----------
function followPath(s: ShipSim, dt: number, vMax: number, vMin: number, sim: MaritimeSim) {
  const target = s.path[s.pathIndex];
  if (!target) return true;
  let remaining = Math.hypot(target[0] - s.x, target[1] - s.z);
  for (let i = s.pathIndex + 1; i < s.path.length; i++)
    remaining += Math.hypot(s.path[i][0] - s.path[i - 1][0], s.path[i][1] - s.path[i - 1][1]);

  let desired = Math.max(vMin, Math.min(vMax, remaining * 0.12));
  // Keep clear of ships ahead.
  for (const o of sim.ships) {
    if (o === s || (o.state !== 'APPROACHING' && o.state !== 'BERTHING' && o.state !== 'DEPARTING')) continue;
    const dx = o.x - s.x;
    const dz = o.z - s.z;
    const d = Math.hypot(dx, dz);
    const ahead = dx * Math.cos(s.heading) - dz * Math.sin(s.heading) > 0;
    if (ahead && d < (s.length + o.length) * 0.7) desired = Math.min(desired, vMin * 0.4);
  }
  s.speed += (desired - s.speed) * Math.min(1, dt * 0.6);

  const dx = target[0] - s.x;
  const dz = target[1] - s.z;
  const dist = Math.hypot(dx, dz);
  const stepLen = s.speed * dt;
  if (dist <= Math.max(stepLen, 0.4)) {
    s.x = target[0];
    s.z = target[1];
    s.pathIndex++;
    return s.pathIndex >= s.path.length;
  }
  s.x += (dx / dist) * stepLen;
  s.z += (dz / dist) * stepLen;
  s.heading = angleLerp(s.heading, Math.atan2(-dz, dx), Math.min(1, dt * 0.9));
  return false;
}

function freeBerth(sim: MaritimeSim) {
  return sim.berths.find((b) => !b.ship);
}

function stepShip(s: ShipSim, dt: number, sim: MaritimeSim) {
  s.stateTime += dt;
  switch (s.state) {
    case 'AT_SEA': {
      s.seaTimer -= dt;
      if (s.seaTimer <= 0) {
        fillCargo(s);
        s.x = ENTRY_LANE[0][0];
        s.z = ENTRY_LANE[0][1];
        s.path = [...ENTRY_LANE.slice(1), ANCHORAGES[s.index % ANCHORAGES.length]];
        s.pathIndex = 0;
        s.heading = Math.atan2(-(s.path[0][1] - s.z), s.path[0][0] - s.x);
        s.speed = 14;
        setState(s, 'APPROACHING');
      }
      break;
    }
    case 'APPROACHING': {
      if (followPath(s, dt, 16, 2.2, sim)) {
        s.path = [];
        s.pathIndex = 0;
        setState(s, 'WAITING');
      }
      break;
    }
    case 'WAITING': {
      s.speed *= 1 - Math.min(1, dt);
      const b = freeBerth(sim);
      if (b && s.stateTime > 2) {
        b.ship = s;
        s.berth = b;
        const dz = dockZ(s.beam);
        s.path = [
          [b.cfg.x - 60, dz + 26],
          [b.cfg.x - 14, dz + 3],
          [b.cfg.x, dz],
        ];
        s.pathIndex = 0;
        setState(s, 'BERTHING');
      }
      break;
    }
    case 'BERTHING': {
      if (followPath(s, dt, 6, 0.9, sim)) {
        s.speed = 0;
        setState(s, 'DOCKED');
      }
      break;
    }
    case 'DOCKED': {
      s.heading = angleLerp(s.heading, 0, Math.min(1, dt * 1.5));
      if (s.stateTime > 3) {
        s.heading = 0;
        setState(s, 'UNLOADING');
        startCraneTask(s.berth!, 'unload', s.toUnload);
      }
      break;
    }
    case 'UNLOADING': {
      const c = s.berth!.crane;
      if (c.phase === 'idle') {
        setState(s, 'LOADING');
        startCraneTask(s.berth!, 'load', s.toLoad);
      }
      break;
    }
    case 'LOADING': {
      const c = s.berth!.crane;
      if (c.phase === 'idle') {
        s.path = [
          [s.x + 30, s.z + 14],
          [s.x + 80, s.z + 46],
          ...EXIT_LANE,
        ];
        s.pathIndex = 0;
        setState(s, 'DEPARTING');
      }
      break;
    }
    case 'DEPARTING': {
      s.speed = Math.max(s.speed, 0.5);
      const done = followPath(s, dt, Math.min(16, 1 + s.stateTime * 0.7), 0.5, sim);
      // Free the berth once the stern has cleared it.
      if (s.berth && Math.abs(s.x - s.berth.cfg.x) > s.length) {
        s.berth.ship = null;
        s.berth = null;
      }
      if (done) {
        if (s.berth) s.berth.ship = null;
        s.berth = null;
        s.seaTimer = s.cfg.seaTime;
        setState(s, 'AT_SEA');
      }
      break;
    }
  }
}

// ---------- quay cranes ----------
function startCraneTask(b: BerthSim, mode: 'unload' | 'load', count: number) {
  const c = b.crane;
  c.mode = mode;
  c.remaining = count;
  c.phase = count > 0 ? 'waiting' : 'idle';
  c.pick = null;
  c.drop = null;
}

const approach = (v: number, target: number, rate: number) => {
  const d = target - v;
  return Math.abs(d) <= rate ? target : v + Math.sign(d) * rate;
};

function topFilled(ship: ShipSim): Slot | null {
  let best: Slot | null = null;
  for (const s of ship.slots) {
    if (s.color === null) continue;
    const above = ship.slots.find((o) => o.bay === s.bay && o.row === s.row && o.tier === s.tier + 1);
    if (above && above.color !== null) continue;
    if (!best || s.tier > best.tier || (s.tier === best.tier && s.row > best.row)) best = s;
  }
  return best;
}

function lowestEmpty(ship: ShipSim): Slot | null {
  let best: Slot | null = null;
  for (const s of ship.slots) {
    if (s.color !== null) continue;
    const below = s.tier === 0 ? null : ship.slots.find((o) => o.bay === s.bay && o.row === s.row && o.tier === s.tier - 1);
    if (s.tier > 0 && (!below || below.color === null)) continue;
    if (!best || s.tier < best.tier || (s.tier === best.tier && s.row < best.row)) best = s;
  }
  return best;
}

function targetOf(ref: CraneSim['pick'], ship: ShipSim | null) {
  if (!ref) return null;
  if (ref.kind === 'ship') {
    if (!ship) return null;
    const w = slotWorld(ship, ref.slot);
    return { x: w.x, z: w.z, top: w.y + CONTAINER.height / 2 };
  }
  return { x: ref.slot.x, z: ref.slot.z, top: LAND_Y + CONTAINER.height };
}

function stepCrane(b: BerthSim, dt: number, sim: MaritimeSim) {
  const c = b.crane;
  const ship = b.ship;
  const gantry = 5 * dt;
  const trolley = 6 * dt;
  const hoist = 5 * dt;

  switch (c.phase) {
    case 'idle': {
      c.x = approach(c.x, c.homeX, gantry * 0.5);
      c.trolleyZ = approach(c.trolleyZ, CRANE.bufferZ, trolley * 0.5);
      c.hoistY = approach(c.hoistY, HOIST_TOP, hoist);
      break;
    }
    case 'waiting': {
      if (!ship || c.remaining <= 0) {
        c.phase = 'idle';
        c.mode = null;
        break;
      }
      c.hoistY = approach(c.hoistY, HOIST_TOP, hoist);
      if (c.mode === 'unload') {
        const slot = topFilled(ship);
        if (!slot) { c.remaining = 0; break; }
        c.pick = { kind: 'ship', slot };
        c.phase = 'toPick';
      } else {
        const ready = b.buffer.find((s) => s.color !== null && s.tag === 'export' && !s.reserved);
        if (ready) {
          ready.reserved = true;
          c.pick = { kind: 'buffer', slot: ready };
          c.phase = 'toPick';
        }
      }
      break;
    }
    case 'toPick':
    case 'toDrop': {
      const t = targetOf(c.phase === 'toPick' ? c.pick : c.drop, ship);
      if (!t) { c.phase = 'waiting'; break; }
      c.hoistY = approach(c.hoistY, HOIST_TOP, hoist);
      c.x = approach(c.x, t.x, gantry);
      c.trolleyZ = approach(c.trolleyZ, t.z, trolley);
      if (c.x === t.x && c.trolleyZ === t.z && c.hoistY === HOIST_TOP) c.phase = c.phase === 'toPick' ? 'lowerPick' : 'lowerDrop';
      break;
    }
    case 'lowerPick':
    case 'lowerDrop': {
      const t = targetOf(c.phase === 'lowerPick' ? c.pick : c.drop, ship);
      if (!t) { c.phase = 'waiting'; break; }
      c.hoistY = approach(c.hoistY, t.top, hoist);
      if (c.hoistY === t.top) {
        c.phase = c.phase === 'lowerPick' ? 'attach' : 'release';
        c.timer = 0.8;
      }
      break;
    }
    case 'attach': {
      c.timer -= dt;
      if (c.timer > 0 || !c.pick) break;
      if (c.pick.kind === 'ship') {
        c.carrying = c.pick.slot.color;
        c.pick.slot.color = null;
        if (ship) ship.cargoVersion++;
      } else {
        c.carrying = c.pick.slot.color;
        c.pick.slot.color = null;
        c.pick.slot.tag = null;
        c.pick.slot.reserved = false;
      }
      c.phase = 'hoistPick';
      break;
    }
    case 'hoistPick': {
      c.hoistY = approach(c.hoistY, HOIST_TOP, hoist);
      if (c.hoistY !== HOIST_TOP) break;
      if (c.mode === 'unload') {
        const free = b.buffer.find((s) => s.color === null && !s.reserved);
        if (!free) break; // wait for a truck to clear the apron
        free.reserved = true;
        c.drop = { kind: 'buffer', slot: free };
      } else {
        const slot = ship ? lowestEmpty(ship) : null;
        if (!slot) break;
        c.drop = { kind: 'ship', slot };
      }
      c.phase = 'toDrop';
      break;
    }
    case 'release': {
      c.timer -= dt;
      if (c.timer > 0 || !c.drop) break;
      if (c.drop.kind === 'buffer') {
        c.drop.slot.color = c.carrying;
        c.drop.slot.tag = 'import';
        c.drop.slot.reserved = false;
      } else {
        c.drop.slot.color = c.carrying;
        if (ship) ship.cargoVersion++;
      }
      c.carrying = null;
      c.remaining--;
      if (ship) {
        if (c.mode === 'unload') ship.toUnload = c.remaining;
        else ship.toLoad = c.remaining;
      }
      c.phase = 'hoistDrop';
      break;
    }
    case 'hoistDrop': {
      c.hoistY = approach(c.hoistY, HOIST_TOP, hoist);
      if (c.hoistY === HOIST_TOP) {
        c.pick = null;
        c.drop = null;
        if (c.remaining > 0) c.phase = 'waiting';
        else {
          c.phase = 'idle';
          c.mode = null;
        }
      }
      break;
    }
  }
  void sim;
}

// ---------- terminal trucks ----------
function routeTo(t: TruckSim, dest: V2) {
  t.path = [
    [t.x, TERMINAL_ROAD_Z + (t.id % 2 ? 1.6 : -1.6)],
    [dest[0], TERMINAL_ROAD_Z + (t.id % 2 ? 1.6 : -1.6)],
    dest,
  ];
  t.pathIndex = 0;
}

function driveTruck(t: TruckSim, dt: number) {
  const target = t.path[t.pathIndex];
  if (!target) return true;
  const dx = target[0] - t.x;
  const dz = target[1] - t.z;
  const d = Math.hypot(dx, dz);
  const step = 10 * dt;
  if (d <= step) {
    t.x = target[0];
    t.z = target[1];
    t.pathIndex++;
    return t.pathIndex >= t.path.length;
  }
  t.x += (dx / d) * step;
  t.z += (dz / d) * step;
  t.heading = angleLerp(t.heading, Math.atan2(-dz, dx), Math.min(1, dt * 8));
  return false;
}

function stepTruck(t: TruckSim, dt: number, sim: MaritimeSim) {
  const b = t.berth;
  switch (t.state) {
    case 'idle': {
      t.timer -= dt;
      if (t.timer > 0) break;
      // Import: collect a container the crane put down.
      const imp = b.buffer.find((s) => s.color !== null && s.tag === 'import' && !s.reserved);
      if (imp) {
        imp.reserved = true;
        t.target = imp;
        t.job = 'import';
        routeTo(t, [imp.x, imp.z]);
        t.state = 'toBuffer';
        break;
      }
      // Export: bring a container for loading if the crane will need one.
      const c = b.crane;
      if (c.mode === 'load' && b.ship) {
        const inFlight =
          b.buffer.filter((s) => s.tag === 'export').length +
          sim.trucks.filter((o) => o.berth === b && o.job === 'export').length +
          (c.carrying !== null ? 1 : 0);
        const free = b.buffer.find((s) => s.color === null && !s.reserved);
        if (inFlight < c.remaining && free && sim.yard.count > 0) {
          free.reserved = true;
          t.target = free;
          t.job = 'export';
          t.carrying = pickColor();
          sim.yard.count--;
          sim.yard.version++;
          routeTo(t, [free.x, free.z]);
          t.state = 'toBuffer';
        }
      }
      t.timer = 0.5;
      break;
    }
    case 'toBuffer': {
      if (driveTruck(t, dt)) {
        t.state = 'atBuffer';
        t.timer = 1.2;
      }
      break;
    }
    case 'atBuffer': {
      t.timer -= dt;
      if (t.timer > 0 || !t.target) break;
      if (t.job === 'import') {
        t.carrying = t.target.color;
        t.target.color = null;
        t.target.tag = null;
      } else {
        t.target.color = t.carrying;
        t.target.tag = 'export';
        t.carrying = null;
      }
      t.target.reserved = false;
      t.target = null;
      routeTo(t, [t.yardX, YARD.maxZ + 2.5]);
      t.state = 'toYard';
      break;
    }
    case 'toYard': {
      if (driveTruck(t, dt)) {
        t.state = 'atYard';
        t.timer = 1.5;
      }
      break;
    }
    case 'atYard': {
      t.timer -= dt;
      if (t.timer > 0) break;
      if (t.carrying !== null) {
        sim.yard.count = Math.min(sim.yard.capacity, sim.yard.count + 1);
        sim.yard.version++;
        t.carrying = null;
      }
      t.job = null;
      t.state = 'idle';
      t.timer = 0.3;
      break;
    }
  }
}
