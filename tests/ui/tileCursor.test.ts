// M11 (NR-032). FR-330: the five emoji cursors are replaced by the pack's pictures: prospect the prospector, develop the
// developing civilian's figure, build a fort the level-1 fort, build rail the rail piece, the construction choice the
// engineer. Each file is drawn once at runtime into a 32 x 32 canvas (contained, figures on the bottom centre) and used as
// `url(data:image/png;base64,...) 16 16, pointer`; until it is ready, and wherever there is no canvas (server render,
// jsdom), the cursor is `pointer`; no action keeps `auto`. FR-342 (review P5): `cursorOf` only reads (React calls it while
// rendering); `requestCursor` loads, called when a tile subscribes, and a failed load is tried again on the next request.
// This file runs in Node: the browser is stubbed where needed.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { CURSOR_ART, RAIL_ART, civilianArt, fortArt } from '@/components/art/inkArt';
import type { PossibleAction } from '@/types/actions';
import { WorkerType } from '@/types/Workers';
import type { GameState } from '@/types/GameState';
import type { CursorAction } from '@/hooks/tileCursor';
import { clickCursors } from '@/hooks/tileClickOrders';
import { newGame } from '@/engine/newGame';
import { addDepot, addRailroad } from '@/engine/systems/railroadSystem';
import { game, N1, put, setTile, T, workerId } from '../engine/fixtures';

/** A fresh copy of the module: its cache of drawn cursors is module state. */
const fresh = async () => {
  vi.resetModules();
  return import('@/hooks/tileCursor');
};

const ACTIONS: [string, PossibleAction, string | undefined][] = [
  ['prospect', { type: 'prospect' }, civilianArt(WorkerType.Prospector)],
  ['develop by a farmer', { type: 'develop', workerType: WorkerType.Farmer, level: 1 }, civilianArt(WorkerType.Farmer)],
  ['develop by a rancher', { type: 'develop', workerType: WorkerType.Rancher, level: 2 }, civilianArt(WorkerType.Rancher)],
  ['develop by a forester', { type: 'develop', workerType: WorkerType.Forester, level: 1 }, civilianArt(WorkerType.Forester)],
  ['develop by a miner', { type: 'develop', workerType: WorkerType.Miner, level: 3 }, civilianArt(WorkerType.Miner)],
  ['develop by a driller', { type: 'develop', workerType: WorkerType.Driller, level: 1 }, civilianArt(WorkerType.Driller)],
  ['build a fort', { type: 'construct', kind: 'fort' }, fortArt(1)],
  ['build rail', { type: 'construct', kind: 'rail' }, RAIL_ART.url],
  ['the construction choice', { type: 'open-construct-modal' }, civilianArt(WorkerType.Engineer)],
  ['no action', null, undefined],
];

/** A browser stand-in: Image loads on the next tick (or fails, until `succeed()`), the canvas records what it draws. */
function stubBrowser({ fail: failing = false } = {}) {
  let fail = failing;
  const images: { src: string }[] = [];
  const draws: number[][] = [];
  const canvases: { width: number; height: number }[] = [];
  class FakeImage {
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    decoding = '';
    naturalWidth = 0;
    naturalHeight = 0;
    private _src = '';
    constructor() {
      images.push(this);
    }
    get src() {
      return this._src;
    }
    set src(value: string) {
      this._src = value;
      setTimeout(() => (fail ? this.onerror?.() : this.onload?.()), 0);
    }
  }
  const document = {
    createElement: (tag: string) => {
      expect(tag).toBe('canvas');
      const canvas = {
        width: 0,
        height: 0,
        getContext: (kind: string) => (kind === '2d' ? { drawImage: (_img: unknown, ...box: number[]) => draws.push(box) } : null),
        toDataURL: (type: string) => `data:${type};base64,FAKE${canvases.length}`,
      };
      canvases.push(canvas);
      return canvas;
    },
  };
  vi.stubGlobal('Image', FakeImage);
  vi.stubGlobal('document', document);
  vi.stubGlobal('window', {});
  return { images, draws, canvases, succeed: () => (fail = false) };
}
const tick = () => new Promise((resolve) => setTimeout(resolve, 5));

afterEach(async () => {
  // Let a test's pending loads finish on its own stubs, so they do not draw into the next test's canvas
  await tick();
  vi.unstubAllGlobals();
});

describe('FR-330 which picture each cursor is drawn from', () => {
  it.each(ACTIONS)('FR-330 %s', async (_name, action, file) => {
    const { cursorArtOf } = await fresh();
    expect(cursorArtOf(action)).toBe(file);
  });

  it('FR-330 the table is the art table\'s cursor entries', async () => {
    const { cursorArtOf } = await fresh();
    expect(cursorArtOf({ type: 'prospect' })).toBe(CURSOR_ART.prospect);
    expect(cursorArtOf({ type: 'construct', kind: 'fort' })).toBe(CURSOR_ART.constructFort);
    expect(cursorArtOf({ type: 'construct', kind: 'rail' })).toBe(CURSOR_ART.constructRail);
    expect(cursorArtOf({ type: 'open-construct-modal' })).toBe(CURSOR_ART.constructModal);
  });
});

describe('FR-330 the cursor value', () => {
  it('FR-330 without a canvas (server render, this Node run) every action is "pointer" and no action is "auto"', async () => {
    const { cursorOf } = await fresh();
    expect(typeof document).toBe('undefined');
    expect(ACTIONS.map(([, action]) => cursorOf(action))).toEqual(ACTIONS.map(([, action]) => (action ? 'pointer' : 'auto')));
  });

  it('FR-330 in a browser: "pointer" until the picture is drawn, then the 32 px data URL with its hotspot in the middle', async () => {
    const browser = stubBrowser();
    const { cursorOf, requestCursor, subscribeCursors } = await fresh();
    const listener = vi.fn();
    const stop = subscribeCursors(listener);
    requestCursor(CURSOR_ART.prospect);
    expect(cursorOf({ type: 'prospect' })).toBe('pointer');
    expect(browser.images.map((i) => i.src)).toEqual([CURSOR_ART.prospect]);
    await tick();
    expect(listener).toHaveBeenCalledTimes(1);
    expect(cursorOf({ type: 'prospect' })).toBe('url(data:image/png;base64,FAKE1) 16 16, pointer');
    expect(browser.canvases).toEqual([expect.objectContaining({ width: 32, height: 32 })]);
    stop();
  });

  it('FR-330 each file is loaded and drawn once, whatever the number of tiles asking', async () => {
    const browser = stubBrowser();
    const { cursorOf, requestCursor, subscribeCursors } = await fresh();
    const listener = vi.fn();
    subscribeCursors(listener);
    const farmer: PossibleAction = { type: 'develop', workerType: WorkerType.Farmer, level: 1 };
    for (let i = 0; i < 50; i++) {
      requestCursor(civilianArt(WorkerType.Farmer));
      requestCursor(RAIL_ART.url);
    }
    expect(browser.images.map((i) => i.src)).toEqual([civilianArt(WorkerType.Farmer), RAIL_ART.url]);
    await tick();
    for (let i = 0; i < 50; i++) requestCursor(civilianArt(WorkerType.Farmer));
    expect(browser.images).toHaveLength(2);
    expect(browser.canvases).toHaveLength(2);
    expect(listener).toHaveBeenCalledTimes(2);
    expect(cursorOf(farmer)).toBe('url(data:image/png;base64,FAKE1) 16 16, pointer');
    // Another civilian's develop cursor is its own figure, not yet asked for
    expect(cursorOf({ type: 'develop', workerType: WorkerType.Rancher, level: 1 })).toBe('pointer');
  });

  it('FR-330 the picture is contained in 32 x 32: a figure fills it, the 42 x 16 rail piece is centred at full width', async () => {
    const browser = stubBrowser();
    const { requestCursor } = await fresh();
    requestCursor(CURSOR_ART.prospect);
    requestCursor(RAIL_ART.url);
    await tick();
    const [figure, rail] = browser.draws;
    expect(figure).toEqual([0, 0, 32, 32]);
    const h = (32 * 16) / 42;
    expect(rail.map((v) => Math.round(v * 1000) / 1000)).toEqual([0, (32 - h) / 2, 32, h].map((v) => Math.round(v * 1000) / 1000));
  });

  it('FR-330 a picture that fails to load leaves "pointer" and tells no one', async () => {
    stubBrowser({ fail: true });
    const { cursorOf, requestCursor, subscribeCursors } = await fresh();
    const listener = vi.fn();
    subscribeCursors(listener);
    requestCursor(fortArt(1)!);
    expect(cursorOf({ type: 'construct', kind: 'fort' })).toBe('pointer');
    await tick();
    expect(listener).not.toHaveBeenCalled();
    expect(cursorOf({ type: 'construct', kind: 'fort' })).toBe('pointer');
  });

  // Review P5: cursorOf ran inside useSyncExternalStore's getSnapshot, so a render started a network request and wrote
  // module state, and a failed load was never tried again
  it('FR-342 cursorOf only reads: asking for every cursor, many times, loads nothing and draws nothing', async () => {
    const browser = stubBrowser();
    const { cursorOf } = await fresh();
    for (let i = 0; i < 3; i++) for (const [, action] of ACTIONS) cursorOf(action);
    expect(browser.images).toEqual([]);
    expect(browser.canvases).toEqual([]);
    expect(ACTIONS.map(([, action]) => cursorOf(action))).toEqual(ACTIONS.map(([, action]) => (action ? 'pointer' : 'auto')));
  });

  it('FR-342 a picture that failed to load is tried again on the next request, and then drawn', async () => {
    const browser = stubBrowser({ fail: true });
    const { cursorOf, requestCursor, subscribeCursors } = await fresh();
    const listener = vi.fn();
    subscribeCursors(listener);
    requestCursor(fortArt(1)!);
    await tick();
    requestCursor(fortArt(1)!);
    expect(browser.images.map((i) => i.src)).toEqual([fortArt(1), fortArt(1)]);
    // The network answers this time
    browser.succeed();
    requestCursor(fortArt(1)!);
    await tick();
    expect(cursorOf({ type: 'construct', kind: 'fort' })).toMatch(/^url\(data:image\/png;base64,FAKE\d\) 16 16, pointer$/);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('FR-342 in a browser without a canvas nothing is asked for', async () => {
    const { requestCursor, cursorOf } = await fresh();
    expect(typeof document).toBe('undefined');
    requestCursor(CURSOR_ART.prospect);
    expect(cursorOf({ type: 'prospect' })).toBe('pointer');
  });

  it('FR-330 the server snapshot is "pointer" for an action and "auto" for none, and loads nothing', async () => {
    const browser = stubBrowser();
    const { serverCursorOf } = await fresh();
    expect(ACTIONS.map(([, action]) => serverCursorOf(action))).toEqual(ACTIONS.map(([, action]) => (action ? 'pointer' : 'auto')));
    expect(browser.images).toEqual([]);
  });
});

// M12 (NR-033), lane L2. FR-379 (ECONOMY-03): with a civilian selected, a tile's cursor follows the order its click would
// send first, as the engine would take it: the construction cursor only on the engineer's own tile where Construction
// Options opens, the fort cursor only where `isFortSite` holds, the rail cursor where the click lays rail (FR-380,
// FR-TRUTH-08), the develop and prospect cursors only where that job is valid, `pointer` for a plain move; a click the
// engine would refuse altogether (the sea, another country's land) keeps `auto`.
describe('FR-379 FR-380 the cursor says what the click does', () => {
  const E = workerId(N1, WorkerType.Engineer);
  const P = workerId(N1, WorkerType.Prospector);
  const F = workerId(N1, WorkerType.Farmer);
  const FORT: CursorAction = { type: 'construct', kind: 'fort' };
  const RAIL: CursorAction = { type: 'construct', kind: 'rail' };
  const MOVE: CursorAction = { type: 'move' };
  const at = (s: GameState, worker: string, tileId: string) => clickCursors(s, N1, worker).get(tileId) ?? null;

  it('FR-379 a plain move is the pointer (no picture); nothing selected, no cursor table', async () => {
    const { cursorArtOf, cursorOf, serverCursorOf } = await fresh();
    expect(cursorArtOf(MOVE)).toBeUndefined();
    expect(cursorOf(MOVE)).toBe('pointer');
    expect(serverCursorOf(MOVE)).toBe('pointer');
    expect(clickCursors(game(), N1, undefined).size).toBe(0);
  });

  it('FR-379 the construction cursor only on the engineer\'s own tile, where Construction Options opens; elsewhere a move', () => {
    const s = put(game(), E, T.orchard1);
    expect(at(s, E, T.orchard1)).toEqual({ type: 'open-construct-modal' });
    // homeOrchard1 is not next to orchard1: the click only moves the engineer there
    expect(at(s, E, T.homeOrchard1)).toEqual(MOVE);
  });

  it('FR-378 FR-379 the fort cursor only where isFortSite holds: a town without a fort, not the capital nor a fortified town', () => {
    const s = put(game(), E, T.town1);
    expect(at(s, E, T.town1)).toEqual(FORT);
    expect(at(setTile(s, T.town1, { fortLevel: 1 }), E, T.town1)).not.toEqual(FORT);
    expect(at(put(game(), E, T.capital1), E, T.capital1)).not.toEqual(FORT);
  });

  it('FR-380 the rail cursor where the click lays rail: rail-on-move from the capital 2-9 onto 3-9, and the section into the capital', () => {
    const ENGINEER = 'worker-nation-1-7';
    const s = newGame({ seed: 1 });
    expect(at(s, ENGINEER, '3-9')).toEqual(RAIL);
    // FR-378: the engineer on 3-9, on the line from the depot at 4-9, over the capital: the section 3-9 to 2-9
    const xy = (tileId: string) => {
      const [x, y] = tileId.split('-').map(Number);
      return { x, y };
    };
    let line = addDepot(setTile(s, '4-9', { depot: true }), N1, xy('4-9'));
    line = put(addRailroad(line, N1, xy('3-9'), xy('4-9')), ENGINEER, '3-9');
    expect(at(line, ENGINEER, '2-9')).toEqual(RAIL);
  });

  it('FR-379 the develop cursor only where the job is valid: a farm to develop, not one with a job on it', () => {
    const s = put(game(), F, T.capital1);
    expect(at(s, F, T.farm1)).toEqual({ type: 'develop', workerType: WorkerType.Farmer, level: 1 });
    const busy = setTile(s, T.farm1, {
      developmentJob: { workerId: 'someone', workerType: WorkerType.Farmer, targetLevel: 1, startedOnTurn: 1, durationTurns: 3 },
    });
    expect(at(busy, F, T.farm1)).toEqual(MOVE);
  });

  it('FR-379 the prospect cursor only where the job is valid: hidden minerals, not a tile being prospected; a farm is a move', () => {
    const s = put(game(), P, T.capital1);
    expect(at(s, P, T.mountains1)).toEqual({ type: 'prospect' });
    expect(at(setTile(s, T.mountains1, { prospecting: { workerId: 'someone', startedOnTurn: 1 } }), P, T.mountains1)).not.toEqual({ type: 'prospect' });
    expect(at(s, P, T.farm1)).toEqual(MOVE);
  });

  it('FR-379 a click the engine would refuse altogether keeps auto: the sea, another nation\'s land', () => {
    const s = put(game(), P, T.capital1);
    expect(at(s, P, T.water)).toBeNull();
    expect(at(s, P, T.farm2)).toBeNull();
  });
});
