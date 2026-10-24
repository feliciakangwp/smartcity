// Land mass, quay wall, terminal paving, roads, breakwater, lighthouse and trees.
import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useLandscape } from '@/store/landscape';
import { CRANE, LAND_Y, NAV_MARKERS, TERMINAL, YARD, landBounds, roadNetwork } from '@/data/layout';
import { C, boxGeo, cylGeo, mat } from './materials';
import { waveHeight } from './Ocean';

export function Terrain() {
  const plots = useLandscape((s) => s.plots);
  const rings = useLandscape((s) => s.platform.mapRings);
  const bounds = useMemo(() => landBounds(plots, rings), [plots, rings]);
  const roads = useMemo(() => roadNetwork(plots, rings), [plots, rings]);
  const w = bounds.maxX - bounds.minX;
  const d = bounds.maxZ - bounds.minZ;
  const cx = (bounds.minX + bounds.maxX) / 2;
  const cz = (bounds.minZ + bounds.maxZ) / 2;

  return (
    <group>
      {/* Land block and seawall */}
      <mesh position={[cx, LAND_Y / 2 - 3, cz]} geometry={boxGeo(1, 1, 1)} scale={[w, LAND_Y + 6, d]} material={mat('#d5dbd6')} receiveShadow />
      <mesh position={[cx, LAND_Y - 1.6, -0.6]} geometry={boxGeo(1, 1, 1)} scale={[w, 3.6, 1.4]} material={mat(C.quay, { roughness: 0.9 })} />
      {/* Grass under the zone districts */}
      <mesh position={[(bounds.minX + -8) / 2, LAND_Y + 0.01, cz]} rotation-x={-Math.PI / 2} receiveShadow material={mat(C.grass)}>
        <planeGeometry args={[-8 - bounds.minX - 4, d - 4]} />
      </mesh>
      {/* Terminal paving */}
      <mesh position={[(TERMINAL.minX + TERMINAL.maxX) / 2 + 2, LAND_Y + 0.02, (TERMINAL.minZ + 0) / 2]} rotation-x={-Math.PI / 2} receiveShadow material={mat(C.concrete, { roughness: 0.95 })}>
        <planeGeometry args={[TERMINAL.maxX - TERMINAL.minX - 4, -TERMINAL.minZ - 1]} />
      </mesh>
      <mesh position={[(YARD.minX + YARD.maxX) / 2, LAND_Y + 0.03, (YARD.minZ + YARD.maxZ) / 2]} rotation-x={-Math.PI / 2} receiveShadow material={mat('#b9c0c6', { roughness: 0.95 })}>
        <planeGeometry args={[YARD.maxX - YARD.minX, YARD.maxZ - YARD.minZ]} />
      </mesh>
      {/* Crane rails */}
      {[CRANE.seaLegZ, CRANE.landLegZ].map((z) => (
        <mesh key={z} position={[(TERMINAL.minX + TERMINAL.maxX) / 2, LAND_Y + 0.08, z]} geometry={boxGeo(1, 1, 1)} scale={[TERMINAL.maxX - TERMINAL.minX, 0.12, 0.5]} material={mat(C.steel)} />
      ))}
      {/* Apron lane markings */}
      <mesh position={[(TERMINAL.minX + TERMINAL.maxX) / 2, LAND_Y + 0.05, CRANE.bufferZ]} geometry={boxGeo(1, 1, 1)} scale={[TERMINAL.maxX - TERMINAL.minX - 10, 0.02, 3.4]} material={mat('#f0d36a', { roughness: 0.9, opacity: 0.55 })} />
      <QuayEdge minX={TERMINAL.minX} maxX={TERMINAL.maxX} />
      <Promenade minX={bounds.minX + 2} maxX={TERMINAL.minX - 1} />
      <Roads roads={roads} />
      <Trees bounds={bounds} />
      <Breakwater />
      <NavMarkers />
    </group>
  );
}

function QuayEdge({ minX, maxX }: { minX: number; maxX: number }) {
  const bollards = useRef<THREE.InstancedMesh>(null);
  const fenders = useRef<THREE.InstancedMesh>(null);
  const n = Math.floor((maxX - minX) / 8);
  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    for (let i = 0; i < n; i++) {
      const x = minX + 4 + i * 8;
      bollards.current?.setMatrixAt(i, m.makeTranslation(x, LAND_Y + 0.45, -0.9));
      fenders.current?.setMatrixAt(i, m.makeTranslation(x + 4, LAND_Y - 1.2, 0.25));
    }
    if (bollards.current) bollards.current.instanceMatrix.needsUpdate = true;
    if (fenders.current) fenders.current.instanceMatrix.needsUpdate = true;
  }, [minX, n]);
  return (
    <>
      <mesh position={[(minX + maxX) / 2, LAND_Y + 0.12, -0.5]} geometry={boxGeo(1, 1, 1)} scale={[maxX - minX, 0.25, 1]} material={mat('#f2c94c')} />
      <instancedMesh ref={bollards} args={[cylGeo(0.35, 0.45, 0.9, 10), mat('#2b333b'), n]} castShadow />
      <instancedMesh ref={fenders} args={[boxGeo(1.6, 2.2, 0.6), mat('#1d2228', { roughness: 0.95 }), n]} />
    </>
  );
}

function Promenade({ minX, maxX }: { minX: number; maxX: number }) {
  const posts = useRef<THREE.InstancedMesh>(null);
  const n = Math.max(1, Math.floor((maxX - minX) / 4));
  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    for (let i = 0; i < n; i++) posts.current?.setMatrixAt(i, m.makeTranslation(minX + i * 4, LAND_Y + 0.6, -0.8));
    if (posts.current) posts.current.instanceMatrix.needsUpdate = true;
  }, [minX, n]);
  return (
    <>
      <mesh position={[(minX + maxX) / 2, LAND_Y + 0.03, -2.6]} rotation-x={-Math.PI / 2} receiveShadow material={mat('#e6dccb')}>
        <planeGeometry args={[maxX - minX, 4]} />
      </mesh>
      <mesh position={[(minX + maxX) / 2, LAND_Y + 1.15, -0.8]} geometry={boxGeo(1, 1, 1)} scale={[maxX - minX, 0.1, 0.1]} material={mat('#ffffff')} />
      <instancedMesh ref={posts} args={[boxGeo(0.12, 1.2, 0.12), mat('#ffffff'), n]} />
    </>
  );
}

function Roads({ roads }: { roads: ReturnType<typeof roadNetwork> }) {
  const dashes = useMemo(() => {
    const out: THREE.Matrix4[] = [];
    for (const r of roads) {
      const [x1, z1] = r.from;
      const [x2, z2] = r.to;
      const len = Math.hypot(x2 - x1, z2 - z1);
      const ang = Math.atan2(-(z2 - z1), x2 - x1);
      for (let t = 4; t < len - 2; t += 7) {
        const f = t / len;
        const m = new THREE.Matrix4().compose(
          new THREE.Vector3(x1 + (x2 - x1) * f, LAND_Y + 0.07, z1 + (z2 - z1) * f),
          new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), ang),
          new THREE.Vector3(1, 1, 1),
        );
        out.push(m);
      }
    }
    return out;
  }, [roads]);
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    dashes.forEach((m, i) => ref.current?.setMatrixAt(i, m));
    if (ref.current) ref.current.instanceMatrix.needsUpdate = true;
  }, [dashes]);
  return (
    <group>
      {roads.map((r, i) => {
        const [x1, z1] = r.from;
        const [x2, z2] = r.to;
        const len = Math.hypot(x2 - x1, z2 - z1) + r.width;
        return (
          <mesh
            key={i}
            position={[(x1 + x2) / 2, LAND_Y + 0.05, (z1 + z2) / 2]}
            rotation-y={Math.atan2(-(z2 - z1), x2 - x1)}
            geometry={boxGeo(1, 1, 1)}
            scale={[len, 0.06, r.width]}
            material={mat(C.asphalt, { roughness: 0.9 })}
            receiveShadow
          />
        );
      })}
      <instancedMesh key={dashes.length} ref={ref} args={[boxGeo(2.6, 0.02, 0.22), mat('#f4f1e6'), Math.max(1, dashes.length)]} />
    </group>
  );
}

function Trees({ bounds }: { bounds: ReturnType<typeof landBounds> }) {
  const spots = useMemo(() => {
    const out: [number, number, number][] = [];
    let seed = 7;
    const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    // Along the promenade and the inland edge of the port.
    for (let x = bounds.minX + 6; x < -14; x += 7 + r() * 4) out.push([x, -5.2, 0.8 + r() * 0.5]);
    for (let x = bounds.minX + 6; x < bounds.maxX - 6; x += 8 + r() * 5) out.push([x, bounds.minZ + 4 + r() * 2, 0.9 + r() * 0.6]);
    for (let z = bounds.minZ + 8; z < -10; z += 8 + r() * 4) out.push([bounds.minX + 3 + r() * 2, z, 0.9 + r() * 0.5]);
    return out;
  }, [bounds]);
  const trunks = useRef<THREE.InstancedMesh>(null);
  const crowns = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    spots.forEach(([x, z, s], i) => {
      trunks.current?.setMatrixAt(i, m.compose(new THREE.Vector3(x, LAND_Y + 1 * s, z), new THREE.Quaternion(), new THREE.Vector3(s, s, s)));
      crowns.current?.setMatrixAt(i, m.compose(new THREE.Vector3(x, LAND_Y + 3.2 * s, z), new THREE.Quaternion(), new THREE.Vector3(s, s, s)));
    });
    if (trunks.current) trunks.current.instanceMatrix.needsUpdate = true;
    if (crowns.current) crowns.current.instanceMatrix.needsUpdate = true;
  }, [spots]);
  return (
    <group key={spots.length}>
      <instancedMesh ref={trunks} args={[cylGeo(0.22, 0.3, 2, 6), mat('#7a5a3a'), spots.length]} castShadow />
      <instancedMesh ref={crowns} args={[new THREE.IcosahedronGeometry(1.9, 1), mat('#4f9b57', { roughness: 0.9 }), spots.length]} castShadow />
    </group>
  );
}

function Breakwater() {
  const blocks = useMemo(() => {
    const out: [number, number, number][] = [];
    for (let i = 0; i < 26; i++) {
      const t = i / 25;
      out.push([226 + t * 24, -1 + t * 96, 1.2 + ((i * 37) % 7) * 0.12]);
    }
    return out;
  }, []);
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    blocks.forEach(([x, z, s], i) =>
      ref.current?.setMatrixAt(i, m.compose(new THREE.Vector3(x, 0.6, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(i, i * 2, 0)), new THREE.Vector3(4 * s, 3 * s, 4 * s))),
    );
    if (ref.current) ref.current.instanceMatrix.needsUpdate = true;
  }, [blocks]);
  return (
    <group>
      <instancedMesh ref={ref} args={[new THREE.DodecahedronGeometry(1, 0), mat('#9aa1a6', { roughness: 1 }), blocks.length]} castShadow receiveShadow />
      <Lighthouse position={[250, 0, 96]} />
    </group>
  );
}

function Lighthouse({ position }: { position: [number, number, number] }) {
  const lamp = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (lamp.current) (lamp.current.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.6 + Math.max(0, Math.sin(clock.elapsedTime * 2.2)) * 1.4;
  });
  return (
    <group position={position}>
      <mesh position={[0, 2, 0]} geometry={cylGeo(4, 4.5, 3, 16)} material={mat('#8e979d')} castShadow />
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} position={[0, 5 + i * 3, 0]} geometry={cylGeo(1.9 - i * 0.12, 2 - i * 0.12, 3, 16)} material={mat(i % 2 ? '#d33a33' : '#ffffff')} castShadow />
      ))}
      <mesh ref={lamp} position={[0, 17.2, 0]} geometry={cylGeo(1.3, 1.3, 1.6, 12)}>
        <meshStandardMaterial color="#fff6c8" emissive="#ffd66b" emissiveIntensity={1} />
      </mesh>
      <mesh position={[0, 18.6, 0]} geometry={new THREE.ConeGeometry(1.7, 1.4, 12)} material={mat('#2b333b')} />
    </group>
  );
}

function NavMarkers() {
  const refs = useRef<(THREE.Group | null)[]>([]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    NAV_MARKERS.forEach((m, i) => {
      const g = refs.current[i];
      if (!g) return;
      g.position.y = waveHeight(m.x, m.z, t) * 0.9;
      g.rotation.z = Math.sin(t * 1.3 + i) * 0.08;
    });
  });
  return (
    <>
      {NAV_MARKERS.map((m, i) => (
        <group key={i} ref={(el) => (refs.current[i] = el)} position={[m.x, 0, m.z]}>
          <mesh position={[0, 0.4, 0]} geometry={cylGeo(1.1, 1.4, 1.4, 12)} material={mat(m.color === 'red' ? '#d43b36' : '#22a05a')} />
          <mesh position={[0, 2.2, 0]} geometry={m.color === 'red' ? cylGeo(0.6, 0.6, 2.4, 10) : new THREE.ConeGeometry(0.8, 2.4, 10)} material={mat(m.color === 'red' ? '#d43b36' : '#22a05a')} />
          <mesh position={[0, 3.7, 0]} geometry={cylGeo(0.28, 0.28, 0.5, 8)}>
            <meshStandardMaterial color="#ffffff" emissive={m.color === 'red' ? '#ff4a3d' : '#46e07c'} emissiveIntensity={1.2} />
          </mesh>
        </group>
      ))}
    </>
  );
}
