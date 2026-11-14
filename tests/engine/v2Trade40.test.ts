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
import { forceSize } from '@/engine/army/armies';
import { SCRIPTED_GARRISON } from '@/definisions/regiments';
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
  /** FR-202, FR-213: the regiments each nation lost to the no-pay step (`regiments-disbanded`, reason "no-pay"; review E1, R2). */
  noPay: Record<string, number>;
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
    noPay: { [N1]: 0, [N2]: 0 },
    violations: [],
    final: start,
  };
  let s = start;
  for (let turn = 1; turn <= TURNS; turn++) {
    const orders = Object.fromEntries(NATIONS.map(id => [id, scriptedPlayer(s, id)]));
    const result = resolveTurn(s, orders, s.seed);
    game.refused += result.events.filter(e => e.type === 'order-rejected').length;
    for (const e of result.events) if (e.type === 'regiments-disbanded' && e.reason === 'no-pay') game.noPay[e.nationId] += e.count;
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

/**
 * The measured v2 baseline (FR-247's status), seeds 1 to 4. Measured again in M8 (FR-215): each nation pays the start
 * army's $100 upkeep a turn (FR-202) and keeps a reserve of it out of its spending (FR-213 (a)), so it bids less; and
 * again in the M8 review fix round (E1, R2): the reserve covers every turn left in the last 8 turns, so no regiment is
 * lost for want of money and each capital province keeps its 4 arms (before it, seed 2 nation 1 and seed 4 nation 2
 * lost their field army on turns 39 and 40: no-pay [3, 0] and [0, 3], capital arms [0, 4] and [4, 0]; seed 2's
 * treasuries were [0, 2176]). Before M8: deals
 * [59, 53], [59, 56], [61, 53], [76, 51]; purchases [31, 23], [30, 25], [34, 23], [45, 22]; minors [4, 1] on every seed;
 * treasuries [924, 88], [561, 492], [38, 38], [1532, 38].
 * Measured again in M9 (FR-229, the scripted campaign on a minor): from turn 10 both nations raise Cuirassiers for a war on
 * Arvelia; Valdoria declares on turn 21 and takes Arvelia on turn 22 in seeds 1, 3 and 4 (a colony then, FR-224), and
 * Testland's 1 or 2 Cuirassiers raised before that stay in its capital province (capital arms 5 or 6; seed 2: no war,
 * both keep theirs). The M8 numbers were: deals [54, 50], [47, 49], [50, 47], [54, 50]; purchases [24, 17], [19, 18],
 * [20, 18], [25, 21]; minors [4, 1] on every seed; treasuries [805, 3177], [150, 2376], [182, 119], [870, 5]; capital
 * arms [4, 4] on every seed.
 * Measured again in the M9 review fix round (R1, FR-275): with the Cuirassiers beyond its capital keep each nation keeps
 * a reserve that rises one turn of upkeep a turn from turn 28, so it spends less on turns 28 to 32. The M9 numbers before
 * it were: deals [60, 60], [58, 52], [50, 53], [53, 63]; purchases [29, 27], [23, 19], [22, 23], [24, 28]; treasuries
 * [1231, 3917], [3570, 2016], [608, 2488], [13, 5871]; minors, no-pay and capital arms as now.
 */
const BASELINE = [
  { seed: 1, minorDeals: [60, 60], minorPurchases: [29, 27], minorsDealt: [4, 4], treasury: [1549, 5040], noPay: [0, 0], capitalArms: [5, 4] },
  { seed: 2, minorDeals: [59, 50], minorPurchases: [24, 19], minorsDealt: [4, 1], treasury: [4178, 959], noPay: [0, 0], capitalArms: [6, 5] },
  { seed: 3, minorDeals: [56, 56], minorPurchases: [26, 25], minorsDealt: [4, 4], treasury: [1518, 5091], noPay: [0, 0], capitalArms: [5, 4] },
  { seed: 4, minorDeals: [53, 60], minorPurchases: [24, 28], minorsDealt: [4, 4], treasury: [13, 3725], noPay: [0, 0], capitalArms: [5, 4] },
];

/** The force size (FR-204) of the nation's army in its capital province at turn 40. */
const capitalArms = (s: GameState, nationId: string) => {
  const army = s.armies.find(a => a.ownerId === nationId && a.provinceId === `province-${nationId}-sw`);
  return army ? forceSize(army) : 0;
};

const measured = (seed: number, g: Game) => ({
  seed,
  minorDeals: NATIONS.map(id => g.minorDeals[id]),
  minorPurchases: NATIONS.map(id => g.minorPurchases[id]),
  minorsDealt: NATIONS.map(id => g.minorsDealt[id].length),
  treasury: NATIONS.map(id => nationOf(g.final, id).treasury),
  noPay: NATIONS.map(id => g.noPay[id]),
  capitalArms: NATIONS.map(id => capitalArms(g.final, id)),
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

  it('FR-247 FR-213 FR-202 the scripted garrison is kept to the end: no regiment lost for want of money, and each capital province still holds 4 arms at turn 40', () => {
    // Review E1, R2: with a reserve of two turns' upkeep, 2 of these 8 nation-games lost their field army on turns 39 and 40
    expect(SEEDS.map(seed => ({ seed, noPay: NATIONS.map(id => games.get(seed)!.first.noPay[id]) }))).toEqual(SEEDS.map(seed => ({ seed, noPay: [0, 0] })));
    for (const seed of SEEDS) {
      for (const id of NATIONS) {
        expect({ seed, id, arms: capitalArms(games.get(seed)!.first.final, id) >= SCRIPTED_GARRISON.capitalArms }).toEqual({ seed, id, arms: true });
      }
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
