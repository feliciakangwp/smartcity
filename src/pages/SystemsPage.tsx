// System Directory: searchable, filterable list of every system.
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MapPin, Search } from 'lucide-react';
import { useLandscape } from '@/store/landscape';
import { activeIntegrations, activeSystems, activeZones, isShared, matchesFilter, owningDivision, usingDivisions, type SystemFilter } from '@/lib/metrics';
import { SYSTEM_CATEGORIES, SYSTEM_STATUSES } from '@/types/domain';
import { Button, Chip, Empty, StatusChip, ZoneSwatch } from '@/components/ui';

export default function SystemsPage() {
  const zonesAll = useLandscape((s) => s.zones);
  const systemsAll = useLandscape((s) => s.systems);
  const integrationsAll = useLandscape((s) => s.integrations);
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [zone, setZone] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [usage, setUsage] = useState<SystemFilter>('all');

  const zones = activeZones(zonesAll);
  const zoneById = new Map(zones.map((z) => [z.id, z]));
  const systems = activeSystems(systemsAll, zonesAll);
  const ints = activeIntegrations(integrationsAll, systems);

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return systems
      .filter((s) => (!zone || s.zoneId === zone) && (!category || s.category === category) && (!status || s.status === status))
      .filter((s) => matchesFilter(s, zonesAll, usage))
      .filter((s) => !term || [s.name, s.acronym, s.description, s.businessPurpose, s.owner ?? ''].some((f) => f.toLowerCase().includes(term)))
      .sort((a, b) => (zoneById.get(a.zoneId)?.sortOrder ?? 0) - (zoneById.get(b.zoneId)?.sortOrder ?? 0) || a.acronym.localeCompare(b.acronym));
  }, [systems, q, zone, category, status, usage, zonesAll, zoneById]);

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="eyebrow">System directory</div>
            <h1 className="mt-1 text-3xl font-bold text-navy-900">Every system in the port</h1>
            <p className="mt-1 text-sm text-ink-700">{systems.length} systems across {zones.length} zones. Select one to see it in the Port World.</p>
          </div>
          <Link to="/admin/systems?new=1">
            <Button variant="primary">Add system</Button>
          </Link>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <label className="flex min-w-[220px] flex-1 items-center gap-2 rounded-md border border-ink-200 bg-white px-3">
            <Search className="h-4 w-4 text-ink-500" aria-hidden />
            <input id="dir-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, acronym or purpose" className="min-w-0 flex-1 bg-transparent py-2 text-sm outline-none" />
          </label>
          <select id="dir-zone" className="input w-auto" value={zone} onChange={(e) => setZone(e.target.value)} aria-label="Filter by zone">
            <option value="">All zones</option>
            {zones.map((z) => (
              <option key={z.id} value={z.id}>{z.name}</option>
            ))}
          </select>
          <select id="dir-category" className="input w-auto" value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Filter by category">
            <option value="">All categories</option>
            {SYSTEM_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
          <select id="dir-usage" className="input w-auto" value={usage} onChange={(e) => setUsage(e.target.value as SystemFilter)} aria-label="Filter by ownership">
            <option value="all">All ownership</option>
            <option value="owned">Division-owned</option>
            <option value="shared">Shared</option>
            <option value="unassigned">Unassigned owner</option>
          </select>
          <select id="dir-status" className="input w-auto" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status">
            <option value="">All statuses</option>
            {SYSTEM_STATUSES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>

        <div className="mt-4 overflow-x-auto rounded-[10px] border border-ink-200 bg-white">
          {rows.length === 0 ? (
            <div className="p-4"><Empty>No systems match these filters.</Empty></div>
          ) : (
            <table className="w-full min-w-[960px] text-sm">
              <thead className="table-head">
                <tr>
                  <th className="px-4 py-2">System</th>
                  <th className="px-4 py-2">Display zone</th>
                  <th className="px-4 py-2">Owner · users</th>
                  <th className="px-4 py-2">Category</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Criticality</th>
                  <th className="px-4 py-2 text-right">Links in / out</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody>
                {rows.map((s) => {
                  const z = zoneById.get(s.zoneId);
                  const inn = ints.filter((i) => i.destinationId === s.id).length;
                  const out = ints.filter((i) => i.sourceId === s.id).length;
                  return (
                    <tr key={s.id} className="border-t border-ink-100 hover:bg-harbor-50/60">
                      <td className="px-4 py-2.5">
                        <div className="flex items-baseline gap-2">
                          <span className="w-12 shrink-0 font-mono text-xs font-semibold text-navy-700">{s.acronym}</span>
                          <span>
                            <span className="font-semibold">{s.name}</span>
                            <span className="block max-w-[340px] truncate text-xs text-ink-500">{s.businessPurpose}</span>
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="flex items-center gap-2"><ZoneSwatch color={z?.color ?? '#999'} />{z?.name}</span>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-ink-700">
                        <span className="flex flex-wrap items-center gap-1.5">
                          {owningDivision(s, zonesAll) ? zoneById.get(owningDivision(s, zonesAll)!)?.name : <Chip>Unassigned</Chip>}
                          <span className="text-ink-300">·</span>
                          <span className="num">{usingDivisions(s, zonesAll).length} using</span>
                          {isShared(s, zonesAll) && <Chip color="#0d9488">Shared</Chip>}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-ink-700">{s.category}</td>
                      <td className="px-4 py-2.5"><StatusChip status={s.status} /></td>
                      <td className="px-4 py-2.5"><Chip>{s.criticality}</Chip></td>
                      <td className="num px-4 py-2.5 text-right">{inn} / {out}</td>
                      <td className="px-4 py-2.5 text-right">
                        <Button size="sm" variant="ghost" icon={MapPin} onClick={() => navigate(`/?focus=system:${s.id}`)}>
                          Show in port
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
