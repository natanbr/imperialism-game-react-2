import { expect, it } from 'vitest';
import { scriptedPlayer } from '@/engine/ai/scriptedPlayer';
import { newGame } from '@/engine/newGame';
import { upkeepReserve } from '@/engine/ai/scriptedArmy';
import { bestDepotSite } from '@/engine/ai/railPlan';
import { addDepot } from '@/engine/systems/railroadSystem';
import { addRegiments, SW2, withoutStartForces } from './armyFixtures';
import { emptyWarehouse, N2, setTile, setTreasury } from './fixtures';

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

it('FR-260 weak world trade reserves six payrolls to start a depot and two to join one', () => {
  const start = emptyWarehouse(addRegiments(newGame({ seed: 8, world: 'continent', market: 'world' }), N2, SW2, ['regulars']), N2);
  const tradeHistory = Array.from({ length: 4 }, () => ({ holds: 4, used: 2 }));
  const weakTrade = { ...start, nations: start.nations.map(n => n.id === N2
    ? { ...n, merchantMarine: { ...n.merchantMarine, tradeHistory } } : n) };
  const builds = (state: typeof start, cash: number, structure: 'depot' | 'rail') =>
    scriptedPlayer(setTreasury(state, N2, cash), N2).some(o => 'structure' in o && o.structure === structure);

  // Five arms cost $125 a turn, so a $2,000 depot must leave $750.
  expect(builds(weakTrade, 2749, 'depot')).toBe(false);
  expect(builds(weakTrade, 2750, 'depot')).toBe(true);
  const { tileId } = bestDepotSite(weakTrade, N2)!;
  const [x, y] = tileId.split('-').map(Number);
  const unconnected = addDepot(setTile(weakTrade, tileId, { depot: true }), N2, { x, y });
  expect(builds(unconnected, 750, 'rail')).toBe(true);
});
