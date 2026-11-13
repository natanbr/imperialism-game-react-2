// FR-247 (replaces FR-196), M7 done: the v2 trade baseline. 40 turns on the continent ("partners" market) with both
// Great Powers played by the scripted player: both open a consulate early, each trades with minor nations and buys
// from them, the two together deal with at least 2 minors, the computer keeps a positive treasury and no price runs
// to its bound. The measured numbers are pinned below and written into FR-247's status: a change that moves them is
// a deliberate one, as for the v1 baselines of FR-159.
import { beforeAll, describe, it, expect } from 'vitest';
import { newGame } from '@/engine/newGame';
import { scriptedPlayer } from '@/engine/ai/scriptedPlayer';
import { resolveTurn } from '@/engine/turn/resolveTurn';
import { pairKey } from '@/engine/diplomacy/relations';
import { PRICE_CEILING, PRICE_FLOOR, START_PRICES, TRADE_COMMODITIES } from '@/definisions/marketPrices';
import type { GameState } from '@/types/GameState';
import { invariantViolations, N1, N2, nationOf, worldViolations } from './fixtures';

const SEEDS = [1, 2, 3, 4];
const TURNS = 40;
const NATIONS = [N1, N2];

interface Game {
  /** The first turn after which the nation holds a consulate with a minor. */
  consulateBy: Record<string, number | undefined>;
  /** Deals with a minor counterparty (a goods-sold or goods-bought event), by nation. */
  minorDeals: Record<string, number>;
  /** Purchases from a minor (goods-bought events with a minor counterparty), by nation. */
  minorPurchases: Record<string, number>;
  /** The minors each nation dealt with, in the order of its first deal. */
  minorsDealt: Record<string, string[]>;
  refused: number;
  /** Nation 2's treasury after every turn. */
  n2Treasury: number[];
  violations: string[];
  final: GameState;
}

function play(seed: number): Game {
  const start = newGame({ seed, world: 'continent' });
  const minors = new Set(start.minorNations.map(m => m.id));
  const game: Game = {
    consulateBy: { [N1]: undefined, [N2]: undefined },
    minorDeals: { [N1]: 0, [N2]: 0 },
    minorPurchases: { [N1]: 0, [N2]: 0 },
    minorsDealt: { [N1]: [], [N2]: [] },
    refused: 0,
    n2Treasury: [],
    violations: [],
    final: start,
  };
  let s = start;
  for (let turn = 1; turn <= TURNS; turn++) {
    const orders = Object.fromEntries(NATIONS.map(id => [id, scriptedPlayer(s, id)]));
    const result = resolveTurn(s, orders, s.seed);
    game.refused += result.events.filter(e => e.type === 'order-rejected').length;
    for (const e of result.events) {
      if ((e.type !== 'goods-sold' && e.type !== 'goods-bought') || !e.counterpartyId || !minors.has(e.counterpartyId)) continue;
      game.minorDeals[e.nationId]++;
      if (e.type === 'goods-bought') game.minorPurchases[e.nationId]++;
      if (!game.minorsDealt[e.nationId].includes(e.counterpartyId)) game.minorsDealt[e.nationId].push(e.counterpartyId);
    }
    s = result.state;
    for (const id of NATIONS) {
      const holds = [...minors].some(m => s.diplomacy[pairKey(id, m)].consulates.includes(id));
      if (holds && game.consulateBy[id] === undefined) game.consulateBy[id] = turn;
    }
    game.n2Treasury.push(nationOf(s, N2).treasury);
    game.violations.push(...[...invariantViolations(s), ...worldViolations(s, start)].map(v => `turn ${turn}: ${v}`));
  }
  game.final = s;
  return game;
}

/** The measured v2 baseline (FR-247's status), seeds 1 to 4. */
const BASELINE = [
  { seed: 1, minorDeals: [59, 53], minorPurchases: [31, 23], minorsDealt: [4, 1], treasury: [924, 88] },
  { seed: 2, minorDeals: [59, 56], minorPurchases: [30, 25], minorsDealt: [4, 1], treasury: [561, 492] },
  { seed: 3, minorDeals: [61, 53], minorPurchases: [34, 23], minorsDealt: [4, 1], treasury: [38, 38] },
  { seed: 4, minorDeals: [76, 51], minorPurchases: [45, 22], minorsDealt: [4, 1], treasury: [1532, 38] },
];

const measured = (seed: number, g: Game) => ({
  seed,
  minorDeals: NATIONS.map(id => g.minorDeals[id]),
  minorPurchases: NATIONS.map(id => g.minorPurchases[id]),
  minorsDealt: NATIONS.map(id => g.minorsDealt[id].length),
  treasury: NATIONS.map(id => nationOf(g.final, id).treasury),
});

describe('FR-247 the v2 trade baseline: 40 turns, both nations scripted, seeds 1 to 4', () => {
  const games = new Map<number, { first: Game; again: Game }>();
  beforeAll(() => {
    for (const seed of SEEDS) games.set(seed, { first: play(seed), again: play(seed) });
    console.log(
      'FR-247 measured:',
      JSON.stringify(SEEDS.map(seed => ({ ...measured(seed, games.get(seed)!.first), consulateBy: games.get(seed)!.first.consulateBy, minorsDealtIds: games.get(seed)!.first.minorsDealt })))
    );
    console.log('FR-247 prices at turn 40:', JSON.stringify(SEEDS.map(seed => games.get(seed)!.first.final.market!.prices)));
  }, 300_000);

  it('FR-247 the games are played on the continent with the partners market', () => {
    for (const seed of SEEDS) {
      const { final } = games.get(seed)!.first;
      expect({ worldId: final.worldId, mode: final.market?.mode, turn: final.turn }).toEqual({ worldId: 'continent', mode: 'partners', turn: TURNS + 1 });
    }
  });

  it('FR-247 each nation holds a consulate by turn 5', () => {
    for (const seed of SEEDS) {
      const { consulateBy } = games.get(seed)!.first;
      for (const id of NATIONS) expect({ seed, id, by: (consulateBy[id] ?? 99) <= 5 }).toEqual({ seed, id, by: true });
    }
  });

  it('FR-247 each nation deals with a minor and buys from one; the two together deal with at least 2 minors; at least 20 deals with minors in all', () => {
    for (const seed of SEEDS) {
      const { minorDeals, minorPurchases, minorsDealt } = games.get(seed)!.first;
      for (const id of NATIONS) {
        expect({ seed, id, minors: minorsDealt[id].length >= 1, buys: minorPurchases[id] >= 1 }).toEqual({ seed, id, minors: true, buys: true });
      }
      const together = new Set(NATIONS.flatMap(id => minorsDealt[id]));
      expect({ seed, together: together.size >= 2, deals: minorDeals[N1] + minorDeals[N2] >= 20 }).toEqual({ seed, together: true, deals: true });
    }
  });

  it('FR-247 the measured baseline: deals, purchases and minors per nation, final treasuries', () => {
    expect(SEEDS.map(seed => measured(seed, games.get(seed)!.first))).toEqual(BASELINE);
  });

  it('FR-247 FR-243 no price runs to its bound: at turn 40 every commodity is above 50% and below 250% of its start price', () => {
    for (const seed of SEEDS) {
      const prices = games.get(seed)!.first.final.market!.prices;
      const atBound = TRADE_COMMODITIES.filter(c => prices[c] <= Math.ceil(START_PRICES[c] * PRICE_FLOOR) || prices[c] >= Math.floor(START_PRICES[c] * PRICE_CEILING));
      expect({ seed, atBound }).toEqual({ seed, atBound: [] });
    }
  });

  it('FR-247 nation 2\'s treasury is at 0 or more every turn and above 0 at turn 40', () => {
    for (const seed of SEEDS) {
      const { n2Treasury } = games.get(seed)!.first;
      expect(n2Treasury).toHaveLength(TURNS);
      expect({ seed, negative: n2Treasury.filter(t => t < 0) }).toEqual({ seed, negative: [] });
      expect(n2Treasury[TURNS - 1]).toBeGreaterThan(0);
    }
  });

  it('FR-247 no order is refused and the invariants hold after every turn', () => {
    expect(SEEDS.map(seed => ({ seed, refused: games.get(seed)!.first.refused, violations: games.get(seed)!.first.violations }))).toEqual(
      SEEDS.map(seed => ({ seed, refused: 0, violations: [] }))
    );
  });

  it('FR-247 the same seed gives the same game', () => {
    for (const seed of SEEDS) {
      const { first, again } = games.get(seed)!;
      expect(again.final).toEqual(first.final);
    }
  });
});
