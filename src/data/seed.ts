// Demo Mode seed. System names are generic placeholders, not real architecture.
import type {
  Integration,
  Journey,
  LandscapeData,
  ShipConfig,
  System,
  Zone,
} from '@/types/domain';
import { DEFAULT_PLOTS } from './layout';

export const SEED_VERSION = 1;
const STAMP = '2026-10-01T09:00:00.000Z';
const audit = { createdAt: STAMP, updatedAt: STAMP, archived: false };

export const uid = (prefix: string, n: number) => `${prefix}000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

const Z = (n: number) => uid('a0', n);
const S = (n: number) => uid('b0', n);
const I = (n: number) => uid('c0', n);

const zones: Zone[] = [
  { id: Z(1), name: 'Trade Gateway', description: 'Trader-facing systems: declarations, trader profiles and eService payments.', color: '#2f7fe0', theme: 'trade', plotId: DEFAULT_PLOTS[2].id, scale: 1, visible: true, sortOrder: 1, ...audit },
  { id: Z(2), name: 'Compliance Centre', description: 'Compliance rules, risk assessment, screening and inspection.', color: '#7c5ce0', theme: 'compliance', plotId: DEFAULT_PLOTS[1].id, scale: 1, visible: true, sortOrder: 2, ...audit },
  { id: Z(3), name: 'Enforcement HQ', description: 'Investigation, case management and intelligence analytics.', color: '#ec7a1c', theme: 'enforcement', plotId: DEFAULT_PLOTS[0].id, scale: 1, visible: true, sortOrder: 3, ...audit },
  { id: Z(4), name: 'Finance Treasury', description: 'Revenue collection, reconciliation and ledger interfaces.', color: '#23a35a', theme: 'finance', plotId: DEFAULT_PLOTS[3].id, scale: 1, visible: true, sortOrder: 4, ...audit },
  { id: Z(5), name: 'Traveller Checkpoint', description: 'Traveller declarations and GST processing.', color: '#e9b414', theme: 'traveller', plotId: DEFAULT_PLOTS[4].id, scale: 1, visible: true, sortOrder: 5, ...audit },
  { id: Z(6), name: 'Integration Hub', description: 'Shared integration, data exchange and cargo operations services.', color: '#2bb3c8', theme: 'integration', plotId: DEFAULT_PLOTS[5].id, scale: 1, visible: true, sortOrder: 6, ...audit },
];

type SysSeed = [n: number, zone: number, acronym: string, name: string, category: System['category'], status: System['status'], criticality: System['criticality'], purpose: string];

const sysSeeds: SysSeed[] = [
  [1, 1, 'TRD', 'Trader (External Party)', 'External System', 'Live', 'Medium', 'Represents traders and agents submitting declarations from outside the agency.'],
  [2, 1, 'TDP', 'Trade Declaration Portal', 'Frontend / eService', 'Live', 'High', 'Online channel for lodging and amending trade declarations.'],
  [3, 1, 'TPR', 'Trader Profile Registry', 'Data Repository', 'Live', 'Medium', 'Master record of registered traders, licences and risk profiles.'],
  [4, 1, 'EPP', 'eService Payment Portal', 'Frontend / eService', 'Live', 'High', 'Online payment channel for duties, fees and penalties.'],
  [5, 2, 'CRE', 'Compliance Rules Engine', 'Compliance', 'Live', 'Mission Critical', 'Applies rules and risk scoring to every declaration.'],
  [6, 2, 'CSI', 'Cargo Screening & Inspection', 'Compliance', 'Enhancement', 'High', 'Schedules and records physical inspection and scanning results.'],
  [7, 3, 'ECM', 'Enforcement Case Management', 'Enforcement', 'Live', 'High', 'Manages referrals, investigations and enforcement outcomes.'],
  [8, 3, 'IAP', 'Intelligence Analytics Platform', 'Analytics', 'In Development', 'Medium', 'Analyses case and trade data to surface emerging risks.'],
  [9, 4, 'RCS', 'Revenue Collection System', 'Finance', 'Live', 'Mission Critical', 'Calculates and collects duties, taxes and fees.'],
  [10, 4, 'RCN', 'Reconciliation Engine', 'Finance', 'Live', 'High', 'Matches collections against bank settlements every day.'],
  [11, 4, 'GLI', 'General Ledger Interface', 'Finance', 'Sunsetting', 'Medium', 'Posts reconciled revenue to the finance ledger.'],
  [12, 5, 'TVL', 'Traveller (External Party)', 'External System', 'Live', 'Low', 'Represents travellers declaring goods on arrival.'],
  [13, 5, 'TDS', 'Traveller Declaration Service', 'Frontend / eService', 'Live', 'High', 'Captures traveller declarations through app and kiosk.'],
  [14, 5, 'GSA', 'GST Assessment Engine', 'Core Processing', 'Live', 'High', 'Calculates GST payable on declared goods.'],
  [15, 6, 'IEX', 'Integration Exchange', 'Integration', 'Live', 'Mission Critical', 'Shared message broker and API gateway between systems.'],
  [16, 6, 'CDR', 'Common Data Repository', 'Data Repository', 'Live', 'High', 'Shared store of reference and historical transaction data.'],
  [17, 6, 'COP', 'Cargo Operations Platform', 'Core Processing', 'Live', 'High', 'Tracks cargo status and release instructions.'],
  [18, 6, 'CTS', 'Container Terminal System', 'External System', 'Live', 'High', 'Terminal operator system that plans yard moves and vessel loading.'],
  [19, 6, 'VMI', 'Vessel Manifest Interface', 'External System', 'Planned', 'Medium', 'Exchanges load lists and manifests with shipping lines.'],
];

const systems: System[] = sysSeeds.map(([n, zone, acronym, name, category, status, criticality, purpose]) => ({
  id: S(n),
  name,
  acronym,
  description: `${name} (placeholder for demonstration).`,
  zoneId: Z(zone),
  businessPurpose: purpose,
  category,
  status,
  criticality,
  docs: [],
  ...audit,
}));

type IntSeed = [n: number, from: number, to: number, name: string, dataType: Integration['dataType'], mechanism: Integration['mechanism'], trigger: string, description: string, via?: number[], extra?: Partial<Integration>];

const intSeeds: IntSeed[] = [
  [1, 1, 2, 'Lodge trade declaration', 'Transaction', 'REST API', 'Trader submits a declaration', 'Trader lodges a declaration through the portal.'],
  [2, 2, 5, 'Declaration for compliance check', 'Compliance', 'Event / Message Queue', 'Declaration accepted by the portal', 'Accepted declarations are published for rules and risk assessment.', [15]],
  [3, 5, 7, 'Referral for investigation', 'Exception', 'Event / Message Queue', 'Risk score above referral threshold', 'High-risk declarations are referred to enforcement.'],
  [4, 5, 9, 'Duty and tax assessment', 'Transaction', 'REST API', 'Declaration has duty or tax payable', 'Assessed amounts are sent for collection.'],
  [5, 5, 17, 'Clearance outcome', 'Clearance / Approval', 'Event / Message Queue', 'Declaration cleared', 'Clearance outcome is shared with cargo operations.', [15]],
  [6, 3, 5, 'Trader risk profile', 'Compliance', 'Database Interface', 'Rules engine evaluates a declaration', 'Rules engine reads the trader profile during assessment.'],
  [7, 12, 13, 'Traveller declaration', 'Transaction', 'REST API', 'Traveller declares goods', 'Traveller submits a declaration in the app or at a kiosk.'],
  [8, 13, 14, 'GST assessment request', 'Pending Processing', 'REST API', 'Declaration includes dutiable goods', 'Declared goods are sent for GST calculation.'],
  [9, 14, 9, 'GST payable', 'Transaction', 'REST API', 'GST calculated', 'GST payable is raised for collection.'],
  [10, 9, 13, 'Payment confirmation', 'Clearance / Approval', 'Event / Message Queue', 'Payment received', 'Payment confirmation is returned to the traveller service.'],
  [11, 17, 18, 'Release instruction', 'Clearance / Approval', 'REST API', 'Cargo released by the agency', 'Release status is sent to the terminal. The terminal still plans and authorises loading itself.'],
  [12, 18, 19, 'Load list update', 'Pending Processing', 'File Transfer', 'Terminal finalises the stowage plan', 'Load list and stowage updates go to the vessel side.'],
  [13, 4, 9, 'eService payment', 'Transaction', 'REST API', 'Payment made online', 'Online payments are posted to revenue collection.'],
  [14, 9, 10, 'Daily collections batch', 'Transaction', 'Batch', 'End of business day', 'Collections are batched for reconciliation.'],
  [15, 10, 11, 'Reconciled postings', 'Transaction', 'File Transfer', 'Reconciliation complete', 'Reconciled totals are posted to the ledger.'],
  [16, 6, 5, 'Inspection results', 'Compliance', 'REST API', 'Inspection completed', 'Inspection findings update the compliance assessment.', undefined, { direction: 'bidirectional' }],
  [17, 7, 8, 'Case data for analytics', 'Compliance', 'Batch', 'Nightly', 'Case outcomes feed the analytics platform.', undefined, { status: 'Planned' }],
  [18, 17, 16, 'Cargo events', 'Transaction', 'Event / Message Queue', 'Cargo status changes', 'Cargo events are stored for reporting.'],
  [19, 14, 16, 'Traveller GST records', 'Transaction', 'Batch', 'Nightly', 'Assessed traveller GST records are archived.'],
];

const integrations: Integration[] = intSeeds.map(([n, from, to, name, dataType, mechanism, trigger, description, via, extra]) => ({
  id: I(n),
  name,
  sourceId: S(from),
  destinationId: S(to),
  dataType,
  mechanism,
  direction: 'one-way',
  description,
  trigger,
  status: 'Live',
  via: (via ?? []).map(S),
  ...audit,
  ...extra,
}));

let stepN = 0;
let branchN = 0;
const steps = (ints: [number, string][]) =>
  ints.map(([i, label], order) => ({ id: uid('e0', ++stepN), order, integrationId: I(i), label }));

const journeyA = steps([[1, 'Trader lodges declaration'], [2, 'Declaration sent for compliance check']]);
const journeys: Journey[] = [
  {
    id: uid('d0', 1),
    code: 'A',
    name: 'Trade Declaration',
    description: 'A trader declaration moves through compliance and branches to enforcement, finance or cargo operations.',
    published: true,
    speed: 1,
    steps: journeyA,
    branches: [
      { id: uid('f0', ++branchN), afterStepId: journeyA[1].id, condition: 'Risk score above threshold', integrationId: I(3) },
      { id: uid('f0', ++branchN), afterStepId: journeyA[1].id, condition: 'Duty or tax payable', integrationId: I(4) },
      { id: uid('f0', ++branchN), afterStepId: journeyA[1].id, condition: 'Declaration cleared', integrationId: I(5) },
    ],
    ...audit,
  },
  {
    id: uid('d0', 2),
    code: 'B',
    name: 'Traveller GST',
    description: 'A traveller declaration is assessed for GST, collected, and confirmed back to the traveller service.',
    published: true,
    speed: 1,
    steps: steps([[7, 'Traveller declares goods'], [8, 'GST assessed'], [9, 'GST raised for collection'], [10, 'Payment confirmed']]),
    branches: [],
    ...audit,
  },
  {
    id: uid('d0', 3),
    code: 'C',
    name: 'Cargo Operations',
    description: 'Clearance informs cargo operations and the terminal. Clearance is not automatic loading permission; the terminal plans loading.',
    published: true,
    speed: 1,
    steps: steps([[5, 'Clearance outcome shared'], [11, 'Release instruction to terminal'], [12, 'Load list to vessel']]),
    branches: [],
    ...audit,
  },
  {
    id: uid('d0', 4),
    code: 'D',
    name: 'Revenue Reconciliation',
    description: 'Online payments are collected, reconciled daily and posted to the ledger.',
    published: true,
    speed: 1,
    steps: steps([[13, 'eService payment'], [14, 'Daily collections batch'], [15, 'Reconciled postings']]),
    branches: [],
    ...audit,
  },
];

const ships: ShipConfig[] = [
  { id: uid('20', 1), name: 'MV Nexus Pioneer', hullColor: '#1d3b6e', bays: 7, rows: 4, tiers: 3, unloadCount: 7, loadCount: 5, seaTime: 35 },
  { id: uid('20', 2), name: 'MV Harbour Spirit', hullColor: '#a8323a', bays: 5, rows: 3, tiers: 3, unloadCount: 5, loadCount: 4, seaTime: 50 },
  { id: uid('20', 3), name: 'MV Coral Feeder', hullColor: '#1f7470', bays: 3, rows: 3, tiers: 2, unloadCount: 3, loadCount: 3, seaTime: 25 },
];

export function createSeed(): LandscapeData {
  return structuredClone({
    version: SEED_VERSION,
    zones,
    plots: DEFAULT_PLOTS,
    systems,
    integrations,
    journeys,
    ships,
    berths: [
      { id: uid('30', 1), name: 'Berth 1', x: 45 },
      { id: uid('30', 2), name: 'Berth 2', x: 110 },
      { id: uid('30', 3), name: 'Berth 3', x: 175 },
    ],
    simulation: { ambientEnabled: true, defaultSpeed: 1 },
    platform: { name: 'PORT NEXUS', tagline: 'Connecting Systems. Moving Information.', quality: 'auto', mapRings: 0 },
  });
}
