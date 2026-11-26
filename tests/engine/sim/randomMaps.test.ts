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
// FR-627 under FR-628: towns now ship before automatic raw and Fish freight, and the computer plans its own town goods
// after its mills' inputs. Town deliveries 0 -> 344 of 778 offered units, in 28 of 72 games. The other 60 games matched.
// standard idle 2: scores [465, 680, 1162] -> [465, 680, 1141]
// standard idle 4: scores [462, 649, 1032] -> [462, 649, 1120]
// standard idle 8: firstCapture 36 -> null, firstPact null -> 39, compulsory 0 -> 3, scores [452, 681, 1072] -> [452, 681, 1177]
// standard scripted 11: winner nation-1 -> nation-2
// standard diplomat 11: winner nation-1 -> nation-2, peacefulWin true -> false
// large idle 1: scores [472, 660, 984] -> [472, 660, 1024]
// large idle 3: firstCapture null -> 35, compulsory 3 -> 0, scores [495, 747, 1276] -> [495, 746, 1261]
// large idle 6: scores [502, 746, 1138] -> [502, 746, 1147]
// large idle 10: scores [505, 652, 1239] -> [505, 652, 1234]
// large scripted 3: winner nation-2 -> nation-1
// large scripted 7: winner nation-1 -> nation-2
// large diplomat 8: winner nation-2 -> nation-1, peacefulWin false -> true

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
        // FR-628: every owner's town receipts, both Great Powers.
        if (event.type === 'town-receipt') {
          for (const line of event.lines) {
            townOffered += line.offered;
            townDelivered += line.delivered;
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
    meals, sick, starved, firstDepot, firstCapture: captures[0] ?? null, captures: captures.length,
    deliveries: deliveries.length, units: deliveries.reduce((sum, sale) => sum + sale.amount, 0),
    firstPact, earned: earned ?? null, townOffered, townDelivered,
    compulsory: earned !== undefined && allFreeVotes !== undefined ? allFreeVotes - earned : null,
    peacefulWin: end?.reason === 'council' && end.winnerId === HUMAN_ID &&
      !turns.some(t => t.warsDeclared.some(w => w.byId === HUMAN_ID)),
    scores: [15, 25, 40].map(turn => atTurn(game, turn)?.score[COMPUTER_ID] ?? null),
  };
}

type Result = ReturnType<typeof measure>;
const everyGame: Result[] = [];

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
      const games: Result[] = [];
      it.each(seeds)('seed %i finishes with legal Orders, valid turns and fair information', async seed => {
        const game = measure(size, policy, seed);
        await yieldToRunner();
        games.push(game);
        everyGame.push(game);
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

// FR-628: towns ship before ordinary automatic freight, and the computer plans for their goods. Task 55 measured
// 778 units offered and 0 delivered across these 72 games when town offers were loaded last.
it('FR-628 towns deliver goods across the 72 generated games', ctx => {
  if (everyGame.length < sizes.length * policies.length * seeds.length) ctx.skip();
  const offered = everyGame.reduce((n, g) => n + g.townOffered, 0);
  const delivered = everyGame.reduce((n, g) => n + g.townDelivered, 0);
  console.log('FR-628 towns ' + JSON.stringify({ games: everyGame.length, offered, delivered,
    gamesWithDelivery: everyGame.filter(g => g.townDelivered > 0).length }));
  expect(delivered).toBeGreaterThan(0);
});
