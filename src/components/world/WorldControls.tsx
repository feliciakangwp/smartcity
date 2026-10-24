// Port World overlay controls: search, camera/visibility toolbar, simulation speed.
import { useMemo, useRef, useState } from 'react';
import { Eye, Home, Maximize, Minimize, Pause, RotateCcw, Search, Ship, Spline, Tags } from 'lucide-react';
import { useLandscape } from '@/store/landscape';
import { useWorld, type Speed } from '@/store/world';
import { activeSystems, activeZones } from '@/lib/metrics';
import { DATA_TYPE_COLORS, DATA_TYPES } from '@/types/domain';
import { IconButton, ZoneSwatch, cx } from '@/components/ui';

export function WorldToolbar() {
  const s = useWorld();
  const [full, setFull] = useState(() => typeof document !== 'undefined' && !!document.fullscreenElement);
  const toggleFull = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
      setFull(!!document.fullscreenElement);
    } catch {
      setFull(false);
    }
  };
  return (
    <div className="panel pointer-events-auto flex flex-col gap-0.5 p-1" role="toolbar" aria-label="World controls" aria-orientation="vertical">
      <IconButton icon={Home} label="Home view" onClick={() => s.focusOn('home')} />
      <IconButton
        icon={RotateCcw}
        label="Reset camera and selection"
        onClick={() => {
          s.select(null);
          s.setImpactSystem(null);
          s.focusOn('home');
        }}
      />
      <div className="mx-1 my-0.5 h-px bg-ink-200" />
      <IconButton icon={Tags} label="Show zone and system labels" active={s.showLabels} onClick={() => s.toggle('showLabels')} />
      <IconButton icon={Spline} label="Show integration lines" active={s.showLines} onClick={() => s.toggle('showLines')} />
      <IconButton icon={Eye} label="Show ambient animations" active={s.showAmbient} onClick={() => s.toggle('showAmbient')} />
      <div className="mx-1 my-0.5 h-px bg-ink-200" />
      <IconButton icon={full ? Minimize : Maximize} label={full ? 'Exit fullscreen' : 'Fullscreen'} onClick={toggleFull} />
    </div>
  );
}

type Result = { kind: 'zone' | 'system' | 'ship'; id: string; title: string; sub: string; color: string };

export function WorldSearch() {
  const zones = useLandscape((s) => s.zones);
  const systems = useLandscape((s) => s.systems);
  const ships = useLandscape((s) => s.ships);
  const select = useWorld((s) => s.select);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);

  const results = useMemo<Result[]>(() => {
    const zs = activeZones(zones).filter((z) => z.visible);
    const zoneById = new Map(zs.map((z) => [z.id, z]));
    const all: Result[] = [
      ...zs.map((z) => ({ kind: 'zone' as const, id: z.id, title: z.name, sub: 'Zone', color: z.color })),
      ...activeSystems(systems, zones).map((s) => ({
        kind: 'system' as const,
        id: s.id,
        title: `${s.acronym} · ${s.name}`,
        sub: zoneById.get(s.zoneId)?.name ?? '',
        color: zoneById.get(s.zoneId)?.color ?? '#999',
      })),
      ...ships.map((s) => ({ kind: 'ship' as const, id: s.id, title: s.name, sub: 'Vessel (simulated)', color: s.hullColor })),
    ];
    const term = q.trim().toLowerCase();
    if (!term) return all.filter((r) => r.kind !== 'system');
    return all.filter((r) => r.title.toLowerCase().includes(term) || r.sub.toLowerCase().includes(term)).slice(0, 12);
  }, [q, zones, systems, ships]);

  const choose = (r: Result) => {
    select({ kind: r.kind, id: r.id }, true);
    setOpen(false);
    setQ('');
    input.current?.blur();
  };

  return (
    <div className="pointer-events-auto relative w-[300px] max-w-[calc(100vw-32px)]">
      <label className="panel flex items-center gap-2 px-3 py-2">
        <Search className="h-4 w-4 shrink-0 text-ink-500" aria-hidden />
        <input
          ref={input}
          id="world-search"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setActive(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') setActive((a) => Math.min(results.length - 1, a + 1));
            if (e.key === 'ArrowUp') setActive((a) => Math.max(0, a - 1));
            if (e.key === 'Enter' && results[active]) choose(results[active]);
            if (e.key === 'Escape') setOpen(false);
          }}
          placeholder="Search zones, systems, ships"
          className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-ink-300"
          role="combobox"
          aria-expanded={open}
          aria-controls="world-search-results"
          aria-autocomplete="list"
        />
      </label>
      {open && (
        <ul id="world-search-results" role="listbox" className="panel absolute left-0 right-0 top-full z-30 mt-1 max-h-[60vh] overflow-y-auto py-1">
          {results.length === 0 && <li className="px-3 py-2 text-sm text-ink-500">No matches. Try an acronym such as TDP.</li>}
          {results.map((r, i) => (
            <li key={`${r.kind}${r.id}`} role="option" aria-selected={i === active}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(r)}
                className={cx('flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-sm', i === active ? 'bg-harbor-100' : 'hover:bg-harbor-50')}
              >
                {r.kind === 'ship' ? <Ship className="h-3.5 w-3.5 text-ink-500" /> : <ZoneSwatch color={r.color} />}
                <span className="min-w-0 flex-1 truncate font-medium">{r.title}</span>
                <span className="shrink-0 text-[11px] text-ink-500">{r.sub}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const SPEEDS: Speed[] = [0, 1, 2, 4];

export function SimControls() {
  const speed = useWorld((s) => s.speed);
  const setSpeed = useWorld((s) => s.setSpeed);
  const ambient = useWorld((s) => s.showAmbient);
  return (
    <div className="panel pointer-events-auto flex items-center gap-3 px-3 py-2">
      <div className="flex flex-col">
        <span className="eyebrow">Simulated activity</span>
        <span className="text-[11px] text-ink-500">{ambient ? 'Shipping and cargo' : 'Paused (ambient hidden)'}</span>
      </div>
      <div className="flex rounded-md border border-ink-200 p-0.5" role="radiogroup" aria-label="Animation speed">
        {SPEEDS.map((v) => (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={speed === v}
            onClick={() => setSpeed(v)}
            className={cx('flex min-w-[38px] items-center justify-center rounded px-2 py-1 text-xs font-semibold', speed === v ? 'bg-navy-800 text-white' : 'text-ink-700 hover:bg-ink-100')}
          >
            {v === 0 ? <Pause className="h-3.5 w-3.5" aria-label="Pause" /> : `${v}×`}
          </button>
        ))}
      </div>
    </div>
  );
}

export function DataTypeLegend() {
  const show = useWorld((s) => s.showLines || s.selection?.kind === 'system' || !!s.impactSystemId);
  if (!show) return null;
  return (
    <div className="panel pointer-events-auto px-3 py-2">
      <div className="eyebrow mb-1">Integration lines by data type</div>
      <ul className="flex flex-col gap-0.5 text-xs text-ink-700">
        {DATA_TYPES.map((t) => (
          <li key={t} className="flex items-center gap-2">
            <span className="h-[3px] w-5 rounded" style={{ background: DATA_TYPE_COLORS[t] }} />
            {t}
          </li>
        ))}
        <li className="flex items-center gap-2 text-ink-500">
          <span className="h-[3px] w-5 rounded" style={{ background: 'repeating-linear-gradient(90deg,#62748c 0 4px,transparent 4px 7px)' }} />
          Planned
        </li>
      </ul>
    </div>
  );
}
