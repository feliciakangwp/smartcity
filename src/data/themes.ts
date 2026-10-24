import type { ZoneTheme } from '@/types/domain';

export const THEME_LABELS: Record<ZoneTheme, string> = {
  trade: 'Trade gateway (entry gates)',
  compliance: 'Compliance (scanning gantry)',
  enforcement: 'Enforcement (secure compound)',
  finance: 'Finance (treasury plaza)',
  traveller: 'Traveller (passenger checkpoint)',
  integration: 'Integration (sorting & transfer)',
  shared: 'Shared services (technology campus)',
  generic: 'General facility',
};
