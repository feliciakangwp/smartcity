// Headless check: runs the maritime simulation and prints ship state changes.
import { createMaritimeSim } from '../src/sim/maritime';
import { createSeed } from '../src/data/seed';

const seed = createSeed();
const sim = createMaritimeSim(seed.ships, seed.berths);
const last = sim.ships.map((s) => s.state);
const seconds = Number(process.argv[2] ?? 900);
let containersMoved = 0;
const prevRemaining = sim.berths.map((b) => b.crane.remaining);
for (let i = 0; i < seconds * 30; i++) {
  sim.step(1 / 30);
  sim.ships.forEach((s, k) => {
    if (s.state !== last[k]) {
      console.log(`${sim.time.toFixed(0).padStart(5)}s  ${s.cfg.name.padEnd(18)} ${last[k]} -> ${s.state}${s.berth ? ' @' + s.berth.cfg.name : ''}`);
      last[k] = s.state;
    }
  });
  sim.berths.forEach((b, k) => {
    if (b.crane.remaining < prevRemaining[k]) containersMoved++;
    prevRemaining[k] = b.crane.remaining;
  });
}
const berthed = new Set(sim.berths.map((b) => b.ship?.cfg.name).filter(Boolean));
console.log('containers moved by cranes:', containersMoved, '| yard:', sim.yard.count, '/', sim.yard.capacity, '| berths occupied:', [...berthed].join(', ') || 'none');
