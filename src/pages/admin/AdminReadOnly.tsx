// Studio sections that are view-only in Phase 1: integrations, journeys, maritime.
import { Link } from 'react-router-dom';
import { useLandscape } from '@/store/landscape';
import { DATA_TYPE_COLORS } from '@/types/domain';
import { shipBeam, shipLength } from '@/sim/maritime';
import { portById } from '@/data/layout';
import { Chip, ZoneSwatch } from '@/components/ui';
import { PageHead, PhaseNote } from './AdminLayout';

export function AdminIntegrations() {
  const integrations = useLandscape((s) => s.integrations).filter((i) => !i.archived);
  const systems = useLandscape((s) => s.systems);
  const zones = useLandscape((s) => s.zones);
  const byId = new Map(systems.map((s) => [s.id, s]));
  const color = (id: string) => zones.find((z) => z.id === byId.get(id)?.zoneId)?.color ?? '#999';
  const tag = (id: string) => (
    <span className="inline-flex items-center gap-1.5 font-semibold">
      <ZoneSwatch color={color(id)} />
      {byId.get(id)?.acronym ?? '?'}
    </span>
  );
  return (
    <>
      <PageHead eyebrow="Integration manager" title="Integrations">
        {integrations.length} integrations. Turn on integration lines in the Port World to see them as arcs between buildings.
      </PageHead>
      <PhaseNote phase={3}>Adding and editing integrations, and the animated data containers that travel along them, arrive with the integration engine.</PhaseNote>
      <div className="overflow-x-auto rounded-[10px] border border-ink-200 bg-surface">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="table-head">
            <tr>
              <th className="px-4 py-2">Integration</th>
              <th className="px-4 py-2">Flow</th>
              <th className="px-4 py-2">Data type</th>
              <th className="px-4 py-2">Mechanism</th>
              <th className="px-4 py-2">Trigger</th>
              <th className="px-4 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {integrations.map((i) => (
              <tr key={i.id} className="border-t border-ink-100 align-top">
                <td className="px-4 py-2">
                  <div className="font-semibold">{i.name}</div>
                  <div className="max-w-[260px] text-xs text-ink-500">{i.description}</div>
                </td>
                <td className="whitespace-nowrap px-4 py-2">
                  {tag(i.sourceId)} <span className="text-ink-300">{i.direction === 'bidirectional' ? '⇄' : '→'}</span>{' '}
                  {i.via.map((v) => (
                    <span key={v}>{tag(v)} <span className="text-ink-300">→</span> </span>
                  ))}
                  {tag(i.destinationId)}
                </td>
                <td className="px-4 py-2"><Chip color={DATA_TYPE_COLORS[i.dataType]}>{i.dataType}</Chip></td>
                <td className="px-4 py-2 text-ink-700">{i.mechanism}</td>
                <td className="px-4 py-2 text-ink-700">{i.trigger}</td>
                <td className="px-4 py-2"><Chip>{i.status}</Chip></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export function AdminJourneys() {
  const journeys = useLandscape((s) => s.journeys).filter((j) => !j.archived);
  return (
    <>
      <PageHead eyebrow="Journey builder" title="Journeys">
        Demonstration journeys A to D. See every step and branch in the <Link to="/journeys" className="font-semibold text-harbor-500 hover:underline">Journey Explorer</Link>.
      </PageHead>
      <PhaseNote phase={3}>The visual builder (ordered steps, conditional branches, speed, preview and publish) arrives with journey playback.</PhaseNote>
      <div className="grid gap-3 md:grid-cols-2">
        {journeys.map((j) => (
          <div key={j.id} className="rounded-[10px] border border-ink-200 bg-surface p-4">
            <div className="flex items-center gap-2">
              <span className="grid h-6 w-6 place-items-center rounded bg-navy-800 font-mono text-xs font-semibold text-white">{j.code}</span>
              <h2 className="font-bold text-heading">{j.name}</h2>
              {j.published ? <Chip color="#1f9d55">Published</Chip> : <Chip>Draft</Chip>}
            </div>
            <p className="mt-2 text-sm text-ink-700">{j.description}</p>
            <p className="num mt-2 text-xs text-ink-500">{j.steps.length} steps · {j.branches.length} branches · speed {j.speed}×</p>
          </div>
        ))}
      </div>
    </>
  );
}

export function AdminMaritime() {
  const ships = useLandscape((s) => s.ships);
  const berths = useLandscape((s) => s.berths);
  const sim = useLandscape((s) => s.simulation);
  const setSimulation = useLandscape((s) => s.setSimulation);
  return (
    <>
      <PageHead eyebrow="Maritime simulation" title="Vessels and berths">
        Ambient shipping keeps the port alive. It is simulated and separate from ICT data flows.
      </PageHead>
      <PhaseNote phase={5}>Editing vessels, routes, berth assignments and cargo operations arrives with the advanced maritime simulation.</PhaseNote>
      <label className="mb-4 inline-flex items-center gap-2 text-sm">
        <input type="checkbox" checked={sim.ambientEnabled} onChange={(e) => setSimulation({ ambientEnabled: e.target.checked })} className="h-4 w-4 accent-navy-800" />
        Start the Port World with ambient shipping running
      </label>
      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="overflow-x-auto rounded-[10px] border border-ink-200 bg-surface">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="table-head">
              <tr>
                <th className="px-4 py-2">Vessel</th>
                <th className="px-4 py-2">Port</th>
                <th className="px-4 py-2 text-right">Length</th>
                <th className="px-4 py-2 text-right">Bays × rows × tiers</th>
                <th className="px-4 py-2 text-right">Unload / load</th>
                <th className="px-4 py-2 text-right">Time at sea</th>
              </tr>
            </thead>
            <tbody>
              {ships.map((s) => (
                <tr key={s.id} className="border-t border-ink-100">
                  <td className="px-4 py-2"><span className="flex items-center gap-2"><ZoneSwatch color={s.hullColor} /> <b>{s.name}</b></span></td>
                  <td className="px-4 py-2 text-ink-700">{portById(s.portId).name}</td>
                  <td className="num px-4 py-2 text-right">{Math.round(shipLength(s))} × {shipBeam(s).toFixed(1)}</td>
                  <td className="num px-4 py-2 text-right">{s.bays} × {s.rows} × {s.tiers}</td>
                  <td className="num px-4 py-2 text-right">{s.unloadCount} / {s.loadCount}</td>
                  <td className="num px-4 py-2 text-right">{s.seaTime}s</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="rounded-[10px] border border-ink-200 bg-surface p-4">
          <h2 className="mb-2 text-sm font-semibold">Berths</h2>
          <ul className="flex flex-col gap-1 text-sm">
            {berths.map((b) => (
              <li key={b.id} className="flex justify-between rounded-md bg-harbor-50 px-3 py-1.5"><span>{b.name}</span><span className="text-ink-500">One quay crane</span></li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-ink-500">Each port has two berths and three vessels, so at busy times one waits at anchorage. Ships reserve a free berth before berthing, so two vessels never share one.</p>
        </div>
      </div>
    </>
  );
}
