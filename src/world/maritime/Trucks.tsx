// Terminal trucks driven by the simulation, plus ambient road traffic in the districts.
import { forwardRef, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { TruckSim } from '@/sim/maritime';
import { CONTAINER, LAND_Y } from '@/data/layout';
import { boxGeo, cylGeo, mat } from '../materials';
import { useLogistics, useSim } from './SimContext';

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

// ---------- scheduled road logistics ----------
/** Port shuttles and delivery trucks from the logistics timetable (pooled, shown when on the road). */
export function RoadTrucks() {
  const logistics = useLogistics();
  const refs = useRef<TruckRefs[]>([]);
  useFrame(() => {
    logistics.trucks.forEach((t, i) => {
      const r = refs.current[i];
      if (!r?.group) return;
      r.group.visible = t.active;
      if (!t.active) return;
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
      {logistics.trucks.map((t, i) => {
        refs.current[i] ??= { group: null, box: null };
        return (
          <TruckModel
            key={t.id}
            cab={t.id % 3 === 0 ? '#f2b705' : t.id % 3 === 1 ? '#e2574c' : '#2f7fe0'}
            ref={(el) => (refs.current[i].group = el)}
            boxRef={(el) => (refs.current[i].box = el)}
          />
        );
      })}
    </>
  );
}
