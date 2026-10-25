// Container ship: two-tone hull, stern superstructure, instanced deck cargo and wake.
import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { setHoverCursor } from '../cursor';
import type { ShipSim } from '@/sim/maritime';
import { DECK_Y, slotLocal } from '@/sim/maritime';
import { CONTAINER } from '@/data/layout';
import { useWorld } from '@/store/world';
import { boxGeo, cylGeo, mat } from '../materials';
import { waveHeight } from '../Ocean';
import { Label } from '../Label';

function hullShape(L: number, B: number) {
  const bow = Math.min(9, L * 0.18);
  const s = new THREE.Shape();
  s.moveTo(-L / 2, -B / 2 + 0.8);
  s.quadraticCurveTo(-L / 2, -B / 2, -L / 2 + 1, -B / 2);
  s.lineTo(L / 2 - bow, -B / 2);
  s.quadraticCurveTo(L / 2 - bow * 0.2, -B / 2 + 0.4, L / 2, 0);
  s.quadraticCurveTo(L / 2 - bow * 0.2, B / 2 - 0.4, L / 2 - bow, B / 2);
  s.lineTo(-L / 2 + 1, B / 2);
  s.quadraticCurveTo(-L / 2, B / 2, -L / 2, B / 2 - 0.8);
  s.closePath();
  return s;
}

const _m = new THREE.Matrix4();
const _c = new THREE.Color();
const HIDDEN = new THREE.Matrix4().makeScale(0, 0, 0);

export function Ship({ ship }: { ship: ShipSim }) {
  const group = useRef<THREE.Group>(null);
  const cargo = useRef<THREE.InstancedMesh>(null);
  const wake = useRef<THREE.Mesh>(null);
  const lastVersion = useRef(-1);
  const select = useWorld((s) => s.select);
  const selected = useWorld((s) => s.selection?.kind === 'ship' && s.selection.id === ship.cfg.id);
  const { length: L, beam: Bm, cfg } = ship;

  const geos = useMemo(() => {
    const shape = hullShape(L, Bm);
    const lower = new THREE.ExtrudeGeometry(shape, { depth: 2.4, bevelEnabled: false });
    const upper = new THREE.ExtrudeGeometry(shape, { depth: DECK_Y - 0.4, bevelEnabled: false });
    const deck = new THREE.ShapeGeometry(hullShape(L - 0.6, Bm - 0.6));
    return { lower, upper, deck };
  }, [L, Bm]);
  useLayoutEffect(() => () => Object.values(geos).forEach((g) => g.dispose()), [geos]);

  useFrame(({ clock }) => {
    const g = group.current;
    if (!g) return;
    const t = clock.elapsedTime;
    const moving = ship.state === 'APPROACHING' || ship.state === 'BERTHING' || ship.state === 'DEPARTING' || ship.state === 'WAITING';
    const bob = moving ? waveHeight(ship.x, ship.z, t) * 0.6 : 0;
    g.position.set(ship.x, bob, ship.z);
    g.rotation.set(moving ? Math.sin(t * 0.7 + ship.index) * 0.012 : 0, ship.heading, moving ? Math.sin(t * 0.9 + ship.index) * 0.02 : 0, 'YXZ');
    g.visible = ship.state !== 'AT_SEA' || Math.hypot(ship.x, ship.z) < 1400;

    if (wake.current) {
      const m = wake.current.material as THREE.MeshBasicMaterial;
      m.opacity = Math.min(0.55, ship.speed * 0.05);
      wake.current.scale.set(Math.min(1.6, 0.4 + ship.speed * 0.08), 1, 1);
    }

    const inst = cargo.current;
    if (inst && lastVersion.current !== ship.cargoVersion) {
      lastVersion.current = ship.cargoVersion;
      ship.slots.forEach((s, i) => {
        if (s.color === null) inst.setMatrixAt(i, HIDDEN);
        else {
          const l = slotLocal(ship, s);
          inst.setMatrixAt(i, _m.makeTranslation(l.along, l.y, l.side));
          inst.setColorAt(i, _c.setHex(s.color));
        }
      });
      inst.instanceMatrix.needsUpdate = true;
      if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
    }
  });

  const hull = mat(cfg.hullColor, { roughness: 0.55, metalness: 0.15 });
  return (
    <group
      ref={group}
      onClick={(e) => {
        e.stopPropagation();
        select({ kind: 'ship', id: cfg.id });
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        select({ kind: 'ship', id: cfg.id }, true);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHoverCursor(true);
      }}
      onPointerOut={() => setHoverCursor(false)}
    >
      <mesh geometry={geos.lower} rotation-x={-Math.PI / 2} position={[0, -2.2, 0]} material={mat('#8c2b2b', { roughness: 0.7 })} />
      <mesh geometry={geos.upper} rotation-x={-Math.PI / 2} position={[0, 0.2, 0]} material={hull} castShadow />
      <mesh geometry={geos.deck} rotation-x={-Math.PI / 2} position={[0, DECK_Y - 0.19, 0]} material={mat('#6f7b86', { roughness: 0.9 })} receiveShadow />
      <mesh geometry={boxGeo(L * 0.86, 0.12, 0.12)} position={[0, DECK_Y + 0.6, Bm / 2 - 0.3]} material={mat('#ffffff')} />
      <mesh geometry={boxGeo(L * 0.86, 0.12, 0.12)} position={[0, DECK_Y + 0.6, -Bm / 2 + 0.3]} material={mat('#ffffff')} />

      {/* Stern superstructure: accommodation block, bridge, wings and funnel */}
      <group position={[-L / 2 + 5, DECK_Y - 0.2, 0]}>
        <mesh geometry={boxGeo(6, 7, Bm * 0.8)} position={[0, 3.5, 0]} material={mat('#f4f6f8')} castShadow />
        {[1.6, 3.4, 5.2].map((y) => (
          <mesh key={y} geometry={boxGeo(6.05, 0.5, Bm * 0.82)} position={[0, y, 0]} material={mat('#2c3a4a', { roughness: 0.3 })} />
        ))}
        <mesh geometry={boxGeo(5, 1.8, Bm + 1.6)} position={[0.4, 7.9, 0]} material={mat('#f4f6f8')} castShadow />
        <mesh geometry={boxGeo(5.05, 0.7, Bm + 1.65)} position={[0.4, 8.1, 0]} material={mat('#24486e', { roughness: 0.2, metalness: 0.3 })} />
        <mesh geometry={cylGeo(1.1, 1.3, 4, 12)} position={[-1.8, 10, 0]} material={hull} castShadow />
        <mesh geometry={cylGeo(1.12, 1.12, 0.8, 12)} position={[-1.8, 11.4, 0]} material={mat('#f2b705')} />
        <mesh geometry={boxGeo(0.12, 3, 0.12)} position={[1.2, 10.3, 0]} material={mat('#dfe5ea')} />
      </group>
      <mesh geometry={boxGeo(0.25, 6, 0.25)} position={[L / 2 - 6, DECK_Y + 3, 0]} material={mat('#dfe5ea')} />

      <instancedMesh ref={cargo} args={[boxGeo(CONTAINER.length - 0.2, CONTAINER.height - 0.08, CONTAINER.width), undefined, ship.slots.length]} castShadow>
        <meshStandardMaterial roughness={0.6} metalness={0.1} />
      </instancedMesh>

      <mesh ref={wake} rotation-x={-Math.PI / 2} position={[-L / 2 - 10, 0.25, 0]}>
        <planeGeometry args={[24, Bm * 1.3]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0} depthWrite={false} />
      </mesh>

      {selected && (
        <Label position={[-L / 2 + 5, 17, 0]} text={cfg.name} border={selected ? '#22c3e6' : '#1f56a3'} height={selected ? 0.03 : 0.024} maxDistance={selected ? Infinity : 420} />
      )}
    </group>
  );
}
