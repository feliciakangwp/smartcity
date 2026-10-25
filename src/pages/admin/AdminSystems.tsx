// System Registry: add, edit, relocate and archive systems.
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Archive, ArchiveRestore, MapPin, Pencil, Plus, Search } from 'lucide-react';
import { useLandscape } from '@/store/landscape';
import { activeZones, isShared, owningDivision, usingDivisions } from '@/lib/metrics';
import { SYSTEM_STATUSES, type System } from '@/types/domain';
import { Button, Chip, StatusChip, ZoneSwatch } from '@/components/ui';
import { Modal } from '@/components/ui/Modal';
import { toast } from '@/components/ui/Toast';
import { SystemForm, blankSystem } from '@/components/forms/SystemForm';
import { PageHead } from './AdminLayout';

export default function AdminSystems() {
  const zonesAll = useLandscape((s) => s.zones);
  const systems = useLandscape((s) => s.systems);
  const { addSystem, updateSystem, archiveSystem } = useLandscape();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [editing, setEditing] = useState<System | 'new' | null>(null);
  const [q, setQ] = useState('');
  const [zone, setZone] = useState('');
  const [status, setStatus] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const zones = activeZones(zonesAll);
  const zoneById = new Map(zonesAll.map((z) => [z.id, z]));

  useEffect(() => {
    if (params.get('new')) setEditing('new');
    const id = params.get('edit');
    const s = id && systems.find((x) => x.id === id);
    if (s) setEditing(s);
  }, [params, systems]);

  const close = () => {
    setEditing(null);
    if (params.toString()) setParams({}, { replace: true });
  };

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return systems
      .filter((s) => (showArchived || !s.archived) && (!zone || s.zoneId === zone) && (!status || s.status === status))
      .filter((s) => !term || s.name.toLowerCase().includes(term) || s.acronym.toLowerCase().includes(term))
      .sort((a, b) => a.acronym.localeCompare(b.acronym));
  }, [systems, q, zone, status, showArchived]);

  return (
    <>
      <PageHead eyebrow="System registry" title="Systems" actions={<Button variant="primary" icon={Plus} onClick={() => setEditing('new')} disabled={!zones.length}>Add system</Button>}>
        Each system becomes a building in its zone. The category sets the building type; changing the zone relocates the building and keeps its integrations.
      </PageHead>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <label className="flex min-w-[220px] flex-1 items-center gap-2 rounded-md border border-ink-200 bg-surface px-3">
          <Search className="h-4 w-4 text-ink-500" aria-hidden />
          <input id="reg-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or acronym" className="min-w-0 flex-1 bg-transparent py-2 text-sm outline-none" />
        </label>
        <select id="reg-zone" className="input w-auto" value={zone} onChange={(e) => setZone(e.target.value)} aria-label="Filter by zone">
          <option value="">All zones</option>
          {zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
        </select>
        <select id="reg-status" className="input w-auto" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status">
          <option value="">All statuses</option>
          {SYSTEM_STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
        <label className="inline-flex items-center gap-2 text-sm">
          <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} className="h-4 w-4 accent-navy-800" /> Archived
        </label>
      </div>

      <div className="overflow-x-auto rounded-[10px] border border-ink-200 bg-surface">
        <table className="w-full min-w-[820px] text-sm">
          <thead className="table-head">
            <tr>
              <th className="px-4 py-2">System</th>
              <th className="px-4 py-2">Display zone</th>
              <th className="px-4 py-2">Owner · users</th>
              <th className="px-4 py-2">Category</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Updated</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => {
              const z = zoneById.get(s.zoneId);
              return (
                <tr key={s.id} className={`border-t border-ink-100 ${s.archived ? 'opacity-55' : ''}`}>
                  <td className="px-4 py-2">
                    <span className="mr-2 font-mono text-xs font-semibold text-heading-soft">{s.acronym}</span>
                    <span className="font-semibold">{s.name}</span>
                    {s.archived && <Chip className="ml-2">Archived</Chip>}
                  </td>
                  <td className="px-4 py-2"><span className="flex items-center gap-2"><ZoneSwatch color={z?.color ?? '#999'} />{z?.name}</span></td>
                  <td className="px-4 py-2">
                    <span className="flex flex-wrap items-center gap-1.5 text-xs text-ink-700">
                      {(() => {
                        const owner = owningDivision(s, zonesAll);
                        return owner ? zoneById.get(owner)?.name : <Chip>Unassigned</Chip>;
                      })()}
                      <span className="text-ink-300">·</span>
                      <span className="num">{usingDivisions(s, zonesAll).length} using</span>
                      {isShared(s, zonesAll) && <Chip color="#0d9488">Shared</Chip>}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-ink-700">{s.category}</td>
                  <td className="px-4 py-2"><StatusChip status={s.status} /></td>
                  <td className="num px-4 py-2 text-ink-500">{new Date(s.updatedAt).toLocaleDateString()}</td>
                  <td className="px-4 py-2">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="ghost" icon={MapPin} disabled={s.archived} onClick={() => navigate(`/world?focus=system:${s.id}`)}>View</Button>
                      <Button size="sm" variant="ghost" icon={Pencil} onClick={() => setEditing(s)}>Edit</Button>
                      {s.archived ? (
                        <Button size="sm" variant="ghost" icon={ArchiveRestore} onClick={() => archiveSystem(s.id, false)}>Restore</Button>
                      ) : (
                        <Button size="sm" variant="ghost" icon={Archive} onClick={() => { archiveSystem(s.id); toast(`Archived ${s.acronym}. Its building is removed from the port.`); }}>Archive</Button>
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
        <Modal title={editing === 'new' ? 'Add system' : `Edit ${editing.acronym}`} onClose={close} wide>
          <SystemForm
            initial={editing === 'new' ? blankSystem(zones[0]?.id ?? '', zones) : { ...blankSystem(editing.zoneId), ...editing }}
            selfId={editing === 'new' ? undefined : editing.id}
            submitLabel={editing === 'new' ? 'Add system' : 'Save changes'}
            onCancel={close}
            onSubmit={(v) => {
              if (editing === 'new') {
                addSystem(v);
                toast(`Added ${v.acronym}. Its building is now in the port.`);
              } else {
                // A move to another zone takes the next free slot there.
                updateSystem(editing.id, { ...v, slot: v.zoneId === editing.zoneId ? editing.slot : undefined });
                toast(`Saved ${v.acronym}`);
              }
              close();
            }}
          />
        </Modal>
      )}
    </>
  );
}
