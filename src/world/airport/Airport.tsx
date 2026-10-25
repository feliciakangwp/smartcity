// Changi Airport: runways, terminal, control tower, aircraft on the timetable,
// and travellers walking from the gates through the Traveller Checkpoint.
import { useLayoutEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { AIRPORT, LAND_Y } from '@/data/layout';
import { boxGeo, cylGeo, mat } from '../materials';
import { Label } from '../Label';
import { useAirport } from '../maritime/SimContext';

export function Airport() {
  return (
    <group>
      <AirportGround />
      <Planes />
      <Travellers />
    </group>
  );
}

function AirportGround() {
  const marks = useRef<THREE.InstancedMesh>(null);
  const dashes: [number, number][] = [];
  for (const r of AIRPORT.runways) for (let z = r.north + 8; z < r.south - 6; z += 9) dashes.push([r.x, z]);
  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    dashes.forEach(([x, z], i) => marks.current?.setMatrixAt(i, m.makeTranslation(x, LAND_Y + 0.12, z)));
    if (marks.current) marks.current.instanceMatrix.needsUpdate = true;
  });
  const t = AIRPORT.terminal;
  const a = AIRPORT.apron;
  return (
    <group>
      {/* Runways with centre-line dashes and threshold bars */}
      {AIRPORT.runways.map((r) => (
        <group key={r.x}>
          <mesh position={[r.x, LAND_Y + 0.06, (r.north + r.south) / 2]} geometry={boxGeo(1, 1, 1)} scale={[11, 0.08, r.south - r.north + 8]} material={mat('#3b4148', { roughness: 0.9 })} receiveShadow />
          {[r.south + 1, r.north - 1].map((z) =>
            [-3.5, -1.5, 1.5, 3.5].map((dx) => <mesh key={`${z}${dx}`} position={[r.x + dx, LAND_Y + 0.12, z]} geometry={boxGeo(1, 0.02, 5)} material={mat('#f4f1e6')} />),
          )}
        </group>
      ))}
      <instancedMesh ref={marks} args={[boxGeo(0.35, 0.02, 4), mat('#f4f1e6'), dashes.length]} />
      {/* Taxiway and apron */}
      <mesh position={[(AIRPORT.runways[0].x + a.maxX) / 2, LAND_Y + 0.05, (a.minZ + AIRPORT.runways[0].south + 8) / 2]} geometry={boxGeo(1, 1, 1)} scale={[AIRPORT.runways[1].x - a.maxX + 6, 0.06, AIRPORT.runways[0].south + 8 - a.minZ + 6]} material={mat('#58616a', { roughness: 0.95 })} receiveShadow />
      <mesh position={[(a.minX + a.maxX) / 2, LAND_Y + 0.07, (a.minZ + a.maxZ) / 2]} geometry={boxGeo(1, 1, 1)} scale={[a.maxX - a.minX, 0.06, a.maxZ - a.minZ]} material={mat('#c3c8cc', { roughness: 0.95 })} receiveShadow />
      {/* Terminal: long glass hall with a wave roof, jet bridges and control tower */}
      <mesh position={[t.x, LAND_Y + 4, t.z]} geometry={boxGeo(t.w, 8, t.d)} material={mat('#9fc8e6', { roughness: 0.15, metalness: 0.3 })} castShadow />
      <mesh position={[t.x, LAND_Y + 8.6, t.z]} geometry={boxGeo(t.w + 3, 1.2, t.d + 4)} material={mat('#f3f6f9')} castShadow />
      {[t.z - t.d / 3, t.z, t.z + t.d / 3].map((z) => (
        <mesh key={z} position={[t.x, LAND_Y + 9.6, z]} rotation-z={Math.PI / 2} geometry={cylGeo(3.2, 3.2, t.w + 3, 20)} scale={[1, 1, 0.35]} material={mat('#e6edf2')} castShadow />
      ))}
      {AIRPORT.gates.map((g) => (
        <mesh key={g.z} position={[(t.x + t.w / 2 + g.x - 6) / 2, LAND_Y + 3.6, g.z]} geometry={boxGeo(g.x - 6 - (t.x + t.w / 2), 2.2, 2.2)} material={mat('#dfe5ea')} castShadow />
      ))}
      <group position={[t.x - 4, LAND_Y, t.z + t.d / 2 + 12]}>
        <mesh position={[0, 11, 0]} geometry={cylGeo(1.4, 2, 22, 14)} material={mat('#e6edf2')} castShadow />
        <mesh position={[0, 23.5, 0]} geometry={cylGeo(4, 3, 3, 14)} material={mat('#2c4a63', { roughness: 0.2, metalness: 0.3 })} castShadow />
        <mesh position={[0, 25.6, 0]} geometry={cylGeo(4.4, 4.4, 1.2, 14)} material={mat('#f3f6f9')} />
      </group>
      <Label position={[t.x, 30, t.z]} text="Changi Airport" border="#1f56a3" height={0.032} />
    </group>
  );
}

/** Narrow-body airliner, nose along +x so it shares the heading convention of ships and trucks. */
function PlaneModel({ livery }: { livery: string }) {
  const white = mat('#f5f7fa', { roughness: 0.4 });
  const tail = mat(livery, { roughness: 0.4 });
  return (
    <group scale={1.1}>
      <mesh rotation-z={Math.PI / 2} geometry={cylGeo(1.1, 1.1, 13, 14)} material={white} castShadow />
      <mesh position={[7, 0, 0]} rotation-z={-Math.PI / 2} geometry={new THREE.ConeGeometry(1.1, 2.4, 14)} material={white} castShadow />
      <mesh position={[-7.2, 0.4, 0]} rotation-z={Math.PI / 2} geometry={new THREE.ConeGeometry(1.05, 2.2, 14)} material={white} />
      <mesh position={[0.5, -0.2, 0]} geometry={boxGeo(3.2, 0.25, 15)} material={white} castShadow />
      <mesh position={[-6.6, 2.2, 0]} geometry={boxGeo(2.4, 3.6, 0.25)} material={tail} castShadow />
      <mesh position={[-6.8, 0.5, 0]} geometry={boxGeo(1.6, 0.18, 5.4)} material={white} />
      {[-3.6, 3.6].map((z) => (
        <mesh key={z} position={[1.4, -0.9, z]} rotation-z={Math.PI / 2} geometry={cylGeo(0.55, 0.55, 2.2, 10)} material={mat('#c9d1d8')} />
      ))}
      <mesh position={[2, 0.35, 0]} geometry={boxGeo(8, 0.25, 2.25)} material={tail} />
    </group>
  );
}

function Planes() {
  const air = useAirport();
  const refs = useRef<(THREE.Group | null)[]>([]);
  useFrame(() => {
    air.planes.forEach((p, i) => {
      const g = refs.current[i];
      if (!g) return;
      g.visible = p.state !== 'gone';
      if (!g.visible) return;
      g.position.set(p.x, LAND_Y + 1.6 + p.y, p.z);
      g.rotation.set(0, p.heading, p.pitch * (p.state === 'approach' ? -1 : 1), 'YXZ');
    });
  });
  return (
    <>
      {air.planes.map((p, i) => (
        <group key={p.id} ref={(el) => (refs.current[i] = el)} visible={false}>
          <PlaneModel livery={p.livery} />
        </group>
      ))}
    </>
  );
}

const _m = new THREE.Matrix4();
const _c = new THREE.Color();
const HIDDEN = new THREE.Matrix4().makeScale(0, 0, 0);

function Travellers() {
  const air = useAirport();
  const bodies = useRef<THREE.InstancedMesh>(null);
  const heads = useRef<THREE.InstancedMesh>(null);
  useFrame(({ clock }) => {
    const b = bodies.current;
    const h = heads.current;
    if (!b || !h) return;
    air.travellers.forEach((t, i) => {
      if (!t.active) {
        b.setMatrixAt(i, HIDDEN);
        h.setMatrixAt(i, HIDDEN);
        return;
      }
      const bob = t.wait > 0 ? 0 : Math.abs(Math.sin(clock.elapsedTime * 7 + i)) * 0.1;
      b.setMatrixAt(i, _m.makeTranslation(t.x, LAND_Y + 0.85 + bob, t.z));
      b.setColorAt(i, _c.setHex(t.color));
      h.setMatrixAt(i, _m.makeTranslation(t.x, LAND_Y + 1.75 + bob, t.z));
    });
    b.instanceMatrix.needsUpdate = true;
    h.instanceMatrix.needsUpdate = true;
    if (b.instanceColor) b.instanceColor.needsUpdate = true;
  });
  const n = air.travellers.length;
  return (
    <>
      <instancedMesh ref={bodies} args={[cylGeo(0.32, 0.38, 1.3, 8), undefined, n]} castShadow frustumCulled={false}>
        <meshStandardMaterial roughness={0.7} />
      </instancedMesh>
      <instancedMesh ref={heads} args={[new THREE.SphereGeometry(0.28, 10, 8), mat('#e8b896'), n]} frustumCulled={false} />
    </>
  );
}
