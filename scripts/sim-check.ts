// Headless check: runs the shipping, road logistics and airport simulations and
// prints ship state changes plus a summary. Run: npm run sim:check
import { createMaritimeSim } from '../src/sim/maritime';
import { createLogisticsSim } from '../src/sim/logistics';
import { createAirportSim } from '../src/sim/airport';
import { createSeed } from '../src/data/seed';

const seed = createSeed();
const sim = createMaritimeSim(seed.ships, seed.berths);
const roads = createLogisticsSim(() => sim);
const air = createAirportSim();
air.setCheckpoint({ x: 272, z: 8, width: 46, depth: 42 });

const last = sim.ships.map((s) => s.state);
const seconds = Number(process.argv[2] ?? 900);
let craneMoves = 0;
let maxWaiting = 0;
let maxRoadTrucks = 0;
let maxParked = 0;
const prevRemaining = sim.berths.map((b) => b.crane.remaining);
const yardsStart = Object.fromEntries(Object.entries(sim.yards).map(([k, y]) => [k, y.count]));
console.log('Opening states:', sim.ships.map((s) => `${s.cfg.name} ${s.state}`).join(' | '));
for (let i = 0; i < seconds * 30; i++) {
  const dt = 1 / 30;
  sim.step(dt);
  roads.step(dt);
  air.step(dt);
  sim.ships.forEach((s, k) => {
    if (s.state !== last[k]) {
      if (i < 30 * 600) console.log(`${sim.time.toFixed(0).padStart(5)}s  ${s.port.name.padEnd(16)} ${s.cfg.name.padEnd(18)} ${last[k]} -> ${s.state}${s.berth ? ' @' + s.berth.cfg.name : ''}`);
      last[k] = s.state;
    }
  });
  sim.berths.forEach((b, k) => {
    if (b.crane.remaining < prevRemaining[k]) craneMoves++;
    prevRemaining[k] = b.crane.remaining;
  });
  maxWaiting = Math.max(maxWaiting, sim.ships.filter((s) => s.state === 'WAITING').length);
  maxRoadTrucks = Math.max(maxRoadTrucks, roads.trucks.filter((t) => t.active).length);
  maxParked = Math.max(maxParked, air.planes.filter((p) => p.state === 'parked').length);
}
const berthShare = new Map<string, number>();
for (const b of sim.berths) if (b.ship) berthShare.set(b.ship.cfg.id, (berthShare.get(b.ship.cfg.id) ?? 0) + 1);
console.log('--- after', seconds, 's');
console.log('crane container moves:', craneMoves, '| most ships waiting at once:', maxWaiting, '| any ship on two berths:', [...berthShare.values()].some((n) => n > 1));
console.log('yards:', Object.entries(sim.yards).map(([k, y]) => `${k} ${yardsStart[k]} -> ${y.count}/${y.capacity}`).join(', '));
console.log('road: deliveries', roads.delivered, '| port shuttles', roads.shuttled, '| most trucks on road at once', maxRoadTrucks);
console.log('airport: travellers through checkpoint', air.processed, '| most aircraft at gates', maxParked, '| next arrival', air.upcoming[0]?.flight);
