import { useMemo } from 'react';
import { useLandscape } from '@/store/landscape';
import { summarise } from '@/lib/metrics';

export function useSummary() {
  const zones = useLandscape((s) => s.zones);
  const systems = useLandscape((s) => s.systems);
  const integrations = useLandscape((s) => s.integrations);
  const journeys = useLandscape((s) => s.journeys);
  return useMemo(() => summarise({ zones, systems, integrations, journeys }), [zones, systems, integrations, journeys]);
}
