// Owns the ambient maritime simulation and steps it once per frame.
import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import { createMaritimeSim, type MaritimeSim } from '@/sim/maritime';
import { useLandscape } from '@/store/landscape';
import { useWorld } from '@/store/world';

const SimContext = createContext<MaritimeSim | null>(null);

export function useSim() {
  const sim = useContext(SimContext);
  if (!sim) throw new Error('useSim must be used inside <MaritimeSimProvider>');
  return sim;
}

/** Shared with UI outside the canvas (ship panel), refreshed when the config changes. */
export let currentSim: MaritimeSim | null = null;

export function MaritimeSimProvider({ children }: { children: ReactNode }) {
  const ships = useLandscape((s) => s.ships);
  const berths = useLandscape((s) => s.berths);
  const sim = useMemo(() => {
    const s = createMaritimeSim(ships, berths);
    currentSim = s;
    return s;
  }, [ships, berths]);
  return (
    <SimContext.Provider value={sim}>
      <SimDriver sim={sim} />
      {children}
    </SimContext.Provider>
  );
}

function SimDriver({ sim }: { sim: MaritimeSim }) {
  // Negative priority: runs before the components that read the sim, without taking over rendering.
  useFrame((_, dt) => {
    const { speed, showAmbient } = useWorld.getState();
    if (!showAmbient) return;
    const step = Math.min(dt, 0.1) * speed;
    // Sub-step at high speeds so cranes and trucks hit their targets cleanly.
    const n = Math.ceil(step / 0.05);
    for (let i = 0; i < n; i++) sim.step(step / n);
  }, -1);
  return null;
}
