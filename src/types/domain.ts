// Domain records. These mirror the tables in supabase/migrations so the demo
// store and the production database share one shape.

export type ID = string;

export interface Audited {
  createdAt: string;
  updatedAt: string;
  archived: boolean;
}

export type ZoneTheme =
  | 'trade'
  | 'compliance'
  | 'enforcement'
  | 'finance'
  | 'traveller'
  | 'integration'
  | 'shared'
  | 'generic';

/** A division owns and uses systems; a shared zone only displays cross-division systems. */
export type ZoneKind = 'division' | 'shared';

export interface ZonePlot {
  id: ID;
  label: string;
  /** World-space centre of the plot (x, z). */
  x: number;
  z: number;
  width: number;
  depth: number;
  /** Expansion plots only appear once the port map has been expanded to that ring. */
  ring: number;
}

export interface Zone extends Audited {
  id: ID;
  name: string;
  description: string;
  color: string;
  theme: ZoneTheme;
  kind: ZoneKind;
  plotId: ID;
  /** 0.6–1 share of the plot footprint the zone occupies. */
  scale: number;
  visible: boolean;
  sortOrder: number;
}

export const SYSTEM_CATEGORIES = [
  'Frontend / eService',
  'Core Processing',
  'Finance',
  'Compliance',
  'Enforcement',
  'Data Repository',
  'Integration',
  'Analytics',
  'External System',
  'Other',
] as const;
export type SystemCategory = (typeof SYSTEM_CATEGORIES)[number];

export const SYSTEM_STATUSES = ['Planned', 'In Development', 'Live', 'Enhancement', 'Sunsetting', 'Retired'] as const;
export type SystemStatus = (typeof SYSTEM_STATUSES)[number];

export const CRITICALITIES = ['Low', 'Medium', 'High', 'Mission Critical'] as const;
export type Criticality = (typeof CRITICALITIES)[number];

export interface DocLink {
  label: string;
  url: string;
}

export interface System extends Audited {
  id: ID;
  name: string;
  acronym: string;
  description: string;
  /** Display zone: where the building is placed in the port. */
  zoneId: ID;
  /** Accountable division. Null while ownership is unconfirmed. */
  owningZoneId: ID | null;
  /** Divisions that use the system (may differ from the owner). */
  usingZoneIds: ID[];
  businessPurpose: string;
  category: SystemCategory;
  status: SystemStatus;
  criticality: Criticality;
  techStack?: string;
  owner?: string;
  endpoints?: string;
  docs: DocLink[];
  /** Slot inside the zone; undefined = auto-place. */
  slot?: number;
}

export const MECHANISMS = [
  'REST API',
  'Event / Message Queue',
  'File Transfer',
  'Batch',
  'Database Interface',
  'Manual Transfer',
  'Other',
] as const;
export type Mechanism = (typeof MECHANISMS)[number];

export const DATA_TYPES = ['Transaction', 'Clearance / Approval', 'Pending Processing', 'Exception', 'Compliance'] as const;
export type DataType = (typeof DATA_TYPES)[number];

export const DATA_TYPE_COLORS: Record<DataType, string> = {
  Transaction: '#2a78d6',
  'Clearance / Approval': '#1f9d55',
  'Pending Processing': '#eb8a1e',
  Exception: '#e0413f',
  Compliance: '#7a5ae0',
};

export type Direction = 'one-way' | 'bidirectional';
export type IntegrationStatus = 'Planned' | 'Live' | 'Degraded' | 'Retired';

export interface Integration extends Audited {
  id: ID;
  name: string;
  sourceId: ID;
  destinationId: ID;
  dataType: DataType;
  mechanism: Mechanism;
  direction: Direction;
  description: string;
  trigger: string;
  status: IntegrationStatus;
  via: ID[];
  payload?: string;
}

export interface JourneyStep {
  id: ID;
  order: number;
  integrationId: ID;
  label: string;
}

export interface JourneyBranch {
  id: ID;
  /** Step after which the branch applies. */
  afterStepId: ID;
  condition: string;
  integrationId: ID;
}

export interface Journey extends Audited {
  id: ID;
  name: string;
  code: string;
  description: string;
  published: boolean;
  speed: number;
  steps: JourneyStep[];
  branches: JourneyBranch[];
}

export interface ShipConfig {
  id: ID;
  name: string;
  hullColor: string;
  /** Number of container bays along the hull. */
  bays: number;
  rows: number;
  tiers: number;
  unloadCount: number;
  loadCount: number;
  /** Seconds the ship spends at sea before returning. */
  seaTime: number;
}

export interface Berth {
  id: ID;
  name: string;
  x: number;
}

export interface SimulationSettings {
  ambientEnabled: boolean;
  defaultSpeed: number;
}

export type Quality = 'auto' | 'low' | 'medium' | 'high';

export interface PlatformSettings {
  name: string;
  tagline: string;
  quality: Quality;
  /** How many rings of expansion plots are open. */
  mapRings: number;
}

export interface LandscapeData {
  version: number;
  zones: Zone[];
  plots: ZonePlot[];
  systems: System[];
  integrations: Integration[];
  journeys: Journey[];
  ships: ShipConfig[];
  berths: Berth[];
  simulation: SimulationSettings;
  platform: PlatformSettings;
}
