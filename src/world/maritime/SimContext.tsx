// Owns the ambient simulations (shipping, road logistics, airport) and steps
// them once per frame. They are independent of ICT data-flow visuals.
import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import { createMaritimeSim, type MaritimeSim } from '@/sim/maritime';
import { createLogisticsSim, type LogisticsSim } from '@/sim/logistics';
import { createAirportSim, type AirportSim } from '@/sim/airport';
import { useLandscape } from '@/store/landscape';
import { useWorld } from '@/store/world';
import { useWorldLayout } from '../useWorldLayout';

export interface Sims {
  maritime: MaritimeSim;
  logistics: LogisticsSim;
  airport: AirportSim;
}

const SimContext = createContext<Sims | null>(null);

function useSims() {
  const sims = useContext(SimContext);
  if (!sims) throw new Error('Simulation hooks must be used inside <MaritimeSimProvider>');
  return sims;
}
export const useSim = () => useSims().maritime;
export const useLogistics = () => useSims().logistics;
export const useAirport = () => useSims().airport;

/** Shared with UI outside the canvas (ship panel, schedule), refreshed when the config changes. */
export let currentSim: MaritimeSim | null = null;
export let currentSims: Sims | null = null;

export function MaritimeSimProvider({ children }: { children: ReactNode }) {
  const ships = useLandscape((s) => s.ships);
  const berths = useLandscape((s) => s.berths);
  const { layouts } = useWorldLayout();
  const sims = useMemo<Sims>(() => {
    const maritime = createMaritimeSim(ships, berths);
    const s = { maritime, logistics: createLogisticsSim(() => maritime), airport: createAirportSim() };
    currentSim = maritime;
    currentSims = s;
    return s;
  }, [ships, berths]);

  // Travellers walk through whichever zone uses the passenger-checkpoint facility.
  const checkpoint = layouts.find((l) => l.zone.theme === 'traveller');
  useEffect(() => {
    sims.airport.setCheckpoint(checkpoint ? { x: checkpoint.plot.x, z: checkpoint.plot.z, width: checkpoint.width, depth: checkpoint.depth } : null);
  }, [sims, checkpoint?.plot.x, checkpoint?.plot.z, checkpoint?.width, checkpoint?.depth]);

  return (
    <SimContext.Provider value={sims}>
      <SimDriver sims={sims} />
      {children}
    </SimContext.Provider>
  );
}

function SimDriver({ sims }: { sims: Sims }) {
  // Negative priority: runs before the components that read the sims, without taking over rendering.
  useFrame((_, dt) => {
    const { speed, showAmbient } = useWorld.getState();
    if (!showAmbient) return;
    const step = Math.min(dt, 0.1) * speed;
    // Sub-step at high speeds so cranes, trucks and aircraft hit their targets cleanly.
    const n = Math.ceil(step / 0.05);
    for (let i = 0; i < n; i++) {
      sims.maritime.step(step / n);
      sims.logistics.step(step / n);
      sims.airport.step(step / n);
    }
  }, -1);
  return null;
}
