// M9 conquest (FR-222 to FR-224): what a taken province brings with it (rail, depots and ports gone, fort, resources and
// levels kept, jobs ended, the old owner's civilians sent home, no militia for the winner), a Great Power's fallen
// capital (all its land to the winner, its regiments gone, its wars over, the game over when one Great Power is left)
// and a minor's fallen capital (a colony). The provinces here are taken undefended (FR-217), so no random number is drawn.
import { describe, it, expect } from 'vitest';
import { newGame } from '@/engine/newGame';
import { tryApplyOrder } from '@/engine/orders/apply';
import { validateOrder } from '@/engine/orders/validate';
import type { Order } from '@/engine/orders/Order';
import { resolveTurn } from '@/engine/turn/resolveTurn';
import { createTurnContext, type GameEvent } from '@/engine/turn/context';
import { combatSystem } from '@/engine/systems/combatSystem';
import { addDepot, addRailroad } from '@/engine/systems/railroadSystem';
import { migrantCap } from '@/engine/industry/industryState';
import { scoreTable } from '@/engine/score/score';
import { getNeighborCoords } from '@/engine/map/mapHelpers';
import { transferProvince } from '@/engine/world/provinces';
import { pairKey } from '@/engine/diplomacy/relations';
import { MAX_RELATION_POINTS } from '@/engine/diplomacy/relations';
import { conquestWinner, isFallen } from '@/engine/army/conquest';
import { settledTradeBarrier } from '@/engine/market/partners';
import type { GameState } from '@/types/GameState';
import { WorkerStatus, WorkerType } from '@/types/Workers';
import { locate, N1, N2, put, setPair, setTile, tileAt, worldViolations } from './fixtures';
import { ARVELIA, ARVELIA_P, clearArmy, continent, NE1, NE2, NW2, relocate, SE2, SUNDMARK, SW2 } from './armyFixtures';

const R1 = 'regiment-1';

const atWar = (s: GameState, a: string, b: string, since = 1): GameState =>
  setPair(s, a, b, { war: { aggressors: [a], since }, consulates: [], embassies: [], pact: false, alliance: false });

const attack = (nationId: string, regimentIds: string[], fromProvinceId: string, toProvinceId: string): Order => ({
  kind: 'moveArmy',
  nationId,
  fromProvinceId,
  regimentIds,
  toProvinceId,
});

function ordered(s: GameState, ...orders: Order[]): GameState {
  return orders.reduce((state, order) => {
    const { state: next, result } = tryApplyOrder(state, order);
    if (!result.ok) throw new Error(`${order.kind} refused: ${result.reason}`);
    return next;
  }, s);
}

/** The combat phase alone; the provinces here are undefended, so no draw is made. */
function combat(s: GameState): { state: GameState; events: GameEvent[] } {
  const events: GameEvent[] = [];
  const state = combatSystem(s, createTurnContext({ turn: s.turn, seed: s.seed, emit: e => events.push(e) }));
  return { state, events };
}

const tilesOf = (s: GameState, provinceId: string): string[] => s.provinces.find(p => p.id === provinceId)!.tileIds;
const ownerOf = (s: GameState, provinceId: string): string => s.provinces.find(p => p.id === provinceId)!.ownerId;
const node = (tileId: string) => ({ x: Number(tileId.split('-')[0]), y: Number(tileId.split('-')[1]) });

/** A tile of `a` with a hex neighbour in `b`, and that neighbour. */
function borderTiles(s: GameState, a: string, b: string): [string, string] {
  for (const tileId of tilesOf(s, a)) {
    const { x, y } = node(tileId);
    for (const [nx, ny] of getNeighborCoords(s.map, x, y)) {
      const other = s.map.tiles[ny][nx];
      if (other.provinceId === b) return [tileId, other.id];
    }
  }
  throw new Error(`${a} does not border ${b}`);
}

/**
 * Testland holds Arvelia's province (hand-built) with its 1st Regulars there, at war with Valdoria; Valdoria North-West
 * is undefended and Testland orders the attack on it.
 */
function northWestUndefended(): GameState {
  let s = transferProvince(continent('world'), ARVELIA_P, N1);
  s = clearArmy(clearArmy(s, ARVELIA, ARVELIA_P), N2, NW2);
  s = atWar(relocate(s, [R1], ARVELIA_P), N1, N2);
  return s;
}

describe('FR-222 a taken province', () => {
  it('FR-222 passes to the winner: the province, its tiles, the event and the capture of this war', () => {
    const { state, events } = combat(ordered(northWestUndefended(), attack(N1, [R1], ARVELIA_P, NW2)));

    expect(ownerOf(state, NW2)).toBe(N1);
    expect(tilesOf(state, NW2).map(id => tileAt(state, id).ownerNationId)).toEqual(tilesOf(state, NW2).map(() => N1));
    expect(events.filter(e => e.type === 'province-taken')).toEqual([{ type: 'province-taken', nationId: N1, provinceId: NW2, fromId: N2 }]);
    expect(state.diplomacy[pairKey(N1, N2)].war!.captures).toEqual([{ provinceId: NW2, fromId: N2, toId: N1, turn: 1 }]);
  });

  it('FR-222 its rail, depots and ports are removed, from its tiles and from the old owner\'s rail graph; its fort, resources and levels stay', () => {
    let s = northWestUndefended();
    const [nw, sw] = borderTiles(s, NW2, SW2);
    const depotTile = tilesOf(s, NW2).find(id => id !== nw)!;
    s = setTile(addRailroad(s, N2, node(nw), node(sw)), sw, { connected: true });
    s = setTile(addDepot(s, N2, node(depotTile)), depotTile, { depot: true, fortLevel: 2 });
    s = setTile(s, nw, { port: true });
    const before = tilesOf(s, NW2).map(id => tileAt(s, id).resource);

    const { state } = combat(ordered(s, attack(N1, [R1], ARVELIA_P, NW2)));

    for (const id of tilesOf(state, NW2)) {
      const tile = tileAt(state, id);
      expect([tile.connected, tile.depot, tile.port], id).toEqual([undefined, undefined, undefined]);
    }
    const network = state.transportNetwork.railroadNetworks![N2];
    const key = (id: string) => `${node(id).x},${node(id).y}`;
    expect(network.graph[key(nw)]).toBeUndefined();
    expect(network.graph[key(depotTile)]).toBeUndefined();
    expect(network.graph[key(sw)]).toEqual([]);
    expect(network.depots).toEqual([]);
    expect(tileAt(state, sw).connected).toBe(true);
    expect(tileAt(state, depotTile).fortLevel).toBe(2);
    expect(tilesOf(state, NW2).map(id => tileAt(state, id).resource)).toEqual(before);
  });

  it('FR-222 the jobs under way there end and the old owner\'s civilians on its tiles go to the old owner\'s capital tile', () => {
    let s = northWestUndefended();
    const [nw] = borderTiles(s, NW2, SW2);
    const [other, third] = tilesOf(s, NW2).filter(id => id !== nw);
    const farmer = 'worker-nation-2-2';
    s = put(s, farmer, nw, { status: WorkerStatus.Working });
    s = setTile(s, nw, { developmentJob: { workerId: farmer, workerType: WorkerType.Farmer, targetLevel: 1, startedOnTurn: 1, durationTurns: 3 } });
    // review R9: every kind of job under way ends, a prospecting and a construction job included
    s = setTile(s, other, { prospecting: { workerId: 'worker-nation-2-9', startedOnTurn: 1 } });
    s = setTile(s, third, { constructionJob: { kind: 'depot', workerId: 'worker-nation-2-9', startedOnTurn: 1, durationTurns: 3 } });

    const { state } = combat(ordered(s, attack(N1, [R1], ARVELIA_P, NW2)));

    expect(tilesOf(state, NW2).map(id => [tileAt(state, id).developmentJob, tileAt(state, id).prospecting, tileAt(state, id).constructionJob])).toEqual(
      tilesOf(state, NW2).map(() => [undefined, undefined, undefined])
    );
    expect(tileAt(state, nw).workers).toEqual([]);
    const home = locate(state, farmer)!;
    expect(home.tile.id).toBe('14-9');
    expect({ status: home.worker.status, justMoved: home.worker.justMoved, assignedTileId: home.worker.assignedTileId }).toEqual({
      status: WorkerStatus.Available,
      justMoved: false,
      assignedTileId: '14-9',
    });
  });

  it('FR-222 the old owner\'s civilians are removed when it holds no capital tile (review R9)', () => {
    // Valdoria's capital province is Testland's (hand-built), so its civilians in North-West have nowhere to go
    let s = transferProvince(northWestUndefended(), SW2, N1);
    const [nw] = borderTiles(s, NW2, SW2);
    const farmer = 'worker-nation-2-2';
    s = put(s, farmer, nw, { status: WorkerStatus.Available });

    const { state } = combat(ordered(s, attack(N1, [R1], ARVELIA_P, NW2)));

    expect(ownerOf(state, NW2)).toBe(N1);
    expect(locate(state, farmer)).toBeUndefined();
  });

  it('FR-222 the winner gets no militia there: only the regiments that took it', () => {
    const { state } = combat(ordered(northWestUndefended(), attack(N1, [R1], ARVELIA_P, NW2)));
    expect(state.armies.filter(a => a.provinceId === NW2).map(a => [a.ownerId, a.regiments.map(r => r.id)])).toEqual([[N1, [R1]]]);
  });
});

describe('FR-223 a Great Power\'s capital falls', () => {
  /** Testland holds Valdoria North-West with its 1st Regulars; Valdoria's capital province is undefended; Valdoria is also at war with Sundmark. */
  function capitalAttack(): GameState {
    let s = transferProvince(continent('world'), NW2, N1);
    s = clearArmy(clearArmy(s, N2, NW2), N2, SW2);
    s = atWar(atWar(relocate(s, [R1], NW2), N1, N2), N2, SUNDMARK);
    return ordered(s, attack(N1, [R1], NW2, SW2));
  }

  it('FR-223 all its provinces pass to the winner, its regiments are removed, its wars end; nation-fallen', () => {
    const { state, events } = combat(capitalAttack());

    expect([SW2, NE2, SE2].map(p => ownerOf(state, p))).toEqual([N1, N1, N1]);
    expect(state.armies.filter(a => a.ownerId === N2)).toEqual([]);
    expect(state.diplomacy[pairKey(N1, N2)].war).toBeUndefined();
    expect(state.diplomacy[pairKey(N2, SUNDMARK)].war).toBeUndefined();
    expect(events.filter(e => e.type !== 'battle-resolved')).toEqual([
      { type: 'province-taken', nationId: N1, provinceId: SW2, fromId: N2 },
      { type: 'province-taken', nationId: N1, provinceId: NE2, fromId: N2 },
      { type: 'province-taken', nationId: N1, provinceId: SE2, fromId: N2 },
      { type: 'nation-fallen', nationId: N1, fallenId: N2 },
    ]);
    expect(isFallen(state, N2)).toBe(true);
    expect(isFallen(state, N1)).toBe(false);
    // its civilians had their capital taken: none is left on the map
    expect(state.map.tiles.flat().flatMap(t => t.workers).filter(w => w.nationId === N2)).toEqual([]);
    // FR-148: 8 provinces give up to 2 migrants a turn
    expect(migrantCap(state, N1)).toBe(2);
  });

  it('FR-223 with one Great Power left standing the game ends at once: gameOver with reason conquest, the winner and the scores', () => {
    const s = capitalAttack();
    const { state, events } = resolveTurn(s, {}, s.seed);

    expect(conquestWinner(state)).toBe(N1);
    expect(state.gameOver).toEqual({ turn: 1, year: s.year, scores: scoreTable(state), reason: 'conquest', winnerId: N1 });
    expect(events.filter(e => e.type === 'game-over')).toEqual([{ type: 'game-over', turn: 1, year: s.year, scores: scoreTable(state), reason: 'conquest', winnerId: N1 }]);
    expect(resolveTurn(state, {}, state.seed).state).toBe(state);
  });

  it('FR-223 FR-068 the turn limit still ends the game without a reason; two-islands is never conquered', () => {
    const last = resolveTurn({ ...continent('world'), turnLimit: 1 }, {}, 1).state;
    expect(last.gameOver!.reason).toBeUndefined();
    expect(last.gameOver!.winnerId).toBeUndefined();
    const v1 = resolveTurn(newGame({ seed: 1, world: 'two-islands' }), {}, 1).state;
    expect(conquestWinner(v1)).toBeUndefined();
    expect([isFallen(v1, N1), isFallen(v1, N2)]).toEqual([false, false]);
    expect(v1.gameOver).toBeUndefined();
  });
});

describe('FR-224 a minor\'s capital falls', () => {
  /** Testland's 1st Regulars at its border, Arvelia undefended and at war with Testland; Valdoria holds treaties with Arvelia. */
  function colonyAttack(): GameState {
    let s = atWar(relocate(clearArmy(continent('partners'), ARVELIA, ARVELIA_P), [R1], NE1), N1, ARVELIA);
    s = setPair(s, N2, ARVELIA, { consulates: [N2], embassies: [N2], pact: true, subsidies: { [N2]: 10 }, lockedGrants: { [N2]: 1000 } });
    return ordered(s, attack(N1, [R1], NE1, ARVELIA_P));
  }

  it('FR-224 the minor becomes the winner\'s colony: its land is the winner\'s, its points with the winner 89, minor-colonised', () => {
    const { state, events } = combat(colonyAttack());

    expect(ownerOf(state, ARVELIA_P)).toBe(N1);
    expect(state.minorNations.find(m => m.id === ARVELIA)).toEqual({ id: ARVELIA, name: 'Arvelia', capitalTileId: '11-4', colonyOf: N1 });
    const pair = state.diplomacy[pairKey(N1, ARVELIA)];
    expect(pair.war).toBeUndefined();
    expect(pair.points).toBe(MAX_RELATION_POINTS);
    expect(events.filter(e => e.type !== 'battle-resolved')).toEqual([
      { type: 'province-taken', nationId: N1, provinceId: ARVELIA_P, fromId: ARVELIA },
      { type: 'minor-colonised', nationId: N1, minorId: ARVELIA },
      { type: 'grant-stopped', nationId: N2, targetId: ARVELIA, amount: 1000, reason: 'colony' },
    ]);
  });

  it('FR-224 the other Great Powers\' consulates, embassies, pacts, subsidies and grants with it end; every war with it ends', () => {
    const { state } = combat(colonyAttack());
    expect(state.diplomacy[pairKey(N2, ARVELIA)]).toMatchObject({ consulates: [], embassies: [], pact: false, subsidies: {}, lockedGrants: {} });

    const both = ordered(atWar(setPair(colonyAttack(), N2, ARVELIA, { consulates: [], embassies: [], pact: false, subsidies: {}, lockedGrants: {} }), N2, ARVELIA));
    expect(combat(both).state.diplomacy[pairKey(N2, ARVELIA)].war).toBeUndefined();
  });

  it('FR-224 no overture, grant or trade policy reaches a colony, from its owner or another Great Power: "colony" (review F2)', () => {
    const { state } = combat(colonyAttack());
    const refusals = [N1, N2].flatMap(nationId =>
      [
        ...(['consulate', 'embassy', 'pact', 'war', 'peace'] as const).map((overture): Order => ({ kind: 'proposeOverture', nationId, overture, targetId: ARVELIA })),
        { kind: 'giveGrant', nationId, targetId: ARVELIA, amount: 1000, locked: false } as Order,
        { kind: 'setTradePolicy', nationId, targetId: ARVELIA, subsidyPercent: 0, boycott: true } as Order,
      ].map(order => validateOrder(state, order))
    );
    expect(refusals).toEqual(refusals.map(() => ({ ok: false, reason: 'colony' })));
    // Sundmark, not a colony, still takes a consulate
    expect(validateOrder(state, { kind: 'proposeOverture', nationId: N2, overture: 'consulate', targetId: SUNDMARK })).toEqual({ ok: true });
  });
});

describe('FR-224 a colony changes hands with its capital province (review E1)', () => {
  /**
   * Arvelia is Valdoria's colony (hand-built from a new game: its province Valdoria's, its militia gone, `colonyOf`
   * nation-2, points 89, Valdoria's consulate and a locked grant there); Testland is at war with Valdoria, holds a
   * consulate with Arvelia, and its 1st Regulars in Testland North-East.
   */
  function valdoriaColony(): GameState {
    let s = clearArmy(transferProvince(continent('partners'), ARVELIA_P, N2), ARVELIA, ARVELIA_P);
    s = { ...s, minorNations: s.minorNations.map(m => (m.id === ARVELIA ? { ...m, colonyOf: N2 } : m)) };
    s = setPair(s, N2, ARVELIA, { points: MAX_RELATION_POINTS, consulates: [N2], embassies: [N2], lockedGrants: { [N2]: 1000 } });
    s = setPair(s, N1, ARVELIA, { consulates: [N1] });
    return atWar(relocate(s, [R1], NE1), N1, N2);
  }

  it('FR-224 another Great Power takes the colony\'s capital province: the colony is its own, trade and the treaties follow', () => {
    const start = valdoriaColony();
    const { state, events } = resolveTurn(ordered(start, attack(N1, [R1], NE1, ARVELIA_P)), {}, start.seed);

    expect(ownerOf(state, ARVELIA_P)).toBe(N1);
    expect(state.minorNations.find(m => m.id === ARVELIA)!.colonyOf).toBe(N1);
    expect(events.filter(e => ['province-taken', 'minor-colonised', 'grant-stopped'].includes(e.type))).toEqual([
      { type: 'province-taken', nationId: N1, provinceId: ARVELIA_P, fromId: N2 },
      { type: 'minor-colonised', nationId: N1, minorId: ARVELIA },
      { type: 'grant-stopped', nationId: N2, targetId: ARVELIA, amount: 1000, reason: 'colony' },
    ]);
    expect([settledTradeBarrier(state, N1, ARVELIA), settledTradeBarrier(state, N2, ARVELIA)]).toEqual([undefined, 'not-a-partner']);
    expect(state.diplomacy[pairKey(N1, ARVELIA)].points).toBe(MAX_RELATION_POINTS);
    expect(state.diplomacy[pairKey(N2, ARVELIA)]).toMatchObject({ consulates: [], embassies: [], lockedGrants: {} });
    expect(worldViolations(state, start).filter(v => v.includes('colony'))).toEqual([]);
  });

  it('FR-223 FR-224 a fallen Great Power\'s colonies pass to its conqueror', () => {
    // Testland takes Valdoria's emptied capital province from Valdoria North-West (hand-built Testland's)
    let start = transferProvince(valdoriaColony(), NW2, N1);
    start = relocate(clearArmy(clearArmy(start, N2, NW2), N2, SW2), [R1], NW2);
    const { state, events } = resolveTurn(ordered(start, attack(N1, [R1], NW2, SW2)), {}, start.seed);

    expect(state.gameOver).toMatchObject({ reason: 'conquest', winnerId: N1 });
    expect(ownerOf(state, ARVELIA_P)).toBe(N1);
    expect(state.minorNations.find(m => m.id === ARVELIA)!.colonyOf).toBe(N1);
    const after = events.slice(events.findIndex(e => e.type === 'nation-fallen'));
    expect(after.filter(e => e.type === 'nation-fallen' || e.type === 'minor-colonised')).toEqual([
      { type: 'nation-fallen', nationId: N1, fallenId: N2 },
      { type: 'minor-colonised', nationId: N1, minorId: ARVELIA },
    ]);
    expect(worldViolations(state, start).filter(v => v.includes('colony'))).toEqual([]);
  });
});
