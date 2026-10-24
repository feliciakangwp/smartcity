// Static integration arcs between buildings, coloured by data type.
// (Animated data containers and journey playback arrive in Phase 3.)
import { useMemo } from 'react';
import { QuadraticBezierLine } from '@react-three/drei';
import { useLandscape } from '@/store/landscape';
import { useWorld } from '@/store/world';
import { activeIntegrations, activeSystems } from '@/lib/metrics';
import { DATA_TYPE_COLORS } from '@/types/domain';
import { LAND_Y } from '@/data/layout';
import { useWorldLayout } from './useWorldLayout';

export function IntegrationLines() {
  const showLines = useWorld((s) => s.showLines);
  const selection = useWorld((s) => s.selection);
  const impactId = useWorld((s) => s.impactSystemId);
  const integrations = useLandscape((s) => s.integrations);
  const systems = useLandscape((s) => s.systems);
  const zones = useLandscape((s) => s.zones);
  const { placements } = useWorldLayout();

  const focusId = impactId ?? (selection?.kind === 'system' ? selection.id : null);

  const lines = useMemo(() => {
    const live = activeIntegrations(integrations, activeSystems(systems, zones));
    return live
      .filter((i) => showLines || (focusId && (i.sourceId === focusId || i.destinationId === focusId)))
      .map((i) => {
        const a = placements.get(i.sourceId);
        const b = placements.get(i.destinationId);
        if (!a || !b) return null;
        const dist = Math.hypot(b.x - a.x, b.z - a.z);
        return {
          id: i.id,
          start: [a.x, LAND_Y + 10, a.z] as [number, number, number],
          end: [b.x, LAND_Y + 10, b.z] as [number, number, number],
          mid: [(a.x + b.x) / 2, LAND_Y + 18 + dist * 0.22, (a.z + b.z) / 2] as [number, number, number],
          color: DATA_TYPE_COLORS[i.dataType],
          dashed: i.status === 'Planned',
          emphasised: focusId !== null && (i.sourceId === focusId || i.destinationId === focusId),
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
  }, [integrations, systems, zones, placements, showLines, focusId]);

  return (
    <>
      {lines.map((l) => (
        <QuadraticBezierLine
          key={l.id}
          start={l.start}
          end={l.end}
          mid={l.mid}
          color={l.color}
          lineWidth={l.emphasised ? 4 : 2.2}
          dashed={l.dashed}
          dashSize={2}
          gapSize={1.5}
          transparent
          opacity={focusId && !l.emphasised ? 0.25 : 0.9}
        />
      ))}
    </>
  );
}
