// Terminal trucks driven by the simulation, plus ambient road traffic in the districts.
import { forwardRef, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { TruckSim } from '@/sim/maritime';
import { CONTAINER_COLORS } from '@/sim/maritime';
import { CONTAINER, LAND_Y, type V2 } from '@/data/layout';
import { useWorld } from '@/store/world';
import { boxGeo, cylGeo, mat } from '../materials';
import { useSim } from './SimContext';

interface TruckRefs {
  group: THREE.Group | null;
  box: THREE.Mesh | null;
}

const TruckModel = forwardRef<THREE.Group, { cab: string; boxRef?: (m: THREE.Mesh | null) => void; chassis?: 'trailer' | 'box' }>(function TruckModel(
  { cab, boxRef, chassis = 'trailer' },
  ref,
) {
  return (
    <group ref={ref}>
      <mesh geometry={boxGeo(7.2, 0.5, 2.2)} position={[-0.6, 0.8, 0]} material={mat('#2b2f33')} castShadow />
      <mesh geometry={boxGeo(1.8, 2, 2.2)} position={[3.4, 1.9, 0]} material={mat(cab, { roughness: 0.45 })} castShadow />
      <mesh geometry={boxGeo(0.06, 0.9, 1.9)} position={[4.32, 2.3, 0]} material={mat('#2c3a4a', { roughness: 0.2 })} />
      {[-3, -1.6, 3].map((x) =>
        [-1, 1].map((z) => (
          <mesh key={`${x}${z}`} geometry={cylGeo(0.5, 0.5, 0.4, 12)} position={[x, 0.5, z]} rotation-x={Math.PI / 2} material={mat('#16191c')} />
        )),
      )}
      <mesh
        ref={boxRef}
        geometry={chassis === 'trailer' ? boxGeo(CONTAINER.length - 0.2, CONTAINER.height - 0.08, CONTAINER.width) : boxGeo(4.8, 2.4, 2.2)}
        position={[-0.9, 1.05 + CONTAINER.height / 2, 0]}
        castShadow
      >
        <meshStandardMaterial color="#2e6db4" roughness={0.6} />
      </mesh>
    </group>
  );
});

export function TerminalTrucks() {
  const sim = useSim();
  const refs = useRef<TruckRefs[]>([]);
  useFrame(() => {
    sim.trucks.forEach((t: TruckSim, i) => {
      const r = refs.current[i];
      if (!r?.group) return;
      r.group.position.set(t.x, LAND_Y, t.z);
      r.group.rotation.y = t.heading;
      if (r.box) {
        r.box.visible = t.carrying !== null;
        if (t.carrying !== null) (r.box.material as THREE.MeshStandardMaterial).color.setHex(t.carrying);
      }
    });
  });
  return (
    <>
      {sim.trucks.map((t, i) => {
        refs.current[i] ??= { group: null, box: null };
        return (
          <TruckModel
            key={t.id}
            cab={['#f3f6f9', '#2c6fbf', '#e2a01b'][i % 3]}
            ref={(el) => (refs.current[i].group = el)}
            boxRef={(el) => (refs.current[i].box = el)}
          />
        );
      })}
    </>
  );
}

// ---------- ambient district traffic ----------
const LOOPS: V2[][] = [
  [[-12, -8], [-176, -8], [-176, -60], [-12, -60]],
  [[-12, -60], [-12, -112], [-176, -112], [-176, -60]],
  [[-4, -30], [215, -30], [215, -72], [-12, -72], [-12, -30]],
];

function loopSampler(points: V2[]) {
  const closed = [...points, points[0]];
  const lens = [0];
  for (let i = 1; i < closed.length; i++) lens.push(lens[i - 1] + Math.hypot(closed[i][0] - closed[i - 1][0], closed[i][1] - closed[i - 1][1]));
  const total = lens[lens.length - 1];
  return (d: number) => {
    d = ((d % total) + total) % total;
    let i = 1;
    while (lens[i] < d) i++;
    const a = closed[i - 1];
    const b = closed[i];
    const f = (d - lens[i - 1]) / (lens[i] - lens[i - 1]);
    return { x: a[0] + (b[0] - a[0]) * f, z: a[1] + (b[1] - a[1]) * f, heading: Math.atan2(-(b[1] - a[1]), b[0] - a[0]), total };
  };
}

export function RoadTraffic() {
  const vehicles = useMemo(
    () =>
      [0, 1, 2, 3, 4, 5, 6].map((i) => ({
        loop: loopSampler(LOOPS[i % LOOPS.length]),
        offset: i * 97,
        speed: 7 + (i % 3) * 1.5,
        cab: ['#e2574c', '#2f7fe0', '#f3f6f9', '#23a35a'][i % 4],
        color: CONTAINER_COLORS[(i * 3) % CONTAINER_COLORS.length],
        lane: i % 2 ? 1.6 : -1.6,
      })),
    [],
  );
  const refs = useRef<(THREE.Group | null)[]>([]);
  const boxes = useRef<(THREE.Mesh | null)[]>([]);
  const dist = useRef(0);
  useFrame((_, dt) => {
    const { speed, showAmbient } = useWorld.getState();
    if (showAmbient) dist.current += Math.min(dt, 0.1) * speed;
    vehicles.forEach((v, i) => {
      const g = refs.current[i];
      if (!g) return;
      const p = v.loop(v.offset + dist.current * v.speed);
      // Keep to one side of the road.
      g.position.set(p.x + Math.sin(p.heading) * v.lane, LAND_Y, p.z + Math.cos(p.heading) * v.lane);
      g.rotation.y = p.heading;
      g.scale.setScalar(0.85);
      const b = boxes.current[i];
      if (b) (b.material as THREE.MeshStandardMaterial).color.setHex(v.color);
    });
  });
  return (
    <>
      {vehicles.map((v, i) => (
        <TruckModel key={i} cab={v.cab} ref={(el) => (refs.current[i] = el)} boxRef={(el) => (boxes.current[i] = el)} chassis={i % 2 ? 'box' : 'trailer'} />
      ))}
    </>
  );
}
