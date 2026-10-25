// UI state for the Port World: selection, camera focus, toggles, simulation speed.
import { create } from 'zustand';
import type { SystemFilter } from '@/lib/metrics';

export type SelectionKind = 'zone' | 'system' | 'ship';
export interface Selection {
  kind: SelectionKind;
  id: string;
}
export type FocusKind = 'home' | 'zone' | 'system' | 'ship' | 'place';
export interface FocusRequest {
  kind: FocusKind;
  id?: string;
  nonce: number;
}
export type Speed = 0 | 1 | 2 | 4;
export type ResolvedQuality = 'low' | 'medium' | 'high';

interface WorldState {
  selection: Selection | null;
  hovered: string | null;
  focus: FocusRequest;
  showLabels: boolean;
  showLines: boolean;
  showAmbient: boolean;
  speed: Speed;
  dashboardExpanded: boolean;
  impactSystemId: string | null;
  quality: ResolvedQuality;
  /** Zone the Add System dialog is open for. */
  addSystemZone: string | null;
  systemFilter: SystemFilter;
  showCrossDivision: boolean;
  showSchedule: boolean;
  /** Module of the selected system whose users are highlighted (e.g. one of eCustoms' modules). */
  selectedModuleId: string | null;

  selectModule: (systemId: string, moduleId: string | null) => void;
  setSystemFilter: (f: SystemFilter) => void;
  openAddSystem: (zoneId: string | null) => void;
  select: (s: Selection | null, focus?: boolean) => void;
  setHovered: (id: string | null) => void;
  focusOn: (kind: FocusKind, id?: string) => void;
  toggle: (key: 'showLabels' | 'showLines' | 'showAmbient' | 'showCrossDivision' | 'showSchedule') => void;
  setSpeed: (s: Speed) => void;
  setDashboardExpanded: (v: boolean) => void;
  setImpactSystem: (id: string | null) => void;
  setQuality: (q: ResolvedQuality) => void;
}

const isMobile = typeof window !== 'undefined' && window.matchMedia('(max-width: 768px), (pointer: coarse)').matches;

export const useWorld = create<WorldState>()((set) => ({
  selection: null,
  hovered: null,
  focus: { kind: 'home', nonce: 0 },
  showLabels: true,
  showLines: false,
  showAmbient: true,
  speed: 1,
  dashboardExpanded: false,
  impactSystemId: null,
  quality: isMobile ? 'low' : 'high',
  addSystemZone: null,
  systemFilter: 'all',
  showCrossDivision: false,
  showSchedule: !isMobile,
  selectedModuleId: null,

  selectModule: (systemId, selectedModuleId) => set({ selection: { kind: 'system', id: systemId }, selectedModuleId }),

  setSystemFilter: (systemFilter) => set({ systemFilter }),

  openAddSystem: (addSystemZone) => set({ addSystemZone }),

  select: (selection, focus = false) =>
    set((s) => ({
      selection,
      selectedModuleId: selection?.kind === 'system' && selection.id === s.selection?.id ? s.selectedModuleId : null,
      focus: focus && selection ? { kind: selection.kind, id: selection.id, nonce: s.focus.nonce + 1 } : s.focus,
    })),
  setHovered: (hovered) => set({ hovered }),
  focusOn: (kind, id) => set((s) => ({ focus: { kind, id, nonce: s.focus.nonce + 1 } })),
  toggle: (key) => set((s) => ({ [key]: !s[key] }) as Partial<WorldState>),
  setSpeed: (speed) => set({ speed }),
  setDashboardExpanded: (dashboardExpanded) => set({ dashboardExpanded }),
  setImpactSystem: (impactSystemId) => set({ impactSystemId }),
  setQuality: (quality) => set({ quality }),
}));

export const isMobileDevice = isMobile;
