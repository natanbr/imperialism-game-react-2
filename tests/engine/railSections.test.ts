// M4.3 (NR-026): rail is a set of sections, each joining the two tiles it was built between. FR-136 the graph
// holds exactly the sections built; FR-137 which section each order builds; FR-138 the scripted engineer plans
// sections; FR-139 Nathan's play-test case and its neighbours, from the real new game through resolveTurn.
import { describe, it, expect } from 'vitest';
import { newGame } from '@/engine/newGame';
import { resolveTurn } from '@/engine/turn/resolveTurn';
import { applyOrder } from '@/engine/orders/apply';
import { validateOrder } from '@/engine/orders/validate';
import { createTurnContext } from '@/engine/turn/context';
import { developmentSystem } from '@/engine/systems/developmentSystem';
import { transportConnectivitySystem } from '@/engine/systems/transportConnectivitySystem';
import { addDepot, addRailroad, railLinksOf } from '@/engine/systems/railroadSystem';
import { bestDepotSite, capitalComponent, nextRailSections, railPath } from '@/engine/ai/railPlan';
import { scriptedPlayer } from '@/engine/ai/scriptedPlayer';
import type { Order, RejectReason } from '@/engine/orders/Order';
import type { GameState } from '@/types/GameState';
import { WorkerType } from '@/types/Workers';
import { createTileId, parseTileIdToArray } from '@/utils/tileIdUtils';
import { game, N1, N2, put, setTile, T, tileAt, workerId } from './fixtures';

const at = (tileId: string) => {
  const [x, y] = parseTileIdToArray(tileId);
  return { x, y };
};
/** A nation's links as sorted "a b" tile-id pairs. */
const links = (s: GameState, nationId = N1): string[] =>
  railLinksOf(s)
    .filter(l => l.nationId === nationId)
    .map(l => [createTileId(l.from.x, l.from.y), createTileId(l.to.x, l.to.y)].sort().join(' '))
    .sort();
const pair = (a: string, b: string) => [a, b].sort().join(' ');
const outcome = (s: GameState, order: Order): 'ok' | RejectReason => {
  const r = validateOrder(s, order);
  return r.ok ? 'ok' : r.reason;
};

describe('FR-136 the rail graph holds exactly the sections built', () => {
  it('FR-136 a new game starts as before: each nation has its capital alone, no link', () => {
    const s = newGame({ seed: 1 });
    expect(railLinksOf(s)).toEqual([]);
    expect(s.transportNetwork.railroadNetworks![N1].graph).toEqual({ '2,9': [] });
    expect(s.transportNetwork.railroadNetworks![N2].graph).toEqual({ '14,9': [] });
  });

  it('FR-136 a section joins its two tiles only, though the new rail has another rail neighbour', () => {
    // Fixture: capital 1-1; the farm 2-1 and the dry plains 2-2 are neighbours of the capital and of each other
    let s = addRailroad(game(), N1, at(T.farm1), at(T.capital1));
    s = addRailroad(s, N1, at(T.dryPlains1), at(T.capital1));
    expect(links(s)).toEqual([pair(T.capital1, T.farm1), pair(T.capital1, T.dryPlains1)].sort());
    expect(tileAt(s, T.dryPlains1).connected).toBe(true);
  });

  it('FR-136 a finished rail job links its tile to the tile it was built from (railFrom), nothing else', () => {
    let s = addRailroad(game(), N1, at(T.farm1), at(T.capital1));
    s = setTile(s, T.dryPlains1, { constructionJob: { workerId: 'x', kind: 'rail', startedOnTurn: 0, durationTurns: 1, railFrom: T.farm1 } });
    const next = developmentSystem(s, createTurnContext({ turn: s.turn }));
    expect(links(next)).toEqual([pair(T.capital1, T.farm1), pair(T.farm1, T.dryPlains1)].sort());
  });

  it('FR-136 a hand-made rail job without railFrom links to its first neighbouring node only', () => {
    let s = addRailroad(game(), N1, at(T.farm1), at(T.capital1));
    s = setTile(s, T.dryPlains1, { constructionJob: { workerId: 'x', kind: 'rail', startedOnTurn: 0, durationTurns: 1 } });
    const next = developmentSystem(s, createTurnContext({ turn: s.turn }));
    // 2-2 (even row) lists its neighbours 1-1, 2-1, ...: the capital comes first
    expect(links(next)).toEqual([pair(T.capital1, T.farm1), pair(T.capital1, T.dryPlains1)].sort());
  });

  it('FR-136 a depot finished next to rail joins the graph with no link and stays unconnected', () => {
    // Rail 1-1 -> 2-1 -> 3-1; a depot job on 3-2 (next to 3-1 and 2-1) finishes
    let s = addRailroad(game(), N1, at(T.farm1), at(T.capital1));
    s = addRailroad(s, N1, at(T.orchard1), at(T.farm1));
    s = setTile(s, T.town1, { constructionJob: { workerId: 'x', kind: 'depot', startedOnTurn: 0, durationTurns: 1 } });
    const built = transportConnectivitySystem(developmentSystem(s, createTurnContext({ turn: s.turn })), createTurnContext({ turn: s.turn }));
    const network = built.transportNetwork.railroadNetworks![N1];
    expect(network.graph['3,2']).toEqual([]);
    expect(network.depots.find(d => d.x === 3 && d.y === 2)?.isActive).toBe(false);
    expect(links(built)).toEqual([pair(T.capital1, T.farm1), pair(T.farm1, T.orchard1)].sort());
  });

  it('FR-136 addDepot adds the node and no link', () => {
    const s = addDepot(addRailroad(game(), N1, at(T.farm1), at(T.capital1)), N1, at(T.orchard1));
    expect(s.transportNetwork.railroadNetworks![N1].graph['3,1']).toEqual([]);
    expect(links(s)).toEqual([pair(T.capital1, T.farm1)]);
  });
});

describe('FR-137 which section an order builds', () => {
  const ENGINEER = workerId(N1, WorkerType.Engineer);
  const railTo = (toTileId: string): Order => ({ kind: 'moveAndBuildRail', nationId: N1, workerId: ENGINEER, toTileId });
  const railOn = (tileId: string, fromTileId?: string): Order => ({ kind: 'startConstruction', nationId: N1, workerId: ENGINEER, tileId, structure: 'rail', ...(fromTileId ? { fromTileId } : {}) });
  const moveRail = (toTileId: string, fromTileId?: string): Order => ({ kind: 'moveAndStartConstruction', nationId: N1, workerId: ENGINEER, toTileId, structure: 'rail', ...(fromTileId ? { fromTileId } : {}) });
  /** Rail 1-1 -> 2-1 and 1-1 -> 2-2 (2-1 and 2-2 are neighbours, not linked). */
  const vee = () => addRailroad(addRailroad(game(), N1, at(T.farm1), at(T.capital1)), N1, at(T.dryPlains1), at(T.capital1));

  it('FR-137 rail-on-move from a rail node builds the section from the engineer\'s tile', () => {
    // The engineer on 2-1 (rail) steps onto the orchard 3-1, which also neighbours nothing else on rail
    const s = put(addRailroad(game(), N1, at(T.farm1), at(T.capital1)), ENGINEER, T.farm1);
    const next = applyOrder(s, railTo(T.orchard1));
    expect(tileAt(next, T.orchard1).constructionJob).toMatchObject({ kind: 'rail', railFrom: T.farm1 });
  });

  it('FR-137 rail-on-move from the capital onto a tile next to two rail tiles builds only the capital\'s section', () => {
    // 2-2 neighbours the capital and the rail on 2-1; the engineer stands on the capital
    const s = addRailroad(game(), N1, at(T.farm1), at(T.capital1));
    const next = applyOrder(s, railTo(T.dryPlains1));
    expect(tileAt(next, T.dryPlains1).constructionJob).toMatchObject({ kind: 'rail', railFrom: T.capital1 });
  });

  it('FR-137 rail-on-move from a tile without rail starts from the target\'s first rail neighbour', () => {
    // The engineer on the range 1-0 (no rail) steps onto the forest 2-0, next to the capital and the rail on 2-1
    const s = put(addRailroad(game(), N1, at(T.farm1), at(T.capital1)), ENGINEER, T.range1);
    const target = createTileId(2, 0);
    expect(outcome(s, railTo(target))).toBe('ok');
    // 2-0 (even row) lists 1-0, 3-0, 1-1, 2-1: the capital 1-1 is its first rail node
    expect(tileAt(applyOrder(s, railTo(target)), target).constructionJob).toMatchObject({ railFrom: T.capital1 });
  });

  it('FR-137 rail-on-move into a depot builds the section into it; once that section exists it is refused', () => {
    // A depot on 3-1 (no rail on its tile) next to the rail on 2-1
    let s = addRailroad(game(), N1, at(T.farm1), at(T.capital1));
    s = put(addDepot(setTile(s, T.orchard1, { depot: true }), N1, at(T.orchard1)), ENGINEER, T.farm1);
    expect(tileAt(applyOrder(s, railTo(T.orchard1)), T.orchard1).constructionJob).toMatchObject({ kind: 'rail', railFrom: T.farm1 });
    // A section built out of the depot to 2-1 leaves the depot tile without the rail flag: the same move is refused
    let out = addDepot(setTile(game(), T.orchard1, { depot: true }), N1, at(T.orchard1));
    out = put(addRailroad(out, N1, at(T.farm1), at(T.orchard1)), ENGINEER, T.farm1);
    expect(tileAt(out, T.orchard1).connected).toBeFalsy();
    expect(outcome(out, railTo(T.orchard1))).toBe('invalid-site');
  });

  it('FR-137 a named section between two rail tiles closes the loop; without the name it is refused', () => {
    const s = put(vee(), ENGINEER, T.dryPlains1);
    expect(outcome(s, railOn(T.dryPlains1))).toBe('invalid-site');
    expect(outcome(s, railOn(T.dryPlains1, T.farm1))).toBe('ok');
    const next = applyOrder(s, railOn(T.dryPlains1, T.farm1));
    expect(tileAt(next, T.dryPlains1).constructionJob).toMatchObject({ kind: 'rail', railFrom: T.farm1 });
    const done = developmentSystem(next, createTurnContext({ turn: next.turn }));
    expect(links(done)).toContain(pair(T.farm1, T.dryPlains1));
  });

  it('FR-137 move-and-build with a named start works from anywhere, like the other move-and-start orders', () => {
    const s = put(vee(), ENGINEER, T.homeOrchard1);
    expect(outcome(s, moveRail(T.dryPlains1, T.farm1))).toBe('ok');
    expect(tileAt(applyOrder(s, moveRail(T.dryPlains1, T.farm1)), T.dryPlains1).constructionJob).toMatchObject({ railFrom: T.farm1 });
  });

  it('FR-137 a named start that is already linked, not next to the tile, or not a rail node is refused with invalid-site', () => {
    const s = put(vee(), ENGINEER, T.dryPlains1);
    expect(outcome(s, railOn(T.dryPlains1, T.capital1))).toBe('invalid-site'); // the section 1-1 -> 2-2 exists
    expect(outcome(s, railOn(T.dryPlains1, T.orchard1))).toBe('invalid-site'); // 3-1 is not next to 2-2
    expect(outcome(s, railOn(T.dryPlains1, T.homeOrchard1))).toBe('invalid-site'); // 1-2 has no rail
  });

  it('FR-137 fromTileId on a depot, port or fort is refused with invalid-target', () => {
    const s = put(game(), ENGINEER, T.orchard1);
    const depot: Order = { kind: 'startConstruction', nationId: N1, workerId: ENGINEER, tileId: T.orchard1, structure: 'depot', fromTileId: T.farm1 };
    expect(outcome(s, depot)).toBe('invalid-target');
  });
});

describe('FR-138 the scripted engineer plans rail sections', () => {
  const ENGINEER_2 = 'worker-nation-2-7';
  const withDepot = (s: GameState, tileId: string) => {
    const [x, y] = parseTileIdToArray(tileId);
    return addDepot(setTile(s, tileId, { depot: true }), N2, { x, y });
  };

  it('FR-138 a new depot needs one section per step of its path, the one into the depot included', () => {
    const s = newGame({ seed: 1 });
    const site = bestDepotSite(s, N2)!;
    const path = railPath(s, N2, site.tileId.replace('-', ','), capitalComponent(s, N2))!;
    expect(site.railNeeded).toBe(path.length - 1);
  });

  it('FR-138 the engineer orders the capital-end section first, naming its start', () => {
    const start = newGame({ seed: 1 });
    const site = bestDepotSite(start, N2)!;
    const s = withDepot(start, site.tileId);
    const sections = nextRailSections(s, N2);
    const path = railPath(s, N2, site.tileId.replace('-', ','), capitalComponent(s, N2))!.map(k => k.replace(',', '-'));
    expect(sections[0]).toEqual({ fromTileId: path[path.length - 1], toTileId: path[path.length - 2] });
    const engineer = scriptedPlayer(s, N2).filter(o => 'workerId' in o && o.workerId === ENGINEER_2);
    expect(engineer).toEqual([{ kind: 'moveAndStartConstruction', nationId: N2, workerId: ENGINEER_2, toTileId: sections[0].toTileId, structure: 'rail', fromTileId: sections[0].fromTileId }]);
  });

  it('FR-138 when only the section into the depot is missing, it is the one ordered', () => {
    // Lay every section of the path but the last, straight into the graph: the depot stays unjoined
    const start = newGame({ seed: 1 });
    const site = bestDepotSite(start, N2)!;
    let s = withDepot(start, site.tileId);
    const path = railPath(s, N2, site.tileId.replace('-', ','), capitalComponent(s, N2))!.map(k => k.replace(',', '-'));
    for (let i = path.length - 2; i >= 1; i--) s = addRailroad(s, N2, at(path[i]), at(path[i + 1]));
    expect(capitalComponent(s, N2).has(site.tileId.replace('-', ','))).toBe(false);
    expect(nextRailSections(s, N2)[0]).toEqual({ fromTileId: path[1], toTileId: path[0] });
  });
});

describe('FR-139 Nathan\'s report: three neighbouring tiles get two sections, not a triangle', () => {
  const ENGINEER = 'worker-nation-1-7';
  const CAPITAL = '2-9';
  // A next to the capital; B next to A; C next to A and B (and, as it happens, to the capital)
  const A = '2-8';
  const B = '2-7';
  const C = '3-8';

  function play(state: GameState, order?: Order): GameState {
    const { state: next, events } = resolveTurn(state, order ? { [N1]: [order] } : {}, state.seed);
    expect(events.filter(e => e.type === 'order-rejected')).toEqual([]);
    return next;
  }
  const railTo = (toTileId: string): Order => ({ kind: 'moveAndBuildRail', nationId: N1, workerId: ENGINEER, toTileId });
  const moveTo = (toTileId: string): Order => ({ kind: 'moveWorker', nationId: N1, workerId: ENGINEER, toTileId });

  it('FR-139 (a) rail on A, then B from A, then C from A: the links are capital-A, A-B and A-C, no B-C', () => {
    let s = newGame({ seed: 1 });
    s = play(s, railTo(A));
    s = play(s, railTo(B));
    s = play(s, moveTo(A));
    s = play(s, railTo(C));
    expect(tileAt(s, C).connected).toBe(true);
    expect(links(s)).toEqual([pair(CAPITAL, A), pair(A, B), pair(A, C)].sort());
    expect(links(s)).not.toContain(pair(B, C));
    expect(links(s)).not.toContain(pair(CAPITAL, C));
  });

  it('FR-139 (b) a straight line of four sections is four links', () => {
    let s = newGame({ seed: 1 });
    const line = ['2-8', '2-7', '2-6', '2-5'];
    for (const to of line) s = play(s, railTo(to));
    expect(links(s)).toEqual([pair(CAPITAL, '2-8'), pair('2-8', '2-7'), pair('2-7', '2-6'), pair('2-6', '2-5')].sort());
  });

  it('FR-139 (c) a section built on purpose between B and C closes the loop and is a link', () => {
    let s = newGame({ seed: 1 });
    s = play(s, railTo(A));
    s = play(s, railTo(B));
    s = play(s, moveTo(A));
    s = play(s, railTo(C));
    // The engineer stands on C and builds the section from B
    s = play(s, { kind: 'startConstruction', nationId: N1, workerId: ENGINEER, tileId: C, structure: 'rail', fromTileId: B });
    expect(links(s)).toEqual([pair(CAPITAL, A), pair(A, B), pair(A, C), pair(B, C)].sort());
  });

  it('FR-139 (d) a depot finished next to the line is red until a section is built into it, then green', () => {
    let s = newGame({ seed: 1 });
    for (const to of ['2-8', '2-7', '2-6', '2-5']) s = play(s, railTo(to));
    const DEPOT = '2-4';
    s = play(s, { kind: 'moveAndStartConstruction', nationId: N1, workerId: ENGINEER, toTileId: DEPOT, structure: 'depot' });
    for (let i = 0; i < 5 && !tileAt(s, DEPOT).depot; i++) s = play(s);
    const light = (st: GameState) => st.transportNetwork.railroadNetworks![N1].depots.find(d => createTileId(d.x, d.y) === DEPOT)?.isActive;
    expect(tileAt(s, DEPOT).depot).toBe(true);
    expect(light(s)).toBe(false);
    expect(links(s).some(l => l.split(' ').includes(DEPOT))).toBe(false);

    s = play(s, moveTo('2-5'));
    s = play(s, railTo(DEPOT));
    expect(links(s)).toContain(pair('2-5', DEPOT));
    expect(light(s)).toBe(true);
  });
});
