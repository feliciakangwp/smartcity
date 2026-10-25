// Data deliveries between systems, from the input / output tally (lib/dataFlows).
// A matched pair (B lists output to A and A lists input from B) gets one delivery van
// carrying documents from B to A and back. A broken link gets a broken-down van with
// a flashing red alarm, parked halfway along the route.
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { LAND_Y, ROAD_NODES, roadPath, type V2 } from '@/data/layout';
import { useLandscape } from '@/store/landscape';
import { useWorld } from '@/store/world';
import { activeSystems } from '@/lib/metrics';
import { dataFlowPairs, type DataFlowPair } from '@/lib/dataFlows';
import type { SystemPlacement, ZoneLayout } from '@/lib/placement';
import { boxGeo, cylGeo, mat } from './materials';
import { setHoverCursor } from './cursor';
import { useWorldLayout } from './useWorldLayout';

const VAN_SPEED = 16;
/** Seconds spent handing over (or picking up) the documents at each end. */
const HANDOVER = 3;
/** Vans keep to the left of the road, like the trucks. */
const KEEP_LEFT = 1.7;
const VAN_SCALE = 1.7;

interface Route {
  pts: V2[];
  cum: number[];
  total: number;
}

function makeRoute(raw: V2[]): Route {
  const pts = raw.filter((p, i) => i === 0 || Math.hypot(p[0] - raw[i - 1][0], p[1] - raw[i - 1][1]) > 0.5);
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  return { pts, cum, total: cum[cum.length - 1] || 1 };
}

/** Point, heading (rotation about y, nose along +x) at distance `d`, offset to the left of travel. */
function sample(r: Route, d: number, reverse: boolean, out: { x: number; z: number; heading: number }) {
  const dist = reverse ? r.total - d : d;
  let i = 1;
  while (i < r.pts.length - 1 && r.cum[i] < dist) i++;
  const a = r.pts[i - 1];
  const b = r.pts[i];
  const seg = r.cum[i] - r.cum[i - 1] || 1;
  const f = Math.min(1, Math.max(0, (dist - r.cum[i - 1]) / seg));
  let dx = b[0] - a[0];
  let dz = b[1] - a[1];
  if (reverse) {
    dx = -dx;
    dz = -dz;
  }
  const len = Math.hypot(dx, dz) || 1;
  // Left of travel when looking down from above, with +x east and +z south.
  const lx = dz / len;
  const lz = -dx / len;
  out.x = a[0] + (b[0] - a[0]) * f + lx * KEEP_LEFT;
  out.z = a[1] + (b[1] - a[1]) * f + lz * KEEP_LEFT;
  out.heading = Math.atan2(-dz, dx);
  return out;
}

const nearestNode = ([x, z]: V2) => {
  let best = '';
  let bd = Infinity;
  for (const [k, [nx, nz]] of Object.entries(ROAD_NODES)) {
    const d = Math.hypot(nx - x, nz - z);
    if (d < bd) {
      bd = d;
      best = k;
    }
  }
  return best;
};

/** From the sender's building door, along the zone walkway, over the expressways, to the receiver's door. */
function routeBetween(from: SystemPlacement, to: SystemPlacement, fromZone: ZoneLayout, toZone: ZoneLayout): Route {
  const door = (p: SystemPlacement): V2 => [p.x, p.z + p.footprint / 2 + 1.5];
  const walkZ = (l: ZoneLayout, p: SystemPlacement) => Math.max(door(p)[1], l.plot.z + l.depth / 2 - l.frontStrip + 2);
  const a = door(from);
  const b = door(to);
  if (fromZone.zone.id === toZone.zone.id) {
    const w = Math.max(walkZ(fromZone, from), walkZ(toZone, to));
    return makeRoute([a, [a[0], w], [b[0], w], b]);
  }
  const exit = (l: ZoneLayout): V2 => [l.plot.x, l.plot.z + l.depth / 2 + 3];
  const ex = exit(fromZone);
  const en = exit(toZone);
  const wa = walkZ(fromZone, from);
  const wb = walkZ(toZone, to);
  const nA = nearestNode(ex);
  const nB = nearestNode(en);
  const road = nA === nB ? [ROAD_NODES[nA]] : roadPath(nA, nB);
  return makeRoute([a, [a[0], wa], [ex[0], wa], ex, ...road, en, [en[0], wb], [b[0], wb], b]);
}

export interface Van {
  pair: DataFlowPair;
  route: Route;
  /** Stagger so vans on shared roads do not travel together. */
  offset: number;
}

/** Vans for every sender → receiver pair whose buildings are on the map, with their routes. */
export function useDataVans() {
  const zones = useLandscape((s) => s.zones);
  const systems = useLandscape((s) => s.systems);
  const { layouts, placements } = useWorldLayout();
  return useMemo(() => {
    const live = activeSystems(systems, zones);
    const layoutOf = new Map(layouts.map((l) => [l.zone.id, l]));
    const out: Van[] = [];
    dataFlowPairs(live).forEach((pair, i) => {
      const from = placements.get(pair.fromId);
      const to = placements.get(pair.toId);
      const lf = from && layoutOf.get(from.zoneId);
      const lt = to && layoutOf.get(to.zoneId);
      if (!from || !to || !lf || !lt) return;
      out.push({ pair, route: routeBetween(from, to, lf, lt), offset: (i * 0.37) % 1 });
    });
    return out;
  }, [systems, zones, layouts, placements]);
}

/** Where a broken-down van stands: halfway along its route. */
export const brokenVanSpot = (van: Van) => sample(van.route, van.route.total / 2, false, { x: 0, z: 0, heading: 0 });

export function DataVans() {
  const vans = useDataVans();
  return (
    <group>
      {vans.map((v) =>
        v.pair.status === 'ok' ? (
          <DeliveryVan key={`${v.pair.fromId}>${v.pair.toId}`} van={v} />
        ) : (
          <BrokenVan key={`${v.pair.fromId}>${v.pair.toId}`} van={v} />
        ),
      )}
    </group>
  );
}

function useVanClick(systemId: string) {
  const select = useWorld((s) => s.select);
  return {
    onClick: (e: { stopPropagation: () => void }) => {
      e.stopPropagation();
      select({ kind: 'system', id: systemId });
    },
    onPointerOver: (e: { stopPropagation: () => void }) => {
      e.stopPropagation();
      setHoverCursor(true);
    },
    onPointerOut: () => setHoverCursor(false),
  };
}

// ---------- van model (nose along +x) ----------
function VanBody({ color = '#f3f6f9', stripe = '#1f56a3' }: { color?: string; stripe?: string }) {
  return (
    <>
      <mesh geometry={boxGeo(4.2, 2.1, 2.1)} position={[-0.5, 1.55, 0]} material={mat(color, { roughness: 0.45 })} castShadow />
      <mesh geometry={boxGeo(1.4, 1.5, 2.06)} position={[2.25, 1.25, 0]} material={mat(color, { roughness: 0.45 })} castShadow />
      <mesh geometry={boxGeo(0.06, 0.8, 1.8)} position={[2.97, 1.55, 0]} material={mat('#2c3a4a', { roughness: 0.15 })} />
      <mesh geometry={boxGeo(4.22, 0.32, 2.14)} position={[-0.5, 1.3, 0]} material={mat(stripe)} />
      {[-1.7, 1.9].map((x) =>
        [-1, 1].map((z) => (
          <mesh key={`${x}${z}`} geometry={cylGeo(0.42, 0.42, 0.3, 12)} position={[x, 0.42, z]} rotation-x={Math.PI / 2} material={mat('#16191c')} />
        )),
      )}
    </>
  );
}

const DOC_PAPER = mat('#ffffff', { roughness: 0.9 });
const DOC_FOLDER = mat('#f2b705', { roughness: 0.7 });

function DeliveryVan({ van }: { van: Van }) {
  const group = useRef<THREE.Group>(null);
  const docs = useRef<THREE.Group>(null);
  const clock = useRef(van.offset * 40);
  const at = useMemo(() => ({ x: 0, z: 0, heading: 0 }), []);
  const handlers = useVanClick(van.pair.toId);
  const drive = van.route.total / VAN_SPEED;
  const cycle = drive * 2 + HANDOVER * 2;

  useFrame((_, dt) => {
    const { showAmbient, speed } = useWorld.getState();
    if (showAmbient) clock.current += Math.min(dt, 0.1) * Math.max(speed, 0);
    const t = clock.current % cycle;
    // Load at the sender, drive to the receiver, hand over the documents, drive back empty.
    let loaded: boolean;
    if (t < HANDOVER) {
      sample(van.route, 0, false, at);
      loaded = t > HANDOVER / 2;
    } else if (t < HANDOVER + drive) {
      sample(van.route, (t - HANDOVER) * VAN_SPEED, false, at);
      loaded = true;
    } else if (t < HANDOVER * 2 + drive) {
      sample(van.route, van.route.total, false, at);
      loaded = t < HANDOVER * 1.5 + drive;
    } else {
      sample(van.route, (t - HANDOVER * 2 - drive) * VAN_SPEED, true, at);
      loaded = false;
    }
    const g = group.current;
    if (!g) return;
    g.position.set(at.x, LAND_Y, at.z);
    g.rotation.y = at.heading;
    if (docs.current) {
      docs.current.visible = loaded;
      docs.current.position.y = 3.6 + Math.sin(clock.current * 2.4) * 0.25;
      docs.current.rotation.y = clock.current * 0.9;
    }
  });

  return (
    <group ref={group} {...handlers}>
      <group scale={VAN_SCALE}>
        <VanBody />
        {/* A stack of documents in a folder riding above the van while it is loaded */}
        <group ref={docs}>
          <mesh geometry={boxGeo(1.5, 0.12, 1.1)} position={[0, 0, 0]} material={DOC_FOLDER} />
          <mesh geometry={boxGeo(1.36, 0.22, 0.98)} position={[0, 0.17, 0]} material={DOC_PAPER} />
          <mesh geometry={boxGeo(1.2, 0.05, 0.86)} position={[0.08, 0.31, 0.04]} rotation-y={0.12} material={DOC_PAPER} />
        </group>
      </group>
    </group>
  );
}

// Shared, animated materials for every broken-down van (not from the cache, so they can flash).
const ALARM = new THREE.MeshStandardMaterial({ color: '#ff2a2a', emissive: '#ff0000', emissiveIntensity: 2, roughness: 0.3 });
const HALO = new THREE.MeshBasicMaterial({ color: '#ff2a2a', transparent: true, opacity: 0.4, depthWrite: false, side: THREE.DoubleSide });
const SMOKE = new THREE.MeshStandardMaterial({ color: '#6b7178', transparent: true, opacity: 0.55, roughness: 1, depthWrite: false });
let alarmFrame = -1;

function BrokenVan({ van }: { van: Van }) {
  const halo = useRef<THREE.Mesh>(null);
  const smoke = useRef<THREE.Group>(null);
  const clock = useRef(0);
  // The system that is missing its side of the tally is the one to fix.
  const handlers = useVanClick(van.pair.status === 'missing-output' ? van.pair.fromId : van.pair.toId);
  const at = useMemo(() => brokenVanSpot(van), [van]);

  useFrame(({ clock: c }, dt) => {
    clock.current += Math.min(dt, 0.1);
    const t = clock.current;
    // Flash on and off about twice a second; updated once per frame for all broken vans.
    if (alarmFrame !== c.elapsedTime) {
      alarmFrame = c.elapsedTime;
      const on = Math.sin(c.elapsedTime * 12) > 0;
      ALARM.emissiveIntensity = on ? 3 : 0.1;
      ALARM.color.set(on ? '#ff2a2a' : '#5a1010');
      HALO.opacity = on ? 0.45 : 0.08;
      ALARM_SIGN.opacity = on ? 1 : 0.35;
    }
    if (halo.current) halo.current.scale.setScalar(1 + ((t * 1.5) % 1) * 0.8);
    smoke.current?.children.forEach((m, i) => {
      const k = (t * 0.45 + i / 3) % 1;
      m.position.set(2.6 + k * 0.6, 2.2 + k * 3.2, Math.sin(i * 2 + t) * 0.3);
      m.scale.setScalar(0.4 + k * 0.9);
    });
  });

  return (
    <group position={[at.x, LAND_Y, at.z]} rotation-y={at.heading} {...handlers}>
      {/* Flashing alarm sign that stays readable from afar, and a pulsing red ring on the road */}
      <sprite position={[0, 9, 0]} scale={[0.034, 0.034, 1]} renderOrder={11}>
        <primitive object={ALARM_SIGN} attach="material" />
      </sprite>
      <mesh ref={halo} rotation-x={-Math.PI / 2} position={[0, 0.15, 0]} material={HALO} geometry={RING} />
      <group scale={VAN_SCALE} rotation-x={0.07} rotation-z={-0.04}>
        <VanBody color="#e7e2d8" stripe="#8a8378" />
        {/* Bonnet propped open, flat front tyre, hazard beacon and a warning triangle behind */}
        <mesh geometry={boxGeo(1.3, 0.08, 1.9)} position={[2.55, 2.35, 0]} rotation-z={0.9} material={mat('#e7e2d8', { roughness: 0.5 })} />
        <mesh geometry={cylGeo(0.42, 0.42, 0.3, 12)} position={[1.9, 0.3, 1]} rotation-x={Math.PI / 2} scale={[1, 1, 0.6]} material={mat('#16191c')} />
        <mesh geometry={cylGeo(0.32, 0.38, 0.45, 12)} position={[0, 2.85, 0]} material={ALARM} />
        <mesh geometry={cylGeo(0.32, 0.38, 0.45, 12)} position={[-2.2, 2.85, 0]} material={ALARM} />
        <group position={[-4.6, 0, 0]}>
          <mesh geometry={TRIANGLE} rotation-y={Math.PI / 2} position={[0, 0.75, 0]} material={ALARM} />
        </group>
        <group ref={smoke}>
          {[0, 1, 2].map((i) => (
            <mesh key={i} geometry={SPHERE} material={SMOKE} />
          ))}
        </group>
      </group>
    </group>
  );
}

const RING = new THREE.RingGeometry(5, 6.2, 40);
const SPHERE = new THREE.SphereGeometry(0.6, 10, 8);
const TRIANGLE = (() => {
  const s = new THREE.Shape();
  s.moveTo(-0.7, -0.6);
  s.lineTo(0.7, -0.6);
  s.lineTo(0, 0.7);
  s.closePath();
  return new THREE.ExtrudeGeometry(s, { depth: 0.08, bevelEnabled: false });
})();

/** Red warning triangle with "!" drawn once to a canvas; screen-sized so it reads at any zoom. */
const ALARM_SIGN = (() => {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  g.fillStyle = '#e11d1d';
  g.strokeStyle = '#ffffff';
  g.lineWidth = 9;
  g.lineJoin = 'round';
  g.beginPath();
  g.moveTo(64, 10);
  g.lineTo(120, 112);
  g.lineTo(8, 112);
  g.closePath();
  g.fill();
  g.stroke();
  g.fillStyle = '#ffffff';
  g.font = '900 64px Arial, sans-serif';
  g.textAlign = 'center';
  g.fillText('!', 64, 100);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false, sizeAttenuation: false });
})();
