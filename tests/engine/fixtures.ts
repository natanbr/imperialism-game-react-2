// Shared helpers for the engine tests. Not a test file (vitest only runs *.test.ts).
import { createTwoNationGame } from '@/testing/mockNation';
import { hasOpenCredit } from '@/engine/credit/account';
import type { GameEvent } from '@/engine/turn/context';
import { pairKey } from '@/engine/diplomacy/relations';
import type { PairDiplomacy } from '@/types/Diplomacy';
import { GameState } from '@/types/GameState';
import { BuildingType, IndustryBuilding, IndustryState } from '@/types/Industry';
import { Nation } from '@/types/Nation';
import { Tile } from '@/types/Tile';
import { Worker, WorkerStatus, WorkerType } from '@/types/Workers';
import type { BuyLandIntent } from '@/types/Intent';
import { DEVELOPMENT_WORKER_TYPES } from '@/engine/orders/queries';
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

/** Test setup: replaces fields of the diplomacy entry of the pair (a, b) (FR-151). */
export function setPair(state: GameState, a: string, b: string, patch: Partial<PairDiplomacy>): GameState {
  const key = pairKey(a, b);
  return { ...state, diplomacy: { ...state.diplomacy, [key]: { ...state.diplomacy[key], ...patch } } };
}

export function setTreasury(state: GameState, nationId: string, amount: number): GameState {
  return { ...state, nations: state.nations.map(n => (n.id === nationId ? { ...n, treasury: amount } : n)) };
}

/** This turn's meal can use warehouse stock but receives no freight. */
export function withoutFreight(state: GameState, nationId: string): GameState {
  return { ...state, nations: state.nations.map(n => n.id === nationId ? { ...n, transportCapacity: 0 } : n) };
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
export function setTechnologies(state: GameState, nationId: string, ...technologies: string[]): GameState {
  return { ...state, nations: state.nations.map(n => n.id === nationId ? { ...n, technologies } : n) };
}
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

/** FR-632: this turn's land purchase of the Developer on the tile, the job a buying Developer works at. */
const buysLand = (state: GameState, workerId: string, tileId: string): boolean =>
  state.intents.some(i => i.kind === 'buy-land' && (i as BuyLandIntent).workerId === workerId && (i as BuyLandIntent).tileId === tileId);

/**
 * No worker on two tiles, finite cash within the credit limit plus any unpaid excess
 * recorded at the last settlement (zero borrowing for cash-only nations), and a working
 * worker on the tile for each job and a job for each working worker (a Developer's job is its
 * land purchase, FR-632). The M18j holdings hold (`overseasViolations`).
 */
export function invariantViolations(state: GameState, lastTurnEvents: readonly GameEvent[] = []): string[] {
  const problems: string[] = [...overseasViolations(state)];
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
      if (w.status === WorkerStatus.Working && !jobs.some(j => j.workerId === w.id) && !(w.type === WorkerType.Developer && buysLand(state, w.id, tile.id))) {
        problems.push(`worker ${w.id} on ${tile.id} is working without a job`);
      }
    }
  }
  for (const n of state.nations) {
    const settlement = lastTurnEvents.find(event => event.type === 'credit-settled' && event.nationId === n.id);
    const unpaidExcess = settlement?.type === 'credit-settled' ? Math.max(0, settlement.closingDebt - settlement.limit) : 0;
    const minimumCash = hasOpenCredit(n) ? -(n.creditAccount.limit + unpaidExcess) : 0;
    if (!Number.isFinite(n.treasury) || n.treasury < minimumCash) problems.push(`nation ${n.id} treasury ${n.treasury}`);
    problems.push(...economyViolations(n));
  }
  return problems;
}

/**
 * M18j (FR-631, FR-634): every holding lies on its Minor Nation's land and is held by a Great Power; a nation has at most
 * one Developer; on Minor Nation land stand only Developers and the holder's improvers on its own held tiles; and no
 * other nation works a held tile.
 */
export function overseasViolations(state: GameState): string[] {
  const problems: string[] = [];
  const greatPowers = new Set(state.nations.map(n => n.id));
  const minors = new Set(state.minorNations.map(m => m.id));
  const provinceOwner = new Map(state.provinces.map(p => [p.id, p.ownerId]));
  const minorOf = (tile: Tile): string | undefined => {
    const owner = tile.provinceId === undefined ? undefined : provinceOwner.get(tile.provinceId);
    return tile.ownerNationId === undefined && owner !== undefined && minors.has(owner) ? owner : undefined;
  };
  const tiles = new Map(state.map.tiles.flat().map(t => [t.id, t]));
  const holdings = state.overseasLand ?? {};
  for (const [tileId, holding] of Object.entries(holdings)) {
    const tile = tiles.get(tileId);
    if (holding.tileId !== tileId || !greatPowers.has(holding.holderId) || !tile || minorOf(tile) !== holding.minorId) {
      problems.push(`holding ${tileId} of ${holding.holderId} is not on ${holding.minorId}'s land`);
    }
  }
  const developers = new Map<string, number>();
  for (const tile of tiles.values()) {
    const holder = holdings[tile.id]?.holderId;
    const minor = minorOf(tile);
    for (const w of tile.workers) {
      if (w.type === WorkerType.Developer) developers.set(w.nationId, (developers.get(w.nationId) ?? 0) + 1);
      else if (minor !== undefined && !(w.nationId === holder && DEVELOPMENT_WORKER_TYPES.includes(w.type))) {
        problems.push(`${w.type} ${w.id} of ${w.nationId} stands on minor land ${tile.id}`);
      }
    }
    if (holder === undefined) continue;
    const jobWorkers = [tile.prospecting?.workerId, tile.developmentJob?.workerId, tile.constructionJob?.workerId];
    const working = new Set([...jobWorkers.filter((id): id is string => id !== undefined), ...tile.workers.filter(w => w.status === WorkerStatus.Working).map(w => w.id)]);
    for (const id of working) {
      const nationId = tile.workers.find(w => w.id === id)?.nationId;
      if (nationId !== holder) problems.push(`${id} of ${nationId} works ${tile.id}, held by ${holder}`);
    }
  }
  for (const [nationId, count] of developers) if (count > 1) problems.push(`nation ${nationId} has ${count} Developers`);
  return problems;
}

/** JSON with object keys sorted and undefined fields dropped, so two deep-equal values give the same text. */
const canonical = (value: unknown): string =>
  JSON.stringify(value, (_key, v: unknown) =>
    v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b))) : v
  );

/**
 * FR-157 (M5 review E3): the M5 world stays consistent while a game runs. Every land tile's
 * `provinceId` names a province that lists it and every listed tile names its province back; a tile's
 * `ownerNationId` is its province's owner when that is a Great Power and absent when it is a minor;
 * land changes hands only by conquest (M9, FR-222 to FR-224): the minor nations are as at `start` but for
 * `colonyOf`, which names a Great Power holding the minor's capital province; the provinces are as at `start`
 * but for `ownerId`, and a province whose owner changed is a Great Power's; every tile of a province its start
 * minor still holds is as at `start`; the diplomacy entries are the same pairs; and no intent is left after a
 * resolved turn (FR-152).
 */
export function worldViolations(state: GameState, start: GameState): string[] {
  const problems: string[] = [];
  const provinces = new Map(state.provinces.map(p => [p.id, p]));
  const greatPowers = new Set(state.nations.map(n => n.id));
  const tiles = state.map.tiles.flat();
  for (const tile of tiles) {
    if (tile.provinceId === undefined) continue;
    const province = provinces.get(tile.provinceId);
    if (!province) problems.push(`tile ${tile.id} names unknown province ${tile.provinceId}`);
    else if (!province.tileIds.includes(tile.id)) problems.push(`tile ${tile.id} names ${province.id}, which does not list it`);
    else {
      const owner = greatPowers.has(province.ownerId) ? province.ownerId : undefined;
      if (tile.ownerNationId !== owner) problems.push(`tile ${tile.id} owner ${tile.ownerNationId}, province ${province.id} owner ${province.ownerId}`);
    }
  }
  const byId = new Map(tiles.map(t => [t.id, t]));
  for (const p of state.provinces) {
    for (const id of p.tileIds) {
      if (byId.get(id)?.provinceId !== p.id) problems.push(`province ${p.id} lists ${id}, which names ${byId.get(id)?.provinceId}`);
    }
  }
  // M9 conquest: colonyOf and the province owners may change, nothing else of them
  const withoutColony = (s: GameState) => s.minorNations.map(m => ({ ...m, colonyOf: undefined }));
  if (canonical(withoutColony(state)) !== canonical(withoutColony(start))) problems.push('minorNations changed');
  for (const m of state.minorNations) {
    if (m.colonyOf === undefined) continue;
    const capital = state.provinces.find(p => p.tileIds.includes(m.capitalTileId));
    if (!greatPowers.has(m.colonyOf) || capital?.ownerId !== m.colonyOf) problems.push(`minor ${m.id} colony of ${m.colonyOf}, its capital province held by ${capital?.ownerId}`);
  }
  const withoutOwner = (s: GameState) => s.provinces.map(p => ({ ...p, ownerId: undefined }));
  if (canonical(withoutOwner(state)) !== canonical(withoutOwner(start))) problems.push('provinces changed');
  for (const p of state.provinces) {
    const before = start.provinces.find(q => q.id === p.id);
    if (before && before.ownerId !== p.ownerId && !greatPowers.has(p.ownerId)) problems.push(`province ${p.id} passed to ${p.ownerId}, not a Great Power`);
  }
  const stillMinor = new Set(start.provinces.filter(p => !greatPowers.has(p.ownerId) && provinces.get(p.id)?.ownerId === p.ownerId).map(p => p.id));
  // M18j (FR-631, FR-634): Developers and the holder's improvers may stand on minor land, and a held tile's level and
  // development job are its holder's (`overseasViolations` checks who); nothing else of a minor tile changes
  const minorFacts = (tile: Tile | undefined) => {
    if (!tile) return tile;
    const facts: Partial<Tile> = { ...tile, workers: [] };
    if (state.overseasLand?.[tile.id]) {
      delete facts.developmentJob;
      if (facts.resource) facts.resource = { ...facts.resource, level: 0 };
    }
    return facts;
  };
  for (const before of start.map.tiles.flat().filter(t => t.provinceId && stillMinor.has(t.provinceId))) {
    if (canonical(minorFacts(byId.get(before.id))) !== canonical(minorFacts(before))) problems.push(`minor tile ${before.id} changed`);
  }
  const pairs = (s: GameState) => Object.keys(s.diplomacy).sort().join(',');
  if (pairs(state) !== pairs(start)) problems.push(`diplomacy pairs ${pairs(state)}, at the start ${pairs(start)}`);
  if (state.intents.length > 0) problems.push(`${state.intents.length} intents left after the turn`);
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
