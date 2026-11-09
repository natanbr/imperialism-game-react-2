// @vitest-environment jsdom
// FR-087 (NR-009): a nation's territory is drawn as border lines in its colour where its tiles meet
// other tiles, and the selected tile has an accent ring no other tile has. Before part B both the
// selected tile and every owned tile had a red border. FR-097: the colour is the owner's palette slot.
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { MapView } from '@/components/MapView';
import { territoryBorderSegments } from '@/components/territoryBorders';
import { useGameStore } from '@/store/rootStore';
import { newGame } from '@/engine';
import { getNeighborCoords } from '@/engine/map/mapHelpers';
import { NATION_COLORS, THEME, TILE_PX } from '@/styles/theme';
import type { GameState } from '@/types/GameState';

const N = 'nation-1';
const game = newGame({ seed: 1 });
const show = (g: GameState, ui: Partial<ReturnType<typeof useGameStore.getState>> = {}) =>
  useGameStore.setState({ ...useGameStore.getInitialState(), game: g, activeNationId: N, ...ui });

describe('FR-087 territory borders', () => {
  const segments = territoryBorderSegments(game.map, game.nations);
  const owned = game.map.tiles.flat().filter((t) => t.ownerNationId === N);

  it('FR-087 one border side per neighbour of another owner, none between two tiles of the same owner', () => {
    expect(owned).toHaveLength(100);
    const expected = owned.reduce((sum, t) => {
      const same = getNeighborCoords(game.map, t.x, t.y).filter(([x, y]) => game.map.tiles[y][x].ownerNationId === N).length;
      return sum + 6 - same;
    }, 0);
    const ours = segments.filter((s) => s.nationId === N);
    expect(ours).toHaveLength(expected);
    const inside = segments.filter((s) => s.neighbour && game.map.tiles[s.neighbour.y][s.neighbour.x].ownerNationId === s.nationId);
    expect(inside).toEqual([]);
    // FR-098: nation 2 owns island 2, a twin of island 1, so it has as many sides
    expect(segments.filter((s) => s.nationId === 'nation-2')).toHaveLength(expected);
    expect(segments).toHaveLength(2 * expected);
  });

  it('FR-097 each nation\'s sides take the colour of its palette slot, whatever the order of state.nations', () => {
    const colours = (segs: typeof segments) => Object.fromEntries(segs.map((s) => [s.nationId, s.color]));
    expect(colours(segments)).toEqual({ [N]: NATION_COLORS[0], 'nation-2': NATION_COLORS[1] });
    const reversed = territoryBorderSegments(game.map, [...game.nations].reverse());
    expect(colours(reversed)).toEqual({ [N]: NATION_COLORS[0], 'nation-2': NATION_COLORS[1] });
    expect(reversed).toEqual(segments);
  });

  it('FR-087 the sides follow the brick rows: an even row tile 2-8 and an odd row tile 2-9 on the 42 px grid', () => {
    const side = (tileId: string, nx: number, ny: number) =>
      segments.find((s) => s.tileId === tileId && s.neighbour?.x === nx && s.neighbour?.y === ny);
    const T = TILE_PX;
    // 2-8 (even row) meets the sea 1-8 on its left side
    expect(side('2-8', 1, 8)).toMatchObject({ x1: 2 * T, y1: 8 * T, x2: 2 * T, y2: 9 * T });
    // 2-9 (odd row, shifted half a tile) meets the sea 1-9 on its left side
    expect(side('2-9', 1, 9)).toMatchObject({ x1: 2 * T + T / 2, y1: 9 * T, x2: 2 * T + T / 2, y2: 10 * T });
    // 2-3 (odd row) meets the sea 2-2 (even row) above the left half of its top side
    expect(side('2-3', 2, 2)).toMatchObject({ x1: 2 * T + T / 2, y1: 3 * T, x2: 3 * T, y2: 3 * T });
  });

  it('FR-087 FR-097 MapView draws one border per nation in its slot colour, apart from the rail lines', () => {
    show(game);
    const { container, unmount } = render(<MapView />);
    const borders = [...container.querySelectorAll('[data-testid="territory-border"]')];
    expect(borders).toHaveLength(2);
    expect(borders.map((b) => b.getAttribute('stroke'))).toEqual([NATION_COLORS[0], NATION_COLORS[1]]);
    expect(borders.every((b) => b.tagName.toLowerCase() === 'path')).toBe(true);
    unmount();
  });
});

describe('FR-087 the selected tile looks different from owned tiles', () => {
  it('FR-087 the selected tile has the accent ring; owned and unowned tiles share one plain grid border', () => {
    show(game, { selectedTileId: '3-9' });
    const { container, unmount } = render(<MapView />);
    const style = (id: string) => (container.querySelector(`[data-tile-id="${id}"]`) as HTMLElement).style;

    const selected = style('3-9');
    const owned = style('3-8');
    const sea = style('1-9');
    expect(selected.boxShadow).toContain(THEME.accent);
    expect(owned.boxShadow).not.toContain(THEME.accent);
    expect(owned.border).toBe(sea.border);
    expect(selected.border).toBe(owned.border);
    // No tile's own style carries a nation colour any more: ownership is the border overlay
    const tiles = [...container.querySelectorAll('[data-testid="tile"]')] as HTMLElement[];
    expect(tiles.filter((t) => NATION_COLORS.some((c) => t.style.cssText.includes(c)))).toEqual([]);
    expect(tiles.filter((t) => t.style.boxShadow.includes(THEME.accent)).map((t) => t.dataset.tileId)).toEqual(['3-9']);
    expect(container.querySelector('[data-tile-id="3-9"]')?.getAttribute('data-selected')).toBe('true');
    unmount();
  });
});
