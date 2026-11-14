// @vitest-environment jsdom
// M11 review fix round. FR-342 (review P2, P5): pictures load outside React's render and ahead of use. The figures in the
// capital's civilian tray were requested only when the tray opened, so its 24 px buttons stood empty until about 400 KB
// arrived: the pointer entering a tile with the player's stack, or the focus reaching the stack button, now starts
// loading those figures, once per page. A tile's cursor picture starts loading when the tile subscribes to it (after
// the commit), not while React renders. jsdom loads no image, so the browser's Image is a recording stand-in here.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { act, fireEvent, render } from '@testing-library/react';
import { CURSOR_ART, civilianArt } from '@/components/art/inkArt';
import { newGame } from '@/engine';
import { TerrainType } from '@/types/Tile';
import { WorkerType } from '@/types/Workers';
import { failOnActWarnings } from './actWarnings';

failOnActWarnings();

const N = 'nation-1';
/** Every URL given to `new Image()` in the page, in order. */
let requested: string[] = [];
class RecordingImage {
  decoding = '';
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  set src(url: string) {
    requested.push(url);
  }
}

/** A fresh page: the map, its store and the loaders' "already asked" memory, as a new tab has them. */
async function freshMap() {
  vi.resetModules();
  const [{ MapView }, { useGameStore }] = await Promise.all([import('@/components/MapView'), import('@/store/rootStore')]);
  const game = newGame({ seed: 1, world: 'continent' });
  useGameStore.setState({ ...useGameStore.getInitialState(), game, activeNationId: N });
  const view = render(React.createElement(MapView));
  const tile = (id: string) => view.container.querySelector(`[data-tile-id="${id}"]`) as HTMLElement;
  return { game, store: useGameStore, tile, unmount: view.unmount };
}

beforeEach(() => {
  requested = [];
  vi.stubGlobal('Image', RecordingImage);
});
afterEach(() => vi.unstubAllGlobals());

describe("FR-342 the capital's civilians are loaded before their tray opens", () => {
  it("FR-342 FR-325 the pointer entering the capital starts loading its seven civilians' figures, once; the first render loads none", async () => {
    const { game, tile, unmount } = await freshMap();
    expect(tile('2-9').querySelector('[data-testid="worker-stack"]')).not.toBeNull();
    const civilians = game.map.tiles.flat().find((t) => t.id === '2-9')!.workers.filter((w) => w.nationId === N);
    expect(civilians).toHaveLength(7);
    // The first paint stays within its budget (FR-339): no figure is asked for yet
    expect(requested).toEqual([]);
    fireEvent.pointerEnter(tile('2-9'));
    expect([...requested].sort()).toEqual(civilians.map((w) => civilianArt(w.type)).sort());
    // Once per page: entering again, or the stack's focus, asks for nothing more
    fireEvent.pointerLeave(tile('2-9'));
    fireEvent.pointerEnter(tile('2-9'));
    act(() => (tile('2-9').querySelector('[data-testid="worker-stack"]') as HTMLElement).focus());
    expect(requested).toHaveLength(7);
    unmount();
  });

  it("FR-342 the focus reaching the stack button starts the loading too (keyboard); another nation's capital loads nothing", async () => {
    const { game, tile, unmount } = await freshMap();
    // Valdoria's civilians are a marker, not the player's stack: the pointer there asks for nothing
    const theirs = game.map.tiles.flat().find((t) => t.terrain === TerrainType.Capital && t.ownerNationId === 'nation-2')!;
    expect(theirs.workers.length).toBeGreaterThan(1);
    fireEvent.pointerEnter(tile(theirs.id));
    expect(requested).toEqual([]);
    act(() => (tile('2-9').querySelector('[data-testid="worker-stack"]') as HTMLElement).focus());
    expect(requested).toEqual(expect.arrayContaining([civilianArt(WorkerType.Prospector), civilianArt(WorkerType.Engineer)]));
    expect(requested).toHaveLength(7);
    unmount();
  });
});

describe("FR-342 a tile's cursor picture loads after the commit", () => {
  it('FR-342 FR-330 selecting the prospector asks for its cursor picture once, for all the tiles that show it', async () => {
    const { game, store, unmount } = await freshMap();
    const prospector = game.map.tiles.flat().find((t) => t.id === '2-9')!.workers.find((w) => w.nationId === N && w.type === WorkerType.Prospector)!;
    expect(requested).toEqual([]);
    act(() => store.getState().selectWorker(prospector.id));
    expect(requested.filter((url) => url === CURSOR_ART.prospect)).toHaveLength(1);
    unmount();
  });
});
