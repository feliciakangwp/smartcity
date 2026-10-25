// Expanded dashboard: landscape, integration, journey and impact views.
// Every figure is computed from the stored zone, system and integration records.
import { useMemo, useState } from 'react';
import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Crosshair, X } from 'lucide-react';
import { useWorld } from '@/store/world';
import { STATUS_COLORS, impactOf, owningDivision, usingDivisions } from '@/lib/metrics';
import { Button, Chip, Empty, StatusChip, ZoneSwatch } from '@/components/ui';
import { useSummary } from './useSummary';
import { chartInk, useTheme } from '@/lib/theme';

const BLUE = '#2a78d6';
const CRIT: Record<string, string> = { Low: '#86b6ef', Medium: '#3987e5', High: '#256abf', 'Mission Critical': '#104281' };

interface Datum {
  name: string;
  value: number;
  color?: string;
}

function HBar({ data, color, label }: { data: Datum[]; color?: (d: Datum) => string; label: string }) {
  const ink = chartInk(useTheme((t) => t.theme));
  if (!data.length) return <Empty>No records yet.</Empty>;
  return (
    <div role="img" aria-label={`${label}: ${data.map((d) => `${d.name} ${d.value}`).join(', ')}`}>
      <ResponsiveContainer width="100%" height={data.length * 30 + 8}>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 34, bottom: 0, left: 0 }} barCategoryGap={6}>
          <XAxis type="number" hide allowDecimals={false} />
          <YAxis type="category" dataKey="name" width={150} tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: ink.text }} />
          <Tooltip cursor={{ fill: 'rgba(30,127,216,0.06)' }} contentStyle={{ borderRadius: 8, border: `1px solid ${ink.border}`, background: ink.bg, color: ink.strong, fontSize: 12 }} formatter={(v: number) => [v, label]} />
          <Bar dataKey="value" barSize={14} radius={[0, 4, 4, 0]} isAnimationActive={false}>
            {data.map((d) => (
              <Cell key={d.name} fill={color ? color(d) : BLUE} />
            ))}
            <LabelList dataKey="value" position="right" style={{ fontSize: 12, fill: ink.strong, fontWeight: 600 }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function Section({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="flex min-w-0 flex-col gap-4">
      <div>
        <h2 className="text-lg font-bold text-heading">{title}</h2>
        {note && <p className="mt-0.5 text-xs text-ink-500">{note}</p>}
      </div>
      {children}
    </section>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0 rounded-[10px] border border-ink-200 bg-surface p-4">
      <h3 className="mb-3 text-sm font-semibold text-ink-900">{title}</h3>
      {children}
    </div>
  );
}

export function DashboardContent({ onHighlight, onFocusSystem }: { onHighlight?: () => void; onFocusSystem?: (systemId: string) => void }) {
  const s = useSummary();
  const systemsById = useMemo(() => new Map(s.systems.map((x) => [x.id, x])), [s.systems]);
  const zoneById = useMemo(() => new Map(s.zones.map((z) => [z.id, z])), [s.zones]);

  return (
    <div className="flex flex-col gap-8">
      <p className="rounded-md border border-ink-200 bg-harbor-50 px-3 py-2 text-xs text-ink-700">
        Figures are counts from the system register. They describe the landscape, not live operational performance.
      </p>

      <Section title="ICT landscape overview">
        <div className="grid gap-4 lg:grid-cols-2">
          <Card title="Systems by display zone">
            <HBar data={s.byZone} color={(d) => d.color ?? BLUE} label="Systems" />
          </Card>
          <Card title="Systems by category">
            <HBar data={s.byCategory} label="Systems" />
          </Card>
          <Card title="Systems by status">
            <HBar data={s.byStatus} color={(d) => STATUS_COLORS[d.name]} label="Systems" />
          </Card>
          <Card title="Systems by criticality">
            <HBar data={s.byCriticality} color={(d) => CRIT[d.name]} label="Systems" />
          </Card>
          <Card title="Systems by age">
            <HBar data={s.byAge} color={(d) => d.color ?? BLUE} label="Systems" />
          </Card>
        </div>
      </Section>

      <SharedSection onFocusSystem={onFocusSystem} />

      <Section title="Integration landscape">
        <div className="grid gap-4 lg:grid-cols-3">
          <Card title="Totals">
            <dl className="grid grid-cols-2 gap-3">
              <div>
                <dt className="text-xs text-ink-500">Integrations</dt>
                <dd className="num font-display text-3xl font-bold text-heading">{s.totals.integrations}</dd>
              </div>
              <div>
                <dt className="text-xs text-ink-500">Cross-division</dt>
                <dd className="num font-display text-3xl font-bold text-heading">{s.totals.crossDivision}</dd>
              </div>
            </dl>
            <p className="mt-3 text-xs text-ink-500">Cross-division integrations connect systems in different zones.</p>
          </Card>
          <Card title="Integration mechanisms">
            <HBar data={s.byMechanism} label="Integrations" />
          </Card>
          <Card title="Systems with most dependencies">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-ink-500">
                  <th className="pb-1 font-mono font-medium">System</th>
                  <th className="pb-1 text-right font-mono font-medium">In</th>
                  <th className="pb-1 text-right font-mono font-medium">Out</th>
                </tr>
              </thead>
              <tbody>
                {s.mostConnected.map((m) => (
                  <tr key={m.system.id} className="border-t border-ink-100">
                    <td className="py-1.5">
                      <span className="flex items-center gap-2">
                        <ZoneSwatch color={zoneById.get(m.system.zoneId)?.color ?? '#999'} />
                        <span className="font-semibold">{m.system.acronym}</span>
                        <span className="truncate text-ink-500">{m.system.name}</span>
                      </span>
                    </td>
                    <td className="num py-1.5 text-right">{m.in}</td>
                    <td className="num py-1.5 text-right">{m.out}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      </Section>

      <Section title="Data journey overview" note="Demonstration journeys use placeholder systems. Animated playback arrives in Phase 3.">
        <div className="overflow-x-auto rounded-[10px] border border-ink-200 bg-surface">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="table-head">
              <tr>
                <th className="px-4 py-2">Journey</th>
                <th className="px-4 py-2 text-right">Steps</th>
                <th className="px-4 py-2 text-right">Branches</th>
                <th className="px-4 py-2">Participating systems</th>
                <th className="px-4 py-2">State</th>
              </tr>
            </thead>
            <tbody>
              {s.journeys.map((j) => {
                const ints = s.integrations;
                const ids = new Set<string>();
                for (const ref of [...j.steps.map((x) => x.integrationId), ...j.branches.map((b) => b.integrationId)]) {
                  const i = ints.find((x) => x.id === ref);
                  if (i) [i.sourceId, i.destinationId, ...i.via].forEach((id) => ids.add(id));
                }
                return (
                  <tr key={j.id} className="border-t border-ink-100 align-top">
                    <td className="px-4 py-2.5">
                      <span className="font-mono text-xs text-ink-500">{j.code}</span> <span className="font-semibold">{j.name}</span>
                    </td>
                    <td className="num px-4 py-2.5 text-right">{j.steps.length}</td>
                    <td className="num px-4 py-2.5 text-right">{j.branches.length}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex flex-wrap gap-1">
                        {[...ids].map((id) => {
                          const sys = systemsById.get(id);
                          return sys ? (
                            <Chip key={id} color={zoneById.get(sys.zoneId)?.color}>
                              {sys.acronym}
                            </Chip>
                          ) : null;
                        })}
                      </div>
                    </td>
                    <td className="px-4 py-2.5">{j.published ? <Chip color="#1f9d55">Published</Chip> : <Chip>Draft</Chip>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Section>

      <ImpactSection onHighlight={onHighlight} />
    </div>
  );
}

function ImpactSection({ onHighlight }: { onHighlight?: () => void }) {
  const s = useSummary();
  const impactId = useWorld((x) => x.impactSystemId);
  const setImpact = useWorld((x) => x.setImpactSystem);
  const [picked, setPicked] = useState<string>(impactId ?? s.systems.find((x) => x.acronym === 'CRE')?.id ?? s.systems[0]?.id ?? '');
  const byId = new Map(s.systems.map((x) => [x.id, x]));
  const zoneById = new Map(s.zones.map((z) => [z.id, z]));
  const impact = picked ? impactOf(picked, s.integrations) : null;

  const list = (m: Map<string, number>) =>
    m.size ? (
      <ul className="flex flex-col gap-1.5">
        {[...m.entries()]
          .sort((a, b) => a[1] - b[1])
          .map(([id, depth]) => {
            const sys = byId.get(id);
            if (!sys) return null;
            return (
              <li key={id} className="flex items-center justify-between gap-2 rounded-md bg-harbor-50 px-3 py-1.5 text-sm">
                <span className="flex min-w-0 items-center gap-2">
                  <ZoneSwatch color={zoneById.get(sys.zoneId)?.color ?? '#999'} />
                  <span className="font-semibold">{sys.acronym}</span>
                  <span className="truncate text-ink-500">{sys.name}</span>
                </span>
                <span className="shrink-0 text-xs text-ink-500">{depth === 1 ? 'direct' : `${depth} hops`}</span>
              </li>
            );
          })}
      </ul>
    ) : (
      <Empty>None</Empty>
    );

  return (
    <Section title="Architecture impact" note="Upstream systems feed the selected system; downstream systems depend on its output, directly or through other systems.">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex min-w-[260px] flex-col gap-1">
          <span className="label">System</span>
          <select id="impact-system" className="input" value={picked} onChange={(e) => setPicked(e.target.value)}>
            {s.systems.map((x) => (
              <option key={x.id} value={x.id}>
                {x.acronym} · {x.name}
              </option>
            ))}
          </select>
        </label>
        <Button
          variant="primary"
          icon={Crosshair}
          onClick={() => {
            setImpact(picked);
            onHighlight?.();
          }}
        >
          Highlight in Port World
        </Button>
        {impactId && (
          <Button variant="ghost" icon={X} onClick={() => setImpact(null)}>
            Clear highlight
          </Button>
        )}
      </div>
      {impact && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card title={`Upstream dependencies (${impact.upstream.size})`}>{list(impact.upstream)}</Card>
          <Card title={`Downstream dependencies (${impact.downstream.size})`}>{list(impact.downstream)}</Card>
        </div>
      )}
    </Section>
  );
}

function SharedSection({ onFocusSystem }: { onFocusSystem?: (id: string) => void }) {
  const s = useSummary();
  const zoneById = new Map(s.zones.map((z) => [z.id, z]));
  const zoneName = (id: string | null) => (id ? zoneById.get(id)?.name : undefined);
  const rows = [...s.shared].sort((a, b) => usingDivisions(b, s.zones).length - usingDivisions(a, s.zones).length || a.acronym.localeCompare(b.acronym));
  const tiles = [
    { label: 'Total shared systems', value: s.totals.sharedSystems, note: 'Used by two or more divisions, or displayed in a shared services zone' },
    { label: 'Used across multiple divisions', value: s.totals.multiDivision, note: 'Systems with two or more using divisions' },
    { label: 'Cross-division usage', value: s.totals.crossDivisionUsage, note: 'Times a division uses a system it does not own' },
  ];
  return (
    <Section title="Cross-division systems" note="Ownership and usage come from the system register. A division using a system is not counted as an integration.">
      <div className="grid gap-3 sm:grid-cols-3">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-[10px] border border-ink-200 bg-surface px-4 py-3">
            <div className="text-xs text-ink-500">{t.label}</div>
            <div className="num font-display text-3xl font-bold text-heading">{t.value}</div>
            <div className="mt-0.5 text-[11px] text-ink-500">{t.note}</div>
          </div>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Systems by owning division">
          <HBar data={s.byOwner} color={(d) => d.color ?? BLUE} label="Systems" />
        </Card>
        <Card title="Cross-division usage by division">
          <p className="-mt-1 mb-2 text-xs text-ink-500">Systems each division uses but does not own.</p>
          <HBar data={s.crossUsageByDivision} color={(d) => d.color ?? BLUE} label="Systems used" />
        </Card>
      </div>
      <div className="overflow-x-auto rounded-[10px] border border-ink-200 bg-surface">
        {rows.length === 0 ? (
          <div className="p-4"><Empty>No shared systems yet. Select two or more using divisions on a system to make it shared.</Empty></div>
        ) : (
          <table className="w-full min-w-[760px] text-sm">
            <thead className="table-head">
              <tr>
                <th className="px-4 py-2">System</th>
                <th className="px-4 py-2">Owning division</th>
                <th className="px-4 py-2">Using divisions</th>
                <th className="px-4 py-2">Display zone</th>
                <th className="px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((sys) => {
                const owner = owningDivision(sys, s.zones);
                const users = usingDivisions(sys, s.zones);
                return (
                  <tr key={sys.id} className="border-t border-ink-100 align-top hover:bg-harbor-50/60">
                    <td className="px-4 py-2.5">
                      <button
                        type="button"
                        onClick={() => onFocusSystem?.(sys.id)}
                        disabled={!onFocusSystem}
                        className="text-left font-semibold text-heading hover:underline disabled:no-underline"
                        title="Show this building in the Port World"
                      >
                        <span className="mr-1.5 font-mono text-xs text-harbor-500">{sys.acronym}</span>
                        {sys.name}
                      </button>
                    </td>
                    <td className="px-4 py-2.5">{owner ? <Chip color={zoneById.get(owner)?.color}>{zoneName(owner)}</Chip> : <Chip>Unassigned</Chip>}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex flex-wrap gap-1">
                        {users.map((u) => (
                          <Chip key={u} color={zoneById.get(u)?.color}>{zoneName(u)}</Chip>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="flex items-center gap-2"><ZoneSwatch color={zoneById.get(sys.zoneId)?.color ?? '#999'} />{zoneName(sys.zoneId)}</span>
                    </td>
                    <td className="px-4 py-2.5"><StatusChip status={sys.status} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </Section>
  );
}
