// One ICT system as a building: archetype by category, look by age (legacy or
// modern), construction state by build progress, and a module campus for
// systems split into modules. Hover highlights, click inspects, double-click flies in.
import { memo, useMemo } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import type { SystemPlacement } from '@/lib/placement';
import { buildState, type BuildState } from '@/lib/systemAge';
import { useWorld } from '@/store/world';
import { LAND_Y } from '@/data/layout';
import { buildingMats, mat, tint, type BuildingMats, type Tone } from '../materials';
import { Label } from '../Label';
import { Archetype, archetypeHeight, B, Cyl } from './archetypes';

interface Props {
  placement: SystemPlacement;
  accent: string;
  tone: Tone;
  showLabel: boolean;
}

const setCursor = (c: string) => (document.body.style.cursor = c);
const BASE_Y = LAND_Y + 0.25;

export const SystemBuilding = memo(function SystemBuilding({ placement, accent, tone, showLabel }: Props) {
  const { system, x, z, footprint: f } = placement;
  const state = buildState(system);
  const hasModules = (system.modules?.length ?? 0) > 0;
  const height = hasModules ? f * 0.75 : archetypeHeight(system.category, f);
  const clipY = state.developing && state.progress > 10 ? BASE_Y + height * (state.progress / 100) : undefined;
  const m = useMemo(() => buildingMats(accent, tone, state.look, clipY), [accent, tone, state.look, clipY]);
  const select = useWorld((s) => s.select);
  const setHovered = useWorld((s) => s.setHovered);

  const handlers = {
    onPointerOver: (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      setHovered(system.id);
      setCursor('pointer');
    },
    onPointerOut: () => {
      setHovered(null);
      setCursor('');
    },
    onClick: (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      select({ kind: 'system', id: system.id });
    },
    onDoubleClick: (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      select({ kind: 'system', id: system.id }, true);
    },
  };

  const site = state.developing && state.progress <= 10;
  return (
    <group position={[x, BASE_Y, z]} {...handlers}>
      <B s={[f * 1.12, 0.18, f * 1.12]} p={[0, 0.09, 0]} m={mat(site ? '#a88a64' : tint(accent, '#e9edf1', 0.82), { opacity: tone === 'dim' ? 0.4 : undefined })} />
      {site ? (
        <ConstructionSite f={f} progress={state.progress} accent={accent} dim={tone === 'dim'} />
      ) : hasModules ? (
        <ModuleCampus systemId={system.id} modules={system.modules!} f={f} m={m} accent={accent} />
      ) : (
        <Archetype category={system.category} f={f} m={m} />
      )}
      {!site && state.legacy && <Weathering f={f} h={height} dim={tone === 'dim'} />}
      {!site && state.look === 'modern' && !state.developing && <ModernTrim f={f} h={height} accent={accent} dim={tone === 'dim'} />}
      {clipY !== undefined && <Scaffold f={f} built={clipY - BASE_Y} h={height} dim={tone === 'dim'} />}
      {showLabel && (
        <Label
          position={[0, height + 3, 0]}
          text={system.acronym}
          sub={state.caption}
          border={accent}
          height={tone === 'highlight' ? 0.04 : 0.032}
          opacity={tone === 'dim' ? 0.45 : 1}
          maxDistance={tone === 'highlight' || tone === 'hover' ? Infinity : 420}
        />
      )}
    </group>
  );
});

/** 0–10%: fenced plot; foundation slab and rebar once work has started. */
function ConstructionSite({ f, progress, accent, dim }: { f: number; progress: number; accent: string; dim: boolean }) {
  const o = dim ? 0.35 : undefined;
  const posts = 14;
  const fence = mat('#d9c7a0', { opacity: o });
  return (
    <group>
      {Array.from({ length: posts }, (_, i) => {
        const t = (i / posts) * Math.PI * 2;
        const r = f * 0.56;
        const px = Math.max(-1, Math.min(1, Math.cos(t) * 1.4)) * r;
        const pz = Math.max(-1, Math.min(1, Math.sin(t) * 1.4)) * r;
        return <B key={i} s={[0.15, 1.2, 0.15]} p={[px, 0.6, pz]} m={fence} />;
      })}
      {[-1, 1].map((k) => (
        <group key={k}>
          <B s={[f * 1.12, 0.12, 0.08]} p={[0, 1.05, k * f * 0.56]} m={mat('#e08a2e', { opacity: o })} />
          <B s={[0.08, 0.12, f * 1.12]} p={[k * f * 0.56, 1.05, 0]} m={mat('#e08a2e', { opacity: o })} />
        </group>
      ))}
      {progress > 0 ? (
        <>
          <B s={[f * 0.8, 0.5, f * 0.65]} p={[0, 0.25, 0]} m={mat('#9c9c95', { opacity: o })} />
          {Array.from({ length: 5 }, (_, i) =>
            Array.from({ length: 4 }, (_, j) => <Cyl key={`${i}${j}`} r={0.06} h={1.1} p={[-f * 0.32 + i * f * 0.16, 1, -f * 0.24 + j * f * 0.16]} m={mat('#8b4a2b', { opacity: o })} />),
          )}
        </>
      ) : (
        [[-0.2, 0.1], [0.15, -0.2], [0.25, 0.2]].map(([px, pz], i) => (
          <mesh key={i} position={[px * f, 0.1, pz * f]} scale={[f * 0.12, f * 0.05, f * 0.12]} material={mat('#8a6a48', { opacity: o })}>
            <sphereGeometry args={[1, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
          </mesh>
        ))
      )}
      <Cyl r={0.1} h={3} p={[-f * 0.3, 1.5, f * 0.5]} m={mat('#6b4f33', { opacity: o })} />
      <Cyl r={0.1} h={3} p={[f * 0.3, 1.5, f * 0.5]} m={mat('#6b4f33', { opacity: o })} />
      <B s={[f * 0.66, 1.4, 0.12]} p={[0, 2.6, f * 0.5]} m={mat(accent, { opacity: o })} />
      <B s={[f * 0.6, 1.1, 0.13]} p={[0, 2.6, f * 0.5]} m={mat('#f4ead2', { opacity: o })} />
    </group>
  );
}

/** Scaffolding from the current build height to the finished height, a ghost of the final volume and a tower crane. */
function Scaffold({ f, built, h, dim }: { f: number; built: number; h: number; dim: boolean }) {
  const o = dim ? 0.35 : undefined;
  const pole = mat('#c9922c', { opacity: o });
  const w = f * 1.0;
  const levels: number[] = [];
  for (let y = Math.max(1.5, built - 1); y <= h + 0.01; y += 1.6) levels.push(y);
  return (
    <group>
      {[-1, 0, 1].map((i) =>
        [-1, 1].map((k) => <B key={`${i}${k}`} s={[0.12, h, 0.12]} p={[(i * w) / 2, h / 2, (k * w) / 2]} m={pole} />),
      )}
      {levels.map((y) => (
        <group key={y}>
          {[-1, 1].map((k) => (
            <group key={k}>
              <B s={[w, 0.1, 0.1]} p={[0, y, (k * w) / 2]} m={pole} />
              <B s={[0.1, 0.1, w]} p={[(k * w) / 2, y, 0]} m={pole} />
            </group>
          ))}
        </group>
      ))}
      <B s={[w * 0.95, Math.max(0.1, h - built), w * 0.95]} p={[0, built + (h - built) / 2, 0]} m={mat('#9fd3ea', { opacity: 0.14 })} />
      <group position={[w * 0.62, 0, -w * 0.45]}>
        <B s={[0.5, h + 5, 0.5]} p={[0, (h + 5) / 2, 0]} m={mat('#f2b705', { opacity: o })} />
        <B s={[f * 1.2, 0.4, 0.4]} p={[-f * 0.35, h + 5, 0]} m={mat('#f2b705', { opacity: o })} />
        <B s={[1, 0.8, 0.8]} p={[f * 0.2, h + 4.8, 0]} m={mat('#555555', { opacity: o })} />
        <Cyl r={0.03} h={3} p={[-f * 0.75, h + 3.5, 0]} m={mat('#333333')} />
      </group>
    </group>
  );
}

/** Older than five years: stains, a crack, a rusty water tank and wall-mounted air-conditioners. */
function Weathering({ f, h, dim }: { f: number; h: number; dim: boolean }) {
  const o = dim ? 0.3 : 0.55;
  const front = f * 0.37;
  const stain = mat('#5e4a3a', { opacity: o });
  return (
    <group>
      {[[-0.25, 0.3, 0.22], [0.2, 0.55, 0.3], [-0.05, 0.75, 0.18], [0.3, 0.2, 0.15]].map(([px, py, s], i) => (
        <B key={i} s={[f * s, h * 0.18, 0.05]} p={[px * f, h * py, front]} m={stain} />
      ))}
      <B s={[0.08, h * 0.35, 0.05]} p={[f * 0.12, h * 0.45, front + 0.02]} r={[0, 0, 0.5]} m={mat('#2b1d14', { opacity: dim ? 0.3 : 0.9 })} />
      <Cyl r={f * 0.09} h={f * 0.14} p={[-f * 0.22, h + f * 0.07, -f * 0.12]} m={mat('#8a5a3a', { opacity: dim ? 0.35 : undefined })} />
      {[0, 1].map((i) => (
        <B key={i} s={[f * 0.12, f * 0.08, f * 0.08]} p={[f * (0.1 + i * 0.18), h * (0.35 + i * 0.25), front + f * 0.04]} m={mat('#b9b4aa', { opacity: dim ? 0.35 : undefined })} />
      ))}
    </group>
  );
}

/** New systems: glowing trim and rooftop solar panels. */
function ModernTrim({ f, h, accent, dim }: { f: number; h: number; accent: string; dim: boolean }) {
  const o = dim ? 0.35 : undefined;
  return (
    <group>
      <B s={[f * 0.96, 0.22, f * 0.78]} p={[0, h - 0.6, 0]} m={mat(accent, { emissive: accent, emissiveIntensity: dim ? 0.1 : 0.9, opacity: o })} />
      {[-1, 0, 1].map((i) => (
        <B key={i} s={[f * 0.22, 0.08, f * 0.14]} p={[i * f * 0.25, h + 0.35, f * 0.08]} r={[-0.35, 0, 0]} m={mat('#1b2f5c', { roughness: 0.2, metalness: 0.6, opacity: o })} />
      ))}
    </group>
  );
}

/** A system split into modules: one central core with a pod per module. Click a pod to see who uses it. */
function ModuleCampus({ systemId, modules, f, m, accent }: { systemId: string; modules: { id: string; name: string }[]; f: number; m: BuildingMats; accent: string }) {
  const selectModule = useWorld((s) => s.selectModule);
  const selectedModuleId = useWorld((s) => s.selectedModuleId);
  const selectedSystem = useWorld((s) => (s.selection?.kind === 'system' ? s.selection.id : null));
  const coreH = f * 0.75;
  const n = modules.length;
  return (
    <group>
      <Cyl r={f * 0.17} h={coreH} p={[0, coreH / 2, 0]} m={m.glass} />
      <Cyl r={f * 0.19} h={0.5} p={[0, coreH * 0.5, 0]} m={m.accent} />
      <Cyl r={f * 0.2} h={0.7} p={[0, coreH, 0]} m={m.accent} />
      <Cyl r={f * 0.27} h={0.25} p={[0, 0.12, 0]} m={m.roof} />
      {modules.map((mod, i) => {
        const a = (i / n) * Math.PI * 2;
        const r = f * 0.4;
        const active = selectedSystem === systemId && selectedModuleId === mod.id;
        const ph = f * (0.14 + (i % 3) * 0.03);
        return (
          <group
            key={mod.id}
            position={[Math.cos(a) * r, 0, Math.sin(a) * r]}
            rotation-y={-a}
            onClick={(e) => {
              e.stopPropagation();
              selectModule(systemId, active ? null : mod.id);
            }}
          >
            <B s={[f * 0.12, ph, f * 0.12]} p={[0, ph / 2, 0]} m={m.wall()} />
            <B s={[f * 0.125, 0.3, f * 0.125]} p={[0, ph, 0]} m={active ? mat(accent, { emissive: accent, emissiveIntensity: 1 }) : m.accent} />
            <B s={[f * 0.2, 0.15, 0.5]} p={[-f * 0.13, 0.6, 0]} m={m.steel} />
            <Label position={[0, ph + 2, 0]} text={`M${String(i + 1).padStart(2, '0')}`} border={accent} height={active ? 0.028 : 0.02} maxDistance={active ? Infinity : 160} />
          </group>
        );
      })}
    </group>
  );
}

/** Shown in an empty zone so administrators can place the first system. */
export function AddSystemPlaceholder({ x, z, f, zoneId, accent }: { x: number; z: number; f: number; zoneId: string; accent: string }) {
  const open = useWorld((s) => s.openAddSystem);
  const dash = mat(accent, { opacity: 0.8 });
  const n = 10;
  return (
    <group
      position={[x, LAND_Y + 0.3, z]}
      onClick={(e) => {
        e.stopPropagation();
        open(zoneId);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setCursor('pointer');
      }}
      onPointerOut={() => setCursor('')}
    >
      {Array.from({ length: n }, (_, i) => {
        const t = (i / n) * f - f / 2 + f / n / 2;
        return (
          <group key={i}>
            <B s={[f / n / 1.8, 0.12, 0.35]} p={[t, 0.06, -f / 2]} m={dash} />
            <B s={[f / n / 1.8, 0.12, 0.35]} p={[t, 0.06, f / 2]} m={dash} />
            <B s={[0.35, 0.12, f / n / 1.8]} p={[-f / 2, 0.06, t]} m={dash} />
            <B s={[0.35, 0.12, f / n / 1.8]} p={[f / 2, 0.06, t]} m={dash} />
          </group>
        );
      })}
      <B s={[f * 0.4, 0.5, f * 0.1]} p={[0, 0.3, 0]} m={mat(accent)} />
      <B s={[f * 0.1, 0.5, f * 0.4]} p={[0, 0.3, 0]} m={mat(accent)} />
      <Label position={[0, 4, 0]} text="Add system" border={accent} height={0.026} />
    </group>
  );
}

export type { BuildState };
