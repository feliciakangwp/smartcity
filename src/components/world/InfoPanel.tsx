// Right-hand panel for the selected zone, system or ship.
import { useEffect, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowDownLeft, ArrowUpRight, Crosshair, ExternalLink, Network, Pencil, Plus, Ship as ShipIcon, Workflow, X } from 'lucide-react';
import { useLandscape } from '@/store/landscape';
import { useWorld } from '@/store/world';
import { activeIntegrations, activeSystems, integrationsFor } from '@/lib/metrics';
import { DATA_TYPE_COLORS, type Integration } from '@/types/domain';
import { SHIP_STATES } from '@/sim/maritime';
import { currentSim } from '@/world/maritime/SimContext';
import { Button, Chip, StatusChip, ZoneSwatch, cx } from '@/components/ui';

export function InfoPanel() {
  const selection = useWorld((s) => s.selection);
  const select = useWorld((s) => s.select);
  if (!selection) return null;
  return (
    <aside className="panel pointer-events-auto flex max-h-full w-[340px] max-w-[calc(100vw-32px)] flex-col overflow-hidden" aria-label="Details">
      <div className="relative overflow-y-auto p-4">
        <button type="button" onClick={() => select(null)} aria-label="Close details" className="absolute right-2 top-2 rounded-md p-1 text-ink-500 hover:bg-ink-100">
          <X className="h-4 w-4" />
        </button>
        {selection.kind === 'zone' && <ZoneDetails id={selection.id} />}
        {selection.kind === 'system' && <SystemDetails id={selection.id} />}
        {selection.kind === 'ship' && <ShipDetails id={selection.id} />}
      </div>
    </aside>
  );
}

function ZoneDetails({ id }: { id: string }) {
  const zone = useLandscape((s) => s.zones.find((z) => z.id === id));
  const systems = useLandscape((s) => s.systems).filter((s) => s.zoneId === id && !s.archived);
  const select = useWorld((s) => s.select);
  const openAdd = useWorld((s) => s.openAddSystem);
  if (!zone) return <p className="text-sm text-ink-500">This zone is no longer in the register.</p>;
  return (
    <div className="flex flex-col gap-4">
      <div className="pr-6">
        <div className="eyebrow flex items-center gap-2">
          <ZoneSwatch color={zone.color} /> Zone
        </div>
        <h2 className="mt-1 text-xl font-bold text-navy-900">{zone.name}</h2>
        <p className="mt-1 text-sm text-ink-700">{zone.description}</p>
      </div>
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Systems ({systems.length})</h3>
          <Button size="sm" icon={Plus} onClick={() => openAdd(zone.id)}>
            Add system
          </Button>
        </div>
        {systems.length === 0 ? (
          <p className="rounded-md border border-dashed border-ink-200 p-3 text-sm text-ink-500">No systems yet. Add the first one to place a building here.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {systems.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => select({ kind: 'system', id: s.id }, true)}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-harbor-50"
                >
                  <span className="w-11 shrink-0 font-mono text-xs font-semibold text-navy-700">{s.acronym}</span>
                  <span className="min-w-0 flex-1 truncate">{s.name}</span>
                  <StatusChip status={s.status} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <Link to={`/admin/zones?edit=${zone.id}`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-harbor-500 hover:underline">
        <Pencil className="h-3.5 w-3.5" /> Edit zone in Studio
      </Link>
    </div>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-ink-500">{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </>
  );
}

function SystemDetails({ id }: { id: string }) {
  const system = useLandscape((s) => s.systems.find((x) => x.id === id));
  const zones = useLandscape((s) => s.zones);
  const allSystems = useLandscape((s) => s.systems);
  const integrations = useLandscape((s) => s.integrations);
  const select = useWorld((s) => s.select);
  const focusOn = useWorld((s) => s.focusOn);
  const setImpact = useWorld((s) => s.setImpactSystem);
  const impactId = useWorld((s) => s.impactSystemId);
  const setExpanded = useWorld((s) => s.setDashboardExpanded);
  const navigate = useNavigate();
  if (!system) return <p className="text-sm text-ink-500">This system is no longer in the register.</p>;

  const zone = zones.find((z) => z.id === system.zoneId);
  const live = activeSystems(allSystems, zones);
  const byId = new Map(live.map((s) => [s.id, s]));
  const { incoming, outgoing } = integrationsFor(id, activeIntegrations(integrations, live));

  const flow = (i: Integration, dir: 'in' | 'out') => {
    const otherId = dir === 'in' ? (i.destinationId === id ? i.sourceId : i.destinationId) : i.sourceId === id ? i.destinationId : i.sourceId;
    const other = byId.get(otherId);
    return (
      <li key={i.id + dir}>
        <button
          type="button"
          onClick={() => other && select({ kind: 'system', id: other.id }, true)}
          className="flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-harbor-50"
          title={`${i.mechanism} · ${i.trigger}`}
        >
          {dir === 'in' ? <ArrowDownLeft className="mt-0.5 h-4 w-4 shrink-0 text-ink-500" /> : <ArrowUpRight className="mt-0.5 h-4 w-4 shrink-0 text-ink-500" />}
          <span className="min-w-0 flex-1">
            <span className="block font-medium">{i.name}</span>
            <span className="block text-xs text-ink-500">
              {dir === 'in' ? 'from' : 'to'} <b className="font-semibold text-ink-700">{other?.acronym ?? '?'}</b> · {i.mechanism}
            </span>
          </span>
          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: DATA_TYPE_COLORS[i.dataType] }} title={i.dataType} />
        </button>
      </li>
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="pr-6">
        <div className="eyebrow flex items-center gap-2">
          <ZoneSwatch color={zone?.color ?? '#999'} /> {zone?.name}
        </div>
        <h2 className="mt-1 text-xl font-bold text-navy-900">
          <span className="font-mono text-base text-harbor-500">{system.acronym}</span> {system.name}
        </h2>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <StatusChip status={system.status} />
          <Chip>{system.category}</Chip>
          <Chip>{system.criticality}</Chip>
        </div>
      </div>
      <p className="text-sm text-ink-700">{system.businessPurpose || system.description}</p>
      <dl className="grid grid-cols-[96px_1fr] gap-x-3 gap-y-1.5 text-sm">
        {system.owner && <Row label="Owner">{system.owner}</Row>}
        {system.techStack && <Row label="Technology">{system.techStack}</Row>}
        {system.endpoints && <Row label="Endpoints"><span className="whitespace-pre-line font-mono text-xs">{system.endpoints}</span></Row>}
        <Row label="Last updated">{new Date(system.updatedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</Row>
      </dl>
      {system.docs.length > 0 && (
        <ul className="flex flex-col gap-1 text-sm">
          {system.docs.map((d) => (
            <li key={d.url}>
              <a href={d.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-harbor-500 hover:underline">
                {d.label} <ExternalLink className="h-3 w-3" />
              </a>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" icon={Crosshair} onClick={() => focusOn('system', id)}>
          Focus
        </Button>
        <Button size="sm" icon={Workflow} onClick={() => navigate(`/journeys?system=${id}`)}>
          View data flow
        </Button>
        <Button
          size="sm"
          variant={impactId === id ? 'primary' : 'secondary'}
          icon={Network}
          onClick={() => {
            setImpact(impactId === id ? null : id);
            if (impactId !== id) setExpanded(false);
          }}
        >
          {impactId === id ? 'Hide impact' : 'View impact'}
        </Button>
      </div>
      <div>
        <h3 className="mb-1 text-sm font-semibold">Incoming ({incoming.length})</h3>
        {incoming.length ? <ul>{incoming.map((i) => flow(i, 'in'))}</ul> : <p className="text-sm text-ink-500">None recorded.</p>}
      </div>
      <div>
        <h3 className="mb-1 text-sm font-semibold">Outgoing ({outgoing.length})</h3>
        {outgoing.length ? <ul>{outgoing.map((i) => flow(i, 'out'))}</ul> : <p className="text-sm text-ink-500">None recorded.</p>}
      </div>
      <Link to={`/admin/systems?edit=${system.id}`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-harbor-500 hover:underline">
        <Pencil className="h-3.5 w-3.5" /> Edit in System Registry
      </Link>
    </div>
  );
}

const STATE_LABEL: Record<string, string> = {
  APPROACHING: 'Approaching',
  WAITING: 'Waiting',
  BERTHING: 'Berthing',
  DOCKED: 'Docked',
  UNLOADING: 'Unloading',
  LOADING: 'Loading',
  DEPARTING: 'Departing',
  AT_SEA: 'At sea',
};

function ShipDetails({ id }: { id: string }) {
  const cfg = useLandscape((s) => s.ships.find((x) => x.id === id));
  const focusOn = useWorld((s) => s.focusOn);
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 400);
    return () => clearInterval(t);
  }, []);
  const ship = currentSim?.ships.find((s) => s.cfg.id === id);
  if (!cfg || !ship) return <p className="text-sm text-ink-500">This vessel is not in the simulation.</p>;
  const onBoard = ship.slots.filter((s) => s.color !== null).length;
  const crane = ship.berth?.crane;

  return (
    <div className="flex flex-col gap-4">
      <div className="pr-6">
        <div className="eyebrow flex items-center gap-2">
          <ShipIcon className="h-3.5 w-3.5" /> Vessel · simulated
        </div>
        <h2 className="mt-1 text-xl font-bold text-navy-900">{cfg.name}</h2>
        <p className="mt-1 text-xs text-ink-500">Ambient port activity for presentation. Not linked to real vessel data.</p>
      </div>
      <ol className="grid grid-cols-2 gap-1" aria-label="Voyage state">
        {SHIP_STATES.map((st) => (
          <li
            key={st}
            className={cx(
              'rounded-md border px-2 py-1 text-xs font-semibold',
              ship.state === st ? 'border-nexus-400 bg-nexus-100 text-navy-900' : 'border-ink-200 text-ink-500',
            )}
            aria-current={ship.state === st ? 'step' : undefined}
          >
            {STATE_LABEL[st]}
          </li>
        ))}
      </ol>
      <dl className="grid grid-cols-[120px_1fr] gap-x-3 gap-y-1.5 text-sm">
        <Row label="Berth">{ship.berth?.cfg.name ?? '—'}</Row>
        <Row label="Containers on board"><span className="num">{onBoard} / {ship.slots.length}</span></Row>
        <Row label="Still to unload"><span className="num">{ship.toUnload}</span></Row>
        <Row label="Still to load"><span className="num">{ship.toLoad}</span></Row>
        {crane && crane.phase !== 'idle' && <Row label="Quay crane">{craneText(crane.phase)}</Row>}
      </dl>
      <Button size="sm" icon={Crosshair} onClick={() => focusOn('ship', id)}>
        Follow vessel
      </Button>
    </div>
  );
}

function craneText(phase: string) {
  return (
    {
      waiting: 'Waiting for a container',
      toPick: 'Travelling to pick up',
      lowerPick: 'Lowering spreader',
      attach: 'Locking on',
      hoistPick: 'Hoisting',
      toDrop: 'Travelling to set down',
      lowerDrop: 'Lowering container',
      release: 'Releasing',
      hoistDrop: 'Raising spreader',
    } as Record<string, string>
  )[phase] ?? phase;
}
