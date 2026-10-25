// Landscape records (zones, systems, integrations, journeys, maritime config).
// Demo Mode persists to localStorage; Phase 4 swaps in the Supabase adapter.
import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';
import type { Integration, LandscapeData, PlatformSettings, SimulationSettings, System, Zone } from '@/types/domain';
import { createSeed, SEED_VERSION } from '@/data/seed';
import { upgradeLandscape } from '@/data/upgrade';
import { DEMO_STORAGE_KEY } from '@/lib/datasource';

const now = () => new Date().toISOString();
const newId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx'.replace(/x/g, () => ((Math.random() * 16) | 0).toString(16));

// Storage that never throws (private windows, blocked storage).
const safeStorage: StateStorage = {
  getItem: (k) => {
    try { return localStorage.getItem(k); } catch { return null; }
  },
  setItem: (k, v) => {
    try { localStorage.setItem(k, v); } catch { /* storage unavailable */ }
  },
  removeItem: (k) => {
    try { localStorage.removeItem(k); } catch { /* storage unavailable */ }
  },
};

export type NewSystem = Omit<System, 'id' | 'createdAt' | 'updatedAt' | 'archived'>;
export type NewZone = Omit<Zone, 'id' | 'createdAt' | 'updatedAt' | 'archived' | 'sortOrder'>;

interface Actions {
  addZone: (z: NewZone) => string;
  updateZone: (id: string, patch: Partial<Zone>) => void;
  archiveZone: (id: string, archived?: boolean) => void;
  moveZoneOrder: (id: string, dir: -1 | 1) => void;
  addSystem: (s: NewSystem) => string;
  updateSystem: (id: string, patch: Partial<System>) => void;
  archiveSystem: (id: string, archived?: boolean) => void;
  updateIntegration: (id: string, patch: Partial<Integration>) => void;
  setPlatform: (patch: Partial<PlatformSettings>) => void;
  setSimulation: (patch: Partial<SimulationSettings>) => void;
  expandMap: () => void;
  importData: (data: LandscapeData) => void;
  resetDemo: () => void;
}

export type LandscapeStore = LandscapeData & Actions;

export const useLandscape = create<LandscapeStore>()(
  persist(
    (set, get) => ({
      ...createSeed(),

      addZone: (z) => {
        const id = newId();
        const sortOrder = Math.max(0, ...get().zones.map((x) => x.sortOrder)) + 1;
        set((s) => ({ zones: [...s.zones, { ...z, id, sortOrder, createdAt: now(), updatedAt: now(), archived: false }] }));
        return id;
      },
      updateZone: (id, patch) =>
        set((s) => ({ zones: s.zones.map((z) => (z.id === id ? { ...z, ...patch, updatedAt: now() } : z)) })),
      archiveZone: (id, archived = true) =>
        set((s) => ({ zones: s.zones.map((z) => (z.id === id ? { ...z, archived, updatedAt: now() } : z)) })),
      moveZoneOrder: (id, dir) =>
        set((s) => {
          const list = [...s.zones].sort((a, b) => a.sortOrder - b.sortOrder);
          const i = list.findIndex((z) => z.id === id);
          const j = i + dir;
          if (i < 0 || j < 0 || j >= list.length) return {};
          [list[i], list[j]] = [list[j], list[i]];
          return { zones: list.map((z, k) => ({ ...z, sortOrder: k + 1 })) };
        }),

      addSystem: (sys) => {
        const id = newId();
        set((s) => ({ systems: [...s.systems, { ...sys, id, createdAt: now(), updatedAt: now(), archived: false }] }));
        return id;
      },
      updateSystem: (id, patch) =>
        set((s) => ({ systems: s.systems.map((x) => (x.id === id ? { ...x, ...patch, updatedAt: now() } : x)) })),
      archiveSystem: (id, archived = true) =>
        set((s) => ({ systems: s.systems.map((x) => (x.id === id ? { ...x, archived, updatedAt: now() } : x)) })),

      updateIntegration: (id, patch) =>
        set((s) => ({ integrations: s.integrations.map((x) => (x.id === id ? { ...x, ...patch, updatedAt: now() } : x)) })),

      setPlatform: (patch) => set((s) => ({ platform: { ...s.platform, ...patch } })),
      setSimulation: (patch) => set((s) => ({ simulation: { ...s.simulation, ...patch } })),
      expandMap: () =>
        set((s) => ({
          platform: { ...s.platform, mapRings: Math.min(Math.max(...s.plots.map((p) => p.ring)), s.platform.mapRings + 1) },
        })),

      importData: (data) => set({ ...upgradeLandscape(data), version: SEED_VERSION }),
      resetDemo: () => set({ ...createSeed() }),
    }),
    {
      name: DEMO_STORAGE_KEY,
      version: SEED_VERSION,
      storage: createJSONStorage(() => safeStorage),
      // v3 re-laid the port on a map of Singapore and replaced the placeholder systems, so
      // older saved layouts (whose plots no longer exist) restart from the new seed. Branding is kept.
      migrate: (persisted, version) => {
        const state = persisted as Partial<LandscapeData>;
        if (version < 3) return { ...createSeed(), platform: { ...createSeed().platform, ...(state.platform ?? {}), mapRings: 0 } } as LandscapeStore;
        // v5: TradeNet 5.0 is a new system at 0%, not a live one. Only the untouched seed record is corrected.
        if (version < 5 && state.systems) {
          const seedTn5 = createSeed().systems.find((s) => s.acronym === 'TradeNet5.0')!;
          state.systems = state.systems.map((s) =>
            s.id === seedTn5.id && s.status === 'Live' && s.yearIntroduced === 2025 && s.buildProgress === undefined
              ? { ...s, status: seedTn5.status, yearIntroduced: seedTn5.yearIntroduced, buildProgress: seedTn5.buildProgress, businessPurpose: seedTn5.businessPurpose }
              : s,
          );
        }
        return upgradeLandscape(state) as LandscapeStore;
      },
      partialize: (s) => {
        const { zones, plots, systems, integrations, journeys, ships, berths, simulation, platform, version } = s;
        return { zones, plots, systems, integrations, journeys, ships, berths, simulation, platform, version };
      },
    },
  ),
);

export function exportLandscape(): LandscapeData {
  const { zones, plots, systems, integrations, journeys, ships, berths, simulation, platform, version } = useLandscape.getState();
  return { zones, plots, systems, integrations, journeys, ships, berths, simulation, platform, version };
}

/** Light structural check before importing a JSON export. */
export function validateImport(raw: unknown): { ok: true; data: LandscapeData } | { ok: false; error: string } {
  if (!raw || typeof raw !== 'object') return { ok: false, error: 'The file is not a Port Nexus export.' };
  const d = raw as Partial<LandscapeData>;
  for (const key of ['zones', 'plots', 'systems', 'integrations', 'journeys', 'ships', 'berths'] as const) {
    if (!Array.isArray(d[key])) return { ok: false, error: `The export is missing "${key}".` };
  }
  const zoneIds = new Set(d.zones!.map((z) => z.id));
  const orphan = d.systems!.find((s) => !zoneIds.has(s.zoneId));
  if (orphan) return { ok: false, error: `System "${orphan.name}" points to a zone that is not in the file.` };
  return { ok: true, data: upgradeLandscape({ ...createSeed(), ...(d as LandscapeData) }) };
}
