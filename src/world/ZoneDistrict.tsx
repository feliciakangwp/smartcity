// A zone: coloured district slab on its plot, landmark props in the front
// strip, one building per system, and the zone name.
import { memo } from 'react';
import type { ZoneLayout, SystemPlacement } from '@/lib/placement';
import { slotGrid } from '@/lib/placement';
import { useWorld } from '@/store/world';
import { LAND_Y } from '@/data/layout';
import { mat, tint, UNIT_BOX, type Tone } from './materials';
import { Label } from './Label';
import { ZoneLandmark } from './zoneThemes';
import { AddSystemPlaceholder, SystemBuilding } from './buildings/SystemBuilding';

interface Props {
  layout: ZoneLayout;
  placements: SystemPlacement[];
  dimmed: boolean;
  selected: boolean;
  tones: Record<string, Tone>;
  showLabels: boolean;
}

export const ZoneDistrict = memo(function ZoneDistrict({ layout, placements, dimmed, selected, tones, showLabels }: Props) {
  const { zone, plot, width: w, depth: d, frontStrip } = layout;
  const select = useWorld((s) => s.select);
  const base = dimmed ? tint(zone.color, '#c7ced6', 0.85) : tint(zone.color, '#ffffff', selected ? 0.6 : 0.72);
  const kerb = dimmed ? tint(zone.color, '#aab4bf', 0.6) : zone.color;
  const grid = slotGrid(Math.max(1, placements.length), layout);

  return (
    <group>
      <group position={[plot.x, LAND_Y, plot.z]}>
        <mesh
          geometry={UNIT_BOX}
          scale={[w, 0.25, d]}
          position={[0, 0.125, 0]}
          material={mat(base, { roughness: 0.9 })}
          receiveShadow
          onClick={(e) => {
            e.stopPropagation();
            select({ kind: 'zone', id: zone.id }, true);
          }}
          onPointerOver={(e) => {
            e.stopPropagation();
            document.body.style.cursor = 'pointer';
          }}
          onPointerOut={() => (document.body.style.cursor = '')}
        />
        {[
          [0, d / 2, w, 0.7],
          [0, -d / 2, w, 0.7],
          [w / 2, 0, 0.7, d],
          [-w / 2, 0, 0.7, d],
        ].map(([x, z, sx, sz], i) => (
          <mesh key={i} geometry={UNIT_BOX} position={[x, 0.3, z]} scale={[sx, 0.45, sz]} material={mat(kerb)} castShadow />
        ))}
        <group position={[0, 0.25, d / 2 - frontStrip / 2 - 0.5]}>
          <ZoneLandmark theme={zone.theme} w={w - 4} d={frontStrip - 1} color={zone.color} dim={dimmed} />
        </group>
        {showLabels && (
          <Label
            position={[0, 15, d / 2 - 2]}
            text={zone.name}
            sub={`${placements.length} system${placements.length === 1 ? '' : 's'}`}
            border={zone.color}
            size="lg"
            height={selected ? 0.04 : 0.03}
            opacity={dimmed ? 0.5 : 1}
          />
        )}
      </group>
      {placements.map((p) => (
        <SystemBuilding key={p.system.id} placement={p} accent={zone.color} tone={tones[p.system.id] ?? 'normal'} showLabel={showLabels} />
      ))}
      {placements.length === 0 && (
        <AddSystemPlaceholder
          x={plot.x + grid.center(1).x}
          z={plot.z + grid.center(1).z}
          f={grid.footprint}
          zoneId={zone.id}
          accent={zone.color}
        />
      )}
    </group>
  );
});
