// Age and build state of a system, used for its look in the port and in panels.
import { LEGACY_AGE_YEARS, type System } from '@/types/domain';

export const CURRENT_YEAR = new Date().getFullYear();

export interface BuildState {
  developing: boolean;
  /** 0–100; 100 for systems that are built. */
  progress: number;
  age: number | null;
  legacy: boolean;
  look: 'standard' | 'legacy' | 'modern';
  caption: string;
}

export function buildState(s: System): BuildState {
  const developing = s.status === 'Planned' || s.status === 'In Development';
  const progress = developing ? Math.max(0, Math.min(99, Math.round(s.buildProgress ?? (s.status === 'Planned' ? 0 : 50)))) : 100;
  const age = s.yearIntroduced ? CURRENT_YEAR - s.yearIntroduced : null;
  const legacy = !developing && age !== null && age > LEGACY_AGE_YEARS;
  const look = legacy ? 'legacy' : developing || (age !== null && age <= LEGACY_AGE_YEARS) ? 'modern' : 'standard';
  const caption = developing
    ? progress === 0
      ? 'Planned · 0% built'
      : `${progress}% built`
    : legacy
      ? `Legacy · since ${s.yearIntroduced}`
      : s.yearIntroduced
        ? `New · ${s.yearIntroduced}`
        : s.status;
  return { developing, progress, age, legacy, look, caption };
}
