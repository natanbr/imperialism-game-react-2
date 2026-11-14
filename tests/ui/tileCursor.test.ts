// M11 (NR-032). FR-330: the five emoji cursors are replaced by the pack's pictures: prospect the prospector, develop the
// developing civilian's figure, build a fort the level-1 fort, build rail the rail piece, the construction choice the
// engineer. Each file is drawn once at runtime into a 32 x 32 canvas (contained, figures on the bottom centre) and used as
// `url(data:image/png;base64,...) 16 16, pointer`; until it is ready, and wherever there is no canvas (server render,
// jsdom), the cursor is `pointer`; no action keeps `auto`. This file runs in Node: the browser is stubbed where needed.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { CURSOR_ART, RAIL_ART, civilianArt, fortArt } from '@/components/art/inkArt';
import type { PossibleAction } from '@/types/actions';
import { WorkerType } from '@/types/Workers';

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

/** A browser stand-in: Image loads on the next tick (or fails), the canvas records what it draws. */
function stubBrowser({ fail = false } = {}) {
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
  return { images, draws, canvases };
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
    const { cursorOf, subscribeCursors } = await fresh();
    const listener = vi.fn();
    const stop = subscribeCursors(listener);
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
    const { cursorOf, subscribeCursors } = await fresh();
    const listener = vi.fn();
    subscribeCursors(listener);
    const farmer: PossibleAction = { type: 'develop', workerType: WorkerType.Farmer, level: 1 };
    for (let i = 0; i < 50; i++) {
      cursorOf(farmer);
      cursorOf({ type: 'construct', kind: 'rail' });
    }
    expect(browser.images.map((i) => i.src)).toEqual([civilianArt(WorkerType.Farmer), RAIL_ART.url]);
    await tick();
    for (let i = 0; i < 50; i++) cursorOf(farmer);
    expect(browser.images).toHaveLength(2);
    expect(browser.canvases).toHaveLength(2);
    expect(listener).toHaveBeenCalledTimes(2);
    // Another civilian's develop cursor is its own figure
    expect(cursorOf({ type: 'develop', workerType: WorkerType.Rancher, level: 1 })).toBe('pointer');
    expect(browser.images.map((i) => i.src)).toEqual([civilianArt(WorkerType.Farmer), RAIL_ART.url, civilianArt(WorkerType.Rancher)]);
  });

  it('FR-330 the picture is contained in 32 x 32: a figure fills it, the 42 x 16 rail piece is centred at full width', async () => {
    const browser = stubBrowser();
    const { cursorOf } = await fresh();
    cursorOf({ type: 'prospect' });
    cursorOf({ type: 'construct', kind: 'rail' });
    await tick();
    const [figure, rail] = browser.draws;
    expect(figure).toEqual([0, 0, 32, 32]);
    const h = (32 * 16) / 42;
    expect(rail.map((v) => Math.round(v * 1000) / 1000)).toEqual([0, (32 - h) / 2, 32, h].map((v) => Math.round(v * 1000) / 1000));
  });

  it('FR-330 a picture that fails to load leaves "pointer" and tells no one', async () => {
    stubBrowser({ fail: true });
    const { cursorOf, subscribeCursors } = await fresh();
    const listener = vi.fn();
    subscribeCursors(listener);
    expect(cursorOf({ type: 'construct', kind: 'fort' })).toBe('pointer');
    await tick();
    expect(listener).not.toHaveBeenCalled();
    expect(cursorOf({ type: 'construct', kind: 'fort' })).toBe('pointer');
  });

  it('FR-330 the server snapshot is "pointer" for an action and "auto" for none, and loads nothing', async () => {
    const browser = stubBrowser();
    const { serverCursorOf } = await fresh();
    expect(ACTIONS.map(([, action]) => serverCursorOf(action))).toEqual(ACTIONS.map(([, action]) => (action ? 'pointer' : 'auto')));
    expect(browser.images).toEqual([]);
  });
});
