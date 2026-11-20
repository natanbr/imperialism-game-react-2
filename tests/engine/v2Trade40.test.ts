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
 * Measured again in M12 (FR-405) for FR-401: at equal points a minor breaks the tie by an order fixed per game from the
 * seed and its id, no longer by the turn's intentOrder. Seeds 1 to 3 are unchanged; seed 4 was deals [53, 60], purchases
 * [24, 28], treasuries [13, 3725], capital arms [5, 4]. (FR-389 moves nothing here: the scripted plan ships as before.)
 * Measured again in M12 strategy C (FR-456, FR-457 depot sites; FR-458 the campaign keeps its trained workers): more
 * deals and purchases on every seed and both nations, minors [4, 4] on every seed. The numbers before were: deals
 * [60, 60], [59, 50], [56, 56], [63, 53]; purchases [29, 27], [24, 19], [26, 25], [30, 24]; minors [4, 4], [4, 1],
 * [4, 4], [4, 4]; treasuries [1549, 5040], [4178, 959], [1518, 5091], [2668, 13]; capital arms [5, 4], [6, 5], [5, 4],
 * [4, 5] (each still at least SCRIPTED_GARRISON.capitalArms).
 * Numbers that went down in strategy C, and why they are accepted: capital arms 5 -> 4 for seed 1 nation 1, seed 2
 * nation 2 and seed 3 nation 1 (seed 2 nation 1 6 -> 7 and seed 4 nation 2 5 -> 7 went up). The arms above 4 are
 * campaign Cuirassiers that stayed in the capital province (M9 above); 4 is the keep's floor (FR-228 (a),
 * SCRIPTED_GARRISON.capitalArms) and "the garrison is kept to the end" passes, so no capital is less defended than the
 * rule asks. Treasuries 5040 -> 4138 (seed 1 nation 2), 5091 -> 3949 (seed 3 nation 2) and 2668 -> 2563 (seed 4
 * nation 1): the same nations bought more from minors (purchases 27 -> 39, 25 -> 39, 30 -> 35); both nations here
 * have an army, so FR-454 keeps their CASH_RESERVE. Accepted because FR-247 is a measured baseline, not a target: every
 * treasury stays above 0 (the lowest 2324, seed 2 nation 2, up from 959), no regiment is disbanded for want of pay
 * (noPay [0, 0] on every seed), and the scripted nation's turn-40 score on the continent rose on every seed (FR-260,
 * nation 1 idle).
 * FR-459 (no civilian works a tile the engineer's rail still needs) moves nothing here.
 * Measured again in M13 T-15 (FR-499; moved by FR-482 to FR-493: both nations play every M13 rule). The numbers before
 * were: deals [73, 70], [72, 68], [73, 69], [66, 74]; purchases [40, 39], [36, 37], [39, 39], [35, 41]; treasuries
 * [3880, 4138], [5730, 2324], [4103, 3949], [2563, 3168]; capital arms [4, 4], [7, 4], [4, 4], [4, 7]. Now each campaign
 * raises the regiments it can (FR-482: 22 to 28 regiments a nation at turn 40 in the harness's both-scripted games),
 * both race for Arvelia (turns 17 to 19) and on seeds 2 and 3 Valdoria then goes to war with Testland (FR-488, turns 22
 * and 30; seed 3 takes one province, FR-489); migrants spend canned food, clothing and furniture (FR-485, FR-486) and the
 * bids toward the other Great Power (FR-493) spend cash. Numbers that went down, and why they are accepted: deals
 * 70 -> 52 (seed 1 nation 2), 72 -> 71 (seed 2 nation 1), 73 -> 72 (seed 3 nation 1); purchases 39 -> 24 (seed 1
 * nation 2), 39 -> 38 (seed 3 nation 1 and seed 3 nation 2), 35 -> 34 (seed 4 nation 1); treasuries 4138 -> 1622
 * (seed 1 nation 2), 5730 -> 2068 (seed 2 nation 1), 4103 -> 442 and 3949 -> 854 (seed 3), 2563 -> 1803 and
 * 3168 -> 2815 (seed 4), the lowest 442 (was 2324); capital arms 7 -> 4 (seed 2 nation 1) and 7 -> 5 (seed 4 nation 2),
 * both still at or above the keep's floor of 4. (The review (ST-04) found the seed 3 nation 2 purchases and the seed 4
 * nation 2 capital arms missing from this list; added in the M13 review fix round.) FR-247 is a measured baseline, not
 * a target: its bounds hold (no regiment disbanded
 * for want of pay, nation 2's treasury at 0 or more every turn and above 0 at turn 40, at least 4 arms in each capital
 * province), and the acceptance sims (m13Acceptance) hold FR-497's no-pay bound over 24 seeds.
 * Measured again in the M13 review fix round (FR-538, review ST-01: before a war on a Great Power the army gathers at the
 * front, in sight, and declares only at more than twice the defence of the province it attacks; measured with the
 * fix round's war rules swapped back to M13's: the baseline is the M13 one, so FR-538 alone moves it). Seeds 1 and 4
 * are unchanged. Seed 2: Valdoria declares on turn 24 (was 22) with 57 strength in Arvelia's province against Testland
 * North-East's 25 (Testland sees the warning on turns 23 and 24 and raises a regiment); the attack fails, Testland takes
 * Arvelia's province from Valdoria on turn 26 and no peace is made by turn 40 (it was made on turn 32). Seed 3: the war
 * turn 30 -> 31, Arvelia's province taken turn 31 -> 32, peace turn 32 -> 33. The numbers before were: deals [71, 69],
 * [72, 71]; purchases [41, 37], [38, 38]; treasuries [2068, 3339], [442, 854] (seeds 2 and 3). Numbers that went down,
 * and why they are accepted: deals 69 -> 64 and purchases 37 -> 28 (seed 2 nation 2: it lost its field army and the
 * colony, and spends on new regiments on turns 28 and 35), deals 71 -> 70, purchases 38 -> 37 and treasury 854 -> 798
 * (seed 3 nation 2: the war a turn later). Both still deal with 4 minors, no regiment is disbanded for want of pay, and
 * the lowest treasury rose from 442 to 798.
 * Measured again in the M13 close round (FR-539, card Q136 (b); FR-499): from turn 7 Valdoria (nation 2) keeps a standing
 * bid of 1 steel toward Testland, whose controller is a person in this setup (newGame), placed before the bids for its
 * mills' inputs. Testland's scripted player offers goods only (FR-245 (c)), so the bid is never answered: it is refunded in
 * the same trade phase, and its effect is the hold it takes from a timber purchase from the minors and the cash Valdoria
 * keeps. That moves the race for Arvelia (measured with `standing` forced empty and on, .gate/m13/close/attrib-off.txt and
 * attrib-on.txt). Seed 1: Testland took Arvelia on turn 19 -> Valdoria takes it on turn 18. Seed 2: Valdoria took it on
 * turn 18, declared on Testland on turn 24, Testland retook it on turn 26, no peace -> Valdoria takes it on turn 20,
 * declares on turn 25, Testland retakes it on turn 27, peace on turn 29. Seed 3: Testland took it on turn 19, Valdoria's
 * war on turn 31 took it back on turn 32, peace on turn 33 -> Valdoria takes it on turn 18 and no war between the Great
 * Powers. Seed 4: Testland took it on turn 19, no war -> Testland takes it on turn 19, then declares war on Valdoria on
 * turn 25 (FR-488); Valdoria takes Arvelia on turn 27, Testland North-East on turn 28 and South-East on turn 30, Testland
 * retakes South-East on turn 32, peace on turn 33. The numbers before were: deals [78, 52], [73, 64], [72, 70], [66, 75];
 * purchases [43, 24], [41, 28], [38, 37], [34, 43]; treasuries [6922, 1622], [4417, 5756], [1680, 798], [1803, 2815];
 * capital arms [10, 7], [4, 4], [4, 4], [7, 5]; minors and no-pay as now. Numbers that went down, and why they are
 * accepted: deals 64 -> 54 (seed 2 nation 2), 72 -> 64 and 70 -> 66 (seed 3), 66 -> 62 and 75 -> 74 (seed 4); purchases
 * 43 -> 40 (seed 1 nation 1), 28 -> 24 (seed 2 nation 2), 38 -> 31 and 37 -> 31 (seed 3), 34 -> 27 and 43 -> 37
 * (seed 4); treasuries 6922 -> 4299 (seed 1 nation 1), 4417 -> 2024 and 5756 -> 2003 (seed 2); capital arms 10 -> 8
 * (seed 1 nation 1) and 7 -> 6 (seed 4 nation 1), both above the keep's floor of 4. Valdoria's purchases go down where the
 * standing bid takes a timber hold (seeds 2 to 4); Testland's go down where it holds no colony (seeds 1 and 3) or fights
 * the turn-25 war (seed 4); the seed 2 treasuries pay the regiments of the war and the peace. FR-247 is a measured
 * baseline, not a target: its bounds hold (no regiment disbanded for want of pay, nation 2's treasury at 0 or more every
 * turn and above 0 at turn 40, at least 4 arms in each capital province, 4 minors each), and the lowest turn-40 treasury
 * rose from 798 to 2003.
 * Measured again in the M13 close round (FR-542, card Q117 (b); FR-499): both nations play FR-542, an embassy ($5,000)
 * and a pact (+10 points) with the minor that favours them most and does not border them, from turn 11 (no embassy for
 * the first meeting). Seed 1: Testland's embassy turn 16, pact 17, and Valdoria declares war on Testland on turn 23 (was
 * no war between the Great Powers). Seed 2: Testland's embassy 17 and pact 18, Valdoria's war on turn 25 as before,
 * Valdoria's embassy 38 and pact 39. Seed 3: Testland's embassy 16 and pact 17, Valdoria's war on turn 23 (was none).
 * Seed 4: Valdoria's embassy 17 and pact 18, Testland's war on turn 25 as before. The numbers before were: deals
 * [80, 65], [92, 54], [64, 66], [62, 74]; purchases [40, 32], [59, 24], [31, 31], [27, 37]; treasuries [4299, 5049],
 * [2024, 2003], [2114, 3951], [4686, 3871]; capital arms [8, 9], [4, 4], [6, 7], [6, 5]; minors and no-pay as now.
 * Numbers that went down, and why they are accepted: deals 65 -> 64 (seed 1 nation 2), 92 -> 66 (seed 2 nation 1),
 * 66 -> 59 (seed 3 nation 2), 74 -> 70 (seed 4 nation 2); purchases 59 -> 33 (seed 2 nation 1), 31 -> 24 (seed 3
 * nation 2), 37 -> 34 (seed 4 nation 2): the pact's 10 points move a minor's trade to the nation that holds it (FR-187),
 * and the nation at war trades less; treasuries 5049 -> 972 (seed 1 nation 2, the war from turn 23) and 3871 -> 2367
 * (seed 4 nation 2, its embassy); capital arms 8 -> 4 and 9 -> 4 (seed 1), 6 -> 4 and 7 -> 4 (seed 3), 6 -> 4 and
 * 5 -> 4 (seed 4): the campaign Cuirassiers that stayed in the capital go to the war or are not raised; 4 is the keep's
 * floor. With the embassy from turn 1 (measured, not built) Testland bought it on turn 7 with half its start treasury and
 * seed 3 nation 2 lost 7 regiments for want of pay (capital arms 0); over seeds 1 to 24 of this game 3 games lost
 * regiments that way (14 regiments), and 4 games (26) before FR-542; with the rule as built, none
 * (.gate/m13/close/grants/v2wide-*.txt). FR-247 is a measured baseline, not a target: its bounds hold; the lowest
 * turn-40 treasury falls from 2003 to 972.
 */
const BASELINE = [
  { seed: 1, minorDeals: [81, 64], minorPurchases: [43, 34], minorsDealt: [4, 4], treasury: [5006, 972], noPay: [0, 0], capitalArms: [4, 4] },
  { seed: 2, minorDeals: [66, 75], minorPurchases: [33, 41], minorsDealt: [4, 4], treasury: [2972, 2744], noPay: [0, 0], capitalArms: [5, 4] },
  { seed: 3, minorDeals: [70, 59], minorPurchases: [34, 24], minorsDealt: [4, 4], treasury: [2726, 6095], noPay: [0, 0], capitalArms: [4, 4] },
  { seed: 4, minorDeals: [71, 70], minorPurchases: [36, 34], minorsDealt: [4, 4], treasury: [5773, 2367], noPay: [0, 0], capitalArms: [4, 4] },
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
