import { setImmediate as yieldToRunner } from 'node:timers/promises';
import { expect, it } from 'vitest';
import { runGame } from './harness';
import { COMPUTER_ID, HUMAN_ID } from './humans';
import type { Order } from '@/engine/orders/Order';
import { MaterialType, ResourceType } from '@/types/Resource';

const results: { seed: number; holds: number; maxSettled: number }[] = [];
for (let seed = 1; seed <= 24; seed++) {
  let maxSettled = 0;
  const game = runGame({ seed, turns: 25, human: {
    name: 'idle',
    orders(state) {
      const nation = state.nations.find(n => n.id === COMPUTER_ID)!;
      const phase = nation.merchantMarine.tradeHistory?.at(-1);
      maxSettled = Math.max(maxSettled, phase?.used ?? 0);
      return [];
    },
  } });
  const fleet = game.final.nations.find(n => n.id === COMPUTER_ID)!.merchantMarine;
  results.push({ seed, holds: fleet.holds, maxSettled: Math.max(maxSettled, fleet.tradeHistory?.at(-1)?.used ?? 0) });
  await yieldToRunner();
}
const expanded = results.filter(r => r.holds >= 8).length;
const used = Math.max(...results.map(r => r.maxSettled));

it(`FR-516 idle, seeds 1–24: ${expanded}/24 fleets reached eight holds by turn 25, maximum ${used} holds actually used`, () => {
  expect(expanded, JSON.stringify(results)).toBeGreaterThanOrEqual(18);
  expect(used).toBeGreaterThan(4);
});

it('FR-514 a human builds an Indiaman from the continent start and uses eight real holds with trading partners', () => {
  const game = runGame({ seed: 1, turns: 8, human: { name: 'shipbuilder', orders(state) {
    const nation = state.nations.find(n => n.id === HUMAN_ID)!;
    const orders: Order[] = [];
    if (state.turn <= 3) orders.push({ kind: 'proposeOverture', nationId: HUMAN_ID, targetId: `minor-${state.turn}`, overture: 'consulate' });
    if (state.turn === 1) orders.push({ kind: 'setProduction', nationId: HUMAN_ID, building: 'textileMill', output: MaterialType.Fabric, amount: 1 });
    if (nation.merchantMarine.holds < 8 && nation.warehouse.fabric >= 3) {
      orders.push({ kind: 'setShipyard', nationId: HUMAN_ID, ship: 'indiaman', count: 1 });
    }
    if (nation.merchantMarine.holds >= 8 && nation.treasury >= 1300) {
      for (const commodity of [ResourceType.Timber, ResourceType.Coal, ResourceType.IronOre, ResourceType.Cotton] as const) {
        orders.push({ kind: 'buyCommodity', nationId: HUMAN_ID, commodity, amount: 2 });
      }
    }
    return orders;
  } } });
  expect(game.turns.flatMap(t => t.humanRefused)).toEqual([]);
  const fleet = game.final.nations.find(n => n.id === HUMAN_ID)!.merchantMarine;
  expect(fleet.ships).toEqual({ indiaman: 2 });
  expect(fleet.tradeHistory).toContainEqual({ holds: 8, used: 8 });
});
