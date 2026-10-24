// Procedural building types, one per system category. Each is built from shared
// unit geometries scaled into place, sized from the slot footprint `f`.
import type { ReactNode } from 'react';
import * as THREE from 'three';
import type { SystemCategory } from '@/types/domain';
import { UNIT_BOX, UNIT_CYL, windowTexture, type BuildingMats } from '../materials';

type V3 = [number, number, number];

export function B({ s, p, m, r }: { s: V3; p: V3; m: THREE.Material; r?: V3 }) {
  return <mesh geometry={UNIT_BOX} scale={s} position={p} rotation={r} material={m} castShadow receiveShadow />;
}
export function Cyl({ r, h, p, m, rot }: { r: number; h: number; p: V3; m: THREE.Material; rot?: V3 }) {
  return <mesh geometry={UNIT_CYL} scale={[r, h, r]} position={p} rotation={rot} material={m} castShadow receiveShadow />;
}

interface Props {
  f: number;
  m: BuildingMats;
}

/** Glass-fronted service office with a canopy and digital signage. */
function EService({ f, m }: Props) {
  const h = f * 0.9;
  return (
    <>
      <B s={[f, 1.2, f * 0.8]} p={[0, 0.6, 0]} m={m.dark} />
      <B s={[f * 0.92, h, f * 0.7]} p={[0, 1.2 + h / 2, -0.2]} m={m.wall(windowTexture(4, 3, 'band'))} />
      <B s={[f * 0.94, 0.5, f * 0.72]} p={[0, 1.2 + h + 0.25, -0.2]} m={m.accent} />
      <B s={[f * 0.6, 0.25, f * 0.28]} p={[0, 3, f * 0.3]} m={m.accent} />
      <B s={[f * 0.36, f * 0.22, 0.2]} p={[f * 0.2, 1.2 + h * 0.62, f * 0.15 + 0.11]} m={m.screen} />
      {[-1, 1].map((k) => (
        <Cyl key={k} r={0.12} h={3} p={[k * f * 0.26, 1.5, f * 0.42]} m={m.steel} />
      ))}
    </>
  );
}

/** Stepped processing tower with a crown and antenna. */
function CoreTower({ f, m }: Props) {
  return (
    <>
      <B s={[f * 0.95, f * 0.4, f * 0.95]} p={[0, f * 0.2, 0]} m={m.wall(windowTexture(4, 2))} />
      <B s={[f * 0.7, f * 0.8, f * 0.7]} p={[0, f * 0.4 + f * 0.4, 0]} m={m.wall(windowTexture(3, 4))} />
      <B s={[f * 0.74, 0.3, f * 0.74]} p={[0, f * 1.2, 0]} m={m.accent} />
      <B s={[f * 0.5, f * 0.4, f * 0.5]} p={[0, f * 1.2 + f * 0.2, 0]} m={m.wall(windowTexture(2, 2))} />
      <B s={[f * 0.54, f * 0.1, f * 0.54]} p={[0, f * 1.65, 0]} m={m.accent} />
      <Cyl r={0.12} h={f * 0.4} p={[0, f * 1.9, 0]} m={m.steel} />
    </>
  );
}

/** Classical treasury: plinth, colonnade, pediment and a small dome. */
function Treasury({ f, m }: Props) {
  const cols = 5;
  const h = f * 0.55;
  return (
    <>
      <B s={[f, 0.6, f * 0.85]} p={[0, 0.3, 0]} m={m.roof} />
      <B s={[f * 0.94, 0.4, f * 0.8]} p={[0, 0.8, 0]} m={m.wall()} />
      <B s={[f * 0.82, h, f * 0.55]} p={[0, 1 + h / 2, -f * 0.1]} m={m.wall(windowTexture(4, 2, 'slit'))} />
      {Array.from({ length: cols }, (_, i) => (
        <Cyl key={i} r={f * 0.035} h={h} p={[-f * 0.38 + (i * f * 0.76) / (cols - 1), 1 + h / 2, f * 0.27]} m={m.wall()} />
      ))}
      <B s={[f * 0.9, 0.35, f * 0.72]} p={[0, 1 + h + 0.17, 0]} m={m.wall()} />
      <mesh position={[0, 1 + h + 0.35 + f * 0.09, f * 0.05]} rotation={[0, 0, 0]} scale={[f * 0.48, f * 0.18, f * 0.62]} castShadow material={m.accent}>
        <cylinderGeometry args={[0, 1, 1, 4, 1]} />
      </mesh>
      <mesh position={[0, 1 + h + 0.3, -f * 0.12]} scale={f * 0.2} castShadow material={m.accent}>
        <sphereGeometry args={[1, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>
    </>
  );
}

/** Inspection hall with a saw-tooth roof and a scanning portal in front. */
function Inspection({ f, m }: Props) {
  const h = f * 0.42;
  const teeth = 4;
  return (
    <>
      <B s={[f, h, f * 0.7]} p={[0, h / 2, -f * 0.1]} m={m.wall(windowTexture(5, 1, 'band'))} />
      {Array.from({ length: teeth }, (_, i) => (
        <B key={i} s={[f / teeth, 0.2, f * 0.72]} p={[-f / 2 + (f / teeth) * (i + 0.5), h + f * 0.08, -f * 0.1]} r={[0, 0, 0.45]} m={i % 2 ? m.accent : m.glass} />
      ))}
      <B s={[0.5, f * 0.5, 0.5]} p={[-f * 0.3, f * 0.25, f * 0.4]} m={m.accent} />
      <B s={[0.5, f * 0.5, 0.5]} p={[f * 0.3, f * 0.25, f * 0.4]} m={m.accent} />
      <B s={[f * 0.66, 0.6, 0.6]} p={[0, f * 0.5, f * 0.4]} m={m.accent} />
      <B s={[f * 0.56, 0.08, 0.3]} p={[0, f * 0.45, f * 0.4]} m={m.screen} />
    </>
  );
}

/** Secure headquarters: solid block, slit windows, rooftop helipad, perimeter fence. */
function SecureHQ({ f, m }: Props) {
  const h = f * 0.85;
  const posts = 10;
  return (
    <>
      <B s={[f * 0.78, h, f * 0.62]} p={[0, h / 2, -f * 0.06]} m={m.wall(windowTexture(5, 5, 'slit'))} />
      <B s={[f * 0.82, 0.4, f * 0.66]} p={[0, h + 0.2, -f * 0.06]} m={m.dark} />
      <Cyl r={f * 0.2} h={0.08} p={[0, h + 0.45, -f * 0.06]} m={m.accent} />
      <B s={[f * 0.12, 0.05, f * 0.03]} p={[0, h + 0.5, -f * 0.06]} m={m.wall()} />
      <B s={[f * 0.2, f * 0.35, f * 0.2]} p={[f * 0.42, f * 0.175, f * 0.34]} m={m.accent} />
      {Array.from({ length: posts }, (_, i) => {
        const a = (i / posts) * Math.PI * 2;
        return <Cyl key={i} r={0.07} h={1.6} p={[Math.cos(a) * f * 0.52, 0.8, Math.sin(a) * f * 0.48]} m={m.steel} />;
      })}
      <mesh position={[0, 1.4, 0]} rotation-x={Math.PI / 2} scale={[f * 0.52, f * 0.48, 1]} material={m.steel}>
        <torusGeometry args={[1, 0.012, 4, 48]} />
      </mesh>
    </>
  );
}

/** Data centre: long low hall with rooftop cooling units and a status band. */
function DataCentre({ f, m }: Props) {
  const h = f * 0.36;
  return (
    <>
      <B s={[f, h, f * 0.62]} p={[0, h / 2, 0]} m={m.wall()} />
      <B s={[f * 1.01, h * 0.18, f * 0.63]} p={[0, h * 0.55, 0]} m={m.accent} />
      <B s={[f * 0.7, h * 0.08, 0.05]} p={[0, h * 0.55, f * 0.32]} m={m.screen} />
      {[-1, 0, 1].map((i) =>
        [-1, 1].map((j) => (
          <group key={`${i}${j}`} position={[i * f * 0.28, h, j * f * 0.15]}>
            <B s={[f * 0.2, 0.6, f * 0.2]} p={[0, 0.3, 0]} m={m.steel} />
            <Cyl r={f * 0.07} h={0.1} p={[0, 0.65, 0]} m={m.dark} />
          </group>
        )),
      )}
    </>
  );
}

/** Exchange / sorting facility: hall, twin silos and a conveyor bridge. */
function Exchange({ f, m }: Props) {
  const h = f * 0.45;
  return (
    <>
      <B s={[f * 0.62, h, f * 0.7]} p={[-f * 0.17, h / 2, 0]} m={m.wall(windowTexture(3, 2, 'band'))} />
      <B s={[f * 0.64, 0.4, f * 0.72]} p={[-f * 0.17, h + 0.2, 0]} m={m.accent} />
      {[-1, 1].map((k) => (
        <group key={k}>
          <Cyl r={f * 0.12} h={h * 1.5} p={[f * 0.34, (h * 1.5) / 2, k * f * 0.18]} m={m.wall()} />
          <Cyl r={f * 0.125} h={0.4} p={[f * 0.34, h * 1.5, k * f * 0.18]} m={m.accent} />
        </group>
      ))}
      <B s={[f * 0.3, 0.5, 0.8]} p={[f * 0.17, h * 1.1, 0]} m={m.steel} />
      <B s={[f * 0.08, f * 0.08, f * 0.6]} p={[f * 0.05, h * 0.5, 0]} m={m.screen} />
    </>
  );
}

/** Analytics observatory: drum base with a dome and a dish. */
function Analytics({ f, m }: Props) {
  const h = f * 0.45;
  return (
    <>
      <B s={[f * 0.85, h, f * 0.7]} p={[0, h / 2, 0]} m={m.wall(windowTexture(4, 2, 'band'))} />
      <Cyl r={f * 0.28} h={f * 0.2} p={[0, h + f * 0.1, 0]} m={m.accent} />
      <mesh position={[0, h + f * 0.2, 0]} scale={f * 0.28} castShadow material={m.glass}>
        <sphereGeometry args={[1, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>
      <group position={[f * 0.32, h, f * 0.22]} rotation={[-0.6, 0.6, 0]}>
        <Cyl r={0.08} h={1.2} p={[0, 0.6, 0]} m={m.steel} />
        <mesh position={[0, 1.3, 0]} scale={[f * 0.12, f * 0.05, f * 0.12]} material={m.wall()}>
          <sphereGeometry args={[1, 14, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
        </mesh>
      </group>
    </>
  );
}

/** External party: open gateway pavilion with a flag. */
function ExternalPavilion({ f, m }: Props) {
  const h = f * 0.32;
  return (
    <>
      <B s={[f * 0.8, 0.3, f * 0.6]} p={[0, 0.15, 0]} m={m.roof} />
      {[-1, 1].map((i) =>
        [-1, 1].map((j) => <Cyl key={`${i}${j}`} r={0.18} h={h} p={[i * f * 0.34, h / 2, j * f * 0.24]} m={m.steel} />),
      )}
      <B s={[f * 0.86, 0.35, f * 0.66]} p={[0, h + 0.17, 0]} m={m.accent} />
      <B s={[f * 0.3, h * 0.7, f * 0.22]} p={[0, (h * 0.7) / 2 + 0.3, -f * 0.05]} m={m.glass} />
      <Cyl r={0.08} h={h * 2.2} p={[f * 0.45, h * 1.1, f * 0.32]} m={m.steel} />
      <B s={[1.4, 0.8, 0.05]} p={[f * 0.45 + 0.7, h * 2, f * 0.32]} m={m.accent} />
    </>
  );
}

/** General two-storey office. */
function Office({ f, m }: Props) {
  const h = f * 0.6;
  return (
    <>
      <B s={[f * 0.86, h, f * 0.7]} p={[0, h / 2, 0]} m={m.wall(windowTexture(4, 2))} />
      <B s={[f * 0.9, 0.4, f * 0.74]} p={[0, h + 0.2, 0]} m={m.accent} />
      <B s={[f * 0.24, 0.8, f * 0.2]} p={[-f * 0.2, h + 0.8, 0]} m={m.steel} />
    </>
  );
}

const ARCHETYPES: Record<SystemCategory, (p: Props) => ReactNode> = {
  'Frontend / eService': EService,
  'Core Processing': CoreTower,
  Finance: Treasury,
  Compliance: Inspection,
  Enforcement: SecureHQ,
  'Data Repository': DataCentre,
  Integration: Exchange,
  Analytics: Analytics,
  'External System': ExternalPavilion,
  Other: Office,
};

const HEIGHTS: Record<SystemCategory, number> = {
  'Frontend / eService': 1.15,
  'Core Processing': 2.1,
  Finance: 0.95,
  Compliance: 0.7,
  Enforcement: 0.95,
  'Data Repository': 0.5,
  Integration: 0.72,
  Analytics: 0.8,
  'External System': 0.75,
  Other: 0.75,
};

export const archetypeHeight = (c: SystemCategory, f: number) => HEIGHTS[c] * f + 1;

export function Archetype({ category, f, m }: Props & { category: SystemCategory }) {
  const Comp = ARCHETYPES[category] ?? Office;
  return <Comp f={f} m={m} />;
}
