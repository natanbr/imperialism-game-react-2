import { afterAll, describe, expect, it } from 'vitest';
import { setImmediate as yieldToRunner } from 'node:timers/promises';
import { isDeepStrictEqual } from 'node:util';
import { computerOrders } from '@/engine/ai/players';
import { capitalComponent, yieldOf } from '@/engine/ai/railPlan';
import { collectingHub } from '@/engine/systems/logisticsSystem';
import type { GameState } from '@/types/GameState';
import { atTurn, runGame } from './harness';
import { COMPUTER_ID, HUMAN_ID } from './humans';
import baseline from './randomMapsBaseline.json';

// FR-616 re-measured FR-597 after port fishing changed freight, food supply and subsequent computer Orders.
// Each row lists the exact changed fields; scores are at turns 15, 25 and 40. The other 45 games matched.
// standard idle 1: scores [476,717,1108] -> [476,717,1068]
// standard idle 2: scores [465,680,1093] -> [465,680,1162]
// standard idle 3: firstCapture 33 -> 35, scores [444,693,971] -> [444,693,1059]
// standard idle 4: winner nation-2 -> nation-1, firstCapture 36 -> null, scores [462,672,1007] -> [462,649,1032]
// standard idle 5: scores [484,555,860] -> [484,562,820]
// standard idle 6: firstCapture null -> 37, compulsory 3 -> 0, scores [471,723,1106] -> [471,723,1122]
// standard idle 7: scores [477,595,1131] -> [477,635,1064]
// standard idle 12: scores [475,708,1265] -> [475,715,1200]
// standard scripted 4: winner nation-1 -> nation-2
// standard scripted 5: winner nation-1 -> nation-2
// standard diplomat 2: winner nation-2 -> nation-1, peacefulWin false -> true
// standard diplomat 6: winner nation-2 -> nation-1, peacefulWin false -> true
// standard diplomat 10: winner nation-1 -> nation-2, peacefulWin true -> false
// large idle 1: scores [472,660,1009] -> [472,660,984]
// large idle 2: scores [503,664,1238] -> [503,664,1271]
// large idle 4: firstCapture 35 -> 40, scores [503,688,1225] -> [503,688,1276]
// large idle 6: firstCapture 30 -> 38, scores [494,717,1217] -> [502,746,1138]
// large idle 8: scores [453,620,null] -> [453,615,null]
// large idle 9: firstCapture 37 -> 30, scores [500,667,1189] -> [500,657,1278]
// large idle 10: firstCapture 26 -> 25, firstPact null -> 29, compulsory 0 -> 1, scores [505,623,1302] -> [505,652,1239]
// large idle 11: scores [457,624,1218] -> [457,623,1203]
// large idle 12: firstCapture 31 -> null, compulsory 0 -> 3, scores [479,653,1235] -> [479,653,1349]
// large scripted 5: turns 30 -> 40
// large scripted 7: winner nation-2 -> nation-1
// large scripted 12: winner nation-2 -> nation-1
// large diplomat 5: turns 30 -> 40
// large diplomat 10: winner nation-2 -> nation-1, peacefulWin false -> true
//
// FR-627 / FR-628, M18h -> towns-first M18i. Town materials/goods displaced automatic raw and Fish freight.
// Changed warehouse inputs and sale income affected later plans, scores, diplomacy and payroll.
// Twelve original fixture rows moved; 20 games changed a prior campaign measurement, and 28 delivered new town freight.
// Totals: both owners 0 -> 344 delivered (778 offered), computer 0 -> 190, games delivering 0 -> 28,
// accepted computer Orders 37,557 -> 37,522 (zero rejected), unpaid disbands 50 -> 51 (idle zero).
// Standard diplomat 3: unpaid human disband turns [24,25] -> [22,23,24]. On turn 24 Testland had $1 for $25 upkeep.
// Per-game changes below; scores are at turns 15, 25 and 40.
// standard idle 2: submitted 523 -> 516, townDelivered 0 -> 12, computerTownDelivered 0 -> 12, scores [465,680,1162] -> [465,680,1141]
// standard idle 4: townDelivered 0 -> 21, computerTownDelivered 0 -> 21, scores [462,649,1032] -> [462,649,1120]
// standard idle 8: submitted 492 -> 457, firstCapture 36 -> null, captures 1 -> 0, firstPact null -> 39, townDelivered 0 -> 9, computerTownDelivered 0 -> 9, compulsory 0 -> 3, scores [452,681,1072] -> [452,681,1177]
// standard scripted 1: townDelivered 0 -> 2
// standard scripted 3: submitted 498 -> 499, townDelivered 0 -> 20, computerTownDelivered 0 -> 5, scores [433,715,1079] -> [433,715,1033]
// standard scripted 4: submitted 511 -> 515, townDelivered 0 -> 22, computerTownDelivered 0 -> 22, scores [487,706,1029] -> [487,706,1089]
// standard scripted 6: townDelivered 0 -> 8
// standard scripted 8: townDelivered 0 -> 4, computerTownDelivered 0 -> 4
// standard scripted 11: winner "nation-1" -> "nation-2", submitted 508 -> 507, townDelivered 0 -> 12, compulsory 1 -> 2, peacefulWin true -> false
// standard diplomat 1: townDelivered 0 -> 2
// standard diplomat 3: submitted 498 -> 499, noPay 2 -> 3, townDelivered 0 -> 13, computerTownDelivered 0 -> 1, scores [433,714,1080] -> [433,714,1108]
// standard diplomat 4: townDelivered 0 -> 4, computerTownDelivered 0 -> 4, scores [443,662,1155] -> [443,662,1162]
// standard diplomat 6: townDelivered 0 -> 9
// standard diplomat 8: submitted 488 -> 493, firstCapture null -> 39, captures 0 -> 1, townDelivered 0 -> 15, computerTownDelivered 0 -> 10, scores [490,751,1263] -> [490,751,1254]
// standard diplomat 11: winner "nation-1" -> "nation-2", submitted 534 -> 528, townDelivered 0 -> 15, peacefulWin true -> false, scores [437,583,835] -> [437,583,879]
// large idle 1: submitted 593 -> 586, townDelivered 0 -> 8, computerTownDelivered 0 -> 8, scores [472,660,984] -> [472,660,1024]
// large idle 3: submitted 513 -> 548, firstCapture null -> 35, captures 0 -> 1, townDelivered 0 -> 11, computerTownDelivered 0 -> 11, compulsory 3 -> 0, scores [495,747,1276] -> [495,746,1261]
// large idle 6: townDelivered 0 -> 3, computerTownDelivered 0 -> 3, scores [502,746,1138] -> [502,746,1147]
// large idle 10: submitted 567 -> 557, townDelivered 0 -> 1, computerTownDelivered 0 -> 1, scores [505,652,1239] -> [505,652,1234]
// large scripted 1: townDelivered 0 -> 2
// large scripted 3: winner "nation-2" -> "nation-1", submitted 536 -> 540, firstCapture 39 -> 36, earned 1 -> 0, townDelivered 0 -> 12, computerTownDelivered 0 -> 12, peacefulWin false -> true, scores [495,705,1261] -> [495,733,1289]
// large scripted 4: townDelivered 0 -> 15, computerTownDelivered 0 -> 15, scores [484,705,1277] -> [484,705,1328]
// large scripted 5: townDelivered 0 -> 14
// large scripted 7: winner "nation-1" -> "nation-2", submitted 535 -> 534, townDelivered 0 -> 18, computerTownDelivered 0 -> 18, scores [453,692,1162] -> [453,692,1237]
// large diplomat 3: submitted 529 -> 516, firstCapture 39 -> null, captures 1 -> 0, townDelivered 0 -> 10, computerTownDelivered 0 -> 10, compulsory 0 -> 3, scores [495,705,1206] -> [495,733,1335]
// large diplomat 4: townDelivered 0 -> 16, computerTownDelivered 0 -> 16, scores [484,705,1224] -> [484,705,1248]
// large diplomat 6: townDelivered 0 -> 8, computerTownDelivered 0 -> 8
// large diplomat 8: winner "nation-2" -> "nation-1", submitted 578 -> 573, townDelivered 0 -> 58, peacefulWin false -> true, scores [479,600,915] -> [479,600,917]

const sizes = ['standard', 'large'] as const;
const policies = ['idle', 'scripted', 'diplomat'] as const;
type Size = typeof sizes[number];
type Policy = typeof policies[number];
const seeds = Array.from({ length: 12 }, (_, i) => i + 1);

function hasProductiveDepot(state: GameState): boolean {
  const network = state.transportNetwork.railroadNetworks?.[COMPUTER_ID];
  if (!network?.depots.some(d => d.isActive)) return false;
  const component = capitalComponent(state, COMPUTER_ID);
  const joined = new Set(network.depots.filter(d => d.isActive && component.has(`${d.x},${d.y}`))
    .map(d => `${d.x}-${d.y}`));
  return state.map.tiles.some(row => row.some(tile => {
    if (tile.ownerNationId !== COMPUTER_ID || !yieldOf(tile)) return false;
    const hub = collectingHub(state, COMPUTER_ID, tile.id);
    return hub?.kind === 'depot' && joined.has(hub.tileId);
  }));
}

function measure(size: Size, policy: Policy, seed: number) {
  let submitted = 0;
  let probes = 0;
  const changedPlans: number[] = [];
  let sick = 0;
  let starved = 0;
  let meals = 0;
  let firstDepot: number | null = null;
  let firstPact: number | null = null;
  let townOffered = 0;
  let townDelivered = 0;
  let computerTownDelivered = 0;
  const embassies = new Set<string>();
  const game = runGame({
    seed, world: 'random', randomMapSize: size, human: policy,
    observePlan(before, after, plan) {
      submitted += plan[COMPUTER_ID]?.length ?? 0;
      // 'before' conceals the entire private submission, including cash and stock reservations.
      if (policy === 'scripted' && before !== after) {
        probes++;
        if (!isDeepStrictEqual(computerOrders(before), plan)) changedPlans.push(before.turn);
      }
    },
    observe(registered, { events, state }, before) {
      if (before.turn === 1) {
        expect(before.worldId).toBe('random');
        expect(before.map.config.cols).toBe(size === 'standard' ? 24 : 32);
      }
      if (firstDepot === null && hasProductiveDepot(state)) firstDepot = before.turn;
      const free = new Set(registered.minorNations.filter(m => !m.colonyOf).map(m => m.id));
      for (const event of events) {
        // FR-628: every owner's town receipts, both Great Powers, and the computer's own deliveries.
        if (event.type === 'town-receipt') {
          for (const line of event.lines) {
            townOffered += line.offered;
            townDelivered += line.delivered;
            if (event.nationId === COMPUTER_ID) computerTownDelivered += line.delivered;
          }
        }
        if (event.type === 'workers-fed' && event.nationId === COMPUTER_ID) {
          meals++;
          sick += event.sick;
          starved += event.starved;
        }
        if (event.type === 'minor-colonised') free.delete(event.minorId);
        if (event.type !== 'overture-done' || event.nationId !== COMPUTER_ID || !free.has(event.targetId)) continue;
        if (event.overture === 'embassy') embassies.add(event.targetId);
        if (event.overture === 'pact' && embassies.has(event.targetId)) firstPact ??= before.turn;
      }
    },
  });
  const turns = game.turns;
  const last = turns.at(-1)!;
  const finalBallot = atTurn(game, 40)?.council;
  const earned = finalBallot?.earnedMinorVotes[COMPUTER_ID];
  const allFreeVotes = finalBallot?.nominees.find(n => n.nationId === COMPUTER_ID)?.otherMinorNations;
  const captures = turns.flatMap(t => t.minorsColonised.filter(c => c.nationId === COMPUTER_ID).map(() => t.turn));
  const deliveries = turns.flatMap(t => t.greatPowerSales);
  const end = game.final.gameOver;
  return {
    seed, size, policy, turns: last.turn, reason: end ? end.reason ?? 'limit' : 'unfinished',
    winner: end?.winnerId ?? null, submitted, probes, changedPlans,
    rejections: turns.flatMap(t => t.ordersRejected.map(order => ({ turn: t.turn, ...order }))),
    violations: turns.flatMap(t => t.invariantViolations.map(message => ({ turn: t.turn, message }))),
    noPay: turns.flatMap(t => t.disbands).filter(d => d.reason === 'no-pay')
      .reduce((total, d) => total + d.count, 0),
    humanNoPayTurns: turns.filter(t => t.disbands.some(d => d.nationId === HUMAN_ID && d.reason === 'no-pay'))
      .map(t => t.turn),
    meals, sick, starved, firstDepot, firstCapture: captures[0] ?? null, captures: captures.length,
    deliveries: deliveries.length, units: deliveries.reduce((sum, sale) => sum + sale.amount, 0),
    firstPact, earned: earned ?? null, townOffered, townDelivered, computerTownDelivered,
    compulsory: earned !== undefined && allFreeVotes !== undefined ? allFreeVotes - earned : null,
    peacefulWin: end?.reason === 'council' && end.winnerId === HUMAN_ID &&
      !turns.some(t => t.warsDeclared.some(w => w.byId === HUMAN_ID)),
    scores: [15, 25, 40].map(turn => atTurn(game, turn)?.score[COMPUTER_ID] ?? null),
  };
}

type Result = ReturnType<typeof measure>;

function spread(values: number[]) {
  const sorted = values.toSorted((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return {
    reached: sorted.length,
    min: sorted[0] ?? null,
    median: sorted.length ? (sorted[middle] + sorted[Math.floor((sorted.length - 1) / 2)]) / 2 : null,
  };
}

for (const size of sizes) {
  for (const policy of policies) {
    describe(`FR-597 ${size} random, ${policy}`, () => {
      const gamesBySeed = new Map<number, Result>();
      it.each(seeds)('seed %i finishes with legal Orders, valid turns and fair information', async seed => {
        const game = measure(size, policy, seed);
        await yieldToRunner();
        gamesBySeed.set(seed, game);
        console.log('FR-597 game ' + JSON.stringify(game));
        expect(game.reason).not.toBe('unfinished');
        expect(game.turns).toBeLessThanOrEqual(40);
        expect(game.submitted).toBeGreaterThan(0);
        expect(game.rejections).toEqual([]);
        expect(game.violations).toEqual([]);
        if (policy === 'idle') expect(game.noPay).toBe(0);
        if (policy === 'scripted') {
          expect(game.probes).toBeGreaterThan(0);
          expect(game.changedPlans).toEqual([]);
        }
        // The scripted partners offered finished goods and bid for inputs. Their observed zero
        // exchanges has no accepted floor. The fixture pins the accepted outcomes by seed.
        const expected = baseline[size][policy].find(row => row.seed === seed);
        expect(expected).toBeDefined();
        expect(game).toMatchObject(expected!);
      });
      afterAll(() => {
        const games = [...gamesBySeed.values()];
        const count = (predicate: (g: Result) => boolean) => games.filter(predicate).length;
        const sum = (pick: (g: Result) => number) => games.reduce((n, g) => n + pick(g), 0);
        const measured = (pick: (g: Result) => number | null) =>
          spread(games.map(pick).filter((n): n is number => n !== null));
        console.log('FR-597 group ' + JSON.stringify({
          size, policy, scheduled: seeds.length, completed: count(g => g.reason !== 'unfinished'),
          turns: sum(g => g.turns), submitted: sum(g => g.submitted), rejected: sum(g => g.rejections.length),
          violations: sum(g => g.violations.length), noPay: sum(g => g.noPay), probes: sum(g => g.probes),
          changedPlans: sum(g => g.changedPlans.length), sickGames: count(g => g.sick > 0),
          starvedGames: count(g => g.starved > 0), foodShortGames: count(g => g.sick + g.starved > 0),
          firstDepot: measured(g => g.firstDepot), firstCapture: measured(g => g.firstCapture),
          traded: count(g => g.units > 0), units: sum(g => g.units), pacts: count(g => g.firstPact !== null),
          reached40: count(g => g.turns === 40), voted40: count(g => g.earned !== null),
          earnedGames: count(g => (g.earned ?? 0) > 0), earnedVotes: sum(g => g.earned ?? 0),
          compulsoryGames: count(g => (g.compulsory ?? 0) > 0), compulsoryVotes: sum(g => g.compulsory ?? 0),
          peacefulWins: count(g => g.peacefulWin),
          towns: { offered: sum(g => g.townOffered), delivered: sum(g => g.townDelivered), games: count(g => g.townDelivered > 0) },
          scores: [0, 1, 2].map(i => measured(g => g.scores[i])),
          early: games.filter(g => g.turns < 40).map(g => [g.seed, g.turns, g.reason, g.winner]),
        }));
      });
    });
  }
}

// Each seed test reconciles its own measurements to these same rows. The aggregate can run by name or on retry.
it('FR-628 towns deliver goods across the 72 generated games', () => {
  const games = sizes.flatMap(size => policies.flatMap(policy => {
    const rows = baseline[size][policy];
    expect(rows.map(row => row.seed)).toEqual(seeds);
    return rows;
  }));
  expect(games).toHaveLength(72);
  type Row = typeof games[number];
  const sum = (pick: (row: Row) => number) => games.reduce((total, row) => total + pick(row), 0);
  const towns = {
    offered: sum(g => g.townOffered), delivered: sum(g => g.townDelivered),
    gamesWithDelivery: games.filter(g => g.townDelivered > 0).length,
    computerDelivered: sum(g => g.computerTownDelivered),
  };
  console.log('FR-628 towns ' + JSON.stringify(towns));
  // FR-627 / FR-628: towns before automatic freight delivers 0 -> 344 units, including 0 -> 190 to the computer.
  expect(towns).toEqual({ offered: 778, delivered: 344, gamesWithDelivery: 28, computerDelivered: 190 });
  // The freight changes alter subsequent plans and available payroll. Each seed above checks zero refused Orders.
  expect(sum(g => g.submitted)).toBe(37_522); // FR-627 / FR-628: 37,557 -> 37,522 accepted computer Orders.
  expect(sum(g => g.noPay)).toBe(51); // FR-627 / FR-628: 50 -> 51 unpaid disbands.
});
