import { scriptedOrdersWithoutResearch } from '@/engine/ai/scriptedPlayer';
import { researchReserve } from '@/engine/ai/economy';
import { tryApplyOrder } from '@/engine/orders/apply';
import type { Order } from '@/engine/orders/Order';
import { nationById } from '@/engine/orders/queries';
import { validateOrder } from '@/engine/orders/validate';
import { collectingHub } from '@/engine/systems/logisticsSystem';
import { availableTechnologies } from '@/engine/technology';
import { resolveTurn } from '@/engine/turn/resolveTurn';
import type { GameState } from '@/types/GameState';
import { COMPUTER_ID as id } from './humans';

export const K = 3;
export const nationOf = (s: GameState) => nationById(s, id)!;
export type Use = { turn: number; tech: string; action: string };
export type Need = { turn: number; tech: string; use: Use };

// An accepted order uses an invention only if removing that invention makes the same order
// illegal. Ungated developments, Indiamen, zero-count orders and prerequisites cannot qualify.
export function actualUse(s: GameState, order: Order, tech: string): Use | undefined {
  let action: string;
  if (order.kind === 'setShipyard') action = order.ship;
  else if (order.kind === 'setUniversity') action = order.civilianType;
  else if (order.kind === 'startDevelopment' || order.kind === 'moveAndStartDevelopment') {
    const tile = order.kind === 'startDevelopment' ? order.tileId : order.toTileId;
    if (!collectingHub(s, id, tile)) return;
    action = `develop ${tile}`;
  } else return;
  const without = { ...s, nations: s.nations.map(nation => nation.id === id
    ? { ...nation, technologies: nation.technologies?.filter(owned => owned !== tech) } : nation) };
  const denied = validateOrder(without, order);
  if (!denied.ok && denied.reason === 'missing-technology' && denied.techId === tech) {
    return { turn: s.turn, tech, action };
  }
}

// Replay the real planning and resolution entry points with an idle human. The only change
// to the decision turn is the single forced purchase. Future research is withheld on the fork.
function firstUse(committed: GameState, tech: string): Use | undefined {
  const paid = tryApplyOrder(committed, { kind: 'buyTechnology', nationId: id, techId: tech });
  if (!paid.result.ok) throw new Error(`T${committed.turn} forced ${tech}: ${paid.result.reason}`);
  let future = resolveTurn(paid.state, {}).state;
  for (let elapsed = 1; elapsed <= K && !future.gameOver; elapsed++) {
    let filed = future;
    const orders = scriptedOrdersWithoutResearch(future, id);
    for (const order of orders) {
      const accepted = tryApplyOrder(filed, order);
      if (!accepted.result.ok) throw new Error(`T${future.turn} replay ${order.kind}: ${accepted.result.reason}`);
      const use = actualUse(filed, order, tech);
      if (use) return use;
      filed = accepted.state;
    }
    if (elapsed < K) future = resolveTurn(future, { [id]: orders }).state;
  }
}

export function replayAffordableTechnologies(committed: GameState) {
  const affordable = availableTechnologies(committed, id).filter(tech =>
    nationOf(committed).treasury - tech.cost >= researchReserve(committed, id));
  const needs: Need[] = [];
  for (const { id: tech } of affordable) {
    const use = firstUse(committed, tech);
    if (use) needs.push({ turn: committed.turn, tech, use });
  }
  return { needs, forks: affordable.length };
}
