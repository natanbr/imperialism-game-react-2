// M4 part A: a second Great Power on island 2, driven by the scripted player, on the same world
// market (FR-097 to FR-099, FR-102 to FR-104). Every test here starts from the real newGame(), not
// a fixture.
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { newGame } from '@/engine/newGame';
import { computerOrders, PLAYERS } from '@/engine/ai/players';
import { scriptedPlayer } from '@/engine/ai/scriptedPlayer';
import { applyOrder } from '@/engine/orders/apply';
import { validateOrder } from '@/engine/orders/validate';
import { railTerrainAllowed, workersOf } from '@/engine/orders/queries';
import { getNeighborCoords } from '@/engine/map/mapHelpers';
import { railLinksOf } from '@/engine/systems/railroadSystem';
import { scoreOf, scoreTable } from '@/engine/score/score';
import { resolveTurn, type TurnResult } from '@/engine/turn/resolveTurn';
import { tradeCapacityOf } from '@/engine/market/market';
import { CAPITAL_SITES, foundNation, START_FOUNDINGS } from '@/engine/world/startWorld';
import { twoIslandsMap } from '@/engine/world/twoIslands';
import type { Order } from '@/engine';
import type { GameState } from '@/types/GameState';
import type { Nation } from '@/types/Nation';
import { ResourceType } from '@/types/Resource';
import { TerrainType, type Tile } from '@/types/Tile';
import { WorkerType } from '@/types/Workers';
import { createTwoNationGame } from '@/testing/mockNation';
import { deepFreeze } from './fixtures';

const N1 = 'nation-1';
const N2 = 'nation-2';
const ENGINE_DIR = join(__dirname, '../../src/app/engine');

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? sourceFiles(path) : path.endsWith('.ts') ? [path] : [];
  });
}

const nation = (state: GameState, id: string): Nation => state.nations.find(n => n.id === id)!;
const levelsOf = (state: GameState, id: string) =>
  state.map.tiles.flat().filter(t => t.ownerNationId === id && t.resource && t.resource.discovered !== false).reduce((sum, t) => sum + t.resource!.level, 0);

describe('FR-097 each nation has a palette slot, not a hex colour', () => {
  it('FR-097 a new game gives nation 1 slot 1 and nation 2 slot 2, and no nation carries a colour value', () => {
    const g = newGame({ seed: 1 });
    expect(g.nations.map(n => [n.id, n.colorSlot])).toEqual([[N1, 1], [N2, 2]]);
    for (const n of g.nations) expect(n).not.toHaveProperty('color');
  });

  it('FR-097 no colour literal (#rgb or #rrggbb) remains in src/app/engine', () => {
    const hex = /#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?\b/;
    const offenders = sourceFiles(ENGINE_DIR).filter(file => hex.test(readFileSync(file, 'utf8')));
    expect(offenders).toEqual([]);
  });
});

describe('FR-098 newGame founds two nations with one shared helper', () => {
  const g = newGame({ seed: 7 });

  it('FR-098 nation 1 "Testland" on capital-1 and nation 2 "Valdoria" on capital-2 at CAPITAL_SITES[1]', () => {
    expect(g.nations.map(n => ({ id: n.id, name: n.name, cities: n.cities }))).toEqual([
      { id: N1, name: 'Testland', cities: ['capital-1'] },
      { id: N2, name: 'Valdoria', cities: ['capital-2'] },
    ]);
    const capital2 = g.map.tiles[CAPITAL_SITES[1].y][CAPITAL_SITES[1].x];
    expect(capital2).toMatchObject({ terrain: TerrainType.Capital, cityId: 'capital-2', ownerNationId: N2 });
    expect(g.transportNetwork.railroadNetworks?.[N2]?.capital).toEqual(CAPITAL_SITES[1]);
  });

  it('FR-098 both get the identical start kit: treasury, workers 4/2/1, freight cars, buildings, warehouse', () => {
    const kit = ({ id, name, cities, colorSlot, controller, ...rest }: Nation) => {
      void id; void name; void cities; void colorSlot; void controller;
      return rest;
    };
    expect(kit(nation(g, N2))).toEqual(kit(nation(g, N1)));
    expect(nation(g, N2)).toMatchObject({ treasury: 10000, transportCapacity: 15 });
    expect(nation(g, N2).industry.workers).toEqual({ untrained: 4, trained: 2, expert: 1 });
  });

  it('FR-098 island 2 is a twin of island 1: terrain, levels, owner, capital and the seven civilians', () => {
    const island1 = g.map.tiles.flat().filter(t => t.x < 12 && t.ownerNationId === N1);
    expect(island1).toHaveLength(100);
    const mismatches = island1.filter(t => {
      const twin: Tile = g.map.tiles[t.y][t.x + 12];
      return (
        twin.terrain !== t.terrain ||
        JSON.stringify(twin.resource) !== JSON.stringify(t.resource) ||
        twin.ownerNationId !== N2 ||
        (t.cityId === 'capital-1') !== (twin.cityId === 'capital-2') ||
        JSON.stringify(twin.workers.map(w => [w.type, w.nationId])) !== JSON.stringify(t.workers.map(w => [w.type, N2]))
      );
    });
    expect(mismatches.map(t => t.id)).toEqual([]);
    expect(g.map.tiles.flat().filter(t => t.ownerNationId === N2)).toHaveLength(100);
    expect(workersOf(g, N2)).toHaveLength(7);
  });

  it('FR-098 newGame is foundNation applied to the empty map for each founding, in founding order', () => {
    expect(START_FOUNDINGS.map(f => [f.id, f.capitalId, f.site, f.colorSlot, f.controller])).toEqual([
      [N1, 'capital-1', CAPITAL_SITES[0], 1, 'human'],
      [N2, 'capital-2', CAPITAL_SITES[1], 2, 'scripted'],
    ]);
    const first = foundNation(twoIslandsMap(), START_FOUNDINGS[0]);
    const second = foundNation(first.map, START_FOUNDINGS[1]);
    expect(second.map).toEqual(g.map);
    expect([first.nation, second.nation]).toEqual(g.nations);
  });

  it('FR-098 NR-015 the shared start technologies let nation 2 build rail on hills, swamp and mountains', () => {
    const hills = g.map.tiles.flat().find(t => t.ownerNationId === N2 && t.terrain === TerrainType.BarrenHills)!;
    for (const terrain of [TerrainType.BarrenHills, TerrainType.Swamp, TerrainType.Mountains]) {
      expect({ terrain, allowed: railTerrainAllowed(g, { ...hills, terrain }) }).toEqual({ terrain, allowed: true });
    }
  });

  it('FR-098 on island 2 a civilian of nation 2 can start developing a tile and its engineer can build rail next to the capital', () => {
    const civilians = workersOf(g, N2);
    const engineer = civilians.find(l => l.worker.type === WorkerType.Engineer)!;
    const site = CAPITAL_SITES[1];
    const railSites = getNeighborCoords(g.map, site.x, site.y)
      .map(([x, y]) => g.map.tiles[y][x])
      .filter(t => validateOrder(g, { kind: 'moveAndBuildRail', nationId: N2, workerId: engineer.worker.id, toTileId: t.id }).ok);
    expect(railSites.length).toBeGreaterThan(0);

    const developable = civilians.flatMap(({ worker }) =>
      g.map.tiles.flat()
        .filter(t => t.ownerNationId === N2)
        .filter(t => validateOrder(g, { kind: 'moveAndStartDevelopment', nationId: N2, workerId: worker.id, toTileId: t.id }).ok)
    );
    expect(developable.length).toBeGreaterThan(0);
  });
});

describe('FR-099 the controller decides who gives a nation its orders', () => {
  it('FR-099 a new game: nation 1 is human, nation 2 scripted; the registry maps scripted to scriptedPlayer', () => {
    const g = newGame({ seed: 1 });
    expect(g.nations.map(n => [n.id, n.controller])).toEqual([[N1, 'human'], [N2, 'scripted']]);
    expect(PLAYERS.scripted).toBe(scriptedPlayer);
  });

  it('FR-099 computerOrders returns the scripted player\'s orders for nation 2 only, and never touches its input', () => {
    const g = deepFreeze(newGame({ seed: 1 }));
    const orders = computerOrders(g);
    expect(Object.keys(orders)).toEqual([N2]);
    expect(orders[N2]).toEqual(scriptedPlayer(g, N2));
    expect(orders[N2].length).toBeGreaterThan(0);
  });

  it('FR-099 human nations give no computer orders; scripted ones come in state order', () => {
    const fixture = createTwoNationGame(1);
    expect(fixture.nations.map(n => n.controller)).toEqual(['human', 'human']);
    expect(computerOrders(fixture)).toEqual({});

    const both: GameState = { ...fixture, nations: fixture.nations.map(n => ({ ...n, controller: 'scripted' as const })) };
    expect(Object.keys(computerOrders(both))).toEqual([N1, N2]);
  });
});

/** Ten turns of the real new game: nation 1 idle (human, no orders), nation 2 on the scripted player. */
function tenTurns(seed: number): { start: GameState; turns: TurnResult[] } {
  const start = newGame({ seed });
  const turns: TurnResult[] = [];
  let s = start;
  for (let i = 0; i < 10; i++) {
    const result = resolveTurn(s, computerOrders(s), s.seed);
    turns.push(result);
    s = result.state;
  }
  return { start, turns };
}

describe('FR-102 nation 2 grows under the scripted player', () => {
  const { start, turns } = tenTurns(1);
  const end = turns.at(-1)!.state;

  it('FR-102 after 10 turns nation 2 has more resource levels, a rail link of its own and a higher score than at the start', () => {
    expect(levelsOf(end, N2)).toBeGreaterThan(levelsOf(start, N2));
    expect(railLinksOf(start).filter(l => l.nationId === N2)).toEqual([]);
    expect(railLinksOf(end).filter(l => l.nationId === N2).length).toBeGreaterThanOrEqual(1);
    expect(scoreOf(end, N2).total).toBeGreaterThan(scoreOf(start, N2).total);
  });

  it('FR-102 no order of nation 2 is refused in the 10 turns, and nation 1 gave none', () => {
    const refused = turns.flatMap(t => t.events).filter(e => e.type === 'order-rejected');
    expect(refused).toEqual([]);
    expect(end.turn).toBe(11);
  });

  it('FR-102 the same seed gives a deep-equal game', () => {
    expect(tenTurns(1).turns.at(-1)!.state).toEqual(end);
  });
});

describe('FR-103 both nations trade on one world market', () => {
  const g = newGame({ seed: 3 });
  const sell = (nationId: string, amount: number): Order => ({ kind: 'sellCommodity', nationId, commodity: ResourceType.Timber, amount });
  const after = (orders: Record<string, Order[]>) => resolveTurn(g, orders, g.seed);

  it('FR-103 two nations selling 2 timber each move the price as one nation selling 4, and both are paid the turn\'s price', () => {
    const both = after({ [N1]: [sell(N1, 2)], [N2]: [sell(N2, 2)] });
    const one = after({ [N1]: [sell(N1, 4)] });
    const none = after({});

    expect(both.state.market!.prices.timber).toBe(one.state.market!.prices.timber);
    expect(both.state.market!.prices.timber).toBeLessThan(none.state.market!.prices.timber);
    const sold = both.events.filter(e => e.type === 'goods-sold');
    expect(sold.map(e => e.type === 'goods-sold' && [e.nationId, e.amount, e.price])).toEqual([
      [N1, 2, g.market!.prices.timber],
      [N2, 2, g.market!.prices.timber],
    ]);
  });

  it('FR-103 the 4-hold limit is per nation: nation 1 at 4 holds is refused a fifth unit, nation 2 may still trade 4', () => {
    const full = applyOrder(g, sell(N1, 4));
    expect(tradeCapacityOf(full, N1)).toEqual({ holds: 4, used: 4, free: 0 });
    expect(validateOrder(full, sell(N1, 5))).toEqual({ ok: false, reason: 'limit-reached' });
    expect(tradeCapacityOf(full, N2)).toEqual({ holds: 4, used: 0, free: 4 });
    expect(validateOrder(full, sell(N2, 4))).toEqual({ ok: true });
    expect(validateOrder(full, { kind: 'buyCommodity', nationId: N2, commodity: ResourceType.Coal, amount: 4 })).toEqual({ ok: true });
  });
});

describe('FR-104 the score and the game over list both nations', () => {
  it('FR-104 scoreTable of a new game lists nation 1 and nation 2 with equal start scores', () => {
    const table = scoreTable(newGame({ seed: 1 }));
    expect(table.map(s => s.nationId)).toEqual([N1, N2]);
    expect(table[0].total).toBe(table[1].total);
  });

  it('FR-104 FR-068 after the last turn the game-over record holds a score for each nation', () => {
    let s = newGame({ seed: 1, turnLimit: 2 });
    for (let i = 0; i < 2; i++) s = resolveTurn(s, computerOrders(s), s.seed).state;
    expect(s.gameOver).toBeDefined();
    expect(s.gameOver!.scores.map(score => score.nationId).sort()).toEqual([N1, N2]);
    expect(s.gameOver!.scores).toEqual(scoreTable(s));
  });
});
