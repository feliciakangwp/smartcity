// Works out which buildings and zones are highlighted or subdued from the
// current selection, hover and impact analysis.
import { useMemo } from 'react';
import { useLandscape } from '@/store/landscape';
import { useWorld } from '@/store/world';
import { activeIntegrations, activeSystems, impactOf } from '@/lib/metrics';
import type { Tone } from './materials';

export function useHighlight() {
  const selection = useWorld((s) => s.selection);
  const hovered = useWorld((s) => s.hovered);
  const impactId = useWorld((s) => s.impactSystemId);
  const systems = useLandscape((s) => s.systems);
  const zones = useLandscape((s) => s.zones);
  const integrations = useLandscape((s) => s.integrations);

  return useMemo(() => {
    const live = activeSystems(systems, zones);
    const ints = activeIntegrations(integrations, live);
    const focus = new Set<string>();
    const related = new Set<string>();
    let focusZone: string | null = null;

    if (impactId) {
      focus.add(impactId);
      const { upstream, downstream } = impactOf(impactId, ints);
      for (const id of [...upstream.keys(), ...downstream.keys()]) related.add(id);
    } else if (selection?.kind === 'system') {
      focus.add(selection.id);
      for (const i of ints) {
        if (i.sourceId === selection.id) related.add(i.destinationId);
        if (i.destinationId === selection.id) related.add(i.sourceId);
      }
    } else if (selection?.kind === 'zone') {
      focusZone = selection.id;
      for (const s of live) if (s.zoneId === selection.id) focus.add(s.id);
    }

    const anyFocus = focus.size > 0 || focusZone !== null;
    const tone = (id: string): Tone => {
      if (focus.has(id)) return 'highlight';
      if (related.has(id)) return 'hover';
      if (anyFocus) return 'dim';
      return hovered === id ? 'hover' : 'normal';
    };
    const zoneDimmed = (zoneId: string) => {
      if (focusZone) return zoneId !== focusZone;
      if (!anyFocus) return false;
      return !live.some((s) => s.zoneId === zoneId && (focus.has(s.id) || related.has(s.id)));
    };
    return { tone, zoneDimmed, focus, related };
  }, [selection, hovered, impactId, systems, zones, integrations]);
}
