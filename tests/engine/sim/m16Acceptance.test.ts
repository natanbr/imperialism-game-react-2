import { afterAll, expect, it } from 'vitest';
import { technologyById } from '@/definisions/technologies';
import { cashReserve, researchReserve } from '@/engine/ai/economy';
import { computerOrders } from '@/engine/ai/players';
import { upkeepReserve } from '@/engine/ai/scriptedArmy';
import { scriptedOrdersWithoutResearch } from '@/engine/ai/scriptedPlayer';
import { newGame } from '@/engine/newGame';
import { tryApplyOrder } from '@/engine/orders/apply';
import { collectingHub } from '@/engine/systems/logisticsSystem';
import { applyTurnOrders, resolveTurn } from '@/engine/turn/resolveTurn';
import type { GameState } from '@/types/GameState';
import { ResourceType } from '@/types/Resource';
import { TerrainType } from '@/types/Tile';
import { WorkerType } from '@/types/Workers';
import { emptyWarehouse, setIndustry, setTile, setTreasury, setWarehouse } from '../fixtures';
import { COMPUTER_ID as id } from './humans';
import { actualUse, K, nationOf, replayAffordableTechnologies, type Need, type Use } from './technologyReplay';

type Transaction = { turn: number; tech: string; cashBefore: number; cashAfter: number; floor: number; researchFloor: number };

function observeGame(start: GameState, through = 40) {
  const needs: Need[] = [];
  const buys: Transaction[] = [];
  const uses: Use[] = [];
  const errors: string[] = [];
  const checkpoints = new Map<number, string[]>();
  let forks = 0;
  let state = start;
  let lastTurn = start.turn - 1;
  while (!state.gameOver && state.turn <= through) {
    const turn = state.turn;
    const orders = computerOrders(state);
    // Probe every choice at the same decision point, including the one the actual buyer chose.
    const committed = applyTurnOrders(state, { [id]: orders[id].filter(o => o.kind !== 'buyTechnology') }, () => {}).state;
    const replay = replayAffordableTechnologies(committed);
    needs.push(...replay.needs);
    forks += replay.forks;

    const bought: string[] = [];
    let filed = state;
    for (const order of orders[id]) {
      const tried = tryApplyOrder(filed, order);
      if (!tried.result.ok) {
        errors.push(`T${turn} ${order.kind} rejected: ${tried.result.reason}`);
        continue;
      }
      if (order.kind === 'buyTechnology') {
        const tech = order.techId;
        const cashBefore = nationOf(filed).treasury;
        const cashAfter = nationOf(tried.state).treasury;
        const floor = Math.max(cashReserve(filed, id), upkeepReserve(filed, id));
        const researchFloor = researchReserve(filed, id);
        buys.push({ turn, tech, cashBefore, cashAfter, floor, researchFloor });
        bought.push(tech);
        if (bought.length > 1) errors.push(`T${turn} more than one purchase`);
        if (!replay.needs.some(n => n.tech === tech)) errors.push(`T${turn} ${tech} has no affordable replayed use`);
        if (cashBefore - cashAfter !== technologyById(tech)?.cost || cashAfter < floor || cashAfter < researchFloor) {
          errors.push(`T${turn} ${tech} payment or reserve`);
        }
        if (!nationOf(tried.state).pendingTechnologies?.includes(tech)) errors.push(`T${turn} ${tech} was not queued`);
      } else {
        for (const tech of nationOf(filed).technologies ?? []) {
          const use = actualUse(filed, order, tech);
          if (use) uses.push(use);
        }
      }
      filed = tried.state;
    }

    const next = resolveTurn(state, orders).state;
    const owned = [...(nationOf(next).technologies ?? [])];
    const added = owned.filter(tech => !nationOf(state).technologies?.includes(tech));
    if (added.length !== bought.length || added.some(tech => !bought.includes(tech))) errors.push(`T${turn} ownership differs from purchases`);
    checkpoints.set(turn, owned);
    lastTurn = turn;
    state = next;
  }

  // Each invention keeps its own deadline, even when two independent forks need different
  // inventions on the same turn. One real purchase can satisfy repeated notices of that need.
  for (const need of needs) {
    if (!buys.some(b => b.tech === need.tech && b.turn >= need.turn && b.turn < need.turn + K)) {
      errors.push(`T${need.turn} missed ${need.tech} (forced buy used for ${need.use.action} T${need.use.turn})`);
    }
  }
  for (const buy of buys) {
    if (!uses.some(u => u.tech === buy.tech && u.turn > buy.turn && u.turn <= buy.turn + K)) {
      errors.push(`T${buy.turn} ${buy.tech} had no accepted use within ${K} turns`);
    }
  }
  return { seed: start.seed, lastTurn, owned20: checkpoints.get(20), owned40: checkpoints.get(40), forks, needs, buys,
    uses: uses.filter(u => buys.some(b => b.tech === u.tech)), errors };
}

const games: ReturnType<typeof observeGame>[] = [];
for (let seed = 1; seed <= 24; seed++) {
  it(`FR-547 every affordable unlock used in a three-turn replay is bought in idle game ${seed}`, () => {
    const game = observeGame(newGame({ seed, world: 'continent' }));
    games.push(game);
    console.info(JSON.stringify(game));
    if (seed === 1) {
      expect(game.needs).toContainEqual({ turn: 3, tech: 'streamlinedHulls',
        use: { turn: 6, tech: 'streamlinedHulls', action: 'clipper' } });
    }
    expect(game.errors).toEqual([]);
  });
}

afterAll(() => {
  if (!games.length) return;
  const forks = games.reduce((sum, game) => sum + game.forks, 0);
  const observed = games.reduce((sum, game) => sum + game.needs.length, 0);
  console.info(`FR-547 ${games.filter(g => !g.errors.length).length}/${games.length} idle games met every need (${observed} need observations, ${forks} affordable purchases replayed)`);
  for (const key of ['owned20', 'owned40'] as const) {
    const counts = games.flatMap(g => g[key] ? [g[key].length] : []).sort((a, b) => a - b);
    const holdings = new Map<string, number>();
    for (const game of games) {
      const owned = game[key];
      if (!owned) continue;
      const names = owned.map(tech => technologyById(tech)!.name).sort().join(', ');
      holdings.set(names, (holdings.get(names) ?? 0) + 1);
    }
    for (const [names, count] of holdings) console.info(`${key}: ${count} games owned ${names}`);
    const mid = counts.length / 2;
    console.info(`${key}: ${counts.length}/${games.length} reached; min/median/max ${counts.length
      ? [counts[0], (counts[Math.ceil(mid) - 1] + counts[Math.floor(mid)]) / 2, counts.at(-1)].join('/') : 'unplayed'}`);
  }
});

function controlledFleet(): GameState {
  let base = newGame({ seed: 1, world: 'continent' });
  while (base.turn < 7) {
    const orders = scriptedOrdersWithoutResearch(base, id);
    base = resolveTurn(base, { [id]: orders }).state;
  }
  const stocked = setTreasury(emptyWarehouse(base, id, { lumber: 6, fabric: 2 }), id, 50000);
  const tiles = stocked.map.tiles.map(row => row.map(tile => tile.resource?.type === ResourceType.Timber
    ? { ...tile, resource: undefined } : tile));
  return { ...stocked, map: { ...stocked.map, tiles }, nations: stocked.nations.map(n => n.id === id ? { ...n,
    merchantMarine: { ...n.merchantMarine, lastShipOrderTurn: undefined, tradeHistory: Array.from({ length: 3 }, () => ({ used: 4, holds: 4 })) },
  } : n) };
}

it('FR-547 the same observer sees an affordable need, payment, and a launch in a controlled continent game', () => {
  const game = observeGame(controlledFleet(), 7 + K);
  console.info('Controlled fleet', JSON.stringify(game));
  const tech = 'streamlinedHulls';
  expect(game.needs).toContainEqual({ turn: 7, tech, use: { turn: 8, tech, action: 'clipper' } });
  expect(game.buys).toContainEqual(expect.objectContaining({ turn: 7, tech }));
  expect(game.uses).toContainEqual({ turn: 8, tech, action: 'clipper' });
  expect(game.errors).toEqual([]);
});

it('FR-547 the oracle records simultaneous affordable unlocks and checks both purchase deadlines', () => {
  let start = controlledFleet();
  const pasture = start.map.tiles.flat().find(tile => tile.ownerNationId === id && !tile.cityId && collectingHub(start, id, tile.id))!;
  start = setTile(start, pasture.id, { terrain: TerrainType.OpenRange, resource: { type: ResourceType.Livestock, level: 0 } });
  start = setIndustry(setWarehouse(start, id, { paper: 8, cannedFood: 100 }), id, { workers: { untrained: 0, trained: 0, expert: 8 } });
  start = { ...start, map: { ...start.map, tiles: start.map.tiles.map(row => row.map(tile => ({ ...tile,
    workers: tile.workers.filter(w => w.nationId !== id || w.type !== WorkerType.Rancher),
  }))) } };
  const game = observeGame(start, 7 + K + 1);
  expect(game.needs.filter(n => n.turn === 7).map(n => n.tech).sort()).toEqual(['feedGrasses', 'streamlinedHulls']);
  expect(game.errors).toEqual([]);
});

it.each([
  { reason: 'a guaranteed fourth trade phase', lastShipOrderTurn: undefined, history: [4, 4, 0, 4], lumber: 6, fabric: 2 },
  { reason: 'an expiring ship cooldown', lastShipOrderTurn: 36, history: [4, 4, 4, 4], lumber: 8, fabric: 4 },
])('FR-547 $reason makes a final-turn Clipper usable', ({ lastShipOrderTurn, history, lumber, fabric }) => {
  const start = newGame({ seed: 1, world: 'continent', market: 'world' });
  const stocked = setTreasury(emptyWarehouse(start, id, { lumber, fabric, clothing: 4, furniture: 4 }), id, 50000);
  const turn39: GameState = { ...stocked, turn: 39, nations: stocked.nations.map(n => n.id === id ? { ...n,
    merchantMarine: { ...n.merchantMarine, lastShipOrderTurn, tradeHistory: history.map(used => ({ used, holds: 4 })) },
  } : n) };
  const orders = computerOrders(turn39);
  const committed = orders[id].filter(order => order.kind !== 'buyTechnology');
  const demand = applyTurnOrders(turn39, { [id]: committed }, () => {}).state;
  expect(replayAffordableTechnologies(demand).needs.map(n => n.tech)).toContain('streamlinedHulls');
  const turn40 = resolveTurn(turn39, orders).state;
  expect(nationOf(turn40).merchantMarine.tradeHistory?.map(p => p.used)).toEqual([...history.slice(-3), 4]);
  expect(nationOf(turn40).warehouse).toMatchObject({ lumber: 6, fabric: 2 });
  expect(nationOf(turn40).technologies).toContain('streamlinedHulls');
  const final = resolveTurn(turn40, computerOrders(turn40)).state;
  expect(nationOf(final).merchantMarine.ships?.clipper).toBe(1);
});
