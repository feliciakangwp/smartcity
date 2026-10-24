// Container yard: instanced stacks whose fill level follows the simulation,
// plus rubber-tyred gantry cranes working along the blocks.
import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CONTAINER_COLORS, yardSlots } from '@/sim/maritime';
import { CONTAINER, LAND_Y, YARD } from '@/data/layout';
import { useWorld } from '@/store/world';
import { boxGeo, mat, UNIT_BOX } from '../materials';
import { useSim } from './SimContext';

const _m = new THREE.Matrix4();
const _c = new THREE.Color();
const HIDDEN = new THREE.Matrix4().makeScale(0, 0, 0);

export function ContainerYard() {
  const sim = useSim();
  const slots = useMemo(() => yardSlots(), []);
  const ref = useRef<THREE.InstancedMesh>(null);
  const shown = useRef(-1);

  useLayoutEffect(() => {
    const inst = ref.current;
    if (!inst) return;
    slots.forEach((_, i) => inst.setColorAt(i, _c.setHex(CONTAINER_COLORS[(i * 7 + (i >> 3)) % CONTAINER_COLORS.length])));
    if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
  }, [slots]);

  useFrame(() => {
    const inst = ref.current;
    if (!inst || shown.current === sim.yard.count) return;
    shown.current = sim.yard.count;
    slots.forEach((s, i) => {
      if (i < sim.yard.count) inst.setMatrixAt(i, _m.makeTranslation(s.x, LAND_Y + CONTAINER.height / 2 + s.tier * CONTAINER.height, s.z));
      else inst.setMatrixAt(i, HIDDEN);
    });
    inst.instanceMatrix.needsUpdate = true;
  });

  return (
    <group>
      <instancedMesh ref={ref} args={[boxGeo(CONTAINER.length - 0.2, CONTAINER.height - 0.08, CONTAINER.width), undefined, slots.length]} castShadow receiveShadow>
        <meshStandardMaterial roughness={0.65} metalness={0.1} />
      </instancedMesh>
      {[0, 1, 2].map((i) => (
        <YardGantry key={i} index={i} />
      ))}
    </group>
  );
}

function YardGantry({ index }: { index: number }) {
  const g = useRef<THREE.Group>(null);
  const hoist = useRef<THREE.Group>(null);
  const t = useRef(index * 40);
  const span = YARD.maxZ - YARD.minZ + 4;
  const blockW = (YARD.maxX - YARD.minX) / 3;
  const x0 = YARD.minX + blockW * index + 6;
  useFrame((_, dt) => {
    const { speed, showAmbient } = useWorld.getState();
    if (showAmbient) t.current += dt * speed;
    const k = t.current;
    g.current?.position.set(x0 + ((Math.sin(k * 0.05) + 1) / 2) * (blockW - 14), LAND_Y, (YARD.minZ + YARD.maxZ) / 2);
    if (hoist.current) {
      hoist.current.position.z = Math.sin(k * 0.21) * (span / 2 - 4);
      hoist.current.position.y = 12 - (Math.sin(k * 0.43) * 0.5 + 0.5) * 3;
    }
  });
  const frame = mat('#e2a01b', { roughness: 0.5 });
  return (
    <group ref={g}>
      {[-1, 1].map((sx) =>
        [-1, 1].map((sz) => <mesh key={`${sx}${sz}`} geometry={UNIT_BOX} scale={[0.8, 13, 0.8]} position={[sx * 4, 6.5, (sz * span) / 2]} material={frame} castShadow />),
      )}
      {[-1, 1].map((sx) => (
        <mesh key={sx} geometry={UNIT_BOX} scale={[0.9, 1, span + 1]} position={[sx * 4, 13, 0]} material={frame} castShadow />
      ))}
      {[-1, 1].map((sz) => (
        <mesh key={sz} geometry={UNIT_BOX} scale={[9, 0.8, 0.8]} position={[0, 13, (sz * span) / 2]} material={frame} />
      ))}
      <group ref={hoist}>
        <mesh geometry={boxGeo(8.6, 0.8, 2.4)} position={[0, 1, 0]} material={mat('#2b333b')} />
        <mesh geometry={boxGeo(6.4, 0.4, 2.6)} position={[0, -0.2, 0]} material={mat('#f2b705')} />
      </group>
      {[-1, 1].map((sz) => (
        <mesh key={`w${sz}`} geometry={boxGeo(9, 1, 1.4)} position={[0, 0.5, (sz * span) / 2]} material={mat('#2b333b')} />
      ))}
    </group>
  );
}
