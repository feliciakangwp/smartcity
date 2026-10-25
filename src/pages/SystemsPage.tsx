// Systems: every system grouped into fully developed and still developing.
// Select a system to see its details and edit them.
import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AlertTriangle, MapPin, Pencil, Plus, Search } from 'lucide-react';
import { useLandscape } from '@/store/landscape';
import { activeSystems, activeZones, isShared, matchesFilter, owningDivision, usingDivisions, type SystemFilter } from '@/lib/metrics';
import { buildState, isDeveloping } from '@/lib/systemAge';
import { brokenLinks, dataFlowPairs } from '@/lib/dataFlows';
import { SYSTEM_CATEGORIES, SYSTEM_STATUSES, type System } from '@/types/domain';
import { Button, Chip, Empty, StatusChip, ZoneSwatch } from '@/components/ui';
import { Modal } from '@/components/ui/Modal';
import { toast } from '@/components/ui/Toast';
import { SystemForm, blankSystem } from '@/components/forms/SystemForm';
import { BuildSummary, DataFlowList } from '@/components/systems/SystemFacts';

export default function SystemsPage() {
  const zonesAll = useLandscape((s) => s.zones);
  const systemsAll = useLandscape((s) => s.systems);
  const { addSystem, updateSystem } = useLandscape();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState('');
  const [zone, setZone] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [usage, setUsage] = useState<SystemFilter>('all');
  const [editing, setEditing] = useState(false);

  const zones = activeZones(zonesAll);
  const zoneById = new Map(zones.map((z) => [z.id, z]));
  const systems = activeSystems(systemsAll, zonesAll);
  const pairs = useMemo(() => dataFlowPairs(systems), [systems]);
  const broken = brokenLinks(pairs);
  const brokenCount = (id: string) => broken.filter((p) => p.fromId === id || p.toId === id).length;

  // The open system lives in the URL (?system=<id>, or ?new=1) so it can be linked to.
  const openId = params.get('system');
  const creating = params.get('new') === '1';
  const open = openId ? systemsAll.find((s) => s.id === openId && !s.archived) : undefined;
  const openSystem = (id: string, edit = false) => {
    setEditing(edit);
    setParams({ system: id });
  };
  const close = () => {
    setEditing(false);
    setParams({}, { replace: true });
  };

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return systems
      .filter((s) => (!zone || s.zoneId === zone) && (!category || s.category === category) && (!status || s.status === status))
      .filter((s) => matchesFilter(s, zonesAll, usage))
      .filter((s) => !term || [s.name, s.acronym, s.description, s.businessPurpose, s.owner ?? '', s.productTeam ?? ''].some((f) => f.toLowerCase().includes(term)))
      .sort((a, b) => (zoneById.get(a.zoneId)?.sortOrder ?? 0) - (zoneById.get(b.zoneId)?.sortOrder ?? 0) || a.acronym.localeCompare(b.acronym));
  }, [systems, q, zone, category, status, usage, zonesAll, zoneById]);

  const developed = rows.filter((s) => !isDeveloping(s));
  const developing = rows.filter((s) => isDeveloping(s));

  const table = (list: System[], kind: 'developed' | 'developing') => (
    <div className="overflow-x-auto rounded-[10px] border border-ink-200 bg-surface">
      {list.length === 0 ? (
        <div className="p-4">
          <Empty>{kind === 'developed' ? 'No fully developed systems match these filters.' : 'No systems in development match these filters.'}</Empty>
        </div>
      ) : (
        <table className="w-full min-w-[980px] text-sm">
          <thead className="table-head whitespace-nowrap">
            <tr>
              <th className="px-4 py-2">System</th>
              <th className="px-4 py-2">Display zone</th>
              <th className="px-4 py-2">Product team</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">{kind === 'developed' ? 'Years' : 'Progress'}</th>
              <th className="px-4 py-2">Owner · users</th>
              <th className="px-4 py-2">Data tally</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {list.map((s) => {
              const z = zoneById.get(s.zoneId);
              const b = buildState(s);
              const n = brokenCount(s.id);
              const flows = pairs.filter((p) => p.fromId === s.id || p.toId === s.id).length;
              return (
                <tr
                  key={s.id}
                  className="cursor-pointer border-t border-ink-100 hover:bg-harbor-50/60"
                  onClick={() => openSystem(s.id)}
                  onKeyDown={(e) => e.key === 'Enter' && openSystem(s.id)}
                  tabIndex={0}
                  aria-label={`Open ${s.name}`}
                >
                  <td className="px-4 py-2.5">
                    <div className="flex items-baseline gap-2">
                      <span className="min-w-[4.5rem] shrink-0 font-mono text-xs font-semibold text-heading-soft">{s.acronym}</span>
                      <span>
                        <span className="font-semibold">{s.name}</span>
                        <span className="block max-w-[260px] truncate text-xs text-ink-500">{s.businessPurpose}</span>
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="flex items-center gap-2 whitespace-nowrap">
                      <ZoneSwatch color={z?.color ?? '#999'} />
                      {z?.name}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-ink-700">{s.productTeam || <span className="text-ink-300">—</span>}</td>
                  <td className="px-4 py-2.5">
                    <StatusChip status={s.status} />
                  </td>
                  <td className="px-4 py-2.5 text-ink-700">
                    {kind === 'developing' ? (
                      <span className="flex items-center gap-2">
                        <span className="h-1.5 w-20 overflow-hidden rounded-full bg-ink-100">
                          <span className="block h-full rounded-full bg-harbor-500" style={{ width: `${b.progress}%` }} />
                        </span>
                        <span className="num text-xs">{b.progress}%</span>
                      </span>
                    ) : b.age !== null ? (
                      <span className="num flex items-center gap-1.5 whitespace-nowrap">
                        {b.age} yr{b.age === 1 ? '' : 's'}
                        {b.decommissioned ? <Chip color="#b45309">Decommission</Chip> : b.legacy ? <Chip color="#9a6b4f">Old</Chip> : <Chip color="#22c3e6">New</Chip>}
                      </span>
                    ) : (
                      <span className="text-ink-300">Not recorded</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-ink-700">
                    <span className="flex flex-wrap items-center gap-1.5">
                      {owningDivision(s, zonesAll) ? zoneById.get(owningDivision(s, zonesAll)!)?.name : <Chip>Unassigned</Chip>}
                      <span className="text-ink-300">·</span>
                      <span className="num">{usingDivisions(s, zonesAll).length} using</span>
                      {isShared(s, zonesAll) && <Chip color="#0d9488">Shared</Chip>}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    {n > 0 ? (
                      <Chip color="#dc2626">
                        {n} broken link{n === 1 ? '' : 's'}
                      </Chip>
                    ) : flows > 0 ? (
                      <Chip color="#1f9d55">Matches</Chip>
                    ) : (
                      <span className="text-xs text-ink-300">No data listed</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
                    <span className="inline-flex gap-1">
                      <Button size="sm" variant="ghost" icon={Pencil} onClick={() => openSystem(s.id, true)} aria-label={`Edit ${s.name}`}>
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={MapPin}
                        onClick={() => navigate(`/world?focus=system:${s.id}`)}
                        aria-label={`Show ${s.name} in Port World`}
                        title="Show in Port World"
                      />
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );

  return (
    <div className="h-full overflow-y-auto">
      <div className="page-wide py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="eyebrow">Systems</div>
            <h1 className="mt-1 text-3xl font-bold text-heading">All systems</h1>
            <p className="mt-1 text-sm text-ink-700">
              {systems.length} systems across {zones.length} zones: {systems.filter((s) => !isDeveloping(s)).length} fully developed, {systems.filter(isDeveloping).length} still developing. Select a system to see and edit its details.
            </p>
          </div>
          <Button variant="primary" icon={Plus} onClick={() => setParams({ new: '1' })} disabled={!zones.length}>
            Add system
          </Button>
        </div>

        {broken.length > 0 && (
          <div className="mt-4 flex items-start gap-2 rounded-[10px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="status" id="broken-banner">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>
              <b>
                {broken.length} broken link{broken.length === 1 ? '' : 's'}
              </b>{' '}
              in the input / output tally. One system lists data that the other system does not list. Open the system to fix it; in the Port World a broken-down van marks each one.
            </span>
          </div>
        )}

        <div className="mt-6 flex flex-wrap gap-2">
          <label className="flex min-w-[220px] flex-1 items-center gap-2 rounded-md border border-ink-200 bg-surface px-3">
            <Search className="h-4 w-4 text-ink-500" aria-hidden />
            <input id="dir-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, acronym, team or purpose" className="min-w-0 flex-1 bg-transparent py-2 text-sm outline-none" />
          </label>
          <select id="dir-zone" className="input w-auto" value={zone} onChange={(e) => setZone(e.target.value)} aria-label="Filter by zone">
            <option value="">All zones</option>
            {zones.map((z) => (
              <option key={z.id} value={z.id}>
                {z.name}
              </option>
            ))}
          </select>
          <select id="dir-category" className="input w-auto" value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Filter by category">
            <option value="">All categories</option>
            {SYSTEM_CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <select id="dir-usage" className="input w-auto" value={usage} onChange={(e) => setUsage(e.target.value as SystemFilter)} aria-label="Filter by ownership">
            <option value="all">All ownership</option>
            <option value="owned">Division-owned</option>
            <option value="shared">Shared</option>
            <option value="unassigned">Unassigned owner</option>
          </select>
          <select id="dir-status" className="input w-auto" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status">
            <option value="">All statuses</option>
            {SYSTEM_STATUSES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>

        <section className="mt-6" aria-labelledby="grp-developed">
          <h2 id="grp-developed" className="mb-2 flex items-baseline gap-2 text-lg font-bold text-heading">
            Fully developed <span className="num text-sm font-semibold text-ink-500">{developed.length}</span>
          </h2>
          {table(developed, 'developed')}
        </section>
        <section className="mt-8" aria-labelledby="grp-developing">
          <h2 id="grp-developing" className="mb-2 flex items-baseline gap-2 text-lg font-bold text-heading">
            Still developing <span className="num text-sm font-semibold text-ink-500">{developing.length}</span>
          </h2>
          {table(developing, 'developing')}
        </section>
      </div>

      {open && (
        <Modal title={editing ? `Edit ${open.acronym}` : `${open.acronym} · ${open.name}`} onClose={close} xwide={editing} wide={!editing}>
          {editing ? (
            <SystemForm
              key={open.id}
              initial={{ ...blankSystem(open.zoneId), ...open }}
              selfId={open.id}
              submitLabel="Save changes"
              onCancel={() => setEditing(false)}
              onSubmit={(v) => {
                updateSystem(open.id, v);
                toast(`Saved ${v.acronym}.`);
                setEditing(false);
              }}
            />
          ) : (
            <SystemDetail system={open} systems={systems} onEdit={() => setEditing(true)} onSelect={(id) => openSystem(id)} onShow={() => navigate(`/world?focus=system:${open.id}`)} />
          )}
        </Modal>
      )}
      {creating && (
        <Modal title="Add system" onClose={close} xwide>
          <SystemForm
            initial={blankSystem(zones[0]?.id ?? '', zones)}
            submitLabel="Add system"
            onCancel={close}
            onSubmit={(v) => {
              const id = addSystem(v);
              toast(`Added ${v.acronym}. Its building is now in the port.`);
              setParams({ system: id }, { replace: true });
            }}
          />
        </Modal>
      )}
    </div>
  );
}

function SystemDetail({
  system,
  systems,
  onEdit,
  onSelect,
  onShow,
}: {
  system: System;
  systems: System[];
  onEdit: () => void;
  onSelect: (id: string) => void;
  onShow: () => void;
}) {
  const zones = useLandscape((s) => s.zones);
  const zoneById = new Map(zones.map((z) => [z.id, z]));
  const owner = owningDivision(system, zones);
  const fact = (label: string, value: React.ReactNode) => (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-ink-500">{label}</dt>
      <dd className="text-sm font-medium">{value || <span className="text-ink-300">—</span>}</dd>
    </div>
  );
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap gap-1.5">
        <StatusChip status={system.status} />
        {isShared(system, zones) && <Chip color="#0d9488">Shared system</Chip>}
        <Chip>{system.category}</Chip>
        <Chip>{system.criticality}</Chip>
      </div>
      <p className="text-sm text-ink-700">{system.businessPurpose || system.description}</p>
      <dl className="grid gap-3 sm:grid-cols-3">
        {fact('Project / Product Team', system.productTeam)}
        {fact('Display zone', zoneById.get(system.zoneId)?.name)}
        {fact('Owning division', owner ? zoneById.get(owner)?.name : 'Unassigned')}
        {fact('System owner', system.owner)}
        {fact('Technology', system.techStack)}
        {fact('Using divisions', usingDivisions(system, zones).map((id) => zoneById.get(id)?.name).join(', '))}
      </dl>
      <section className="rounded-md border border-ink-200 bg-harbor-50/60 p-3">
        <h3 className="mb-2 text-sm font-semibold">Age and lifecycle</h3>
        <BuildSummary system={system} />
      </section>
      <DataFlowList system={system} systems={systems} onSelect={onSelect} />
      <div className="flex justify-end gap-2 border-t border-ink-200 pt-4">
        <Button variant="ghost" icon={MapPin} onClick={onShow}>
          Show in Port World
        </Button>
        <Button variant="primary" icon={Pencil} onClick={onEdit} id="sys-edit">
          Edit system
        </Button>
      </div>
    </div>
  );
}
