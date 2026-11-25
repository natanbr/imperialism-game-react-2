import { expect, it } from 'vitest';
import { cargoHolds } from '@/definisions/ships';
import { newGame, type GameEvent } from '@/engine';
import { councilStanding } from '@/engine/council/council';
import { militaryStrength } from '@/engine/diplomacy/queries';
import { labourTotal } from '@/engine/industry/labour';
import { scoreOf } from '@/engine/score/score';
import { projectRankings } from '@/store/rankHistory';
import { ResourceType } from '@/types/Resource';
import type { Nation } from '@/types/Nation';
import { deepFreeze } from '../engine/fixtures';

it('FR-610 projects only the permitted competition places from settled sources, with ties in founding order', () => {
  const game = newGame({ seed: 1, world: 'continent' });
  const [first, second] = game.nations;
  const third = { ...first, id: 'third', colorSlot: 3 };
  game.nations = [third, second, first].map(n => ({
    ...n, transportCapacity: n.id === third.id ? 2 : 8,
    treasury: n.id === second.id ? 50000 : 0,
    industry: {
      ...n.industry,
      buildings: { lumberMill: { capacity: n.colorSlot, pendingCapacity: 12 - n.colorSlot, orders: {} } },
      workers: { untrained: 2, trained: 0, expert: 4 },
      training: { untrained: 0, trained: 0, expert: n.colorSlot },
      sick: { untrained: 0, trained: 0, expert: n.id === first.id ? 3 : 0 },
    },
    merchantMarine: n.id === second.id ? { holds: 9, avgSpeed: 1 } :
      { holds: 100, avgSpeed: 1, ships: { trader: n.colorSlot } },
  }));
  game.armies = game.armies.filter(a => a.ownerId !== first.id);
  const commodity = ResourceType.Coal;
  const events: GameEvent[] = [
    { type: 'goods-sold', nationId: first.id, counterpartyId: second.id, commodity, amount: 2, price: 3, income: 6 },
    { type: 'goods-bought', nationId: second.id, counterpartyId: first.id, commodity, amount: 2, price: 3, cost: 6 },
    { type: 'goods-sold', nationId: first.id, commodity, amount: 2, price: 1, income: 2 },
    { type: 'goods-sold', nationId: third.id, commodity, amount: 3, price: 20, income: 60 },
    { type: 'forced-sale', nationId: second.id, commodity, amount: 12, price: 10, proceeds: 120 },
  ];
  const ranked = (quantity: (n: Nation) => number, powers = game.nations) => [...powers]
    .sort((a, b) => quantity(b) - quantity(a) || a.colorSlot - b.colorSlot)
    .map(n => ({ nationId: n.id, place: 1 + powers.filter(other => quantity(other) > quantity(n)).length }));
  const row = (nation: Nation, place: number) => ({ nationId: nation.id, place });
  deepFreeze(game);
  deepFreeze(events);
  const record = projectRankings(game, events, 5);
  expect(record).toEqual({ turn: 5, places: {
    council: ranked(n => councilStanding(game, n.id), game.nations.filter(n => n.id !== third.id)),
    army: ranked(n => militaryStrength(game, n.id)),
    industry: ranked(n => scoreOf(game, n.id).capacity),
    labour: ranked(n => labourTotal(n.industry)),
    transport: [row(first, 1), row(second, 1), row(third, 3)],
    merchant: ranked(n => cargoHolds(n.merchantMarine)),
    exports: [row(first, 1), row(third, 2), row(second, 3)],
  } });
  const next = { ...game, nations: game.nations.map(n => n.id === third.id ? { ...n, transportCapacity: 10 } : n) };
  expect(projectRankings(next, [], 6).places.transport).toEqual([row(third, 1), row(first, 2), row(second, 2)]);
});

it('FR-610 omits Council and land on Two islands and shares first place for zero exports', () => {
  const game = newGame({ seed: 18, world: 'two-islands' });
  const { places } = projectRankings(game, [], 1);
  expect(Object.keys(places).sort()).toEqual(['exports', 'industry', 'labour', 'merchant', 'transport']);
  expect(places.exports).toEqual(game.nations.map(n => ({ nationId: n.id, place: 1 })));
});
