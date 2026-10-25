// Ship-to-shore gantry crane. Gantry travels along the rail (x), the trolley
// along the boom (z), and the spreader hoists containers on cables (y).
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { BerthSim } from '@/sim/maritime';
import { CONTAINER, CRANE, LAND_Y } from '@/data/layout';
import { C, UNIT_BOX, boxGeo, mat } from '../materials';

const BOOM_Y = 27;
const _c = new THREE.Color();

export function QuayCrane({ berth }: { berth: BerthSim }) {
  const gantry = useRef<THREE.Group>(null);
  const trolley = useRef<THREE.Group>(null);
  const cables = useRef<THREE.Mesh>(null);
  const spreader = useRef<THREE.Group>(null);
  const carried = useRef<THREE.Mesh>(null);

  useFrame(() => {
    const c = berth.crane;
    gantry.current?.position.set(c.x, LAND_Y, berth.port.quayZ);
    trolley.current?.position.set(0, BOOM_Y - LAND_Y - 0.9, c.trolleyZ - berth.port.quayZ);
    const drop = BOOM_Y - 1.4 - c.hoistY;
    if (cables.current) {
      cables.current.scale.set(1, Math.max(0.1, drop - 0.1), 1);
      cables.current.position.set(0, -0.55 - drop / 2, 0);
    }
    spreader.current?.position.set(0, -0.5 - drop, 0);
    if (carried.current) {
      carried.current.visible = c.carrying !== null;
      if (c.carrying !== null) (carried.current.material as THREE.MeshStandardMaterial).color.copy(_c.setHex(c.carrying));
    }
  });

  const frame = mat(C.craneBlue, { roughness: 0.5, metalness: 0.2 });
  const white = mat('#eef2f6', { roughness: 0.5 });
  const legH = BOOM_Y - LAND_Y - 2;
  const boomLen = CRANE.boomTipZ - CRANE.backreachZ;
  const boomMid = (CRANE.boomTipZ + CRANE.backreachZ) / 2;

  return (
    <group ref={gantry}>
      {/* Four legs on the rails, portal beams and sill beams */}
      {[-5, 5].map((x) =>
        [CRANE.seaLegZ, CRANE.landLegZ].map((z) => (
          <mesh key={`${x}${z}`} geometry={UNIT_BOX} scale={[1, legH, 1]} position={[x, legH / 2, z]} material={frame} castShadow />
        )),
      )}
      {[CRANE.seaLegZ, CRANE.landLegZ].map((z) => (
        <mesh key={z} geometry={UNIT_BOX} scale={[11, 1.2, 1.2]} position={[0, legH, z]} material={frame} castShadow />
      ))}
      {[-5, 5].map((x) => (
        <mesh key={x} geometry={UNIT_BOX} scale={[1, 1, CRANE.seaLegZ - CRANE.landLegZ]} position={[x, legH - 4, (CRANE.seaLegZ + CRANE.landLegZ) / 2]} material={frame} />
      ))}
      {[-5, 5].map((x) =>
        [CRANE.seaLegZ, CRANE.landLegZ].map((z) => (
          <mesh key={`b${x}${z}`} geometry={boxGeo(1.6, 0.8, 2.6)} position={[x, 0.4, z]} material={mat('#2b333b')} />
        )),
      )}

      {/* Boom with apex frame and tie-backs */}
      <mesh geometry={UNIT_BOX} scale={[2.2, 1.6, boomLen]} position={[0, BOOM_Y - LAND_Y, boomMid]} material={white} castShadow />
      <mesh geometry={UNIT_BOX} scale={[1, 9, 1]} position={[0, BOOM_Y - LAND_Y + 5, CRANE.landLegZ + 2]} material={frame} castShadow />
      <Tie from={[0, BOOM_Y - LAND_Y + 9.5, CRANE.landLegZ + 2]} to={[0, BOOM_Y - LAND_Y + 0.6, CRANE.boomTipZ - 1]} />
      <Tie from={[0, BOOM_Y - LAND_Y + 9.5, CRANE.landLegZ + 2]} to={[0, BOOM_Y - LAND_Y + 0.6, CRANE.backreachZ + 1]} />
      <mesh geometry={boxGeo(5, 3.2, 6)} position={[0, BOOM_Y - LAND_Y + 2.4, CRANE.backreachZ + 4]} material={frame} castShadow />
      <mesh geometry={boxGeo(3.6, 2, 2.6)} position={[0, BOOM_Y - LAND_Y - 3, CRANE.landLegZ + 5]} material={mat('#2c3a4a', { roughness: 0.3 })} />

      {/* Trolley, cables, spreader and the carried container */}
      <group ref={trolley}>
        <mesh geometry={boxGeo(3, 1.2, 3)} material={mat('#f2b705')} castShadow />
        <mesh ref={cables} geometry={boxGeo(1.6, 1, 0.08)} material={mat('#2b333b')} />
        <group ref={spreader}>
          <mesh geometry={boxGeo(CONTAINER.length + 0.3, 0.5, CONTAINER.width + 0.2)} position={[0, 0.25, 0]} material={mat('#f2b705')} castShadow />
          <mesh ref={carried} geometry={boxGeo(CONTAINER.length - 0.2, CONTAINER.height - 0.08, CONTAINER.width)} position={[0, -CONTAINER.height / 2, 0]} castShadow visible={false}>
            <meshStandardMaterial color="#c0392b" roughness={0.6} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

function Tie({ from, to }: { from: [number, number, number]; to: [number, number, number] }) {
  const a = new THREE.Vector3(...from);
  const b = new THREE.Vector3(...to);
  const mid = a.clone().add(b).multiplyScalar(0.5);
  const len = a.distanceTo(b);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
  return <mesh geometry={UNIT_BOX} position={mid} quaternion={q} scale={[0.25, len, 0.25]} material={mat('#dfe5ea')} />;
}

/** Containers the crane has set down on the apron, waiting for (or left by) trucks. */
export function ApronBuffer({ berth }: { berth: BerthSim }) {
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  useFrame(() => {
    berth.buffer.forEach((s, i) => {
      const m = refs.current[i];
      if (!m) return;
      m.visible = s.color !== null;
      if (s.color !== null) (m.material as THREE.MeshStandardMaterial).color.setHex(s.color);
    });
  });
  return (
    <>
      {berth.buffer.map((s, i) => (
        <group key={i}>
          <mesh position={[s.x, LAND_Y + 0.06, s.z]} geometry={boxGeo(CONTAINER.length + 0.8, 0.04, CONTAINER.width + 0.8)} material={mat('#ffffff', { opacity: 0.6 })} />
          <mesh ref={(el) => (refs.current[i] = el)} position={[s.x, LAND_Y + CONTAINER.height / 2, s.z]} geometry={boxGeo(CONTAINER.length - 0.2, CONTAINER.height - 0.08, CONTAINER.width)} castShadow visible={false}>
            <meshStandardMaterial color="#c0392b" roughness={0.6} />
          </mesh>
        </group>
      ))}
    </>
  );
}
