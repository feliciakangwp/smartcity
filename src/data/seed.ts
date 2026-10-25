// Demo Mode seed: the agency's systems placed on a stylised Singapore.
// Go-live years and eCustoms module names/usage are placeholders to confirm.
import type { LandscapeData, ShipConfig, System, SystemModule, Zone } from '@/types/domain';
import { DEFAULT_PLOTS } from './layout';

export const SEED_VERSION = 5;
const STAMP = '2026-10-25T09:00:00.000Z';
const audit = { createdAt: STAMP, updatedAt: STAMP, archived: false };

export const uid = (prefix: string, n: number) => `${prefix}000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

const Z = (n: number) => uid('a0', n);
const S = (n: number) => uid('b0', n);

const plotByLabel = (label: string) => DEFAULT_PLOTS.find((p) => p.label.startsWith(label))!.id;

export const SHARED_HUB_ZONE_ID = Z(7);
export const SHARED_HUB_PLOT_ID = plotByLabel('Shared Centre');

const zone = (n: number, name: string, description: string, color: string, theme: Zone['theme'], plot: string, sortOrder: number, kind: Zone['kind'] = 'division'): Zone => ({
  id: Z(n), name, description, color, theme, kind, plotId: plotByLabel(plot), scale: 1, visible: true, sortOrder, ...audit,
});

export const sharedHubZone = (): Zone =>
  zone(7, 'Shared Services Hub', 'Shared centre beside the Trade zone for systems used across divisions, such as eCustoms.', '#0d9488', 'shared', 'Shared Centre', 6, 'shared');

const zones: Zone[] = [
  zone(1, 'Trade Gateway', 'Trade-facing systems for declarations and permits.', '#2f7fe0', 'trade', 'Bukit Timah', 1),
  zone(2, 'Compliance Centre', 'Compliance and risk systems.', '#7c5ce0', 'compliance', 'Pioneer West', 2),
  zone(3, 'Enforcement HQ', 'Investigation and enforcement systems.', '#ec7a1c', 'enforcement', 'Pioneer East', 3),
  zone(4, 'Finance Treasury', 'Revenue and finance systems.', '#23a35a', 'finance', 'Marina', 4),
  zone(5, 'Traveller Checkpoint', 'Traveller declarations and GST payments at Changi.', '#e9b414', 'traveller', 'Changi', 5),
  sharedHubZone(),
];

const YEAR_NOTE = 'Go-live year is a placeholder until confirmed.';
type SysSeed = {
  n: number;
  zone: number;
  acronym: string;
  name: string;
  category: System['category'];
  status: System['status'];
  criticality: System['criticality'];
  year: number;
  progress?: number;
  purpose: string;
};

const sysSeeds: SysSeed[] = [
  { n: 1, zone: 1, acronym: 'eServices', name: 'Customs eServices', category: 'Frontend / eService', status: 'Live', criticality: 'High', year: 2012, purpose: 'Online services for traders.' },
  { n: 2, zone: 1, acronym: 'TradeNet4.1', name: 'TradeNet 4.1', category: 'Core Processing', status: 'Live', criticality: 'Mission Critical', year: 2014, purpose: 'Current trade declaration and permit platform.' },
  { n: 3, zone: 1, acronym: 'TradeNet5.0', name: 'TradeNet 5.0', category: 'Core Processing', status: 'Planned', criticality: 'Mission Critical', year: 2027, progress: 0, purpose: 'Next-generation trade declaration and permit platform. New system; development has not started.' },
  { n: 4, zone: 2, acronym: 'CORDIS', name: 'CORDIS', category: 'Compliance', status: 'Planned', criticality: 'High', year: 2027, progress: 0, purpose: 'New compliance system. Development has not started.' },
  { n: 5, zone: 4, acronym: 'ORION', name: 'ORION', category: 'Finance', status: 'In Development', criticality: 'High', year: 2026, progress: 60, purpose: 'New finance system, 60% developed.' },
  { n: 6, zone: 4, acronym: 'POLARIS', name: 'POLARIS', category: 'Finance', status: 'In Development', criticality: 'High', year: 2028, progress: 5, purpose: 'New finance system, 5% developed.' },
  { n: 7, zone: 5, acronym: 'Kiosk', name: 'Kiosk', category: 'Frontend / eService', status: 'Live', criticality: 'Medium', year: 2016, purpose: 'Self-service kiosks for travellers at the checkpoint.' },
  { n: 8, zone: 5, acronym: 'Customs@SG', name: 'Customs@SG', category: 'Frontend / eService', status: 'Live', criticality: 'High', year: 2019, purpose: 'Traveller declarations and GST payments.' },
  { n: 9, zone: 3, acronym: 'C2iS', name: 'C2iS', category: 'Enforcement', status: 'Live', criticality: 'High', year: 2013, purpose: 'Enforcement system.' },
];

const divisionIds = [Z(1), Z(2), Z(3), Z(4), Z(5)];

/** eCustoms: one system, one campus building, 13 modules with their own users (placeholder names and usage). */
export const ECUSTOMS_MODULES = (): SystemModule[] =>
  Array.from({ length: 13 }, (_, i) => {
    const users = new Set([divisionIds[i % 5], divisionIds[(i + 2) % 5]]);
    if (i % 3 === 0) users.add(divisionIds[(i + 1) % 5]);
    return { id: uid('e1', i + 1), name: `Module ${String(i + 1).padStart(2, '0')}`, usingZoneIds: [...users] };
  });

const systems: System[] = [
  ...sysSeeds.map((s) => ({
    id: S(s.n),
    name: s.name,
    acronym: s.acronym,
    description: YEAR_NOTE,
    zoneId: Z(s.zone),
    owningZoneId: Z(s.zone),
    usingZoneIds: [Z(s.zone)],
    businessPurpose: s.purpose,
    category: s.category,
    status: s.status,
    criticality: s.criticality,
    yearIntroduced: s.year,
    buildProgress: s.progress,
    docs: [],
    ...audit,
  })),
  {
    id: S(10),
    name: 'eCustoms',
    acronym: 'eCustoms',
    description: `Shared across divisions through 13 modules. Module names and which divisions use each are placeholders. ${YEAR_NOTE}`,
    zoneId: SHARED_HUB_ZONE_ID,
    owningZoneId: null,
    usingZoneIds: [...new Set(ECUSTOMS_MODULES().flatMap((m) => m.usingZoneIds))],
    businessPurpose: 'Customs platform whose modules serve several divisions.',
    category: 'Core Processing',
    status: 'Live',
    criticality: 'Mission Critical',
    yearIntroduced: 2017,
    modules: ECUSTOMS_MODULES(),
    docs: [],
    ...audit,
  },
];

const ship = (n: number, name: string, portId: string, hullColor: string, bays: number, rows: number, tiers: number, unloadCount: number, loadCount: number, seaTime: number): ShipConfig => ({
  id: uid('20', n), name, portId, hullColor, bays, rows, tiers, unloadCount, loadCount, seaTime,
});

const ships: ShipConfig[] = [
  ship(1, 'MV Nexus Pioneer', 'tuas', '#1d3b6e', 7, 4, 3, 7, 5, 30),
  ship(2, 'MV Harbour Spirit', 'tuas', '#a8323a', 5, 3, 3, 5, 4, 40),
  ship(3, 'MV Coral Feeder', 'tuas', '#1f7470', 3, 3, 2, 3, 3, 25),
  ship(4, 'MV Merlion Star', 'queenstown', '#24456b', 7, 4, 3, 6, 5, 35),
  ship(5, 'MV Straits Trader', 'queenstown', '#6b4a1f', 5, 3, 3, 5, 4, 30),
  ship(6, 'MV Lion City', 'queenstown', '#5b2c83', 3, 3, 2, 3, 3, 45),
];

export function createSeed(): LandscapeData {
  return structuredClone({
    version: SEED_VERSION,
    zones,
    plots: DEFAULT_PLOTS,
    systems,
    integrations: [],
    journeys: [],
    ships,
    berths: [
      { id: uid('30', 1), name: 'Jurong Port Berth 1', portId: 'tuas', x: -385 },
      { id: uid('30', 2), name: 'Jurong Port Berth 2', portId: 'tuas', x: -312 },
      { id: uid('30', 3), name: 'PSA Berth 1', portId: 'queenstown', x: -92 },
      { id: uid('30', 4), name: 'PSA Berth 2', portId: 'queenstown', x: -22 },
    ],
    simulation: { ambientEnabled: true, defaultSpeed: 1 },
    platform: { name: 'PORT NEXUS', tagline: 'Connecting Systems. Moving Information.', quality: 'auto', mapRings: 0 },
  });
}
