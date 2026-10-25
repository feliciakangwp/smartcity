// Division usage relationships: which divisions use a system. Drawn as flowing
// dashed light trails in the using division's colour, with a pulsing ring on
// that zone. Deliberately distinct from integration arcs (solid, data-type colours):
// a division using a system is not an integration.
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { QuadraticBezierLine } from '@react-three/drei';
import * as THREE from 'three';
import { useLandscape } from '@/store/landscape';
import { useWorld } from '@/store/world';
import { activeSystems, matchesFilter, usingDivisions } from '@/lib/metrics';
import { LAND_Y } from '@/data/layout';
import { useWorldLayout } from './useWorldLayout';

interface Trail {
  key: string;
  start: [number, number, number];
  end: [number, number, number];
  mid: [number, number, number];
  color: string;
  strong: boolean;
}

export function UsageLines() {
  const selection = useWorld((s) => s.selection);
  const showAll = useWorld((s) => s.showCrossDivision);
  const filter = useWorld((s) => s.systemFilter);
  const moduleId = useWorld((s) => s.selectedModuleId);
  const systems = useLandscape((s) => s.systems);
  const zones = useLandscape((s) => s.zones);
  const { layouts, placements } = useWorldLayout();

  const selectedId = selection?.kind === 'system' ? selection.id : null;

  const { trails, rings } = useMemo(() => {
    const layoutById = new Map(layouts.map((l) => [l.zone.id, l]));
    const trails: Trail[] = [];
    const rings = new Map<string, { x: number; z: number; color: string; r: number }>();
    for (const s of activeSystems(systems, zones)) {
      const mine = s.id === selectedId;
      if (!mine && !(showAll && matchesFilter(s, zones, filter === 'all' ? 'shared' : filter))) continue;
      const p = placements.get(s.id);
      if (!p) continue;
      for (const zid of usingDivisions(s, zones, mine ? moduleId : null)) {
        const l = layoutById.get(zid);
        if (!l) continue;
        if (mine) rings.set(zid, { x: l.plot.x, z: l.plot.z, color: l.zone.color, r: Math.min(l.width, l.depth) * 0.42 });
        if (zid === s.zoneId) continue; // the building already stands in this zone
        const dist = Math.hypot(l.plot.x - p.x, l.plot.z - p.z);
        trails.push({
          key: `${s.id}:${zid}`,
          start: [p.x, LAND_Y + 6, p.z],
          end: [l.plot.x, LAND_Y + 1.5, l.plot.z],
          mid: [(p.x + l.plot.x) / 2, LAND_Y + 10 + dist * 0.12, (p.z + l.plot.z) / 2],
          color: l.zone.color,
          strong: mine,
        });
      }
    }
    return { trails, rings: [...rings.entries()] };
  }, [systems, zones, layouts, placements, selectedId, showAll, filter, moduleId]);

  return (
    <>
      {trails.map((t) => (
        <Trail key={t.key} t={t} />
      ))}
      {rings.map(([id, r]) => (
        <UsageRing key={id} {...r} />
      ))}
    </>
  );
}

function Trail({ t }: { t: Trail }) {
  // drei's line exposes a LineMaterial whose dashOffset we animate to make the trail flow.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ref = useRef<any>(null);
  useFrame((_, dt) => {
    const m = ref.current?.material;
    if (m) m.dashOffset -= dt * (t.strong ? 6 : 3);
  });
  return (
    <QuadraticBezierLine
      ref={ref}
      start={t.start}
      end={t.end}
      mid={t.mid}
      color={t.color}
      lineWidth={t.strong ? 3.2 : 1.6}
      dashed
      dashSize={1.6}
      gapSize={1.1}
      transparent
      opacity={t.strong ? 0.95 : 0.55}
      depthWrite={false}
    />
  );
}

function UsageRing({ x, z, color, r }: { x: number; z: number; color: string; r: number }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    const m = ref.current;
    if (!m) return;
    const k = (clock.elapsedTime * 0.6) % 1;
    m.scale.setScalar(0.55 + k * 0.45);
    (m.material as THREE.MeshBasicMaterial).opacity = 0.75 * (1 - k);
  });
  return (
    <mesh ref={ref} position={[x, LAND_Y + 0.45, z]} rotation-x={-Math.PI / 2}>
      <ringGeometry args={[r * 0.92, r, 64]} />
      <meshBasicMaterial color={color} transparent depthWrite={false} />
    </mesh>
  );
}
