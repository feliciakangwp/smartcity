// Landmark props for each zone's front strip, so every district reads as its
// own kind of facility (gates, scanners, fences, plazas, canopies, conveyors).
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { ZoneTheme } from '@/types/domain';
import { useWorld } from '@/store/world';
import { B, Cyl } from './buildings/archetypes';
import { C, mat, tint } from './materials';
import { CONTAINER_COLORS } from '@/sim/maritime';

interface ThemeProps {
  w: number;
  d: number;
  color: string;
  dim: boolean;
}

const ambientOn = () => useWorld.getState().showAmbient;

function Truck({ p, rot = 0, cargo = '#2e6db4', dim }: { p: [number, number, number]; rot?: number; cargo?: string; dim: boolean }) {
  const o = dim ? 0.35 : undefined;
  return (
    <group position={p} rotation-y={rot}>
      <B s={[4.6, 0.5, 1.6]} p={[0, 0.6, 0]} m={mat('#2b2f33', { opacity: o })} />
      <B s={[1.3, 1.4, 1.6]} p={[2.1, 1.5, 0]} m={mat('#e9edf2', { opacity: o })} />
      <B s={[3.2, 1.5, 1.55]} p={[-0.6, 1.6, 0]} m={mat(cargo, { opacity: o })} />
      {[-1.5, 1.6].map((x) => [-0.8, 0.8].map((z) => <Cyl key={`${x}${z}`} r={0.42} h={0.3} p={[x, 0.42, z]} rot={[Math.PI / 2, 0, 0]} m={mat('#16191c')} />))}
    </group>
  );
}

function TradeGate({ w, d, color, dim }: ThemeProps) {
  const arms = useRef<(THREE.Group | null)[]>([]);
  useFrame(({ clock }) => {
    if (!ambientOn()) return;
    arms.current.forEach((a, i) => {
      if (a) a.rotation.z = Math.max(0, Math.sin(clock.elapsedTime * 0.6 + i * 1.7)) * 1.2;
    });
  });
  const o = dim ? 0.35 : undefined;
  const lanes = 3;
  return (
    <group>
      {[-1, 1].map((k) => (
        <B key={k} s={[1.4, 8, 1.4]} p={[k * (w * 0.32), 4, 0]} m={mat(color, { opacity: o })} />
      ))}
      <B s={[w * 0.64 + 1.4, 1.6, 1.8]} p={[0, 8.4, 0]} m={mat(color, { opacity: o })} />
      <B s={[w * 0.5, 0.5, 0.1]} p={[0, 8.4, 0.95]} m={mat('#5ad6f0', { emissive: '#22c3e6', emissiveIntensity: 0.8, opacity: o })} />
      {Array.from({ length: lanes }, (_, i) => {
        const x = -w * 0.2 + (i * w * 0.4) / (lanes - 1);
        return (
          <group key={i} position={[x, 0, 0]}>
            <B s={[1.6, 2.4, 1.6]} p={[-2.6, 1.2, 0]} m={mat(C.glass, { opacity: o ?? 0.9, roughness: 0.15 })} />
            <B s={[1.8, 0.3, 1.8]} p={[-2.6, 2.55, 0]} m={mat(color, { opacity: o })} />
            <group position={[-1.7, 1.1, 0]} ref={(el) => (arms.current[i] = el)}>
              <B s={[3.4, 0.18, 0.18]} p={[1.7, 0, 0]} m={mat('#e5463c', { opacity: o })} />
            </group>
          </group>
        );
      })}
      <Truck p={[-w * 0.2 + 1.2, 0, -d * 0.1 - 5]} rot={Math.PI / 2} cargo="#c0392b" dim={dim} />
      <Truck p={[w * 0.2 + 1.2, 0, -d * 0.1 - 5]} rot={Math.PI / 2} cargo="#2f8f4e" dim={dim} />
    </group>
  );
}

function ScanningGantry({ w, color, dim }: ThemeProps) {
  const beam = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (beam.current && ambientOn()) beam.current.position.y = 1 + (Math.sin(clock.elapsedTime * 1.4) * 0.5 + 0.5) * 5;
  });
  const o = dim ? 0.35 : undefined;
  return (
    <group>
      {[-1, 1].map((k) => (
        <B key={k} s={[1, 7.5, 1.4]} p={[-w * 0.18 + k * 3.6, 3.75, 0]} m={mat(color, { opacity: o })} />
      ))}
      <B s={[8.4, 1.2, 1.6]} p={[-w * 0.18, 7.8, 0]} m={mat(color, { opacity: o })} />
      <mesh ref={beam} position={[-w * 0.18, 3, 0]} scale={[6.2, 0.15, 1.2]}>
        <boxGeometry />
        <meshStandardMaterial color="#9ff0ff" emissive="#22c3e6" emissiveIntensity={1.4} transparent opacity={dim ? 0.2 : 0.75} />
      </mesh>
      <Truck p={[-w * 0.18, 0, 0]} cargo="#e2a12b" dim={dim} rot={Math.PI / 2} />
      {[0, 1, 2].map((i) => (
        <group key={i} position={[w * 0.12 + i * 4.5, 0, 0]}>
          <B s={[2.2, 2.6, 2]} p={[0, 1.3, 0]} m={mat(C.white, { opacity: o })} />
          <B s={[2.4, 0.3, 2.2]} p={[0, 2.75, 0]} m={mat(color, { opacity: o })} />
          <B s={[0.9, 1, 0.05]} p={[0, 1.5, 1.03]} m={mat(C.glass, { opacity: o })} />
        </group>
      ))}
    </group>
  );
}

function SecureCompound({ w, d, color, dim }: ThemeProps) {
  const o = dim ? 0.35 : undefined;
  const posts = Math.floor(w / 2.2);
  const lights = useRef<THREE.Mesh[]>([]);
  useFrame(({ clock }) => {
    if (!ambientOn()) return;
    lights.current.forEach((l, i) => {
      if (l) (l.material as THREE.MeshStandardMaterial).emissiveIntensity = Math.sin(clock.elapsedTime * 6 + i * Math.PI) > 0 ? 1.6 : 0.1;
    });
  });
  return (
    <group>
      {Array.from({ length: posts }, (_, i) => (
        <B key={i} s={[0.15, 2.2, 0.15]} p={[-w / 2 + 1 + i * 2.2, 1.1, d / 2 - 0.5]} m={mat(C.steel, { opacity: o })} />
      ))}
      <B s={[w - 2, 0.1, 0.06]} p={[0, 2.1, d / 2 - 0.5]} m={mat(C.steel, { opacity: o })} />
      <B s={[w - 2, 0.1, 0.06]} p={[0, 1.2, d / 2 - 0.5]} m={mat(C.steel, { opacity: o })} />
      {[-1, 1].map((k) => (
        <group key={k} position={[k * w * 0.4, 0, 0]}>
          <Cyl r={0.2} h={9} p={[0, 4.5, 0]} m={mat(C.steel, { opacity: o })} />
          <B s={[1.6, 0.6, 0.8]} p={[0, 9, 0]} m={mat('#fff3c2', { emissive: '#ffe08a', emissiveIntensity: 0.5, opacity: o })} />
        </group>
      ))}
      {[0, 1, 2].map((i) => (
        <B key={i} s={[6, 2.6, 2.4]} p={[-w * 0.12 + i * 6.6, 1.3, -1]} m={mat(['#c0392b', '#8d9aa5', '#2e6db4'][i], { opacity: o, roughness: 0.6 })} />
      ))}
      <group position={[w * 0.25, 0, 1]}>
        <B s={[4, 1.1, 1.9]} p={[0, 0.9, 0]} m={mat('#1f2a44', { opacity: o })} />
        <B s={[2.2, 0.8, 1.7]} p={[-0.2, 1.8, 0]} m={mat(C.glass, { opacity: o })} />
        {[-0.5, 0.5].map((x, i) => (
          <mesh key={x} ref={(el) => el && (lights.current[i] = el)} position={[x, 2.3, 0]} scale={[0.6, 0.25, 0.5]}>
            <boxGeometry />
            <meshStandardMaterial color={i ? '#ff5a4f' : '#4a8bff'} emissive={i ? '#ff2a1f' : '#2a6bff'} emissiveIntensity={1} />
          </mesh>
        ))}
      </group>
      <B s={[1.2, 1.2, 0.1]} p={[0, 0.6, d / 2 - 0.4]} m={mat(color, { opacity: o })} />
    </group>
  );
}

function TreasuryPlaza({ w, d, color, dim }: ThemeProps) {
  const jet = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (jet.current && ambientOn()) jet.current.scale.y = 2.2 + Math.sin(clock.elapsedTime * 3) * 0.5;
  });
  const o = dim ? 0.35 : undefined;
  return (
    <group>
      <B s={[w * 0.8, 0.08, d * 0.8]} p={[0, 0.04, 0]} m={mat('#e9e2d3', { opacity: o })} />
      <Cyl r={3.4} h={0.8} p={[0, 0.4, 0]} m={mat('#d9d3c4', { opacity: o })} />
      <Cyl r={3} h={0.1} p={[0, 0.8, 0]} m={mat('#4fb2e3', { roughness: 0.1, opacity: o })} />
      <mesh ref={jet} position={[0, 1.6, 0]} scale={[0.25, 2.2, 0.25]}>
        <cylinderGeometry args={[0.6, 1, 1, 10]} />
        <meshStandardMaterial color="#cfefff" transparent opacity={dim ? 0.2 : 0.7} />
      </mesh>
      {[-1, 1].map((k) => (
        <group key={k}>
          <B s={[3, 0.5, 0.8]} p={[k * w * 0.25, 0.4, 0]} m={mat('#8a6a4a', { opacity: o })} />
          <Cyl r={0.25} h={2} p={[k * w * 0.36, 1, -1.5]} m={mat('#7a5a3a', { opacity: o })} />
          <mesh position={[k * w * 0.36, 3, -1.5]} material={mat('#4f9b57', { opacity: o })} castShadow>
            <icosahedronGeometry args={[1.6, 1]} />
          </mesh>
        </group>
      ))}
      <B s={[0.3, 5, 0.3]} p={[w * 0.42, 2.5, d * 0.3]} m={mat(C.steel, { opacity: o })} />
      <B s={[2, 1.2, 0.05]} p={[w * 0.42 + 1, 4.4, d * 0.3]} m={mat(color, { opacity: o })} />
    </group>
  );
}

function TravellerCanopy({ w, d, color, dim }: ThemeProps) {
  const people = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!people.current || !ambientOn()) return;
    people.current.children.forEach((p, i) => {
      const t = (clock.elapsedTime * 0.5 + i * 0.37) % 1;
      p.position.x = -w * 0.38 + t * w * 0.5;
      p.position.y = Math.abs(Math.sin(clock.elapsedTime * 6 + i)) * 0.08;
    });
  });
  const o = dim ? 0.35 : undefined;
  const shirts = ['#e9b414', '#2f7fe0', '#e0413f', '#23a35a', '#7c5ce0', '#ec7a1c', '#2bb3c8'];
  return (
    <group>
      {[-0.4, -0.13, 0.13, 0.4].map((f) => (
        <Cyl key={f} r={0.2} h={4.2} p={[f * w, 2.1, -d * 0.15]} m={mat(C.steel, { opacity: o })} />
      ))}
      <mesh position={[0, 4.5, -d * 0.15]} rotation-x={0.1} scale={[w * 0.9, 0.35, d * 0.6]} material={mat(color, { opacity: o ?? 0.92 })} castShadow>
        <boxGeometry />
      </mesh>
      {[0, 1, 2, 3].map((i) => (
        <group key={i} position={[w * 0.18 + i * 3.2, 0, -d * 0.15]}>
          <B s={[2.2, 1.2, 1]} p={[0, 0.6, 0]} m={mat(C.white, { opacity: o })} />
          <B s={[1, 0.7, 0.08]} p={[0, 1.7, 0]} m={mat('#5ad6f0', { emissive: '#22c3e6', emissiveIntensity: 0.8, opacity: o })} />
        </group>
      ))}
      <group ref={people} position={[0, 0, -d * 0.15 + 2.2]}>
        {Array.from({ length: 9 }, (_, i) => (
          <group key={i}>
            <Cyl r={0.32} h={1.1} p={[0, 0.75, 0]} m={mat(shirts[i % shirts.length], { opacity: o })} />
            <mesh position={[0, 1.55, 0]} scale={0.27} material={mat('#e8b896', { opacity: o })}>
              <sphereGeometry args={[1, 10, 8]} />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  );
}

function SortingConveyor({ w, d, color, dim }: ThemeProps) {
  const boxes = useRef<THREE.Group>(null);
  const len = w * 0.7;
  useFrame(({ clock }) => {
    if (!boxes.current || !ambientOn()) return;
    boxes.current.children.forEach((b, i, all) => {
      const t = (clock.elapsedTime * 0.08 + i / all.length) % 1;
      // Loop: out along the front belt, back along the rear belt.
      if (t < 0.5) b.position.set(-len / 2 + t * 2 * len, 1.55, 1.6);
      else b.position.set(len / 2 - (t - 0.5) * 2 * len, 1.55, -1.6);
    });
  });
  const o = dim ? 0.35 : undefined;
  return (
    <group>
      {[-1.6, 1.6].map((z) => (
        <group key={z}>
          <B s={[len, 0.4, 1.4]} p={[0, 1.1, z]} m={mat('#3a4654', { opacity: o })} />
          <B s={[len, 0.1, 1.5]} p={[0, 1.33, z]} m={mat(color, { opacity: o })} />
        </group>
      ))}
      {Array.from({ length: 6 }, (_, i) => (
        <B key={i} s={[0.3, 1, 4.4]} p={[-len / 2 + (i * len) / 5, 0.5, 0]} m={mat(C.steel, { opacity: o })} />
      ))}
      <group ref={boxes}>
        {Array.from({ length: 12 }, (_, i) => (
          <B key={i} s={[1.1, 0.8, 0.9]} p={[0, 1.55, 1.6]} m={mat('#' + new THREE.Color(CONTAINER_COLORS[i % CONTAINER_COLORS.length]).getHexString(), { opacity: o })} />
        ))}
      </group>
      <B s={[4, 4.5, 5.6]} p={[w * 0.42, 2.25, 0]} m={mat(tint(color, '#ffffff', 0.4), { opacity: o })} />
      <B s={[4.2, 0.4, 5.8]} p={[w * 0.42, 4.7, 0]} m={mat(color, { opacity: o })} />
      <B s={[0.1, 1.6, 2.8]} p={[w * 0.42 - 2.05, 1.6, 0]} m={mat('#5ad6f0', { emissive: '#22c3e6', emissiveIntensity: 0.7, opacity: o })} />
      <B s={[2, 0.1, d * 0.6]} p={[-w * 0.44, 0.05, 0]} m={mat('#f2c94c', { opacity: o })} />
    </group>
  );
}

/** Shared technology campus: glass atrium, green-roofed wings, skybridge and a data spire. */
function SharedCampus({ w, d, color, dim }: ThemeProps) {
  const ring = useRef<THREE.Mesh>(null);
  const halo = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!ambientOn()) return;
    const t = clock.elapsedTime;
    if (ring.current) ring.current.position.y = 2 + ((t * 0.35) % 1) * 9;
    if (halo.current) (halo.current.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.6 + Math.sin(t * 2) * 0.35;
  });
  const o = dim ? 0.35 : undefined;
  const glass = mat(C.glass, { opacity: o ?? 0.85, roughness: 0.08, metalness: 0.35 });
  const green = mat('#6dbb6a', { opacity: o, roughness: 0.95 });
  return (
    <group>
      <Cyl r={w * 0.46} h={0.06} p={[0, 0.03, 0]} m={mat(tint(color, '#ffffff', 0.55), { opacity: o })} />
      {/* Atrium */}
      <Cyl r={3.4} h={4.2} p={[0, 2.1, 0]} m={glass} />
      <Cyl r={3.7} h={0.35} p={[0, 4.35, 0]} m={mat(color, { opacity: o })} />
      <Cyl r={2.4} h={1.6} p={[0, 5.3, 0]} m={glass} />
      <Cyl r={2.6} h={0.25} p={[0, 6.2, 0]} m={mat(color, { opacity: o })} />
      {/* Wings with green roofs and a skybridge */}
      {[-1, 1].map((k) => (
        <group key={k} position={[k * w * 0.3, 0, -d * 0.05]}>
          <B s={[w * 0.22, 3.2, d * 0.55]} p={[0, 1.6, 0]} m={mat(C.white, { opacity: o, map: undefined })} />
          <B s={[w * 0.225, 0.4, d * 0.56]} p={[0, 1.1, 0]} m={mat(C.glass, { opacity: o ?? 0.9, roughness: 0.15 })} />
          <B s={[w * 0.2, 0.25, d * 0.5]} p={[0, 3.32, 0]} m={green} />
          <B s={[w * 0.08, 1.2, 1.4]} p={[-k * w * 0.13, 2.6, 0]} m={glass} />
        </group>
      ))}
      {/* Data spire with a rising light ring */}
      <group position={[w * 0.42, 0, d * 0.2]}>
        <Cyl r={0.35} h={12} p={[0, 6, 0]} m={mat('#dfe7ee', { opacity: o })} />
        <mesh ref={halo} position={[0, 12.3, 0]} scale={0.7}>
          <sphereGeometry args={[1, 14, 10]} />
          <meshStandardMaterial color="#9ff0e6" emissive={color} emissiveIntensity={0.8} transparent opacity={dim ? 0.3 : 1} />
        </mesh>
        <mesh ref={ring} position={[0, 2, 0]} rotation-x={Math.PI / 2}>
          <torusGeometry args={[1.1, 0.12, 6, 24]} />
          <meshStandardMaterial color="#c9fff7" emissive={color} emissiveIntensity={1.2} transparent opacity={dim ? 0.2 : 0.85} />
        </mesh>
      </group>
      {[-0.42, -0.2, 0.2].map((f) => (
        <group key={f} position={[f * w, 0, d * 0.32]}>
          <Cyl r={0.18} h={1.4} p={[0, 0.7, 0]} m={mat('#7a5a3a', { opacity: o })} />
          <mesh position={[0, 2.1, 0]} material={mat('#4f9b57', { opacity: o })} castShadow>
            <icosahedronGeometry args={[1.1, 1]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function Parking({ w, d, dim }: ThemeProps) {
  const o = dim ? 0.35 : undefined;
  return (
    <group>
      <B s={[w * 0.8, 0.06, d * 0.7]} p={[0, 0.03, 0]} m={mat('#596470', { opacity: o })} />
      {Array.from({ length: 8 }, (_, i) => (
        <B key={i} s={[0.15, 0.08, d * 0.5]} p={[-w * 0.36 + i * w * 0.1, 0.08, 0]} m={mat('#ffffff', { opacity: o })} />
      ))}
    </group>
  );
}

const THEMES: Record<ZoneTheme, (p: ThemeProps) => JSX.Element> = {
  trade: TradeGate,
  compliance: ScanningGantry,
  enforcement: SecureCompound,
  finance: TreasuryPlaza,
  traveller: TravellerCanopy,
  integration: SortingConveyor,
  shared: SharedCampus,
  generic: Parking,
};


export function ZoneLandmark({ theme, ...props }: ThemeProps & { theme: ZoneTheme }) {
  const Comp = THEMES[theme] ?? Parking;
  return <Comp {...props} />;
}
