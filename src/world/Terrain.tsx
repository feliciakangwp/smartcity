// Stylised Singapore: island and offshore islands, two container terminals,
// expressways, town blocks, trees, place names, buoys and a lighthouse.
import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useLandscape } from '@/store/landscape';
import {
  AIRPORT, CRANE, ISLANDS, LAND_Y, MAINLAND, NAV_MARKERS, PORTS, PORT_HIGHWAY, ROAD_EDGES, ROAD_NODES,
  TERMINAL_ROAD_DZ, W, YARD_ROAD_DZ, pointInPolygon, portYard, type PortSite, type V2,
} from '@/data/layout';
import { C, boxGeo, cylGeo, mat } from './materials';
import { waveHeight } from './Ocean';

export function Terrain() {
  return (
    <group>
      <LandMass poly={MAINLAND} />
      {ISLANDS.map((p, i) => (
        <LandMass key={i} poly={p} />
      ))}
      {PORTS.map((p) => (
        <PortGround key={p.id} port={p} />
      ))}
      <Roads />
      <TownsAndTrees />
      <NavMarkers />
      <Lighthouse position={[W(368, 291)[0], 0, W(368, 291)[1]]} />
    </group>
  );
}

function LandMass({ poly }: { poly: V2[] }) {
  const geo = useMemo(() => {
    const shape = new THREE.Shape(poly.map(([x, z]) => new THREE.Vector2(x, -z)));
    const g = new THREE.ExtrudeGeometry(shape, { depth: LAND_Y + 6, bevelEnabled: false });
    g.rotateX(-Math.PI / 2);
    g.translate(0, -6, 0);
    return g;
  }, [poly]);
  useLayoutEffect(() => () => geo.dispose(), [geo]);
  return <mesh geometry={geo} material={[mat('#a9cf8f', { roughness: 0.95 }), mat('#d9c9a0', { roughness: 1 })]} receiveShadow />;
}

function PortGround({ port }: { port: PortSite }) {
  const w = port.maxX - port.minX;
  const cx = (port.minX + port.maxX) / 2;
  const yard = portYard(port);
  const bollards = useRef<THREE.InstancedMesh>(null);
  const n = Math.floor(w / 8);
  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    for (let i = 0; i < n; i++) bollards.current?.setMatrixAt(i, m.makeTranslation(port.minX + 4 + i * 8, LAND_Y + 0.45, port.quayZ - 0.9));
    if (bollards.current) bollards.current.instanceMatrix.needsUpdate = true;
  }, [port, n]);
  return (
    <group>
      {/* Paved terminal */}
      <mesh position={[cx, LAND_Y + 0.03, port.quayZ - 40]} rotation-x={-Math.PI / 2} receiveShadow material={mat(C.concrete, { roughness: 0.95 })}>
        <planeGeometry args={[w, 80]} />
      </mesh>
      <mesh position={[(yard.minX + yard.maxX) / 2, LAND_Y + 0.05, (yard.minZ + yard.maxZ) / 2]} rotation-x={-Math.PI / 2} receiveShadow material={mat('#b9c0c6', { roughness: 0.95 })}>
        <planeGeometry args={[yard.maxX - yard.minX, yard.maxZ - yard.minZ]} />
      </mesh>
      {/* Quay wall, cope edge, crane rails, apron lane */}
      <mesh position={[cx, LAND_Y - 1.6, port.quayZ - 0.6]} geometry={boxGeo(1, 1, 1)} scale={[w, 3.6, 1.4]} material={mat(C.quay, { roughness: 0.9 })} />
      <mesh position={[cx, LAND_Y + 0.12, port.quayZ - 0.5]} geometry={boxGeo(1, 1, 1)} scale={[w, 0.25, 1]} material={mat('#f2c94c')} />
      {[CRANE.seaLegZ, CRANE.landLegZ].map((dz) => (
        <mesh key={dz} position={[cx, LAND_Y + 0.1, port.quayZ + dz]} geometry={boxGeo(1, 1, 1)} scale={[w, 0.12, 0.5]} material={mat(C.steel)} />
      ))}
      <mesh position={[cx, LAND_Y + 0.07, port.quayZ + CRANE.bufferZ]} geometry={boxGeo(1, 1, 1)} scale={[w - 10, 0.02, 3.4]} material={mat('#f0d36a', { roughness: 0.9, opacity: 0.55 })} />
      {/* Terminal road and yard road out to the gate */}
      {[TERMINAL_ROAD_DZ, YARD_ROAD_DZ].map((dz) => (
        <mesh key={dz} position={[cx, LAND_Y + 0.08, port.quayZ + dz]} geometry={boxGeo(1, 1, 1)} scale={[w + 6, 0.06, 7]} material={mat(C.asphalt, { roughness: 0.9 })} receiveShadow />
      ))}
      <instancedMesh ref={bollards} args={[cylGeo(0.35, 0.45, 0.9, 10), mat('#2b333b'), n]} castShadow />
    </group>
  );
}

const roadLen = ([ax, az]: V2, [bx, bz]: V2) => Math.hypot(bx - ax, bz - az);

function Roads() {
  const highway = useMemo(() => new Set(PORT_HIGHWAY.slice(1).map((n, i) => `${PORT_HIGHWAY[i]}>${n}`)), []);
  const segments = useMemo(
    () =>
      ROAD_EDGES.map(([a, b]) => ({
        a: ROAD_NODES[a],
        b: ROAD_NODES[b],
        major: highway.has(`${a}>${b}`) || highway.has(`${b}>${a}`),
      })),
    [highway],
  );
  const dashes = useMemo(() => {
    const out: THREE.Matrix4[] = [];
    for (const { a, b } of segments) {
      const len = roadLen(a, b);
      const ang = Math.atan2(-(b[1] - a[1]), b[0] - a[0]);
      for (let t = 4; t < len - 3; t += 8) {
        const f = t / len;
        out.push(
          new THREE.Matrix4().compose(
            new THREE.Vector3(a[0] + (b[0] - a[0]) * f, LAND_Y + 0.12, a[1] + (b[1] - a[1]) * f),
            new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), ang),
            new THREE.Vector3(1, 1, 1),
          ),
        );
      }
    }
    return out;
  }, [segments]);
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    dashes.forEach((m, i) => ref.current?.setMatrixAt(i, m));
    if (ref.current) ref.current.instanceMatrix.needsUpdate = true;
  }, [dashes]);
  return (
    <group>
      {segments.map(({ a, b, major }, i) => (
        <mesh
          key={i}
          position={[(a[0] + b[0]) / 2, LAND_Y + 0.07, (a[1] + b[1]) / 2]}
          rotation-y={Math.atan2(-(b[1] - a[1]), b[0] - a[0])}
          geometry={boxGeo(1, 1, 1)}
          scale={[roadLen(a, b) + 7, 0.08, major ? 9 : 7]}
          material={mat(major ? '#3a4249' : C.asphalt, { roughness: 0.9 })}
          receiveShadow
        />
      ))}
      <instancedMesh ref={ref} args={[boxGeo(3, 0.02, 0.26), mat('#f4f1e6'), Math.max(1, dashes.length)]} />
    </group>
  );
}

/** HDB-style town blocks and trees, scattered on land away from roads, plots, ports and the airport. */
function TownsAndTrees() {
  const plots = useLandscape((s) => s.plots);
  const rings = useLandscape((s) => s.platform.mapRings);
  const { blocks, trees } = useMemo(() => {
    let seed = 11;
    const r = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const open = plots.filter((p) => p.ring <= rings);
    const clearOfRoads = (x: number, z: number, m: number) =>
      ROAD_EDGES.every(([a, b]) => {
        const A = ROAD_NODES[a], B = ROAD_NODES[b];
        const l2 = (B[0] - A[0]) ** 2 + (B[1] - A[1]) ** 2;
        const t = Math.max(0, Math.min(1, ((x - A[0]) * (B[0] - A[0]) + (z - A[1]) * (B[1] - A[1])) / l2));
        return Math.hypot(x - (A[0] + t * (B[0] - A[0])), z - (A[1] + t * (B[1] - A[1]))) > m;
      });
    const free = (x: number, z: number, m: number) =>
      pointInPolygon([x, z], MAINLAND) &&
      pointInPolygon([x + m, z], MAINLAND) && pointInPolygon([x - m, z], MAINLAND) &&
      pointInPolygon([x, z + m], MAINLAND) && pointInPolygon([x, z - m], MAINLAND) &&
      clearOfRoads(x, z, m + 5) &&
      open.every((p) => Math.abs(x - p.x) > p.width / 2 + m + 9 || Math.abs(z - p.z) > p.depth / 2 + m + 9) &&
      PORTS.every((p) => x < p.minX - m - 6 || x > p.maxX + m + 6 || z < p.quayZ - 86 - m) &&
      !(x > AIRPORT.terminal.x - AIRPORT.terminal.w - 10 && z > -90 && z < 60);
    const blocks: { x: number; z: number; w: number; d: number; h: number; tint: number }[] = [];
    const trees: [number, number, number][] = [];
    for (let i = 0; i < 9000 && (blocks.length < 340 || trees.length < 520); i++) {
      const x = -430 + r() * 860;
      const z = -190 + r() * 340;
      // Denser towns near expressway nodes.
      const nearTown = Object.values(ROAD_NODES).some(([nx, nz]) => Math.hypot(nx - x, nz - z) < 55);
      if (blocks.length < 340 && nearTown && r() < 0.6) {
        const w = 5 + r() * 4;
        const d = 4.5 + r() * 3.5;
        if (free(x, z, Math.max(w, d) / 2 + 1)) blocks.push({ x, z, w, d, h: 3 + r() * 8, tint: r() });
      } else if (trees.length < 520 && free(x, z, 2)) trees.push([x, z, 0.8 + r() * 0.7]);
    }
    return { blocks, trees };
  }, [plots, rings]);

  const body = useRef<THREE.InstancedMesh>(null);
  const roof = useRef<THREE.InstancedMesh>(null);
  const trunks = useRef<THREE.InstancedMesh>(null);
  const crowns = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const col = new THREE.Color();
    const roofs = ['#e2574c', '#2f7fe0', '#23a35a', '#e9b414', '#7c5ce0'];
    blocks.forEach((b, i) => {
      body.current?.setMatrixAt(i, m.compose(new THREE.Vector3(b.x, LAND_Y + b.h / 2, b.z), q, new THREE.Vector3(b.w, b.h, b.d)));
      body.current?.setColorAt(i, col.set(b.tint < 0.5 ? '#f3efe6' : '#e6edf2'));
      roof.current?.setMatrixAt(i, m.compose(new THREE.Vector3(b.x, LAND_Y + b.h + 0.3, b.z), q, new THREE.Vector3(b.w + 0.3, 0.6, b.d + 0.3)));
      roof.current?.setColorAt(i, col.set(roofs[Math.floor(b.tint * roofs.length)]));
    });
    trees.forEach(([x, z, s], i) => {
      trunks.current?.setMatrixAt(i, m.compose(new THREE.Vector3(x, LAND_Y + s, z), q, new THREE.Vector3(s, s, s)));
      crowns.current?.setMatrixAt(i, m.compose(new THREE.Vector3(x, LAND_Y + 3.2 * s, z), q, new THREE.Vector3(s, s, s)));
    });
    for (const r of [body, roof, trunks, crowns]) {
      if (!r.current) continue;
      r.current.instanceMatrix.needsUpdate = true;
      if (r.current.instanceColor) r.current.instanceColor.needsUpdate = true;
    }
  }, [blocks, trees]);
  return (
    <group key={`${blocks.length}-${trees.length}`}>
      <instancedMesh ref={body} args={[boxGeo(1, 1, 1), undefined, Math.max(1, blocks.length)]} castShadow receiveShadow>
        <meshStandardMaterial roughness={0.8} />
      </instancedMesh>
      <instancedMesh ref={roof} args={[boxGeo(1, 1, 1), undefined, Math.max(1, blocks.length)]}>
        <meshStandardMaterial roughness={0.7} />
      </instancedMesh>
      <instancedMesh ref={trunks} args={[cylGeo(0.22, 0.3, 2, 6), mat('#7a5a3a'), Math.max(1, trees.length)]} castShadow />
      <instancedMesh ref={crowns} args={[new THREE.IcosahedronGeometry(1.9, 1), mat('#4f9b57', { roughness: 0.9 }), Math.max(1, trees.length)]} castShadow />
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
