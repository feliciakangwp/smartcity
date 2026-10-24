// Memoised zone layouts and building placements from the landscape store.
import { useMemo } from 'react';
import { useLandscape } from '@/store/landscape';
import { layoutZones, placeSystems } from '@/lib/placement';

export function useWorldLayout() {
  const zones = useLandscape((s) => s.zones);
  const plots = useLandscape((s) => s.plots);
  const systems = useLandscape((s) => s.systems);
  const rings = useLandscape((s) => s.platform.mapRings);
  return useMemo(() => {
    const layouts = layoutZones(zones, plots, rings);
    const placements = placeSystems(layouts, systems);
    return { layouts, placements };
  }, [zones, plots, systems, rings]);
}
