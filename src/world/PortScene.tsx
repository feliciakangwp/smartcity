// The Port World canvas: lighting, sky, sea, land, districts, maritime activity, camera.
import { Suspense, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { AdaptiveDpr, OrbitControls, PerformanceMonitor, Sky } from '@react-three/drei';
import * as THREE from 'three';
import { useLandscape } from '@/store/landscape';
import { useWorld, type ResolvedQuality } from '@/store/world';
import { Ocean } from './Ocean';
import { Terrain } from './Terrain';
import { ZoneDistrict } from './ZoneDistrict';
import { useHighlight } from './useHighlight';
import { useWorldLayout } from './useWorldLayout';
import { CameraRig, HOME } from './CameraRig';
import { IntegrationLines } from './IntegrationLines';
import { UsageLines } from './UsageLines';
import { MaritimeSimProvider, useSim } from './maritime/SimContext';
import { Ship } from './maritime/Ship';
import { ApronBuffer, QuayCrane } from './maritime/QuayCrane';
import { ContainerYards } from './maritime/Yard';
import { RoadTrucks, TerminalTrucks } from './maritime/Trucks';
import { Airport } from './airport/Airport';
import type { Tone } from './materials';

const SUN: [number, number, number] = [260, 420, 200];

export function PortScene() {
  const quality = useWorld((s) => s.quality);
  const setQuality = useWorld((s) => s.setQuality);
  const pref = useLandscape((s) => s.platform.quality);
  const select = useWorld((s) => s.select);
  const effective: ResolvedQuality = pref === 'auto' ? quality : pref;
  const dpr: [number, number] = effective === 'high' ? [1, 2] : effective === 'medium' ? [1, 1.5] : [0.75, 1];

  return (
    <Canvas
      className="port-canvas"
      shadows={effective !== 'low'}
      dpr={dpr}
      camera={{ position: HOME.position.toArray(), fov: 42, near: 1, far: 6000 }}
      onCreated={({ gl }) => {
        // Lets buildings under construction be cut off at their build height.
        gl.localClippingEnabled = true;
      }}
      gl={{ antialias: effective !== 'low', powerPreference: 'high-performance' }}
      onPointerMissed={() => select(null)}
    >
      <PerformanceMonitor
        onDecline={() => pref === 'auto' && setQuality(quality === 'high' ? 'medium' : 'low')}
        onIncline={() => pref === 'auto' && quality === 'low' && setQuality('medium')}
      />
      <AdaptiveDpr pixelated={false} />
      <color attach="background" args={['#cfe6f6']} />
      <fog attach="fog" args={['#d4e8f5', 1100, 2800]} />
      <Sky sunPosition={SUN} turbidity={3.5} rayleigh={0.9} mieCoefficient={0.004} mieDirectionalG={0.8} distance={5000} />
      <hemisphereLight args={['#eaf4ff', '#8fa88a', 0.85]} />
      <ambientLight intensity={0.25} />
      <directionalLight
        position={SUN}
        intensity={2.2}
        color="#fff4e2"
        castShadow={effective !== 'low'}
        shadow-mapSize={effective === 'high' ? [4096, 4096] : [2048, 2048]}
        shadow-camera-left={-520}
        shadow-camera-right={520}
        shadow-camera-top={340}
        shadow-camera-bottom={-340}
        shadow-camera-near={10}
        shadow-camera-far={1600}
        shadow-bias={-0.0004}
        shadow-normalBias={0.6}
      />
      <Suspense fallback={null}>
        <MaritimeSimProvider>
          <Ocean />
          <Terrain />
          <Districts />
          <Maritime />
          <RoadTrucks />
          <Airport />
          <IntegrationLines />
          <UsageLines />
          <CameraRig />
        </MaritimeSimProvider>
      </Suspense>
      <OrbitControls
        makeDefault
        target={HOME.target}
        enableDamping
        dampingFactor={0.08}
        maxPolarAngle={Math.PI / 2.25}
        minDistance={18}
        maxDistance={1800}
        screenSpacePanning={false}
        // Grab the map to move it (left drag / one finger); right drag or two fingers to rotate.
        mouseButtons={{ LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE }}
        touches={{ ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_ROTATE }}
        panSpeed={1.2}
      />
    </Canvas>
  );
}

function Districts() {
  const { layouts, placements } = useWorldLayout();
  const showLabels = useWorld((s) => s.showLabels);
  const selection = useWorld((s) => s.selection);
  const { tone, zoneDimmed, zoneEmphasised } = useHighlight();
  const byZone = useMemo(() => {
    const m = new Map<string, ReturnType<typeof placements.get>[]>();
    for (const p of placements.values()) {
      if (!m.has(p.zoneId)) m.set(p.zoneId, []);
      m.get(p.zoneId)!.push(p);
    }
    return m;
  }, [placements]);

  return (
    <>
      {layouts.map((l) => {
        const list = (byZone.get(l.zone.id) ?? []).filter((p): p is NonNullable<typeof p> => !!p);
        const tones: Record<string, Tone> = {};
        for (const p of list) tones[p.system.id] = tone(p.system.id);
        return (
          <ZoneDistrict
            key={l.zone.id}
            layout={l}
            placements={list}
            dimmed={zoneDimmed(l.zone.id)}
            selected={(selection?.kind === 'zone' && selection.id === l.zone.id) || zoneEmphasised(l.zone.id)}
            tones={tones}
            showLabels={showLabels}
          />
        );
      })}
    </>
  );
}

function Maritime() {
  const sim = useSim();
  return (
    <>
      {sim.ships.map((s) => (
        <Ship key={s.cfg.id} ship={s} />
      ))}
      {sim.berths.map((b) => (
        <group key={b.cfg.id}>
          <QuayCrane berth={b} />
          <ApronBuffer berth={b} />
        </group>
      ))}
      <ContainerYards />
      <TerminalTrucks />
    </>
  );
}
