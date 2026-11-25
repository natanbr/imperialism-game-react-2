import { afterAll, describe, expect, it } from 'vitest';
import { isDeepStrictEqual } from 'node:util';
import { computerOrders } from '@/engine/ai/players';
import { capitalComponent, yieldOf } from '@/engine/ai/railPlan';
import { collectingHub } from '@/engine/systems/logisticsSystem';
import type { GameState } from '@/types/GameState';
import { atTurn, runGame } from './harness';
import { COMPUTER_ID, HUMAN_ID } from './humans';

const sizes = ['standard', 'large'] as const;
const policies = ['idle', 'scripted', 'diplomat'] as const;
type Size = typeof sizes[number];
type Policy = typeof policies[number];
const full = process.env.M18E_MAP_SWEEP === 'full';
const seeds = Array.from({ length: full ? 12 : 4 }, (_, i) => i + 1);

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
    firstPact, earned: earned ?? null,
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
  for (const policy of full ? policies : ['idle'] as const) {
    describe(`FR-597 ${size} random, ${policy}`, () => {
      const games: Result[] = [];
      it.each(seeds)('seed %i finishes with legal Orders, valid turns and fair information', seed => {
        const game = measure(size, policy, seed);
        games.push(game);
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
          peacefulWins: count(g => g.peacefulWin), scores: [0, 1, 2].map(i => measured(g => g.scores[i])),
          early: games.filter(g => g.turns < 40).map(g => [g.seed, g.turns, g.reason, g.winner]),
        }));
      });
    });
  }
}
