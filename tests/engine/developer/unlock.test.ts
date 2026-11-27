// M18j T-01: the Developer is a diplomatic reward (FR-629) and no longer a generic improver (FR-630).
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { newGame, type NewGameOptions } from '@/engine/newGame';
import { universityCapital } from '@/engine/orders/civilianOrders';
import { DEVELOPMENT_WORKER_TYPES } from '@/engine/orders/queries';
import { validateOrder } from '@/engine/orders/validate';
import { resolveTurn } from '@/engine/turn/resolveTurn';
import { createTurnContext, type GameEvent, type TurnSystem } from '@/engine/turn/context';
import { capitalProvinceOf } from '@/engine/army/armies';
import { transferProvince } from '@/engine/world/provinces';
import { newsLines, workerJobLabel } from '@/components/gameText';
import type { GameState } from '@/types/GameState';
import type { Order } from '@/engine/orders/Order';
import { TerrainType } from '@/types/Tile';
import { ResourceType } from '@/types/Resource';
import { WorkerStatus, WorkerType, type Worker } from '@/types/Workers';
import { parseTileIdToArray } from '@/utils/tileIdUtils';
import { deepFreeze, N1, N2, put, setPair, setTile, tileAt } from '../fixtures';

// Imported when a test runs, so each test of this file reports its own result before the phase exists.
const developerPhase = async (): Promise<TurnSystem> => (await import('@/engine/systems/developerSystem')).developerSystem;

const continent = () => newGame({ seed: 1, world: 'continent' });
const minorIds = (state: GameState) => state.minorNations.map(m => m.id);

/** The nation holds an embassy (and so a consulate) with the minor at `points`, in the settled record. */
const qualify = (state: GameState, nationId: string, minorId: string, points = 60) =>
  setPair(state, nationId, minorId, { points, consulates: [nationId], embassies: [nationId] });

const developersOf = (state: GameState, nationId: string) =>
  state.map.tiles.flat().flatMap(tile => tile.workers
    .filter(w => w.nationId === nationId && w.type === WorkerType.Developer)
    .map(worker => ({ worker, tileId: tile.id })));

const capitalOf = (state: GameState, nationId: string) => universityCapital(state, state.nations.find(n => n.id === nationId)!)!.id;

/** The phase alone, with a context that fails on any RNG draw (FR-629: the grant draws none). */
async function settle(state: GameState, turn = state.turn) {
  const events: GameEvent[] = [];
  const ctx = {
    ...createTurnContext({ turn, seed: state.seed, emit: event => events.push(event) }),
    get rng(): never { throw new Error('FR-629: the Developer grant draws no random number'); },
    rngFor: (): never => { throw new Error('FR-629: the Developer grant draws no random number'); },
  };
  const phase = await developerPhase();
  return { state: phase(state, ctx), events };
}

describe('FR-629 the Developer is a diplomatic reward, one at a time', () => {
  it('FR-629 an embassy at 59 points grants nothing; at 60 points (level 6, grey) one Developer, Available on the capital tile', async () => {
    const minor = minorIds(continent())[0];
    const below = deepFreeze(qualify(continent(), N1, minor, 59));
    const none = await settle(below);
    expect(none.state).toBe(below);
    expect(none.events).toEqual([]);

    const at = deepFreeze(qualify(continent(), N1, minor, 60));
    const { state, events } = await settle(at);
    const capital = capitalOf(at, N1);
    const id = `developer-${N1}-${at.turn}`;
    expect(developersOf(state, N1)).toEqual([{
      tileId: capital,
      worker: { id, type: WorkerType.Developer, nationId: N1, assignedTileId: capital, efficiency: 100, status: WorkerStatus.Available, justMoved: false },
    }]);
    expect(developersOf(state, N2)).toEqual([]);
    expect(events).toEqual([{ type: 'developer-arrived', nationId: N1, workerId: id, tileId: capital, minorId: minor }]);
    // Only the capital tile changed: no cash, stock, diplomacy or other tile moved
    expect({ ...state, map: undefined }).toEqual({ ...at, map: undefined });
    expect(state.map.tiles.flat().filter((t, i) => t !== at.map.tiles.flat()[i]).map(t => t.id)).toEqual([capital]);
  });

  it('FR-629 the End Turn grants it after the settlement, to the owner only, with no Order', () => {
    const minor = minorIds(continent())[0];
    const { state, events } = resolveTurn(qualify(continent(), N1, minor, 65), {});
    const id = `developer-${N1}-1`;
    expect(developersOf(state, N1).map(d => [d.worker.id, d.tileId, d.worker.status, d.worker.justMoved])).toEqual([[id, capitalOf(state, N1), WorkerStatus.Available, false]]);
    expect(developersOf(state, N2)).toEqual([]);
    const arrivals = events.filter(e => e.type === 'developer-arrived');
    expect(arrivals).toEqual([{ type: 'developer-arrived', nationId: N1, workerId: id, tileId: capitalOf(state, N1), minorId: minor }]);
    // The owner reads it; the other Great Power never sees it (FR-640)
    const nameOf = (countryId: string) => countryId;
    expect(newsLines(arrivals, N1, nameOf).length).toBe(1);
    expect(newsLines(arrivals, N2, nameOf)).toEqual([]);
  });

  it('FR-629 an embassy ordered this turn does not count; it counts at the next settlement', () => {
    const minor = minorIds(continent())[0];
    const start = setPair(continent(), N1, minor, { points: 65, consulates: [N1], embassies: [] });
    const embassy: Order = { kind: 'proposeOverture', nationId: N1, overture: 'embassy', targetId: minor };
    expect(validateOrder(start, embassy)).toEqual({ ok: true });
    const first = resolveTurn(start, { [N1]: [embassy] });
    expect(first.events.filter(e => e.type === 'order-rejected')).toEqual([]);
    expect(first.state.diplomacy[`${minor}|${N1}`].embassies).toEqual([N1]);
    expect(developersOf(first.state, N1)).toEqual([]);
    expect(first.events.filter(e => e.type === 'developer-arrived')).toEqual([]);

    const second = resolveTurn(first.state, {});
    expect(developersOf(second.state, N1).map(d => d.worker.id)).toEqual([`developer-${N1}-2`]);
  });

  it('FR-629 a colony, a war (declared or begun) and a consulate without an embassy do not qualify', async () => {
    const minor = minorIds(continent())[0];
    const qualified = qualify(continent(), N1, minor, 80);
    const colony = { ...qualified, minorNations: qualified.minorNations.map(m => (m.id === minor ? { ...m, colonyOf: N1 } : m)) };
    const declared = setPair(qualified, N1, minor, { war: { aggressors: [N1], since: qualified.turn + 1 } });
    const begun = setPair(qualified, N1, minor, { war: { aggressors: [N1], since: qualified.turn } });
    const consulateOnly = setPair(qualified, N1, minor, { embassies: [] });
    const rivalEmbassy = setPair(continent(), N1, minor, { points: 80, consulates: [N2], embassies: [N2] });
    for (const state of [colony, declared, begun, consulateOnly, rivalEmbassy]) {
      const result = await settle(state);
      expect(result.state).toBe(state);
      expect(result.events).toEqual([]);
    }
  });

  it('FR-629 one at a time: none while one exists, none extra for a second minor, a removed one replaced at the next settlement', async () => {
    const [first, second] = minorIds(continent());
    const both = qualify(qualify(continent(), N1, first, 70), N1, second, 70);
    const granted = await settle(both);
    expect(developersOf(granted.state, N1).map(d => d.worker.id)).toEqual([`developer-${N1}-1`]);
    expect(granted.events.map(e => e.type)).toEqual(['developer-arrived']);

    const again = await settle(granted.state, 2);
    expect(again.state).toBe(granted.state);
    expect(again.events).toEqual([]);

    // Moved away from the capital it still counts
    const moved = put(granted.state, `developer-${N1}-1`, capitalProvinceOf(granted.state, N1)!.tileIds.find(id => id !== capitalOf(granted.state, N1) && tileAt(granted.state, id).terrain !== TerrainType.Water)!);
    expect((await settle(moved, 3)).state).toBe(moved);

    const capital = capitalOf(granted.state, N1);
    const [cx, cy] = parseTileIdToArray(capital);
    const removed = {
      ...granted.state,
      map: { ...granted.state.map, tiles: granted.state.map.tiles.map((row, y) => row.map((t, x) => (x === cx && y === cy ? { ...t, workers: t.workers.filter(w => w.type !== WorkerType.Developer) } : t))) },
    };
    expect(developersOf(removed, N1)).toEqual([]);
    const replaced = await settle(removed, 4);
    expect(developersOf(replaced.state, N1).map(d => [d.worker.id, d.tileId])).toEqual([[`developer-${N1}-4`, capital]]);
  });

  it('FR-629 a nation whose capital province another country holds gets none', async () => {
    const minor = minorIds(continent())[0];
    const qualified = qualify(continent(), N1, minor, 80);
    const fallen = transferProvince(qualified, capitalProvinceOf(qualified, N1)!.id, N2);
    const result = await settle(fallen);
    expect(result.state).toBe(fallen);
    expect(result.events).toEqual([]);
  });

  it('FR-629 the grant is the same for a human, a scripted and a computer controller', async () => {
    const [first, second] = minorIds(continent());
    const start = qualify(qualify(continent(), N1, first, 60), N2, second, 75);
    const swapped = { ...start, nations: start.nations.map(n => ({ ...n, controller: n.controller === 'human' ? 'scripted' as const : 'human' as const })) };
    expect(swapped.nations.map(n => n.controller)).not.toEqual(start.nations.map(n => n.controller));
    const a = await settle(start);
    const b = await settle(swapped);
    expect(a.events).toEqual(b.events);
    expect(a.events.map(e => 'nationId' in e && e.nationId)).toEqual([N1, N2]);
    expect(a.state.map).toEqual(b.state.map);
  });

  it('FR-629 Two islands, seeds 1 to 4: no Minor Nation, so the phase returns its input and no game grants one', async () => {
    for (const seed of [1, 2, 3, 4]) {
      const start = deepFreeze(newGame({ seed, world: 'two-islands' }));
      expect(start.minorNations).toEqual([]);
      expect((await settle(start)).state).toBe(start);
      let state = start;
      for (let turn = 0; turn < 3; turn++) state = resolveTurn(state, {}).state;
      expect(developersOf(state, N1).concat(developersOf(state, N2))).toEqual([]);
    }
  });
});

describe('FR-630 one Developer type: the generic improver is retired', () => {
  const developerOn = (tileId: string) => {
    const state = setTile(continent(), tileId, { resource: { type: ResourceType.Grain, level: 0, discovered: true } });
    const farmer = state.map.tiles.flat().flatMap(t => t.workers).find(w => w.nationId === N1 && w.type === WorkerType.Farmer)!;
    return { state: put(state, farmer.id, tileId, { type: WorkerType.Developer }), workerId: farmer.id };
  };
  const ownFarm = (state: GameState) => state.map.tiles.flat().find(t => t.ownerNationId === N1 && t.terrain === TerrainType.Farm && !t.developmentJob)!;

  it('FR-630 the improvers are the five specialists', () => {
    expect(DEVELOPMENT_WORKER_TYPES).toEqual([WorkerType.Farmer, WorkerType.Rancher, WorkerType.Forester, WorkerType.Miner, WorkerType.Driller]);
  });

  it('FR-630 a Developer\'s development Order is refused with wrong-worker-type, on site and after a move', () => {
    const farm = ownFarm(continent());
    const { state, workerId } = developerOn(farm.id);
    expect(validateOrder(state, { kind: 'startDevelopment', nationId: N1, workerId, tileId: farm.id })).toEqual({ ok: false, reason: 'wrong-worker-type' });
    const atCapital = put(state, workerId, capitalOf(state, N1));
    expect(validateOrder(atCapital, { kind: 'moveAndStartDevelopment', nationId: N1, workerId, toTileId: farm.id })).toEqual({ ok: false, reason: 'wrong-worker-type' });
  });

  it('FR-629 FR-630 the University refuses a Developer, and a Developer cannot be disbanded', () => {
    const farm = ownFarm(continent());
    const { state, workerId } = developerOn(farm.id);
    const university = { kind: 'setUniversity', nationId: N1, civilianType: WorkerType.Developer, count: 1 } as unknown as Order;
    expect(validateOrder(state, university)).toEqual({ ok: false, reason: 'invalid-target' });
    expect(validateOrder(state, { kind: 'disbandCivilian', nationId: N1, workerId })).toEqual({ ok: false, reason: 'wrong-worker-type' });
    // The specialists still may be disbanded
    const farmer = continent().map.tiles.flat().flatMap(t => t.workers).find(w => w.nationId === N1 && w.type === WorkerType.Farmer)!;
    expect(validateOrder(continent(), { kind: 'disbandCivilian', nationId: N1, workerId: farmer.id })).toEqual({ ok: true });
  });

  it('FR-630 a working Developer reads "Buying land"', () => {
    const farm = ownFarm(continent());
    const developer: Worker = { id: 'd', type: WorkerType.Developer, nationId: N1, assignedTileId: farm.id, efficiency: 100, status: WorkerStatus.Working, justMoved: false };
    expect(workerJobLabel({ ...farm, workers: [developer] }, developer)).toBe('Buying land');
    expect(workerJobLabel({ ...farm, workers: [developer] }, { ...developer, status: WorkerStatus.Available })).toBeUndefined();
  });

  /** JSON with every object's keys sorted and undefined fields left out, as the FR-464 goldens hash it. */
  function canonical(value: unknown): string {
    if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
    if (value && typeof value === 'object') {
      const entries = Object.entries(value as Record<string, unknown>).filter(([, v]) => v !== undefined);
      return `{${entries.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(',')}}`;
    }
    return JSON.stringify(value);
  }
  // Recorded on base 8c03962 (M18i merged, before any M18j engine change). A changed digest means a fixed start moved.
  const STARTS: [string, NewGameOptions, string][] = [
    ['continent 1', { seed: 1, world: 'continent' }, '9e31311b7f12c998c061fee51215cb34bfc98353474240a794bc720c01dfbb10'],
    ['continent 2', { seed: 2, world: 'continent' }, 'b367002051ebe99a6c65244cbaabab9c1b17e40328ad6bbfc11abd476b921fdc'],
    ['continent 3', { seed: 3, world: 'continent' }, 'b3d5828b31b30a2691c1c6afb3a9edfc93a1a42db207f8925175aebc23bebd39'],
    ['continent 4', { seed: 4, world: 'continent' }, '4387eeb87905056c39e6140d32cca5e9241dda0a0ee1dc3a195dac26eb24d59f'],
    ['continent Demo 1', { seed: 1, world: 'continent', difficulty: 'demo' }, '9dfc0112b4e6d36b05e53a0ef489ae5b82949b458d72a69500cf279ef8664b8e'],
    ['continent Demo 2', { seed: 2, world: 'continent', difficulty: 'demo' }, '5ff59db9136d248305b3470a677a0acf75c6862529533e5840534f93622a8f6f'],
    ['continent Demo 3', { seed: 3, world: 'continent', difficulty: 'demo' }, 'bea07ecd52b46dbe69d7e137c7eac0a6a2da7d552c46a99ea52cffff66d2bb0d'],
    ['continent Demo 4', { seed: 4, world: 'continent', difficulty: 'demo' }, '4dbf14e34071a23279517ed291b20ba577d23034c67c10d963c722048ef10acb'],
    ['Random Standard 1', { seed: 1, world: 'random', randomMapSize: 'standard' }, '6b30eb05570c6c0cd98834819f246d252a47e8bf83cdb64d1f0660ed9adfe424'],
    ['Random Standard 2', { seed: 2, world: 'random', randomMapSize: 'standard' }, '9404162dba679a4ff30bbab49d66986c41d82e8e19a94a4d38ae240b1f09d8bb'],
    ['Random Standard 3', { seed: 3, world: 'random', randomMapSize: 'standard' }, '534d6d2cb9d93ba2f7dfda7d764aba5dbd5ca6235a4f230d0876920671e89eb5'],
    ['Random Standard 4', { seed: 4, world: 'random', randomMapSize: 'standard' }, 'c97ae6514ae4e0b05c8818ee2575ac3defddee2b76579aa784783984782363c5'],
    ['Random Large 1', { seed: 1, world: 'random', randomMapSize: 'large' }, '51220fe8ce29656115295ba6ac735d264a34ff7add5b76361d809ff7f5032595'],
    ['Random Large 2', { seed: 2, world: 'random', randomMapSize: 'large' }, 'bcc629a9b06503f3a99b05579d1c73469afedc48e7c57832a0c62f7320d82b1c'],
    ['Random Large 3', { seed: 3, world: 'random', randomMapSize: 'large' }, '6061b53266410aa4208b8d0757681e5a2ed642380621b43b9f22e2c6776cb6f2'],
    ['Random Large 4', { seed: 4, world: 'random', randomMapSize: 'large' }, 'ee560063415794f6deb9c830e02aa36ab2a1df62c7490e39e78fca87784ccd3d'],
    ['Two islands 1', { seed: 1, world: 'two-islands' }, 'e946d53fbe9e39a119257ed59e24eed41016e14e7acc932fd2ef9af693a1a66f'],
    ['Two islands 2', { seed: 2, world: 'two-islands' }, '23e392655d7e3ede1707538d54c47d946ee706f698c4a7471e3b24c603180d1e'],
    ['Two islands 3', { seed: 3, world: 'two-islands' }, '8a7d10f0e127af782a81b0854118cc06b1176b0d4618e0386a9b36544c696fdc'],
    ['Two islands 4', { seed: 4, world: 'two-islands' }, '29c9cdc28135e122ffca931f2b69d68e3da6f0e4a2e68acf651e202e9e6bd15a'],
  ];
  it.each(STARTS)('FR-630 FR-641 %s: the new game is byte-identical to the base and has no Developer', (_name, options, recorded) => {
    const state = newGame(options);
    expect(createHash('sha256').update(canonical(state)).digest('hex')).toBe(recorded);
    expect(state.map.tiles.flat().flatMap(t => t.workers).filter(w => w.type === WorkerType.Developer)).toEqual([]);
  });
});
