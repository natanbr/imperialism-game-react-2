// M4.1 (NR-022): the scripted player builds depots where the resources are and joins them to the
// capital by the shortest rail path. FR-122 the engineer, FR-123 where the others work first, FR-124
// the 15-turn acceptance against the M4 player (a frozen copy in m4ScriptedPlayer.ts).
import { describe, it, expect } from 'vitest';
import { newGame } from '@/engine/newGame';
import { resolveTurn } from '@/engine/turn/resolveTurn';
import { validateOrder } from '@/engine/orders/validate';
import { applyOrder } from '@/engine/orders/apply';
import { computerOrders } from '@/engine/ai/players';
import { scriptedPlayer, type Player } from '@/engine/ai/scriptedPlayer';
import { bestDepotSite, capitalComponent, coveredTiles, railPath } from '@/engine/ai/railPlan';
import { railLinksOf, addDepot } from '@/engine/systems/railroadSystem';
import { computeLogisticsTransport } from '@/engine/systems/logisticsSystem';
import { getNeighborCoords } from '@/engine/map/mapHelpers';
import { scoreOf } from '@/engine/score/score';
import type { Order } from '@/engine/orders/Order';
import type { GameState } from '@/types/GameState';
import { TerrainType } from '@/types/Tile';
import { m4ScriptedPlayer } from './m4ScriptedPlayer';
import { setTile } from './fixtures';

const N2 = 'nation-2';
const CAPITAL_2 = '14-9';
const ENGINEER_2 = 'worker-nation-2-7';
const key = (tileId: string) => tileId.replace('-', ',');
const network = (s: GameState) => s.transportNetwork.railroadNetworks![N2];
const linksOf = (s: GameState) => railLinksOf(s).filter(l => l.nationId === N2).length;
const yieldOf = (s: GameState) => Object.values(computeLogisticsTransport(s.map, N2, network(s))).reduce((a, b) => a + b, 0);
const workerOrders = (orders: Order[]) => orders.filter((o): o is Extract<Order, { workerId: string }> => 'workerId' in o);

interface Run {
  state: GameState;
  /** Units the freight cars carried to the warehouse over the turns: min(cars, what the tiles deliver). */
  shipped: number;
  /** Units offered on the world market over the turns (each turn's final sell amounts). */
  sold: number;
  /** The order-rejected events of nation 2 that resolveTurn reported over the turns. */
  refused: number;
}

/** 15 turns from the real new game; nation 2's orders from `player`, none for nation 1. */
function play(player: Player, turns = 15, seed = 1): Run {
  let state = newGame({ seed });
  let shipped = 0;
  let sold = 0;
  let refused = 0;
  for (let t = 0; t < turns; t++) {
    const orders = player(state, N2);
    const sells = new Map<string, number>();
    for (const o of orders) if (o.kind === 'sellCommodity') sells.set(o.commodity, o.amount);
    sold += [...sells.values()].reduce((a, b) => a + b, 0);
    const cars = state.nations.find(n => n.id === N2)!.transportCapacity ?? 0;
    const result = resolveTurn(state, { [N2]: orders }, state.seed);
    refused += result.events.filter(e => e.type === 'order-rejected' && e.nationId === N2).length;
    state = result.state;
    shipped += Math.min(cars, yieldOf(state));
  }
  return { state, shipped, sold, refused };
}

/** Steps over the nation's land from a tile to its capital (breadth-first). */
function landDistanceToCapital(s: GameState, from: { x: number; y: number }): number {
  const capital = s.map.tiles.flat().find(t => t.ownerNationId === N2 && t.terrain === TerrainType.Capital)!;
  const seen = new Map<string, number>([[`${from.x},${from.y}`, 0]]);
  const queue = [from];
  while (queue.length) {
    const cur = queue.shift()!;
    const d = seen.get(`${cur.x},${cur.y}`)!;
    if (cur.x === capital.x && cur.y === capital.y) return d;
    for (const [x, y] of getNeighborCoords(s.map, cur.x, cur.y)) {
      const t = s.map.tiles[y][x];
      if (seen.has(`${x},${y}`) || t.ownerNationId !== N2) continue;
      seen.set(`${x},${y}`, d + 1);
      queue.push({ x, y });
    }
  }
  return Infinity;
}

/**
 * The rail a player that only joins depots needs: each joined depot's land distance to the capital, + 3.
 * Only depots in the capital's rail component count: a depot not joined yet has no rail to allow for.
 */
function railBound(s: GameState): number {
  const component = capitalComponent(s, N2);
  const joined = network(s).depots.filter(d => component.has(`${d.x},${d.y}`));
  return joined.reduce((sum, d) => sum + landDistanceToCapital(s, d), 0) + 3;
}

describe('FR-122 the scripted engineer', () => {
  it('FR-122 on turn 1 (no depot yet) the engineer starts a depot on the best site and lays no rail', () => {
    const s = newGame({ seed: 1 });
    const site = bestDepotSite(s, N2)!;
    expect(site.gain).toBeGreaterThanOrEqual(2);
    const engineer = workerOrders(scriptedPlayer(s, N2)).filter(o => o.workerId === ENGINEER_2);
    expect(engineer).toEqual([{ kind: 'moveAndStartConstruction', nationId: N2, workerId: ENGINEER_2, toTileId: site.tileId, structure: 'depot' }]);
  });

  it('FR-122 with a built depot not joined to the capital, the engineer builds the next tile of the shortest rail path', () => {
    const start = newGame({ seed: 1 });
    const site = bestDepotSite(start, N2)!;
    const [x, y] = site.tileId.split('-').map(Number);
    const s = addDepot(setTile(start, site.tileId, { depot: true }), N2, { x, y });

    const path = railPath(s, N2, key(site.tileId), capitalComponent(s, N2))!;
    expect(path[0]).toBe(key(site.tileId));
    expect(path[path.length - 1]).toBe(key(CAPITAL_2));
    expect(path.length - 1).toBe(landDistanceToCapital(s, { x, y }));

    const engineer = workerOrders(scriptedPlayer(s, N2)).filter(o => o.workerId === ENGINEER_2);
    expect(engineer).toHaveLength(1);
    const next = path[path.length - 2].replace(',', '-');
    expect(engineer[0]).toMatchObject({ toTileId: next });
    expect(['moveAndBuildRail', 'moveAndStartConstruction']).toContain(engineer[0].kind);
  });

  it('FR-122 when every depot is joined and none is worth building, the engineer gives no order', () => {
    // Nothing on the island yields: no site gains the 2 units a turn a depot needs
    const s = newGame({ seed: 1 });
    const barren: GameState = { ...s, map: { ...s.map, tiles: s.map.tiles.map(row => row.map(t => (t.ownerNationId === N2 ? { ...t, resource: undefined } : t))) } };
    expect(bestDepotSite(barren, N2)).toBeUndefined();
    expect(workerOrders(scriptedPlayer(barren, N2)).filter(o => o.workerId === ENGINEER_2)).toEqual([]);
  });
});

describe('FR-123 the others work the gathered tiles first', () => {
  it('FR-123 on turn 1 the engineer plans first, and a civilian works a gathered tile whenever one is open to it', () => {
    const s = newGame({ seed: 1 });
    const orders = scriptedPlayer(s, N2);
    expect(workerOrders(orders)[0].workerId).toBe(ENGINEER_2);

    let view = s;
    let onGathered = 0;
    for (const order of orders) {
      if (order.kind === 'moveAndStartDevelopment' || order.kind === 'moveAndStartProspecting') {
        // The tiles on or next to the capital or a depot (the engineer's new depot included)
        const covered = coveredTiles(view, N2);
        const gatheredOpen = view.map.tiles.flat().filter(t => covered.has(`${t.x},${t.y}`) && validateOrder(view, { ...order, toTileId: t.id }).ok);
        const chosen = covered.has(key(order.toTileId));
        expect({ worker: order.workerId, chosenGathered: chosen || gatheredOpen.length === 0 }).toEqual({ worker: order.workerId, chosenGathered: true });
        if (chosen) onGathered++;
      }
      view = applyOrder(view, order);
    }
    expect(onGathered).toBeGreaterThanOrEqual(2);
  });
});

describe('FR-124 AI acceptance: 15 turns of nation 2', () => {
  const now = play(scriptedPlayer);
  const m4 = play(m4ScriptedPlayer);

  it('FR-124 nation 2 has a depot joined to its capital (active by the connectivity phase and in the capital\'s rail component)', () => {
    const depots = network(now.state).depots;
    const component = capitalComponent(now.state, N2);
    const joined = depots.filter(d => d.isActive && component.has(`${d.x},${d.y}`));
    expect(joined.length).toBeGreaterThanOrEqual(1);
  });

  it('FR-124 its rail links are at most the sum of the joined depots\' rail distances to the capital + 3 (no mesh)', () => {
    expect(linksOf(now.state)).toBeGreaterThan(0);
    expect(linksOf(now.state)).toBeLessThanOrEqual(railBound(now.state));
    // The bound tells the players apart: the M4 player's rail breaks it
    expect(linksOf(m4.state)).toBeGreaterThan(railBound(m4.state));
  });

  it('FR-124 its tiles deliver more a turn, and its freight cars carry more over 15 turns, than the M4 player\'s', () => {
    expect(yieldOf(now.state)).toBeGreaterThan(yieldOf(m4.state));
    expect(now.shipped).toBeGreaterThan(m4.shipped);
  });

  it('FR-124 no order of nation 2 is refused (no order-rejected event from resolveTurn), and the same seed gives the same game', () => {
    expect(now.refused).toBe(0);
    expect(play(scriptedPlayer).state).toEqual(now.state);
    // Through the registry too (FR-099): the same orders
    expect(computerOrders(newGame({ seed: 1 }))[N2]).toEqual(scriptedPlayer(newGame({ seed: 1 }), N2));
  });

  it('FR-124 the numbers, for the journal', () => {
    const row = (r: Run) => ({ depots: network(r.state).depots.length, links: linksOf(r.state), yieldPerTurn: yieldOf(r.state), shipped: r.shipped, sold: r.sold, score: scoreOf(r.state, N2).total });
    console.log('FR-124 M4.1', JSON.stringify({ ...row(now), bound: railBound(now.state), refused: now.refused }), 'M4', JSON.stringify({ ...row(m4), bound: railBound(m4.state), refused: m4.refused }));
    expect(row(now).depots).toBeGreaterThan(0);
  });
});
