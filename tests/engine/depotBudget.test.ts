import { expect, it } from 'vitest';
import { scriptedPlayer } from '@/engine/ai/scriptedPlayer';
import { newGame } from '@/engine/newGame';
import { upkeepReserve } from '@/engine/ai/scriptedArmy';
import { addRegiments, withoutStartForces } from './armyFixtures';
import { emptyWarehouse, N2, setTreasury } from './fixtures';

it('FR-454 FR-616 a new depot leaves one level-one job for each developer, including at the exact budget', () => {
  const start = emptyWarehouse(newGame({ seed: 1 }), N2);
  const withoutForester = {
    ...start,
    map: { ...start.map, tiles: start.map.tiles.map(row => row.map(tile => ({
      ...tile, workers: tile.workers.filter(worker => worker.id !== 'worker-nation-2-4'),
    }))) },
  };
  const startsDepot = (state: typeof start, cash: number) =>
    scriptedPlayer(setTreasury(state, N2, cash), N2).some(order => 'structure' in order && order.structure === 'depot');

  // A depot costs $2,000. Each developer needs $100 for a level-one job.
  expect(startsDepot(start, 2499)).toBe(false);
  expect(startsDepot(start, 2500)).toBe(true);
  expect(startsDepot(withoutForester, 2399)).toBe(false);
  expect(startsDepot(withoutForester, 2400)).toBe(true);
});

it('FR-213 FR-454 an army can fund a depot down to its military upkeep reserve', () => {
  const continent = withoutStartForces(newGame({ seed: 8, world: 'continent' }));
  const capital = continent.map.tiles.flat().find(tile => tile.cityId === continent.nations[1].cities[0])!;
  const armed = emptyWarehouse(addRegiments(continent, N2, capital.provinceId!, ['regulars']), N2);
  const reserve = upkeepReserve(armed, N2);
  expect(reserve).toBeGreaterThan(0);
  expect(reserve).toBeLessThan(500);
  const plansDepot = (cash: number) => scriptedPlayer(setTreasury(armed, N2, cash), N2)
    .some(order => 'structure' in order && order.structure === 'depot');
  expect(plansDepot(2000 + reserve - 1)).toBe(false);
  expect(plansDepot(2000 + reserve)).toBe(true);
});
