// One ICT system as a building: archetype by category, acronym label,
// hover highlight, click to inspect, double-click to fly the camera in.
import { memo, useMemo } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import type { SystemPlacement } from '@/lib/placement';
import { useWorld } from '@/store/world';
import { LAND_Y } from '@/data/layout';
import { buildingMats, mat, tint, type Tone } from '../materials';
import { Label } from '../Label';
import { Archetype, archetypeHeight, B } from './archetypes';

interface Props {
  placement: SystemPlacement;
  accent: string;
  tone: Tone;
  showLabel: boolean;
}

const setCursor = (c: string) => (document.body.style.cursor = c);

export const SystemBuilding = memo(function SystemBuilding({ placement, accent, tone, showLabel }: Props) {
  const { system, x, z, footprint: f } = placement;
  const m = useMemo(() => buildingMats(accent, tone), [accent, tone]);
  const select = useWorld((s) => s.select);
  const setHovered = useWorld((s) => s.setHovered);
  const height = archetypeHeight(system.category, f);

  const handlers = {
    onPointerOver: (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      setHovered(system.id);
      setCursor('pointer');
    },
    onPointerOut: () => {
      setHovered(null);
      setCursor('');
    },
    onClick: (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      select({ kind: 'system', id: system.id });
    },
    onDoubleClick: (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      select({ kind: 'system', id: system.id }, true);
    },
  };

  return (
    <group position={[x, LAND_Y + 0.25, z]} {...handlers}>
      <B s={[f * 1.12, 0.18, f * 1.12]} p={[0, 0.09, 0]} m={mat(tint(accent, '#e9edf1', 0.82), { opacity: tone === 'dim' ? 0.4 : undefined })} />
      <Archetype category={system.category} f={f} m={m} />
      {showLabel && (
        <Label
          position={[0, height + 2.2, 0]}
          text={system.acronym}
          border={accent}
          height={tone === 'highlight' ? 0.03 : 0.024}
          opacity={tone === 'dim' ? 0.45 : 1}
          maxDistance={tone === 'highlight' || tone === 'hover' ? Infinity : 260}
        />
      )}
    </group>
  );
});

/** Shown in an empty zone so administrators can place the first system. */
export function AddSystemPlaceholder({ x, z, f, zoneId, accent }: { x: number; z: number; f: number; zoneId: string; accent: string }) {
  const open = useWorld((s) => s.openAddSystem);
  const dash = mat(accent, { opacity: 0.8 });
  const n = 10;
  return (
    <group
      position={[x, LAND_Y + 0.3, z]}
      onClick={(e) => {
        e.stopPropagation();
        open(zoneId);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setCursor('pointer');
      }}
      onPointerOut={() => setCursor('')}
    >
      {Array.from({ length: n }, (_, i) => {
        const t = (i / n) * f - f / 2 + f / n / 2;
        return (
          <group key={i}>
            <B s={[f / n / 1.8, 0.12, 0.35]} p={[t, 0.06, -f / 2]} m={dash} />
            <B s={[f / n / 1.8, 0.12, 0.35]} p={[t, 0.06, f / 2]} m={dash} />
            <B s={[0.35, 0.12, f / n / 1.8]} p={[-f / 2, 0.06, t]} m={dash} />
            <B s={[0.35, 0.12, f / n / 1.8]} p={[f / 2, 0.06, t]} m={dash} />
          </group>
        );
      })}
      <B s={[f * 0.4, 0.5, f * 0.1]} p={[0, 0.3, 0]} m={mat(accent)} />
      <B s={[f * 0.1, 0.5, f * 0.4]} p={[0, 0.3, 0]} m={mat(accent)} />
      <Label position={[0, 4, 0]} text="Add system" border={accent} height={0.026} />
    </group>
  );
}
