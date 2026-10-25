// Works out which buildings and zones are highlighted or subdued from the
// current selection, hover, impact analysis and the shared-systems filter.
import { useMemo } from 'react';
import { useLandscape } from '@/store/landscape';
import { useWorld } from '@/store/world';
import { activeIntegrations, activeSystems, impactOf, matchesFilter, usingDivisions } from '@/lib/metrics';
import type { Tone } from './materials';

export function useHighlight() {
  const selection = useWorld((s) => s.selection);
  const hovered = useWorld((s) => s.hovered);
  const impactId = useWorld((s) => s.impactSystemId);
  const filter = useWorld((s) => s.systemFilter);
  const moduleId = useWorld((s) => s.selectedModuleId);
  const systems = useLandscape((s) => s.systems);
  const zones = useLandscape((s) => s.zones);
  const integrations = useLandscape((s) => s.integrations);

  return useMemo(() => {
    const live = activeSystems(systems, zones);
    const ints = activeIntegrations(integrations, live);
    const focus = new Set<string>();
    const related = new Set<string>();
    /** Zones lit because they use the selected system (division usage, not integrations). */
    const usingZones = new Set<string>();
    /** Zones kept bright for the current filter. */
    const litZones = new Set<string>();
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
      const sys = live.find((s) => s.id === selection.id);
      if (sys) for (const z of usingDivisions(sys, zones, moduleId)) usingZones.add(z);
    } else if (selection?.kind === 'zone') {
      focusZone = selection.id;
      for (const s of live) if (s.zoneId === selection.id) focus.add(s.id);
    } else if (filter !== 'all') {
      for (const s of live) if (matchesFilter(s, zones, filter)) focus.add(s.id);
      if (filter === 'shared') for (const z of zones) if (z.kind === 'shared' && !z.archived) litZones.add(z.id);
    }

    const anyFocus = focus.size > 0 || focusZone !== null || filter !== 'all';
    const tone = (id: string): Tone => {
      if (focus.has(id)) return 'highlight';
      if (related.has(id)) return 'hover';
      if (anyFocus) return hovered === id ? 'hover' : 'dim';
      return hovered === id ? 'hover' : 'normal';
    };
    const zoneDimmed = (zoneId: string) => {
      if (focusZone) return zoneId !== focusZone;
      if (!anyFocus) return false;
      if (usingZones.has(zoneId) || litZones.has(zoneId)) return false;
      return !live.some((s) => s.zoneId === zoneId && (focus.has(s.id) || related.has(s.id)));
    };
    const zoneEmphasised = (zoneId: string) => usingZones.has(zoneId) || litZones.has(zoneId);
    return { tone, zoneDimmed, zoneEmphasised, focus, related, usingZones };
  }, [selection, hovered, impactId, filter, moduleId, systems, zones, integrations]);
}
