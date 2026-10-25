// Add / edit system form, shared by the Port World dialog and the Studio registry.
import { useState, type FormEvent } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { CRITICALITIES, LEGACY_AGE_YEARS, SYSTEM_CATEGORIES, SYSTEM_STATUSES, type System, type SystemModule, type Zone } from '@/types/domain';
import { CURRENT_YEAR } from '@/lib/systemAge';
import type { NewSystem } from '@/store/landscape';
import { useLandscape } from '@/store/landscape';
import { activeZones } from '@/lib/metrics';
import { Button, Chip, ZoneSwatch, cx } from '@/components/ui';

/** New system displayed in `zoneId`. If that zone is a division it also becomes the owner and first user. */
export function blankSystem(zoneId: string, zones: Zone[] = []): NewSystem {
  const owner = zones.some((z) => z.id === zoneId && z.kind === 'division') ? zoneId : null;
  return {
    name: '',
    acronym: '',
    description: '',
    zoneId,
    owningZoneId: owner,
    usingZoneIds: owner ? [owner] : [],
    businessPurpose: '',
    category: 'Other',
    status: 'Planned',
    criticality: 'Medium',
    techStack: '',
    owner: '',
    endpoints: '',
    docs: [],
  };
}

type Errors = Partial<Record<'name' | 'acronym' | 'zoneId' | 'owningZoneId' | 'usingZoneIds' | 'docs' | 'yearIntroduced' | 'modules', string>>;

export function validateSystem(v: NewSystem, all: System[], selfId?: string, zones: Zone[] = []): Errors {
  const e: Errors = {};
  if (!v.name.trim()) e.name = 'Enter the system name.';
  const ac = v.acronym.trim();
  if (!/^[A-Za-z0-9@.\-]{2,16}$/.test(ac)) e.acronym = 'Use 2–16 letters, digits, @, dot or dash, for example TradeNet5.0.';
  else if (all.some((s) => !s.archived && s.id !== selfId && s.acronym.toUpperCase() === ac.toUpperCase())) e.acronym = `${ac} is already used by another system.`;
  if (v.yearIntroduced !== undefined && (!Number.isInteger(v.yearIntroduced) || v.yearIntroduced < 1980 || v.yearIntroduced > 2050)) e.yearIntroduced = 'Enter a year between 1980 and 2050.';
  if ((v.modules ?? []).some((m) => !m.name.trim())) e.modules = 'Give every module a name.';
  if (!v.zoneId) e.zoneId = 'Choose the zone where the building is displayed.';
  const division = (id: string) => zones.length === 0 || zones.some((z) => z.id === id && z.kind === 'division' && !z.archived);
  if (v.owningZoneId && !division(v.owningZoneId)) e.owningZoneId = 'The owner must be a division, not a shared zone.';
  if (v.usingZoneIds.some((id) => !division(id))) e.usingZoneIds = 'Using divisions must be divisions, not shared zones.';
  const bad = v.docs.find((d) => d.url && !/^https?:\/\/\S+$/i.test(d.url));
  if (bad) e.docs = `“${bad.url}” is not a web address. Start it with https://`;
  return e;
}

export function SystemForm({
  initial,
  selfId,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial: NewSystem;
  selfId?: string;
  submitLabel: string;
  onSubmit: (v: NewSystem) => void;
  onCancel?: () => void;
}) {
  const allZones = useLandscape((s) => s.zones);
  const zones = activeZones(allZones);
  const divisions = zones.filter((z) => z.kind === 'division');
  const systems = useLandscape((s) => s.systems);
  const [v, setV] = useState<NewSystem>(initial);
  const [errors, setErrors] = useState<Errors>({});
  const set = <K extends keyof NewSystem>(k: K, val: NewSystem[K]) => setV((x) => ({ ...x, [k]: val }));
  const developing = v.status === 'Planned' || v.status === 'In Development';
  const age = v.yearIntroduced ? CURRENT_YEAR - v.yearIntroduced : null;
  const ageHint = developing
    ? 'Shown as a new, modern building once built.'
    : age === null
      ? 'Systems older than 5 years look like legacy buildings.'
      : age > LEGACY_AGE_YEARS
        ? `${age} years old: shown as a legacy building.`
        : `${age} year${age === 1 ? '' : 's'} old: shown as a new, modern building.`;

  const submit = (ev: FormEvent) => {
    ev.preventDefault();
    const e = validateSystem(v, systems, selfId, allZones);
    setErrors(e);
    if (Object.keys(e).length) return;
    onSubmit({
      ...v,
      name: v.name.trim(),
      acronym: v.acronym.trim(),
      usingZoneIds: [...new Set(v.usingZoneIds)],
      modules: v.modules?.length ? v.modules.map((m) => ({ ...m, name: m.name.trim(), usingZoneIds: [...new Set(m.usingZoneIds)] })) : undefined,
      buildProgress: v.status === 'Planned' || v.status === 'In Development' ? (v.buildProgress ?? 0) : undefined,
      docs: v.docs.filter((d) => d.url.trim()).map((d) => ({ label: d.label.trim() || d.url.trim(), url: d.url.trim() })),
    });
  };

  const err = (k: keyof Errors) => errors[k] && <span className="text-xs font-medium text-red-700">{errors[k]}</span>;

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      <div className="grid gap-3 sm:grid-cols-[1fr_170px]">
        <label className="flex flex-col gap-1">
          <span className="label">System name</span>
          <input id="sys-name" className="input" value={v.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Trade Declaration Portal" />
          {err('name')}
        </label>
        <label className="flex flex-col gap-1">
          <span className="label">Acronym</span>
          <input id="sys-acronym" className="input font-mono" value={v.acronym} onChange={(e) => set('acronym', e.target.value)} placeholder="TradeNet5.0" maxLength={16} />
          {err('acronym')}
        </label>
      </div>
      <OwnershipFields v={v} setV={setV} divisions={divisions} zones={zones} errors={errors} />
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="label">Category (sets the building type)</span>
          <select id="sys-category" className="input" value={v.category} onChange={(e) => set('category', e.target.value as NewSystem['category'])}>
            {SYSTEM_CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="label">Status</span>
          <select id="sys-status" className="input" value={v.status} onChange={(e) => set('status', e.target.value as NewSystem['status'])}>
            {SYSTEM_STATUSES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="label">Criticality</span>
          <select id="sys-crit" className="input" value={v.criticality} onChange={(e) => set('criticality', e.target.value as NewSystem['criticality'])}>
            {CRITICALITIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="label">{developing ? 'Target go-live year' : 'Go-live year'}</span>
          <input
            id="sys-year"
            type="number"
            className="input num"
            value={v.yearIntroduced ?? ''}
            onChange={(e) => set('yearIntroduced', e.target.value === '' ? undefined : Number(e.target.value))}
            placeholder="e.g. 2014"
          />
          <span className="text-[11px] text-ink-500">{ageHint}</span>
          {err('yearIntroduced')}
        </label>
      </div>
      {developing && (
        <label className="flex flex-col gap-1">
          <span className="label">Development progress: {v.buildProgress ?? 0}%</span>
          <input id="sys-progress" type="range" min={0} max={100} step={5} value={v.buildProgress ?? 0} onChange={(e) => set('buildProgress', Number(e.target.value))} className="accent-navy-800" />
          <span className="text-[11px] text-ink-500">The building in the port is drawn this far through construction. 0% shows an empty fenced site.</span>
        </label>
      )}
      <ModulesEditor v={v} setV={setV} divisions={divisions} />
      {err('modules')}
      <label className="flex flex-col gap-1">
        <span className="label">Description</span>
        <textarea id="sys-desc" className="input min-h-[64px]" value={v.description} onChange={(e) => set('description', e.target.value)} />
      </label>
      <label className="flex flex-col gap-1">
        <span className="label">Business purpose</span>
        <textarea id="sys-purpose" className="input min-h-[64px]" value={v.businessPurpose} onChange={(e) => set('businessPurpose', e.target.value)} />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="label">Technology stack (optional)</span>
          <input id="sys-tech" className="input" value={v.techStack ?? ''} onChange={(e) => set('techStack', e.target.value)} placeholder="e.g. Java, PostgreSQL" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="label">System owner (optional)</span>
          <input id="sys-owner" className="input" value={v.owner ?? ''} onChange={(e) => set('owner', e.target.value)} />
        </label>
      </div>
      <label className="flex flex-col gap-1">
        <span className="label">Integration endpoints (optional)</span>
        <textarea id="sys-endpoints" className="input min-h-[48px] font-mono text-xs" value={v.endpoints ?? ''} onChange={(e) => set('endpoints', e.target.value)} placeholder="One per line" />
      </label>
      <fieldset className="flex flex-col gap-2">
        <legend className="label mb-1">Supporting documentation</legend>
        {v.docs.map((d, i) => (
          <div key={i} className="grid grid-cols-[1fr_1.6fr_auto] gap-2">
            <input id={`doc-label-${i}`} className="input" placeholder="Label" value={d.label} onChange={(e) => set('docs', v.docs.map((x, k) => (k === i ? { ...x, label: e.target.value } : x)))} />
            <input id={`doc-url-${i}`} className="input" placeholder="https://" value={d.url} onChange={(e) => set('docs', v.docs.map((x, k) => (k === i ? { ...x, url: e.target.value } : x)))} />
            <button type="button" className="rounded-md px-2 text-ink-500 hover:bg-red-50 hover:text-red-700" aria-label="Remove link" onClick={() => set('docs', v.docs.filter((_, k) => k !== i))}>
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
        {err('docs')}
        <div>
          <Button type="button" size="sm" icon={Plus} onClick={() => set('docs', [...v.docs, { label: '', url: '' }])}>
            Add link
          </Button>
        </div>
      </fieldset>
      <div className="flex justify-end gap-2 border-t border-ink-200 pt-4">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" variant="primary">
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}

/** Owning division, using divisions and display zone. Shared status is derived, not entered. */
function OwnershipFields({
  v,
  setV,
  divisions,
  zones,
  errors,
}: {
  v: NewSystem;
  setV: React.Dispatch<React.SetStateAction<NewSystem>>;
  divisions: Zone[];
  zones: Zone[];
  errors: Errors;
}) {
  const shared = v.usingZoneIds.filter((id) => divisions.some((d) => d.id === id)).length >= 2;
  const sharedZone = zones.find((z) => z.kind === 'shared');
  const setOwner = (owner: string | null) =>
    setV((x) => ({
      ...x,
      owningZoneId: owner,
      // Placement follows the owner unless the administrator already chose somewhere else.
      zoneId: owner && (!x.zoneId || x.zoneId === x.owningZoneId) ? owner : x.zoneId,
      // Swap the default user along with the owner; keep any users the administrator picked.
      usingZoneIds:
        owner && (x.usingZoneIds.length === 0 || (x.usingZoneIds.length === 1 && x.usingZoneIds[0] === x.owningZoneId))
          ? [owner]
          : x.usingZoneIds,
    }));
  const toggleUser = (id: string) =>
    setV((x) => ({ ...x, usingZoneIds: x.usingZoneIds.includes(id) ? x.usingZoneIds.filter((u) => u !== id) : [...x.usingZoneIds, id] }));
  const err = (k: keyof Errors) => errors[k] && <span className="text-xs font-medium text-red-700">{errors[k]}</span>;

  return (
    <fieldset className="flex flex-col gap-3 rounded-md border border-ink-200 bg-harbor-50/60 p-3">
      <legend className="px-1 text-xs font-semibold text-ink-700">Ownership, usage and placement</legend>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="label">Owning division</span>
          <select id="sys-owner-zone" className="input" value={v.owningZoneId ?? ''} onChange={(e) => setOwner(e.target.value || null)}>
            <option value="">Unassigned (not yet confirmed)</option>
            {divisions.map((z) => (
              <option key={z.id} value={z.id}>
                {z.name}
              </option>
            ))}
          </select>
          {err('owningZoneId')}
        </label>
        <label className="flex flex-col gap-1">
          <span className="label">Display zone (where the building stands)</span>
          <select id="sys-zone" className="input" value={v.zoneId} onChange={(e) => setV((x) => ({ ...x, zoneId: e.target.value }))}>
            <option value="">Choose a zone…</option>
            {zones.map((z) => (
              <option key={z.id} value={z.id}>
                {z.name}
                {z.kind === 'shared' ? ' (shared)' : ''}
                {z.id === v.owningZoneId ? ' (owner)' : ''}
              </option>
            ))}
          </select>
          {err('zoneId')}
        </label>
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="label" id="sys-users-label">
          Using divisions
        </span>
        <div className="flex flex-wrap gap-1.5" role="group" aria-labelledby="sys-users-label">
          {divisions.map((z) => {
            const on = v.usingZoneIds.includes(z.id);
            return (
              <button
                key={z.id}
                id={`sys-user-${z.id}`}
                type="button"
                aria-pressed={on}
                onClick={() => toggleUser(z.id)}
                className={cx(
                  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors',
                  on ? 'border-navy-700 bg-navy-800 text-white' : 'border-ink-200 bg-white text-ink-700 hover:border-ink-300',
                )}
              >
                <ZoneSwatch color={z.color} className="h-2.5 w-2.5" />
                {z.name}
              </button>
            );
          })}
        </div>
        {err('usingZoneIds')}
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs text-ink-700">
        {shared ? <Chip color="#0d9488">Shared system</Chip> : <Chip>Single-division system</Chip>}
        <span>
          {shared
            ? `Used by ${v.usingZoneIds.length} divisions. ${sharedZone && v.zoneId !== sharedZone.id ? `You can display it in ${sharedZone.name}; it is not moved automatically.` : ''}`
            : 'Becomes a shared system when two or more divisions use it.'}
        </span>
      </div>
    </fieldset>
  );
}

const newModuleId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `m-${Date.now()}-${Math.random().toString(16).slice(2)}`;

/** Optional modules: each has a name and its own using divisions. The system's users include all of them. */
function ModulesEditor({ v, setV, divisions }: { v: NewSystem; setV: React.Dispatch<React.SetStateAction<NewSystem>>; divisions: Zone[] }) {
  const modules = v.modules ?? [];
  const [open, setOpen] = useState(modules.length > 0);
  const update = (next: SystemModule[]) => setV((x) => ({ ...x, modules: next }));
  if (!open)
    return (
      <div>
        <Button type="button" size="sm" icon={Plus} onClick={() => setOpen(true)}>
          Split into modules
        </Button>
      </div>
    );
  return (
    <fieldset className="flex flex-col gap-2 rounded-md border border-ink-200 p-3">
      <legend className="px-1 text-xs font-semibold text-ink-700">Modules ({modules.length})</legend>
      <p className="text-xs text-ink-500">Use modules when parts of one system serve different divisions. It stays one building; each module shows as a pod.</p>
      {modules.map((m, i) => (
        <div key={m.id} className="flex flex-col gap-1.5 rounded-md bg-harbor-50/70 p-2">
          <div className="flex gap-2">
            <input
              id={`mod-name-${i}`}
              className="input"
              value={m.name}
              onChange={(e) => update(modules.map((x) => (x.id === m.id ? { ...x, name: e.target.value } : x)))}
              aria-label={`Module ${i + 1} name`}
            />
            <button type="button" className="rounded-md px-2 text-ink-500 hover:bg-red-50 hover:text-red-700" aria-label={`Remove ${m.name}`} onClick={() => update(modules.filter((x) => x.id !== m.id))}>
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
          <div className="flex flex-wrap gap-1">
            {divisions.map((z) => {
              const on = m.usingZoneIds.includes(z.id);
              return (
                <button
                  key={z.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() =>
                    update(modules.map((x) => (x.id === m.id ? { ...x, usingZoneIds: on ? x.usingZoneIds.filter((u) => u !== z.id) : [...x.usingZoneIds, z.id] } : x)))
                  }
                  className={cx('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold', on ? 'border-navy-700 bg-navy-800 text-white' : 'border-ink-200 bg-white text-ink-700')}
                >
                  <ZoneSwatch color={z.color} className="h-2 w-2" />
                  {z.name}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      <div>
        <Button type="button" size="sm" icon={Plus} onClick={() => update([...modules, { id: newModuleId(), name: `Module ${String(modules.length + 1).padStart(2, '0')}`, usingZoneIds: [] }])}>
          Add module
        </Button>
      </div>
    </fieldset>
  );
}
