// The 40-turn game of the scripted player on the two-islands world (FR-125), shared by tests/engine/scriptedScore.test.ts
// (the score acceptance) and tests/engine/twoIslandsGolden.test.ts (FR-464: the order log pinned). Not a test file.
import { newGame } from '@/engine/newGame';
import { resolveTurn, type OrdersByNation } from '@/engine/turn/resolveTurn';
import { capitalComponent } from '@/engine/ai/railPlan';
import { railLinksOf } from '@/engine/systems/railroadSystem';
import { scoreOf } from '@/engine/score/score';
import type { Order } from '@/engine/orders/Order';
import type { GameState } from '@/types/GameState';
import { railBound, railDeadEnds } from './railBound';
import { invariantViolations, N2 } from './fixtures';

export const SEEDS = [1, 2, 3, 4];
export const CHECKPOINTS = [15, 25, 40];

export const start = (seed = 1): GameState => newGame({ seed });

export interface Checkpoint { turn: number; score: number; depotsJoined: number; links: number; bound: number; deadEnds: string[] }
/** FR-125 health: nation 2's meals (`workers-fed`) and the invariants, every turn. */
export interface Health { meals: number; sick: number; starved: number; violations: string[] }
/**
 * `councils`: the `council-met` events of the game (FR-305: none on two-islands). `orders`: each turn's orders as they were
 * given to resolveTurn, turn 1 first (FR-464).
 */
export interface Game { checkpoints: Checkpoint[]; refused: number; health: Health; councils: number; orders: OrdersByNation[]; final: GameState }

/** 40 turns from the real new game; nation 2's orders from `orders`, none for nation 1. */
export function play(orders: (s: GameState) => Order[], seed: number): Game {
  let state = start(seed);
  let refused = 0;
  const checkpoints: Checkpoint[] = [];
  const health: Health = { meals: 0, sick: 0, starved: 0, violations: [] };
  const log: OrdersByNation[] = [];
  let councils = 0;
  for (let turn = 1; turn <= 40; turn++) {
    const given = { [N2]: orders(state) };
    log.push(given);
    const result = resolveTurn(state, given, state.seed);
    refused += result.events.filter(e => e.type === 'order-rejected' && e.nationId === N2).length;
    councils += result.events.filter(e => e.type === 'council-met').length;
    for (const e of result.events) {
      if (e.type !== 'workers-fed' || e.nationId !== N2) continue;
      health.meals++;
      health.sick += e.sick;
      health.starved += e.starved;
    }
    state = result.state;
    health.violations.push(...invariantViolations(state).map(v => `turn ${turn}: ${v}`));
    if (!CHECKPOINTS.includes(turn)) continue;
    const component = capitalComponent(state, N2);
    const depotsJoined = state.transportNetwork.railroadNetworks![N2].depots.filter(d => d.isActive && component.has(`${d.x},${d.y}`)).length;
    const links = railLinksOf(state).filter(l => l.nationId === N2).length;
    checkpoints.push({ turn, score: scoreOf(state, N2).total, depotsJoined, links, bound: railBound(state, N2), deadEnds: railDeadEnds(state, N2) });
  }
  return { checkpoints, refused, health, councils, orders: log, final: state };
}
