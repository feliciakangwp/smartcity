// Age and build state of a system, used for its look in the port and in panels.
import { LEGACY_AGE_YEARS, type System } from '@/types/domain';

export const CURRENT_YEAR = new Date().getFullYear();

export const isDeveloping = (s: Pick<System, 'status'>) => s.status === 'Planned' || s.status === 'In Development';
export const isDecommissioned = (s: Pick<System, 'status'>) => s.status === 'Decommission';

/**
 * Year the system's age counts from: the year it originated, or the revamp ticked for it,
 * whichever is more recent (gives the younger system).
 */
export function ageBaseYear(s: Pick<System, 'yearOriginated' | 'revamps'>): { year: number; from: 'originated' | 'revamp' } | null {
  const ticked = (s.revamps ?? []).filter((r) => r.useForAge && Number.isInteger(r.year)).map((r) => r.year);
  const revamp = ticked.length ? Math.max(...ticked) : undefined;
  if (revamp !== undefined && (s.yearOriginated === undefined || revamp > s.yearOriginated)) return { year: revamp, from: 'revamp' };
  return s.yearOriginated !== undefined ? { year: s.yearOriginated, from: 'originated' } : null;
}

/** "Years of the system": whole years from the age base year to this year. */
export function systemYears(s: Pick<System, 'yearOriginated' | 'revamps'>) {
  const base = ageBaseYear(s);
  return base ? Math.max(0, CURRENT_YEAR - base.year) : null;
}

export interface BuildState {
  developing: boolean;
  decommissioned: boolean;
  /** 0–100; 100 for systems that are built. */
  progress: number;
  age: number | null;
  legacy: boolean;
  look: 'standard' | 'legacy' | 'modern';
  caption: string;
}

export function buildState(s: System): BuildState {
  const developing = isDeveloping(s);
  const decommissioned = isDecommissioned(s);
  const progress = developing ? Math.max(0, Math.min(99, Math.round(s.buildProgress ?? (s.status === 'Planned' ? 0 : 50)))) : 100;
  const base = developing ? null : ageBaseYear(s);
  const age = base ? Math.max(0, CURRENT_YEAR - base.year) : null;
  const legacy = !developing && ((age !== null && age > LEGACY_AGE_YEARS) || decommissioned);
  const look = legacy ? 'legacy' : developing || (age !== null && age <= LEGACY_AGE_YEARS) ? 'modern' : 'standard';
  const caption = developing
    ? progress === 0
      ? 'Planned · 0% built'
      : `${progress}% built`
    : decommissioned
      ? `Decommission${s.decommissionYear ? ` · ${s.decommissionYear}` : ''}`
      : base
        ? `${legacy ? 'Old infrastructure' : 'New'} · ${base.from === 'revamp' ? `revamped ${base.year}` : base.year}`
        : s.status;
  return { developing, decommissioned, progress, age, legacy, look, caption };
}
