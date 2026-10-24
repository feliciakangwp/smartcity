// Zone Management: add, edit, move, resize, hide, reorder and archive zones.
import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArchiveRestore, Archive, ArrowDown, ArrowUp, Expand, Eye, EyeOff, MapPin, Pencil, Plus } from 'lucide-react';
import { useLandscape, type NewZone } from '@/store/landscape';
import { availablePlots } from '@/lib/placement';
import type { Zone, ZoneTheme } from '@/types/domain';
import { THEME_LABELS } from '@/data/themes';
import { Button, Chip, ZoneSwatch } from '@/components/ui';
import { Modal } from '@/components/ui/Modal';
import { toast } from '@/components/ui/Toast';
import { PageHead } from './AdminLayout';

const PRESETS = ['#2f7fe0', '#7c5ce0', '#ec7a1c', '#23a35a', '#e9b414', '#2bb3c8', '#e0413f', '#d55181', '#1d3b6e', '#64748b'];

export default function AdminZones() {
  const zones = useLandscape((s) => s.zones);
  const systems = useLandscape((s) => s.systems);
  const plots = useLandscape((s) => s.plots);
  const rings = useLandscape((s) => s.platform.mapRings);
  const { addZone, updateZone, archiveZone, moveZoneOrder, expandMap } = useLandscape();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [editing, setEditing] = useState<Zone | 'new' | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  useEffect(() => {
    const id = params.get('edit');
    const z = id && zones.find((x) => x.id === id);
    if (z) setEditing(z);
  }, [params, zones]);

  const close = () => {
    setEditing(null);
    if (params.has('edit')) setParams({}, { replace: true });
  };

  const free = availablePlots(plots, zones, rings);
  const maxRing = Math.max(...plots.map((p) => p.ring));
  const list = [...zones].filter((z) => showArchived || !z.archived).sort((a, b) => a.sortOrder - b.sortOrder);
  const plotLabel = (id: string) => plots.find((p) => p.id === id)?.label ?? 'Unplaced';

  return (
    <>
      <PageHead
        eyebrow="Zone management"
        title="Zones"
        actions={
          <>
            <Button icon={Expand} disabled={rings >= maxRing} onClick={() => { expandMap(); toast('Port map expanded. New plots are available.'); }}>
              {rings >= maxRing ? 'Map fully expanded' : 'Expand port map'}
            </Button>
            <Button variant="primary" icon={Plus} disabled={free.length === 0} onClick={() => setEditing('new')} title={free.length ? undefined : 'Expand the port map to open more plots'}>
              Add zone
            </Button>
          </>
        }
      >
        Each zone occupies one plot. {free.length} plot{free.length === 1 ? '' : 's'} free{free.length === 0 ? ': expand the port map to open more.' : '.'} Zones never overlap, and moving a zone keeps its systems and integrations.
      </PageHead>

      <label className="mb-3 inline-flex items-center gap-2 text-sm">
        <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} className="h-4 w-4 accent-navy-800" />
        Show archived zones
      </label>

      <div className="overflow-x-auto rounded-[10px] border border-ink-200 bg-white">
        <table className="w-full min-w-[820px] text-sm">
          <thead className="table-head">
            <tr>
              <th className="px-4 py-2">Order</th>
              <th className="px-4 py-2">Zone</th>
              <th className="px-4 py-2">Facility type</th>
              <th className="px-4 py-2">Plot</th>
              <th className="px-4 py-2 text-right">Systems</th>
              <th className="px-4 py-2">Visibility</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {list.map((z, i) => {
              const count = systems.filter((s) => s.zoneId === z.id && !s.archived).length;
              return (
                <tr key={z.id} className={`border-t border-ink-100 ${z.archived ? 'opacity-55' : ''}`}>
                  <td className="px-4 py-2">
                    <div className="flex gap-0.5">
                      <button type="button" className="rounded p-1 hover:bg-ink-100 disabled:opacity-30" disabled={i === 0} onClick={() => moveZoneOrder(z.id, -1)} aria-label={`Move ${z.name} up`}>
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>
                      <button type="button" className="rounded p-1 hover:bg-ink-100 disabled:opacity-30" disabled={i === list.length - 1} onClick={() => moveZoneOrder(z.id, 1)} aria-label={`Move ${z.name} down`}>
                        <ArrowDown className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <ZoneSwatch color={z.color} />
                      <span className="font-semibold">{z.name}</span>
                      {z.kind === 'shared' && <Chip color={z.color}>Shared services</Chip>}
                      {z.archived && <Chip>Archived</Chip>}
                    </div>
                    <div className="max-w-[360px] truncate text-xs text-ink-500">{z.description}</div>
                  </td>
                  <td className="px-4 py-2 text-ink-700">{THEME_LABELS[z.theme]}</td>
                  <td className="px-4 py-2 text-ink-700">{plotLabel(z.plotId)} · {Math.round(z.scale * 100)}%</td>
                  <td className="num px-4 py-2 text-right">{count}</td>
                  <td className="px-4 py-2">
                    <button type="button" className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold hover:bg-ink-100" onClick={() => updateZone(z.id, { visible: !z.visible })}>
                      {z.visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                      {z.visible ? 'Shown' : 'Hidden'}
                    </button>
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="ghost" icon={MapPin} onClick={() => navigate(`/?focus=zone:${z.id}`)} disabled={z.archived || !z.visible}>
                        View
                      </Button>
                      <Button size="sm" variant="ghost" icon={Pencil} onClick={() => setEditing(z)}>
                        Edit
                      </Button>
                      {z.archived ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          icon={ArchiveRestore}
                          onClick={() => {
                            const clash = zones.some((o) => !o.archived && o.plotId === z.plotId);
                            if (clash) return toast(`Plot ${plotLabel(z.plotId)} is taken. Edit the zone and choose a free plot first.`);
                            archiveZone(z.id, false);
                          }}
                        >
                          Restore
                        </Button>
                      ) : (
                        <Button size="sm" variant="ghost" icon={Archive} onClick={() => { archiveZone(z.id); toast(`Archived ${z.name}. Its systems are hidden until it is restored.`); }}>
                          Archive
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {editing && (
        <Modal title={editing === 'new' ? 'Add zone' : `Edit ${editing.name}`} onClose={close}>
          <ZoneForm
            zone={editing === 'new' ? null : editing}
            onCancel={close}
            onSave={(v) => {
              if (editing === 'new') {
                addZone(v);
                toast(`Added ${v.name}. It now appears in the Port World.`);
              } else {
                updateZone(editing.id, v);
                toast(`Saved ${v.name}`);
              }
              close();
            }}
          />
        </Modal>
      )}
    </>
  );
}

function ZoneForm({ zone, onSave, onCancel }: { zone: Zone | null; onSave: (z: NewZone) => void; onCancel: () => void }) {
  const zones = useLandscape((s) => s.zones);
  const plots = useLandscape((s) => s.plots);
  const rings = useLandscape((s) => s.platform.mapRings);
  const options = availablePlots(plots, zones, rings, zone?.id);
  const [v, setV] = useState<NewZone>(
    zone
      ? { name: zone.name, description: zone.description, color: zone.color, theme: zone.theme, kind: zone.kind, plotId: zone.plotId, scale: zone.scale, visible: zone.visible }
      : { name: '', description: '', color: PRESETS[6], theme: 'generic', kind: 'division', plotId: options[0]?.id ?? '', scale: 1, visible: true },
  );
  const [error, setError] = useState('');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!v.name.trim()) return setError('Enter a zone name.');
    if (zones.some((z) => !z.archived && z.id !== zone?.id && z.name.toLowerCase() === v.name.trim().toLowerCase())) return setError('Another zone already has this name.');
    if (!options.some((p) => p.id === v.plotId)) return setError('Choose a free plot.');
    onSave({ ...v, name: v.name.trim() });
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      <label className="flex flex-col gap-1">
        <span className="label">Zone name</span>
        <input id="zone-name" className="input" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} placeholder="e.g. Customer Service Centre" />
      </label>
      <label className="flex flex-col gap-1">
        <span className="label">Description</span>
        <textarea id="zone-desc" className="input min-h-[64px]" value={v.description} onChange={(e) => setV({ ...v, description: e.target.value })} />
      </label>
      <fieldset>
        <legend className="label mb-1.5">Colour</legend>
        <div className="flex flex-wrap items-center gap-2">
          {PRESETS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setV({ ...v, color: c })}
              aria-label={`Colour ${c}`}
              aria-pressed={v.color === c}
              className={`h-7 w-7 rounded-md border-2 ${v.color === c ? 'border-navy-900' : 'border-white'} shadow-sm`}
              style={{ background: c }}
            />
          ))}
          <input id="zone-color" type="color" value={v.color} onChange={(e) => setV({ ...v, color: e.target.value })} className="h-8 w-10 cursor-pointer rounded border border-ink-200" aria-label="Custom colour" />
        </div>
      </fieldset>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="label">Facility type (landmark)</span>
          <select id="zone-theme" className="input" value={v.theme} onChange={(e) => setV({ ...v, theme: e.target.value as ZoneTheme })}>
            {(Object.keys(THEME_LABELS) as ZoneTheme[]).map((t) => (
              <option key={t} value={t}>{THEME_LABELS[t]}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="label">Plot</span>
          <select id="zone-plot" className="input" value={v.plotId} onChange={(e) => setV({ ...v, plotId: e.target.value })}>
            {options.length === 0 && <option value="">No free plots</option>}
            {options.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}{p.id === zone?.plotId ? ' (current)' : ''}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="flex flex-col gap-1">
        <span className="label">Size within plot: {Math.round(v.scale * 100)}%</span>
        <input id="zone-scale" type="range" min={0.6} max={1} step={0.05} value={v.scale} onChange={(e) => setV({ ...v, scale: Number(e.target.value) })} className="accent-navy-800" />
      </label>
      <label className="flex items-start gap-2 text-sm">
        <input id="zone-kind" type="checkbox" checked={v.kind === 'shared'} onChange={(e) => setV({ ...v, kind: e.target.checked ? 'shared' : 'division' })} className="mt-0.5 h-4 w-4 accent-navy-800" />
        <span>
          Shared services zone
          <span className="block text-xs text-ink-500">Displays cross-division systems. It is not a division, so it cannot own or use systems.</span>
        </span>
      </label>
      <label className="inline-flex items-center gap-2 text-sm">
        <input id="zone-visible" type="checkbox" checked={v.visible} onChange={(e) => setV({ ...v, visible: e.target.checked })} className="h-4 w-4 accent-navy-800" />
        Show this zone in the Port World
      </label>
      {error && <p className="text-sm font-medium text-red-700">{error}</p>}
      <div className="flex justify-end gap-2 border-t border-ink-200 pt-4">
        <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button type="submit" variant="primary">{zone ? 'Save zone' : 'Add zone'}</Button>
      </div>
    </form>
  );
}
