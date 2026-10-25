// Officers in navy blue uniforms walking around each zone, so districts look staffed.
// One set of instanced meshes for every officer; ambient like the rest of the port.
import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { LAND_Y } from '@/data/layout';
import { useWorld } from '@/store/world';
import { cylGeo, mat } from './materials';
import { useWorldLayout } from './useWorldLayout';

const NAVY = '#1b2a4a';
const NAVY_DARK = '#111c33';
/** Slightly larger than life so officers read at the usual viewing distance. */
const SIZE = 1.3;

interface Walker {
  /** Closed walking loop in world x/z. */
  loop: [number, number][];
  lengths: number[];
  total: number;
  start: number;
  speed: number;
  /** Seconds walked between short pauses, and the pause length. */
  walkFor: number;
  pause: number;
}

function makeLoop(points: [number, number][]): Pick<Walker, 'loop' | 'lengths' | 'total'> {
  const lengths = [0];
  for (let i = 1; i <= points.length; i++) {
    const a = points[i - 1];
    const b = points[i % points.length];
    lengths.push(lengths[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1]));
  }
  return { loop: points, lengths, total: lengths[lengths.length - 1] };
}

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3(1, 1, 1);
const _up = new THREE.Vector3(0, 1, 0);
const _off = new THREE.Vector3();

export function Officers() {
  const { layouts } = useWorldLayout();
  const walkers = useMemo(() => {
    const out: Walker[] = [];
    layouts.forEach((l, zi) => {
      const hw = l.width / 2 - 1.8;
      const hd = l.depth / 2 - 1.8;
      const { x, z } = l.plot;
      // Patrol around the zone edge, and along the walkway between the buildings and the landmark.
      const edge = makeLoop([[x - hw, z - hd], [x + hw, z - hd], [x + hw, z + hd], [x - hw, z + hd]]);
      const walkZ = z + l.depth / 2 - l.frontStrip - 1.2;
      const walkway = makeLoop([[x - hw, walkZ - 0.8], [x + hw, walkZ - 0.8], [x + hw, walkZ + 0.8], [x - hw, walkZ + 0.8]]);
      const count = l.zone.kind === 'shared' ? 4 : 6;
      for (let i = 0; i < count; i++) {
        const base = i % 3 === 2 ? walkway : edge;
        const dir = i % 2 ? 1 : -1;
        out.push({
          ...base,
          start: ((i * 0.37 + zi * 0.11) % 1) * base.total,
          speed: dir * (1.2 + ((i * 7 + zi * 3) % 5) * 0.12),
          walkFor: 9 + ((i * 5 + zi) % 7),
          pause: 1.5 + (i % 3),
        });
      }
    });
    return out;
  }, [layouts]);

  const legs = useRef<THREE.InstancedMesh>(null);
  const bodies = useRef<THREE.InstancedMesh>(null);
  const heads = useRef<THREE.InstancedMesh>(null);
  const caps = useRef<THREE.InstancedMesh>(null);
  const bands = useRef<THREE.InstancedMesh>(null);
  const brims = useRef<THREE.InstancedMesh>(null);
  const clock = useRef(0);

  useLayoutEffect(() => {
    clock.current = 0;
  }, [walkers]);

  useFrame((_, dt) => {
    const { showAmbient, speed } = useWorld.getState();
    if (showAmbient) clock.current += Math.min(dt, 0.1) * Math.max(speed, 0);
    const t = clock.current;
    walkers.forEach((w, i) => {
      // Walk, then stand for a moment; distance only advances while walking.
      const cycle = w.walkFor + w.pause;
      const k = Math.floor(t / cycle);
      const into = t - k * cycle;
      const walking = into < w.walkFor;
      const travelled = k * w.walkFor + Math.min(into, w.walkFor);
      let d = (w.start + travelled * w.speed) % w.total;
      if (d < 0) d += w.total;
      let seg = 0;
      while (w.lengths[seg + 1] < d) seg++;
      const a = w.loop[seg];
      const b = w.loop[(seg + 1) % w.loop.length];
      const f = (d - w.lengths[seg]) / (w.lengths[seg + 1] - w.lengths[seg] || 1);
      const x = a[0] + (b[0] - a[0]) * f;
      const z = a[1] + (b[1] - a[1]) * f;
      const sign = Math.sign(w.speed);
      const heading = Math.atan2(-(b[1] - a[1]) * sign, (b[0] - a[0]) * sign);
      _q.setFromAxisAngle(_up, heading);
      const bob = walking ? Math.abs(Math.sin(t * 7 + i)) * 0.08 : 0;
      const stride = walking ? 1 + Math.abs(Math.sin(t * 7 + i)) * 0.15 : 1;

      const set = (mesh: THREE.InstancedMesh | null, y: number, sx = 1, sy = 1, sz = 1, forward = 0) => {
        if (!mesh) return;
        _off.set(forward * SIZE, 0, 0).applyQuaternion(_q);
        _p.set(x + _off.x, LAND_Y + 0.25 + (y + bob) * SIZE, z + _off.z);
        mesh.setMatrixAt(i, _m.compose(_p, _q, _s.set(sx * SIZE, sy * SIZE, sz * SIZE)));
      };
      set(legs.current, 0.45, stride, 1, 1);
      set(bodies.current, 1.25);
      set(heads.current, 1.95);
      set(caps.current, 2.22);
      set(bands.current, 2.12);
      set(brims.current, 2.13, 1, 1, 1, 0.24);
    });
    for (const r of [legs, bodies, heads, caps, bands, brims]) if (r.current) r.current.instanceMatrix.needsUpdate = true;
  });

  const n = Math.max(1, walkers.length);
  return (
    <group key={walkers.length}>
      <instancedMesh ref={legs} args={[new THREE.BoxGeometry(0.42, 0.9, 0.5), mat(NAVY_DARK), n]} castShadow frustumCulled={false} />
      <instancedMesh ref={bodies} args={[cylGeo(0.3, 0.36, 0.8, 10), mat(NAVY, { roughness: 0.7 }), n]} castShadow frustumCulled={false} />
      <instancedMesh ref={heads} args={[new THREE.SphereGeometry(0.25, 10, 8), mat('#d9a882'), n]} frustumCulled={false} />
      {/* Peaked cap: navy crown with a white band and a short brim to the front */}
      <instancedMesh ref={caps} args={[cylGeo(0.3, 0.27, 0.16, 12), mat(NAVY_DARK), n]} frustumCulled={false} />
      <instancedMesh ref={bands} args={[cylGeo(0.275, 0.275, 0.07, 12), mat('#f3f6f9'), n]} frustumCulled={false} />
      <instancedMesh ref={brims} args={[new THREE.BoxGeometry(0.22, 0.04, 0.42), mat('#0b1324'), n]} frustumCulled={false} />
    </group>
  );
}
