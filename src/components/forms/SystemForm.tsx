// Add / edit system form, shared by the Port World dialog and the Studio registry.
import { useState, type FormEvent } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { CRITICALITIES, SYSTEM_CATEGORIES, SYSTEM_STATUSES, type System } from '@/types/domain';
import type { NewSystem } from '@/store/landscape';
import { useLandscape } from '@/store/landscape';
import { activeZones } from '@/lib/metrics';
import { Button } from '@/components/ui';

export function blankSystem(zoneId: string): NewSystem {
  return {
    name: '',
    acronym: '',
    description: '',
    zoneId,
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

type Errors = Partial<Record<'name' | 'acronym' | 'zoneId' | 'docs', string>>;

export function validateSystem(v: NewSystem, all: System[], selfId?: string): Errors {
  const e: Errors = {};
  if (!v.name.trim()) e.name = 'Enter the system name.';
  const ac = v.acronym.trim().toUpperCase();
  if (!/^[A-Z0-9]{2,8}$/.test(ac)) e.acronym = 'Use 2–8 letters or digits, for example TDP.';
  else if (all.some((s) => !s.archived && s.id !== selfId && s.acronym.toUpperCase() === ac)) e.acronym = `${ac} is already used by another system.`;
  if (!v.zoneId) e.zoneId = 'Choose the owning zone.';
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
  const zones = activeZones(useLandscape((s) => s.zones));
  const systems = useLandscape((s) => s.systems);
  const [v, setV] = useState<NewSystem>(initial);
  const [errors, setErrors] = useState<Errors>({});
  const set = <K extends keyof NewSystem>(k: K, val: NewSystem[K]) => setV((x) => ({ ...x, [k]: val }));

  const submit = (ev: FormEvent) => {
    ev.preventDefault();
    const e = validateSystem(v, systems, selfId);
    setErrors(e);
    if (Object.keys(e).length) return;
    onSubmit({
      ...v,
      name: v.name.trim(),
      acronym: v.acronym.trim().toUpperCase(),
      docs: v.docs.filter((d) => d.url.trim()).map((d) => ({ label: d.label.trim() || d.url.trim(), url: d.url.trim() })),
    });
  };

  const err = (k: keyof Errors) => errors[k] && <span className="text-xs font-medium text-red-700">{errors[k]}</span>;

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
        <label className="flex flex-col gap-1">
          <span className="label">System name</span>
          <input id="sys-name" className="input" value={v.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Trade Declaration Portal" />
          {err('name')}
        </label>
        <label className="flex flex-col gap-1">
          <span className="label">Acronym</span>
          <input id="sys-acronym" className="input font-mono uppercase" value={v.acronym} onChange={(e) => set('acronym', e.target.value)} placeholder="TDP" maxLength={8} />
          {err('acronym')}
        </label>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="label">Owning division / zone</span>
          <select id="sys-zone" className="input" value={v.zoneId} onChange={(e) => set('zoneId', e.target.value)}>
            <option value="">Choose a zone…</option>
            {zones.map((z) => (
              <option key={z.id} value={z.id}>
                {z.name}
              </option>
            ))}
          </select>
          {err('zoneId')}
        </label>
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
      </div>
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
