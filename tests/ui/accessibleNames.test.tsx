// @vitest-environment jsdom
// M3.5 review fix round. FR-093: depots and ports name their state ("Depot: connected") and show it by
// shape as well as colour. FR-095: every tile has an accessible name (terrain, resource and level,
// owner) now that the terrain text is no longer drawn. FR-096: the browser tab says "Imperialism".
import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { render, screen } from '@testing-library/react';
import { MapView } from '@/components/MapView';
import { TileInfrastructure } from '@/components/Tile/TileInfrastructure';
import { useGameStore } from '@/store/rootStore';
import { newGame } from '@/engine';
import { TerrainType } from '@/types/Tile';

const ROOT = join(__dirname, '..', '..');

describe('FR-093 depot and port state is named, not only coloured', () => {
  it('FR-093 a connected depot and an unconnected port carry their state as title and accessible name', () => {
    render(<TileInfrastructure depot depotActive port portActive={false} />);
    const depot = screen.getByRole('img', { name: 'Depot: connected' });
    expect(depot.getAttribute('title')).toBe('Depot: connected');
    expect(depot.getAttribute('data-connected')).toBe('true');
    const port = screen.getByRole('img', { name: 'Port: not connected' });
    expect(port.getAttribute('title')).toBe('Port: not connected');
    expect(port.getAttribute('data-connected')).toBe('false');
  });

  it('FR-093 an unconnected depot and a connected port', () => {
    render(<TileInfrastructure depot depotActive={false} port portActive />);
    expect(screen.getByRole('img', { name: 'Depot: not connected' })).toBeTruthy();
    expect(screen.getByRole('img', { name: 'Port: connected' })).toBeTruthy();
  });

  it('FR-093 not connected is a hollow ring, connected a filled dot: the shape differs, not only the colour', () => {
    const css = readFileSync(join(ROOT, 'src/app/components/Tile/Tile.module.css'), 'utf8');
    const rule = (name: string) => new RegExp(`\\.${name}\\s*\\{([^}]*)\\}`).exec(css)?.[1] ?? '';
    expect(rule('statusOn')).toMatch(/background:\s*var\(--color-good\)/);
    // A light centre inside a red border, not a red fill
    expect(rule('statusOff')).toMatch(/background:\s*var\(--color-surface-raised\)/);
    expect(rule('statusOff')).toMatch(/border:\s*\d+px solid var\(--color-bad\)/);
  });
});

describe('FR-095 every tile has an accessible name', () => {
  beforeEach(() => {
    useGameStore.setState({ ...useGameStore.getInitialState(), game: newGame({ seed: 1 }), activeNationId: 'nation-1' });
  });

  it('FR-095 all 384 tiles are named groups', () => {
    const { container } = render(<MapView />);
    const tiles = [...container.querySelectorAll('[data-testid="tile"]')];
    expect(tiles).toHaveLength(24 * 16);
    expect(tiles.filter((t) => t.getAttribute('role') !== 'group' || !t.getAttribute('aria-label'))).toEqual([]);
  });

  it('FR-095 FR-098 terrain, resource and level, and owner; a hidden resource is not named; the sea is "Sea"', () => {
    // Since M4 island 2 is nation 2's (FR-098), so no land is unowned: one of its orchards is made
    // ownerless here for the "not owned" name.
    const start = useGameStore.getState().game;
    const [theirs, unowned] = start.map.tiles
      .flat()
      .filter((t) => t.terrain === TerrainType.Orchard && t.ownerNationId === 'nation-2' && t.resource?.level === 0);
    const game = {
      ...start,
      map: { ...start.map, tiles: start.map.tiles.map((row) => row.map((t) => (t.id === unowned.id ? { ...t, ownerNationId: undefined } : t))) },
    };
    useGameStore.setState({ game });
    const tiles = game.map.tiles.flat();
    const hidden = tiles.find((t) => t.terrain === TerrainType.BarrenHills && t.ownerNationId === 'nation-1' && t.resource?.discovered === false)!;
    const sea = tiles.find((t) => t.terrain === TerrainType.Water)!;
    const { container } = render(<MapView />);
    const label = (id: string) => container.querySelector(`[data-tile-id="${id}"]`)!.getAttribute('aria-label');

    // FR-081: the farm east of the capital starts at level 1
    expect(game.map.tiles[9][3].terrain).toBe(TerrainType.Farm);
    expect(label('3-9')).toBe('Farm, grain, level 1, owned by Testland');
    expect(label('2-9')).toBe('Capital, owned by Testland');
    expect(label(hidden.id)).toBe('Barren hills, owned by Testland');
    expect(label(theirs.id)).toBe('Orchard, fruit, level 0, owned by Valdoria');
    expect(label(unowned.id)).toBe('Orchard, fruit, level 0, not owned');
    expect(label(sea.id)).toBe('Sea');
    // FR-081: two farms next to the capital start at level 1, so two tiles share this name
    const farms = screen.getAllByRole('group', { name: 'Farm, grain, level 1, owned by Testland' });
    expect(farms.map((t) => t.getAttribute('data-tile-id'))).toContain('3-9');
    expect(farms).toHaveLength(2);
  });

  it('FR-095 the name is not drawn: the tile shows no terrain text', () => {
    const { container } = render(<MapView />);
    expect(container.querySelector('[data-tile-id="3-9"]')!.textContent).not.toMatch(/Farm|grain|Testland/);
  });
});

describe('FR-096 the browser tab title', () => {
  it('FR-096 layout.tsx titles the page "Imperialism"', () => {
    const layout = readFileSync(join(ROOT, 'src/app/layout.tsx'), 'utf8');
    expect(layout).toMatch(/title:\s*"Imperialism"/);
    expect(layout).not.toMatch(/Create Next App|create next app/);
  });
});
