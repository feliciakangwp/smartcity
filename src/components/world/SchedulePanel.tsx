// Live timetable for the simulated port: flights, vessels and trucks.
import { useEffect, useState, type ReactNode } from 'react';
import { AlertTriangle, CalendarClock, FileText, Plane, Ship, Truck, X } from 'lucide-react';
import { useLandscape } from '@/store/landscape';
import { activeSystems } from '@/lib/metrics';
import { dataFlowPairs } from '@/lib/dataFlows';
import { brokenVanSpot, useDataVans } from '@/world/DataVans';
import { currentSims } from '@/world/maritime/SimContext';
import type { ShipSim } from '@/sim/maritime';
import { useWorld } from '@/store/world';
import { cx } from '@/components/ui';

const secs = (s: number) => (s <= 0 ? 'now' : s < 60 ? `in ${Math.ceil(s)}s` : `in ${Math.floor(s / 60)}m ${String(Math.ceil(s % 60)).padStart(2, '0')}s`);

function eta(s: ShipSim) {
  let d = 0;
  let x = s.x;
  let z = s.z;
  for (let i = s.pathIndex; i < s.path.length; i++) {
    d += Math.hypot(s.path[i][0] - x, s.path[i][1] - z);
    [x, z] = s.path[i];
  }
  return d / Math.max(4, s.speed);
}

function Section({ icon: Icon, title, children }: { icon: typeof Plane; title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-1.5">
      <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-ink-500">
        <Icon className="h-3.5 w-3.5" aria-hidden /> {title}
      </h3>
      <ul className="flex flex-col gap-1 text-[13px]">{children}</ul>
    </section>
  );
}

function Item({ left, right, tone }: { left: ReactNode; right: ReactNode; tone?: 'live' | 'wait' }) {
  return (
    <li className="flex items-baseline justify-between gap-3">
      <span className="min-w-0 truncate">{left}</span>
      <span className={cx('num shrink-0 text-xs', tone === 'live' ? 'font-semibold text-emerald-700' : tone === 'wait' ? 'font-semibold text-amber-700' : 'text-ink-500')}>{right}</span>
    </li>
  );
}

export function SchedulePanel() {
  const open = useWorld((s) => s.showSchedule);
  const toggle = useWorld((s) => s.toggle);
  const [, tick] = useState(0);
  useEffect(() => {
    if (!open) return;
    const t = setInterval(() => tick((n) => n + 1), 500);
    return () => clearInterval(t);
  }, [open]);
  const sims = currentSims;
  if (!open || !sims) return null;
  const { maritime, logistics, airport } = sims;

  const planes = airport.planes.filter((p) => p.state !== 'gone');
  const label: Record<string, string> = { approach: 'On approach', rollout: 'Landed', taxiIn: 'Taxiing to gate', taxiOut: 'Taxiing to runway', takeoff: 'Departing' };
  const onRoad = logistics.trucks.filter((t) => t.active);

  return (
    <aside className="panel pointer-events-auto flex max-h-full w-[320px] max-w-[calc(100vw-32px)] flex-col overflow-hidden" aria-label="Operations schedule">
      <div className="flex items-center justify-between border-b border-ink-200 px-4 py-2.5">
        <div>
          <div className="eyebrow flex items-center gap-1.5">
            <CalendarClock className="h-3.5 w-3.5" /> Operations schedule
          </div>
          <div className="text-[11px] text-ink-500">Simulated timetable · not live operational data</div>
        </div>
        <button type="button" onClick={() => toggle('showSchedule')} aria-label="Close schedule" className="rounded-md p-1 text-ink-500 hover:bg-ink-100">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="flex flex-col gap-4 overflow-y-auto px-4 py-3">
        <DataDeliveries />
        <Section icon={Plane} title="Changi arrivals">
          {airport.upcoming.map((a) => (
            <Item key={a.flight} left={<b className="font-semibold">{a.flight}</b>} right={`lands ${secs(a.at - airport.time)}`} />
          ))}
          {planes.map((p) => (
            <Item
              key={p.id}
              left={<><b className="font-semibold">{p.flight}</b> {p.state === 'parked' ? `at Gate ${p.gate + 1}` : label[p.state]}</>}
              right={p.state === 'parked' ? `departs ${secs(p.timer)}` : p.state === 'approach' ? 'landing' : ''}
              tone={p.state === 'parked' ? undefined : 'live'}
            />
          ))}
          <Item left="Travellers cleared at checkpoint" right={airport.processed} />
        </Section>

        {maritime.ports.map((port) => {
          const ships = maritime.ships.filter((s) => s.port.id === port.id);
          return (
            <Section key={port.id} icon={Ship} title={port.name}>
              {maritime.berths
                .filter((b) => b.port.id === port.id)
                .map((b) => (
                  <Item
                    key={b.cfg.id}
                    left={<>{b.cfg.name.replace(port.name + ' ', '')}: {b.ship ? <b className="font-semibold">{b.ship.cfg.name}</b> : <span className="text-ink-500">free</span>}</>}
                    right={b.ship ? (b.ship.state === 'UNLOADING' ? `unloading · ${b.ship.toUnload} left` : b.ship.state === 'LOADING' ? `loading · ${b.ship.toLoad} left` : b.ship.state.toLowerCase()) : ''}
                    tone={b.ship ? 'live' : undefined}
                  />
                ))}
              {ships
                .filter((s) => s.state === 'WAITING')
                .map((s) => (
                  <Item key={s.cfg.id} left={<><b className="font-semibold">{s.cfg.name}</b> at anchorage</>} right="waiting for a berth" tone="wait" />
                ))}
              {ships
                .filter((s) => s.state === 'APPROACHING')
                .map((s) => (
                  <Item key={s.cfg.id} left={<><b className="font-semibold">{s.cfg.name}</b> inbound</>} right={`arrives ${secs(eta(s))}`} />
                ))}
              {ships
                .filter((s) => s.state === 'AT_SEA')
                .map((s) => (
                  <Item key={s.cfg.id} left={<><b className="font-semibold">{s.cfg.name}</b> at sea</>} right={`returns ${secs(s.seaTimer)}`} />
                ))}
              <Item left="Containers in yard" right={maritime.yards[port.id]?.count ?? 0} />
            </Section>
          );
        })}

        <Section icon={Truck} title="Trucks">
          <Item left="On the road now" right={`${onRoad.filter((t) => t.kind === 'shuttle').length} port shuttles · ${onRoad.filter((t) => t.kind === 'delivery').length} deliveries`} tone="live" />
          {logistics.upcoming.slice(0, 5).map((d, i) => (
            <Item key={i} left={d.kind === 'shuttle' ? `Shuttle ${d.from} → ${d.to}` : `Delivery ${d.from} → ${d.to}`} right={`leaves ${secs(d.at - logistics.time)}`} />
          ))}
          <Item left="Delivered so far" right={logistics.delivered} />
        </Section>
      </div>
    </aside>
  );
}

/** One delivery van per matched sender → receiver pair; broken links are listed in red. */
function DataDeliveries() {
  const systems = useLandscape((s) => s.systems);
  const zones = useLandscape((s) => s.zones);
  const select = useWorld((s) => s.select);
  const focusOn = useWorld((s) => s.focusOn);
  const vans = useDataVans();
  const live = activeSystems(systems, zones);
  const pairs = dataFlowPairs(live);
  if (!pairs.length) return null;
  const name = (id: string) => live.find((s) => s.id === id)?.acronym ?? '?';
  const sorted = [...pairs].sort((a, b) => Number(a.status === 'ok') - Number(b.status === 'ok'));
  return (
    <Section icon={FileText} title="Data deliveries">
      {sorted.map((p) => {
        const ok = p.status === 'ok';
        const fix = p.status === 'missing-output' ? p.fromId : p.toId;
        return (
          <li key={`${p.fromId}>${p.toId}`}>
            <button
              type="button"
              onClick={() => {
                // A broken link frames its broken-down van and selects the system that needs fixing.
                const van = !ok && vans.find((v) => v.pair.fromId === p.fromId && v.pair.toId === p.toId);
                if (!van) return select({ kind: 'system', id: ok ? p.toId : fix }, true);
                select({ kind: 'system', id: fix });
                const at = brokenVanSpot(van);
                focusOn('place', `${at.x.toFixed(1)},${at.z.toFixed(1)},near`);
              }}
              className="flex w-full items-baseline justify-between gap-3 rounded text-left hover:bg-harbor-50"
              title={ok ? (p.inputs.length ? p.inputs : p.outputs).join(', ') : `Broken link: ${name(fix)} needs to list this flow`}
            >
              <span className="min-w-0 truncate">
                {name(p.fromId)} → {name(p.toId)}
              </span>
              {ok ? (
                <span className="shrink-0 text-xs font-semibold text-emerald-700">Van delivering</span>
              ) : (
                <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-red-700">
                  <AlertTriangle className="h-3 w-3" aria-hidden /> Broken link
                </span>
              )}
            </button>
          </li>
        );
      })}
    </Section>
  );
}
