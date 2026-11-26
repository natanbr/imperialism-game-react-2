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
import { bestDepotSite, capitalComponent, coveredTiles, pendingRailTiles, railPath } from '@/engine/ai/railPlan';
import { cashReserve } from '@/engine/ai/economy';
import { railLinksOf, addDepot, addRailroad } from '@/engine/systems/railroadSystem';
import { computeLogisticsTransport } from '@/engine/systems/logisticsSystem';
import { scoreOf } from '@/engine/score/score';
import type { Order } from '@/engine/orders/Order';
import type { GameState } from '@/types/GameState';
import { m4ScriptedPlayer } from './m4ScriptedPlayer';
import { put, setIndustry, setTile, setTreasury, setWarehouse } from './fixtures';
import { landDistanceToCapital as distanceToCapital, railBound as bound, railDeadEnds } from './railBound';

const N2 = 'nation-2';
const CAPITAL_2 = '14-9';
const ENGINEER_2 = 'worker-nation-2-7';
const FORESTER_2 = 'worker-nation-2-4';
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

const landDistanceToCapital = (s: GameState, from: { x: number; y: number }) => distanceToCapital(s, N2, from);
const railBound = (s: GameState) => bound(s, N2);

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

  it('FR-122 when the engineer already stands on the best site (railed), he starts the depot there with startConstruction', () => {
    // Rail on a site can change which site is best (shorter rail path wins a tie): rail the best site until it stays best
    let start = newGame({ seed: 1 });
    let site = bestDepotSite(start, N2)!;
    for (let i = 0; i < 5 && !start.map.tiles.flat().find(t => t.id === site.tileId)!.connected; i++) {
      start = setTile(start, site.tileId, { connected: true });
      site = bestDepotSite(start, N2)!;
    }
    expect(start.map.tiles.flat().find(t => t.id === site.tileId)!.connected).toBe(true);
    // Move the engineer onto that railed site: the best site is now his own tile
    const engineer = start.map.tiles.flat().flatMap(t => t.workers).find(w => w.id === ENGINEER_2)!;
    const moved: GameState = {
      ...start,
      map: {
        ...start.map,
        tiles: start.map.tiles.map(row =>
          row.map(t => {
            const workers = t.workers.filter(w => w.id !== ENGINEER_2);
            return t.id === site.tileId ? { ...t, workers: [...workers, engineer] } : { ...t, workers };
          })
        ),
      },
    };
    expect(bestDepotSite(moved, N2)?.tileId).toBe(site.tileId);

    const orders = workerOrders(scriptedPlayer(moved, N2)).filter(o => o.workerId === ENGINEER_2);
    expect(orders).toEqual([{ kind: 'startConstruction', nationId: N2, workerId: ENGINEER_2, tileId: site.tileId, structure: 'depot' }]);
    const after = resolveTurn(moved, { [N2]: orders });
    expect(after.events.filter(e => e.type === 'order-rejected')).toEqual([]);
    const [x, y] = site.tileId.split('-').map(Number);
    expect(after.state.map.tiles[y][x].constructionJob?.kind).toBe('depot');
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

// The two-islands games of seeds 3 and 4 at turn 25 (M12 review): the depot 20-2 is built and not joined, the rail
// reaches 18-2. The engineer laid 18-2 -> 19-2 and the forester then started a job on 20-2, so the last section (built
// on 20-2) was refused "tile-has-job" on turns 26 and 27 and the depot was joined on turn 28.
const RAIL = ['14-9', '15-8', '15-7', '16-6', '16-5', '17-4', '17-3', '18-2'];
const node = (tileId: string) => {
  const [x, y] = tileId.split('-').map(Number);
  return { x, y };
};
const PATH = ['19-2', '20-2'];
/**
 * Seed 1's start with the rail of `RAIL` up to `railTo` and the depot 20-2 built; every other resource tile of nation 2
 * at level 3, so only the path is left to develop. `railTo` '17-3' leaves 18-2 unrailed: a path of three missing sections.
 */
const blocked = (railTo = '18-2'): GameState => {
  let s = newGame({ seed: 1 });
  for (let i = 1; i <= RAIL.indexOf(railTo); i++) s = addRailroad(s, N2, node(RAIL[i]), node(RAIL[i - 1]));
  s = setTile(addDepot(s, N2, node('20-2')), '20-2', { depot: true });
  const tiles = s.map.tiles.map(row =>
    row.map(t => (t.ownerNationId === N2 && t.resource && !PATH.includes(t.id) ? { ...t, resource: { ...t.resource, level: 3 } } : t))
  );
  return put({ ...s, map: { ...s.map, tiles } }, ENGINEER_2, '20-2');
};
const jobTile = (o: Order): string | undefined => ('toTileId' in o ? o.toTileId : 'tileId' in o ? o.tileId : undefined);

describe('FR-459 no civilian starts a job on a tile the engineer\'s rail still needs', () => {
  it('FR-459 with a built depot not joined, the engineer lays the first section and no other civilian takes the depot\'s tile or its path', () => {
    const s = blocked();
    expect(railPath(s, N2, '20,2', capitalComponent(s, N2))).toEqual(['20,2', '19,2', '18,2']);
    const orders = workerOrders(scriptedPlayer(s, N2));
    expect(orders.filter(o => o.workerId === ENGINEER_2)).toEqual([
      { kind: 'moveAndStartConstruction', nationId: N2, workerId: ENGINEER_2, toTileId: '19-2', structure: 'rail', fromTileId: '18-2' },
    ]);
    expect(orders.filter(o => o.workerId !== ENGINEER_2 && PATH.includes(jobTile(o) ?? ''))).toEqual([]);
  });

  it('FR-459 so the depot is joined on the second turn, with no dead end', () => {
    let s = blocked();
    for (let turn = 1; turn <= 2; turn++) s = resolveTurn(s, { [N2]: scriptedPlayer(s, N2) }, s.seed).state;
    expect({ joined: capitalComponent(s, N2).has('20,2'), deadEnds: railDeadEnds(s, N2) }).toEqual({ joined: true, deadEnds: [] });
  });

  // M12 delta review 2: the two tests above cannot see the path half of the rule (the engineer's own job on 19-2 refuses a
  // developer there anyway); with 18-2 unrailed his job goes on 18-2 and only FR-459 keeps 19-2 free.
  it('FR-459 pendingRailTiles: the depot and both ends of each missing section outside the capital\'s rail', () => {
    expect([...pendingRailTiles(blocked(), N2)].sort()).toEqual(['19-2', '20-2']);
    expect([...pendingRailTiles(blocked('17-3'), N2)].sort()).toEqual(['18-2', '19-2', '20-2']);
  });

  it('FR-459 with three sections missing, the engineer lays the first and no other civilian takes a tile farther along the path', () => {
    const s = blocked('17-3');
    expect(railPath(s, N2, '20,2', capitalComponent(s, N2))).toEqual(['20,2', '19,2', '18,2', '17,3']);
    // The forester could start on 19-2 (timber, level 0): only FR-459 keeps it free
    expect(validateOrder(s, { kind: 'moveAndStartDevelopment', nationId: N2, workerId: FORESTER_2, toTileId: '19-2' }).ok).toBe(true);
    const orders = workerOrders(scriptedPlayer(s, N2));
    expect(orders.filter(o => o.workerId === ENGINEER_2)).toEqual([
      { kind: 'moveAndStartConstruction', nationId: N2, workerId: ENGINEER_2, toTileId: '18-2', structure: 'rail', fromTileId: '17-3' },
    ]);
    expect(orders.filter(o => o.workerId !== ENGINEER_2 && ['18-2', ...PATH].includes(jobTile(o) ?? ''))).toEqual([]);
  });
});

describe('FR-460 training leaves the cash the civilians need', () => {
  // Two-islands seeds 7 and 15 (M12 delta review 2): the economy plans before the civilians, and trainings to expert
  // ($1,000 each) left $116 (seed 7, turn 25: one) and $21 (seed 15, turn 24: three) for the engineer's rail section, which
  // was then refused "insufficient-funds"; the depot 20-2 joined a turn late and the turn-25 checkpoint saw the dead end 19,2.
  /** `blocked()` (5 developers and a depot to join: a reserve of $800) with `cash`, `paper` and no untrained worker. */
  const short = (cash: number, paper = 2): GameState =>
    setIndustry(setWarehouse(setTreasury(blocked(), N2, cash), N2, { paper }), N2, { workers: { untrained: 0, trained: 3, expert: 1 } });
  const training = (s: GameState) => scriptedPlayer(s, N2).filter(o => o.kind === 'trainWorkers');
  const toExpert = (delta: number): Order => ({ kind: 'trainWorkers', nationId: N2, from: 'trained', delta });

  it('FR-460 with $1,116 and a reserve of $800 no worker trains to expert ($1,000), and the engineer lays his section', () => {
    const s = short(1116);
    expect(cashReserve(s, N2)).toBe(800);
    const orders = scriptedPlayer(s, N2);
    expect(orders.filter(o => o.kind === 'trainWorkers')).toEqual([]);
    expect(workerOrders(orders).filter(o => o.workerId === ENGINEER_2)).toEqual([
      { kind: 'moveAndStartConstruction', nationId: N2, workerId: ENGINEER_2, toTileId: '19-2', structure: 'rail', fromTileId: '18-2' },
    ]);
    expect(training(short(1799, 4))).toEqual([]);
  });

  it('FR-460 the cash above the reserve still trains: $1,800 trains one worker, $2,800 two', () => {
    expect(training(short(1800, 4))).toEqual([toExpert(1)]);
    expect(training(short(2800, 4))).toEqual([toExpert(2)]);
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
    // Changed in M4.3 (FR-136): this line asserted that the M4 player's rail breaks the bound (13 links of 11).
    // Those were mostly links nobody built: every pair of neighbouring rail tiles was linked. Its rail is now
    // a tree of the sections it built (10 links), within the bound's slack of 3, yet still more rail than
    // its joined depots need (the bound less the slack).
    expect(linksOf(m4.state)).toBeGreaterThan(railBound(m4.state) - 3);
  });

  it('FR-124 its rail has no dead end at turn 15: every node with one link is a depot or a port (the capital excepted)', () => {
    // A checkpoint invariant, not a per-turn one: while a path is being laid its tip is a dead end for a few
    // turns (seed 1: turns 4, 5, 10 to 12). The frozen M4 player has none at turn 15 either (one line to its
    // depot); that the invariant can fail is shown at the FR-125 checkpoints (tests/engine/scriptedScore.test.ts).
    expect(railDeadEnds(now.state, N2)).toEqual([]);
    expect(railDeadEnds(m4.state, N2)).toEqual([]);
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

  it('FR-124 the numbers (pinned, seed 1, 15 turns): the M4.1 player and the frozen M4 player', () => {
    // Was a console.log with one assertion (FR-TRUTH-15). A moved number is a moved baseline (FR-405): re-record it
    // here with its reason in the journal; never loosen the check.
    // M12 re-record (integration): the pins were measured on a half-built M12 tree (sold 19, score 613; M4 401). With
    // L1's FR-389 final transport plan the scripted players ship what they shipped before M12 (sold 29), and FR-402
    // (work in progress +21) and FR-403 (the M4 player's level-3 tile worth 50 more) move the scores: 616+21 = 637,
    // M4 390+21+40 = 451.
    const row = (r: Run) => ({ depots: network(r.state).depots.length, links: linksOf(r.state), yieldPerTurn: yieldOf(r.state), shipped: r.shipped, sold: r.sold, score: scoreOf(r.state, N2).total });
    expect({ ...row(now), bound: railBound(now.state), refused: now.refused })
      // M12 strategy C re-record (FR-454 to FR-457): links 7 -> 9 (bound 10 -> 11), yield 33 -> 36, sold 29 -> 19 (the
      // start timber and the gathered inputs go into pairs instead of the holds), score 637 -> 747
      // M12 FR-459 re-record: links 9 -> 8, yield 36 -> 35, sold 19 -> 22, score 747 -> 760. On turn 10 the rancher took
      // 16-5, on the 5-section path of the new depot 17-4, so the rail went round it (6 sections, joined on turn 15); now
      // he works 17-5, the depot is joined on turn 14 by 5 sections and the engineer starts the depot 18-2 on turn 15
      // FR-616: Fish changes freight and depot choice. depots 2 -> 3, links 8 -> 5, yieldPerTurn 35 -> 30, shipped 200 -> 205, sold 22 -> 23, score 760 -> 701.
      .toEqual({ depots: 3, links: 5, yieldPerTurn: 30, shipped: 205, sold: 23, score: 701, bound: 11, refused: 0 });
    expect({ ...row(m4), bound: railBound(m4.state), refused: m4.refused })
      // FR-616: the frozen M4 policy collects coastal Fish. Yield 21 -> 22, shipped 181 -> 195, score 451 -> 445.
      .toEqual({ depots: 1, links: 10, yieldPerTurn: 22, shipped: 195, sold: 32, score: 445, bound: 11, refused: 0 });
  });
});
