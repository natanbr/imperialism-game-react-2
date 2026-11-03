// Shared helpers for the engine tests. Not a test file (vitest only runs *.test.ts).
import { createTwoNationGame } from '@/testing/mockNation';
import { GameState } from '@/types/GameState';
import { BuildingType, IndustryBuilding, IndustryState } from '@/types/Industry';
import { Nation } from '@/types/Nation';
import { Tile } from '@/types/Tile';
import { Worker, WorkerStatus, WorkerType } from '@/types/Workers';
import { createTileId, parseTileIdToArray } from '@/utils/tileIdUtils';

export const N1 = 'nation-1';
export const N2 = 'nation-2';

// Fixture layout (see createTwoNationGame): nation-1 capital at (1,1), nation-2 capital at (6,1).
export const T = {
  capital1: createTileId(1, 1),
  capital2: createTileId(6, 1),
  farm1: createTileId(2, 1), // Farm, grain level 0, adjacent to capital1
  range1: createTileId(1, 0), // OpenRange, livestock level 0, adjacent to capital1
  mountains1: createTileId(0, 1), // Mountains, hidden mineral, adjacent to capital1
  orchard1: createTileId(3, 1), // Orchard, not adjacent to capital1
  homeOrchard1: createTileId(1, 2), // Orchard, fruit level 1, adjacent to capital1 (2 fruit a turn)
  dryPlains1: createTileId(2, 2), // DryPlains, grain level 1, inland, adjacent to capital1
  coastFarm1: createTileId(1, 4), // Farm next to the water row: a port site
  town1: createTileId(3, 2),
  water: createTileId(1, 5),
  farm2: createTileId(5, 1), // nation-2 Farm
} as const;

export const game = (seed = 1): GameState => createTwoNationGame(seed);

export const workerId = (nationId: string, type: WorkerType) => `${nationId}-${type}`;

export function tileAt(state: GameState, tileId: string): Tile {
  const [x, y] = parseTileIdToArray(tileId);
  return state.map.tiles[y][x];
}

export function locate(state: GameState, id: string): { worker: Worker; tile: Tile } | undefined {
  for (const tile of state.map.tiles.flat()) {
    const worker = tile.workers.find(w => w.id === id);
    if (worker) return { worker, tile };
  }
  return undefined;
}

export const treasury = (state: GameState, nationId: string) => state.nations.find(n => n.id === nationId)!.treasury;

export function setTile(state: GameState, tileId: string, patch: Partial<Tile>): GameState {
  const [x, y] = parseTileIdToArray(tileId);
  return {
    ...state,
    map: {
      ...state.map,
      tiles: state.map.tiles.map((row, ry) => row.map((t, rx) => (rx === x && ry === y ? { ...t, ...patch } : t))),
    },
  };
}

export function setTreasury(state: GameState, nationId: string, amount: number): GameState {
  return { ...state, nations: state.nations.map(n => (n.id === nationId ? { ...n, treasury: amount } : n)) };
}

export function setWarehouse(state: GameState, nationId: string, patch: Record<string, number>): GameState {
  return {
    ...state,
    nations: state.nations.map(n => (n.id === nationId ? { ...n, warehouse: { ...n.warehouse, ...patch } } : n)),
  };
}

/** Every warehouse stock set to 0, then the patch. */
export function emptyWarehouse(state: GameState, nationId: string, patch: Record<string, number> = {}): GameState {
  const nation = state.nations.find(n => n.id === nationId)!;
  const zero = Object.fromEntries(Object.keys(nation.warehouse).map(k => [k, 0]));
  return setWarehouse(state, nationId, { ...zero, ...patch });
}

export const nationOf = (state: GameState, nationId: string): Nation => state.nations.find(n => n.id === nationId)!;
export const industryOf = (state: GameState, nationId: string): IndustryState => nationOf(state, nationId).industry;
export const stockOf = (state: GameState, nationId: string, key: string): number =>
  (nationOf(state, nationId).warehouse as Record<string, number>)[key] ?? 0;

/** Test setup: replaces parts of a nation's industry (workers, sick, training, recruits). */
export function setIndustry(state: GameState, nationId: string, patch: Partial<IndustryState>): GameState {
  return {
    ...state,
    nations: state.nations.map(n => (n.id === nationId ? { ...n, industry: { ...n.industry, ...patch } } : n)),
  };
}

/** Test setup: replaces a building's state (capacity, pendingCapacity, orders). */
export function setBuilding(state: GameState, nationId: string, building: BuildingType, patch: Partial<IndustryBuilding>): GameState {
  const industry = industryOf(state, nationId);
  const current: IndustryBuilding = industry.buildings[building] ?? { capacity: 0, pendingCapacity: 0, orders: {} };
  return setIndustry(state, nationId, { buildings: { ...industry.buildings, [building]: { ...current, ...patch } } });
}

/** Test setup only: teleports a worker onto a tile as available and unmoved, with optional changes. */
export function put(state: GameState, id: string, tileId: string, patch: Partial<Worker> = {}): GameState {
  const found = locate(state, id);
  if (!found) throw new Error(`no worker ${id}`);
  const [x, y] = parseTileIdToArray(tileId);
  const worker: Worker = {
    ...found.worker,
    assignedTileId: tileId,
    status: WorkerStatus.Available,
    justMoved: false,
    previousTileId: undefined,
    ...patch,
  };
  return {
    ...state,
    map: {
      ...state.map,
      tiles: state.map.tiles.map((row, ry) =>
        row.map((t, rx) => {
          const without = t.workers.filter(w => w.id !== id);
          if (rx === x && ry === y) return { ...t, workers: [...without, worker] };
          return without.length === t.workers.length ? t : { ...t, workers: without };
        })
      ),
    },
  };
}

export function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const key of Object.keys(value as object)) {
      deepFreeze((value as Record<string, unknown>)[key]);
    }
  }
  return value;
}

/**
 * Game invariants checked after every headless turn: no worker on two tiles, no negative
 * treasury, every job's worker is on that tile and working, every working worker has a job.
 */
export function invariantViolations(state: GameState): string[] {
  const problems: string[] = [];
  const seen = new Map<string, string>();
  for (const tile of state.map.tiles.flat()) {
    for (const w of tile.workers) {
      const other = seen.get(w.id);
      if (other) problems.push(`worker ${w.id} on ${other} and ${tile.id}`);
      seen.set(w.id, tile.id);
    }
    const jobs: { name: string; workerId: string }[] = [];
    if (tile.prospecting) jobs.push({ name: 'prospecting', workerId: tile.prospecting.workerId });
    if (tile.developmentJob) jobs.push({ name: 'development', workerId: tile.developmentJob.workerId });
    if (tile.constructionJob) jobs.push({ name: 'construction', workerId: tile.constructionJob.workerId });
    for (const job of jobs) {
      const w = tile.workers.find(x => x.id === job.workerId);
      if (!w) problems.push(`orphaned ${job.name} job on ${tile.id}: worker ${job.workerId} is not there`);
      else if (w.status !== WorkerStatus.Working) problems.push(`${job.name} job on ${tile.id}: worker ${w.id} is ${w.status}`);
    }
    for (const w of tile.workers) {
      if (w.status === WorkerStatus.Working && !jobs.some(j => j.workerId === w.id)) {
        problems.push(`worker ${w.id} on ${tile.id} is working without a job`);
      }
    }
  }
  for (const n of state.nations) {
    if (!(n.treasury >= 0)) problems.push(`nation ${n.id} treasury ${n.treasury}`);
    problems.push(...economyViolations(n));
  }
  return problems;
}

/**
 * FR-045: no warehouse stock and no worker count is negative; sick workers and trainees are
 * workers that exist; capacities and standing orders are non-negative numbers.
 */
export function economyViolations(n: Nation): string[] {
  const problems: string[] = [];
  const bad = (v: unknown) => typeof v !== 'number' || !Number.isFinite(v) || v < 0;
  for (const [key, amount] of Object.entries(n.warehouse)) {
    if (bad(amount)) problems.push(`nation ${n.id} warehouse ${key} ${amount}`);
  }
  const { workers, sick, training, recruits, buildings } = n.industry;
  for (const grade of ['untrained', 'trained', 'expert'] as const) {
    if (bad(workers[grade])) problems.push(`nation ${n.id} ${grade} workers ${workers[grade]}`);
    if (bad(sick[grade]) || sick[grade] + training[grade] > workers[grade]) {
      problems.push(`nation ${n.id} ${grade}: ${sick[grade]} sick and ${training[grade]} in training of ${workers[grade]}`);
    }
    if (bad(training[grade])) problems.push(`nation ${n.id} ${grade} training ${training[grade]}`);
  }
  if (bad(recruits)) problems.push(`nation ${n.id} recruits ${recruits}`);
  for (const [name, b] of Object.entries(buildings)) {
    if (!b) continue;
    if (bad(b.capacity) || bad(b.pendingCapacity)) problems.push(`nation ${n.id} ${name} capacity ${b.capacity}+${b.pendingCapacity}`);
    for (const [output, amount] of Object.entries(b.orders)) {
      if (bad(amount)) problems.push(`nation ${n.id} ${name} order ${output} ${amount}`);
    }
  }
  return problems;
}
