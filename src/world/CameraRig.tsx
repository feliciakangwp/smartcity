// Smooth camera flights to home, zones, systems and ships. Any manual drag
// cancels a flight; ship focus keeps following until the user takes over.
import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { useWorld } from '@/store/world';
import { isMobileDevice } from '@/store/world';
import { LAND_Y } from '@/data/layout';
import { useWorldLayout } from './useWorldLayout';
import { useSim } from './maritime/SimContext';

export const HOME = {
  // Framed slightly right of centre so the island clears the schedule panel on the right.
  position: new THREE.Vector3(isMobileDevice ? 0 : 95, isMobileDevice ? 760 : 600, isMobileDevice ? 900 : 720),
  target: new THREE.Vector3(isMobileDevice ? 0 : 95, 0, -5),
};

interface Goal {
  position: THREE.Vector3;
  target: THREE.Vector3;
  followShip?: string;
}

export function CameraRig() {
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls) as OrbitControlsImpl | null;
  const focus = useWorld((s) => s.focus);
  const { layouts, placements } = useWorldLayout();
  const sim = useSim();
  const goal = useRef<Goal | null>(null);

  useEffect(() => {
    const { kind, id } = focus;
    if (kind === 'home') {
      goal.current = { position: HOME.position.clone(), target: HOME.target.clone() };
    } else if (kind === 'zone') {
      const l = layouts.find((x) => x.zone.id === id);
      if (l) {
        const t = new THREE.Vector3(l.plot.x, LAND_Y, l.plot.z);
        goal.current = { target: t, position: t.clone().add(new THREE.Vector3(30, 62, 74)) };
      }
    } else if (kind === 'system') {
      const p = id ? placements.get(id) : undefined;
      if (p) {
        const t = new THREE.Vector3(p.x, LAND_Y + 4, p.z);
        goal.current = { target: t, position: t.clone().add(new THREE.Vector3(26, 34, 48)) };
      }
    } else if (kind === 'place' && id) {
      // Places (ports, airport) are addressed as "x,z"; "x,z,near" frames something small, like a van.
      const [xs, zs, near] = id.split(',');
      const t = new THREE.Vector3(Number(xs), LAND_Y, Number(zs));
      goal.current = { target: t, position: t.clone().add(near === 'near' ? new THREE.Vector3(16, 24, 34) : new THREE.Vector3(60, 95, 120)) };
    } else if (kind === 'ship' && id) {
      goal.current = { target: new THREE.Vector3(), position: new THREE.Vector3(), followShip: id };
    }
    // Only react to new focus requests, not to layout edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus.nonce]);

  useEffect(() => {
    if (!controls) return;
    const start = () => {
      goal.current = null;
      document.body.dataset.worldDragging = '1';
    };
    const end = () => delete document.body.dataset.worldDragging;
    controls.addEventListener('start', start);
    controls.addEventListener('end', end);
    return () => {
      controls.removeEventListener('start', start);
      controls.removeEventListener('end', end);
      end();
    };
  }, [controls]);

  useFrame((_, dt) => {
    if (!controls) return;
    // Keep panning over Singapore: clamp the look-at point and move the camera with it.
    const t = controls.target;
    const cx = THREE.MathUtils.clamp(t.x, -520, 520);
    const cz = THREE.MathUtils.clamp(t.z, -280, 380);
    if (cx !== t.x || cz !== t.z) {
      camera.position.x += cx - t.x;
      camera.position.z += cz - t.z;
      t.set(cx, t.y, cz);
    }
    const g = goal.current;
    if (!g) return;
    if (g.followShip) {
      const ship = sim.ships.find((s) => s.cfg.id === g.followShip);
      if (!ship) return void (goal.current = null);
      g.target.set(ship.x, 4, ship.z);
      g.position.set(ship.x + 60, 55, ship.z + 85);
    }
    const k = 1 - Math.exp(-dt * 2.4);
    camera.position.lerp(g.position, k);
    controls.target.lerp(g.target, k);
    controls.update();
    if (!g.followShip && camera.position.distanceTo(g.position) < 0.5 && controls.target.distanceTo(g.target) < 0.3) goal.current = null;
  });

  return null;
}
