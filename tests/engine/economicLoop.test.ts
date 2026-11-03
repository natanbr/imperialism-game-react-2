// FR-044, the M2 acceptance test: grain on a farm ends up as canned food in the warehouse through
// transport and production, headless, through the order API.
import { describe, it, expect } from 'vitest';
import { resolveTurn } from '@/engine/turn/resolveTurn';
import { GameEvent } from '@/engine/turn/context';
import { GameState } from '@/types/GameState';
import { ResourceType } from '@/types/Resource';
import { emptyWarehouse, game, invariantViolations, N1, setIndustry, setTile, stockOf, T } from './fixtures';

/**
 * nation-1 with one expert (4 labour, eats 1 grain a turn), an empty warehouse but 1 fruit, and a
 * level 3 farm next to the capital as the only grain source (4 grain a turn). The open range next
 * to the capital ships 1 livestock a turn.
 */
function start(farmHasGrain: boolean): GameState {
  let s = emptyWarehouse(game(), N1, { fruit: 1 });
  s = setIndustry(s, N1, { workers: { untrained: 0, trained: 0, expert: 1 } });
  s = setTile(s, T.dryPlains1, { resource: undefined });
  s = setTile(s, T.homeOrchard1, { resource: undefined });
  s = setTile(s, T.farm1, { resource: farmHasGrain ? { type: ResourceType.Grain, level: 3 } : undefined });
  return s;
}

const canFood = { kind: 'setProduction', nationId: N1, building: 'foodProcessing', amount: 2 } as const;

function play(farmHasGrain: boolean) {
  const s0 = start(farmHasGrain);
  const turn1 = resolveTurn(s0, {}, 1);
  const turn2 = resolveTurn(turn1.state, { [N1]: [canFood] }, 1);
  return { s0, turn1, turn2 };
}

const ofNation1 = (events: GameEvent[]) => events.filter(e => 'nationId' in e && e.nationId === N1);

describe('FR-044 grain from a farm becomes canned food', () => {
  it('FR-044 the farm\'s grain is shipped to the warehouse, then food processing cans it', () => {
    const { s0, turn1, turn2 } = play(true);

    expect(stockOf(s0, N1, 'grain')).toBe(0);
    // Turn 1: 4 grain shipped from the farm, 1 eaten by the expert.
    expect(stockOf(turn1.state, N1, 'grain')).toBe(3);
    expect(stockOf(turn1.state, N1, 'livestock')).toBe(1);

    // Turn 2: the order is accepted and production makes 2 cans from 2 grain, 1 fruit, 1 livestock.
    expect(ofNation1(turn2.events)).toContainEqual({ type: 'goods-produced', nationId: N1, output: 'cannedFood', amount: 2 });
    expect(turn2.events.filter(e => e.type === 'order-rejected')).toEqual([]);
    expect(stockOf(turn2.state, N1, 'cannedFood')).toBe(2);
    expect(stockOf(turn2.state, N1, 'fruit')).toBe(0);
    // 3 - 2 canned + 4 shipped - 1 eaten.
    expect(stockOf(turn2.state, N1, 'grain')).toBe(4);
    expect(invariantViolations(turn2.state)).toEqual([]);
  });

  it('FR-044 without the farm\'s grain there is nothing to can', () => {
    const { turn1, turn2 } = play(false);

    expect(stockOf(turn1.state, N1, 'grain')).toBe(0);
    expect(turn2.events).toContainEqual({ type: 'order-rejected', nationId: N1, order: canFood, reason: 'insufficient-resources' });
    expect(stockOf(turn2.state, N1, 'cannedFood')).toBe(0);
  });
});
