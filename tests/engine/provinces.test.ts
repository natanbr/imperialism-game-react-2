// M5 (decision 6): provinces. Each land tile of a world with provinces names its province; ownership
// moves by province through one helper, so the `ownerNationId` read sites keep their meaning.
// FR-147 the provinces and their queries, FR-148 transferProvince and the migrant cap.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, it, expect } from 'vitest';
import { newGame } from '@/engine/newGame';
import { validateOrder } from '@/engine/orders/validate';
import { migrantCap } from '@/engine/industry/industryState';
import { adjacentProvinces, provinceOf, provincesOf, transferProvince } from '@/engine/world/provinces';
import type { GameState } from '@/types/GameState';
import { TerrainType, type Tile } from '@/types/Tile';
import { deepFreeze, N1, N2, setWarehouse } from './fixtures';

const continent = (): GameState => newGame({ seed: 1, world: 'continent' });
const tiles = (s: GameState): Tile[] => s.map.tiles.flat();
const isLand = (t: Tile) => t.terrain !== TerrainType.Water;
const QUARTERS = [
  { suffix: 'nw', name: 'North-West' },
  { suffix: 'ne', name: 'North-East' },
  { suffix: 'sw', name: 'South-West' },
  { suffix: 'se', name: 'South-East' },
];

describe('FR-147 the provinces of the continent', () => {
  it('FR-147 two-islands has no province and no tile names one', () => {
    const s = newGame({ seed: 1, world: 'two-islands' });
    expect(s.provinces).toEqual([]);
    expect(tiles(s).filter(t => t.provinceId !== undefined)).toEqual([]);
  });

  it('FR-147 4 provinces per Great Power and 1 per minor, with the FR-147 ids, names, owners and seats', () => {
    const rows = continent().provinces.map(({ id, name, ownerId, seatTileId, tileIds }) => ({ id, name, ownerId, seatTileId, size: tileIds.length }));
    expect(rows).toEqual([
      { id: 'province-nation-1-nw', name: 'Testland North-West', ownerId: N1, seatTileId: '4-4', size: 22 },
      { id: 'province-nation-1-ne', name: 'Testland North-East', ownerId: N1, seatTileId: '7-3', size: 21 },
      { id: 'province-nation-1-sw', name: 'Testland South-West', ownerId: N1, seatTileId: '2-9', size: 25 },
      { id: 'province-nation-1-se', name: 'Testland South-East', ownerId: N1, seatTileId: '7-10', size: 32 },
      { id: 'province-nation-2-nw', name: 'Valdoria North-West', ownerId: N2, seatTileId: '16-4', size: 22 },
      { id: 'province-nation-2-ne', name: 'Valdoria North-East', ownerId: N2, seatTileId: '19-3', size: 21 },
      { id: 'province-nation-2-sw', name: 'Valdoria South-West', ownerId: N2, seatTileId: '14-9', size: 25 },
      { id: 'province-nation-2-se', name: 'Valdoria South-East', ownerId: N2, seatTileId: '19-10', size: 32 },
      { id: 'province-minor-1', name: 'Arvelia', ownerId: 'minor-1', seatTileId: '11-4', size: 12 },
      { id: 'province-minor-2', name: 'Sundmark', ownerId: 'minor-2', seatTileId: '12-9', size: 5 },
      { id: 'province-minor-3', name: 'Lorran', ownerId: 'minor-3', seatTileId: '11-1', size: 4 },
      { id: 'province-minor-4', name: 'Pellis', ownerId: 'minor-4', seatTileId: '12-13', size: 5 },
    ]);
  });

  it('FR-147 every land tile carries exactly the province whose tileIds list it, and no sea tile carries one', () => {
    const s = continent();
    const listed = new Map(s.provinces.flatMap(p => p.tileIds.map(id => [id, p.id] as const)));
    expect(listed.size).toBe(s.provinces.reduce((n, p) => n + p.tileIds.length, 0));
    expect(tiles(s).filter(isLand).map(t => [t.id, t.provinceId])).toEqual(tiles(s).filter(isLand).map(t => [t.id, listed.get(t.id)]));
    expect(tiles(s).filter(t => !isLand(t) && t.provinceId !== undefined)).toEqual([]);
    for (const p of s.provinces) expect(p.tileIds).toContain(p.seatTileId);
  });

  it('FR-147 a Great Power island splits by the island column lx = x mod 12 and the row: North (y <= 6) / South, West (lx <= 5) / East', () => {
    const s = continent();
    const wrong = tiles(s)
      .filter(t => t.ownerNationId)
      .filter(t => {
        const lx = t.x % 12;
        const quarter = `${t.y <= 6 ? 'n' : 's'}${lx <= 5 ? 'w' : 'e'}`;
        return t.provinceId !== `province-${t.ownerNationId}-${quarter}`;
      })
      .map(t => t.id);
    expect(wrong).toEqual([]);
    for (const nationId of [N1, N2]) {
      const name = s.nations.find(n => n.id === nationId)!.name;
      expect(provincesOf(s, nationId).map(p => p.name)).toEqual(QUARTERS.map(q => `${name} ${q.name}`));
    }
  });

  it('FR-147 provinceOf names the province of a tile; a sea tile has none', () => {
    const s = continent();
    expect(['3-9', '2-9', '9-4', '14-9', '11-4', '0-0'].map(id => provinceOf(s, id)?.name)).toEqual([
      'Testland South-West', 'Testland South-West', 'Testland North-East', 'Valdoria South-West', 'Arvelia', undefined,
    ]);
  });

  it('FR-147 provincesOf: 4 per Great Power and 1 per minor at the start', () => {
    const s = continent();
    expect(['nation-1', 'nation-2', 'minor-1', 'minor-2', 'minor-3', 'minor-4', 'minor-9'].map(id => provincesOf(s, id).length)).toEqual([4, 4, 1, 1, 1, 1, 0]);
  });

  it('FR-147 adjacentProvinces: Arvelia borders Testland North-East and Valdoria North-West; Sundmark, Lorran and Pellis border no province', () => {
    const s = continent();
    expect(adjacentProvinces(s, 'province-minor-1').map(p => p.id)).toEqual(['province-nation-1-ne', 'province-nation-2-nw']);
    for (const id of ['province-minor-2', 'province-minor-3', 'province-minor-4']) expect(adjacentProvinces(s, id)).toEqual([]);
  });

  it('FR-147 adjacency is symmetric, never includes the province itself, and joins the four quarters of an island', () => {
    const s = continent();
    for (const p of s.provinces) {
      const around = adjacentProvinces(s, p.id).map(q => q.id);
      expect(around).not.toContain(p.id);
      for (const q of around) expect(adjacentProvinces(s, q).map(r => r.id)).toContain(p.id);
    }
    expect(adjacentProvinces(s, 'province-nation-1-sw').map(p => p.id)).toEqual(expect.arrayContaining(['province-nation-1-nw', 'province-nation-1-se']));
  });
});

describe('FR-148 ownership moves by province', () => {
  it('FR-148 transferProvince gives the province and each of its tiles to a Great Power and leaves its input unchanged', () => {
    const before = deepFreeze(continent());
    const snapshot = structuredClone(before);

    const after = transferProvince(before, 'province-nation-1-ne', N2);

    expect(before).toEqual(snapshot);
    const province = after.provinces.find(p => p.id === 'province-nation-1-ne')!;
    expect(province.ownerId).toBe(N2);
    expect(province.tileIds.map(id => tiles(after).find(t => t.id === id)!.ownerNationId)).toEqual(province.tileIds.map(() => N2));
    const others = (s: GameState) => tiles(s).filter(t => t.provinceId !== 'province-nation-1-ne');
    expect(others(after)).toEqual(others(before));
    expect(after.provinces.filter(p => p.id !== province.id)).toEqual(before.provinces.filter(p => p.id !== province.id));
  });

  it('FR-148 a province given to a minor leaves its tiles with no ownerNationId; one taken from a minor gets the Great Power\'s id', () => {
    const toMinor = transferProvince(continent(), 'province-nation-1-ne', 'minor-1');
    const ne = toMinor.provinces.find(p => p.id === 'province-nation-1-ne')!;
    expect(ne.ownerId).toBe('minor-1');
    expect(tiles(toMinor).filter(t => t.provinceId === ne.id && t.ownerNationId !== undefined)).toEqual([]);

    const fromMinor = transferProvince(continent(), 'province-minor-1', N1);
    expect(tiles(fromMinor).filter(t => t.provinceId === 'province-minor-1').map(t => t.ownerNationId)).toEqual(Array(12).fill(N1));
    expect(provincesOf(fromMinor, N1)).toHaveLength(5);
    expect(provincesOf(fromMinor, 'minor-1')).toHaveLength(0);
  });

  it('FR-148 an unknown province or new owner throws', () => {
    expect(() => transferProvince(continent(), 'province-x', N1)).toThrow(/province-x/);
    expect(() => transferProvince(continent(), 'province-minor-1', 'nation-9')).toThrow(/nation-9/);
  });

  it('FR-148 Nation.provinces is gone: the provinces are only in state.provinces', () => {
    for (const world of ['two-islands', 'continent'] as const) {
      for (const nation of newGame({ seed: 1, world }).nations) expect(nation).not.toHaveProperty('provinces');
    }
  });

  it('FR-148 FR-042 the migrant cap is max(1, floor(provinces / 4)): 1 on two-islands (0), 1 on a new continent game (4), 2 for a nation holding 8', () => {
    const eight = [1, 2, 3, 4].reduce((s, i) => transferProvince(s, `province-nation-2-${QUARTERS[i - 1].suffix}`, N1), continent());
    expect([
      migrantCap(newGame({ seed: 1, world: 'two-islands' }), N1),
      migrantCap(continent(), N1),
      migrantCap(eight, N1),
      migrantCap(eight, N2),
    ]).toEqual([1, 1, 2, 1]);

    const stock = { cannedFood: 2, clothing: 2, furniture: 2 };
    const two = { kind: 'recruitWorkers', nationId: N1, delta: 2 } as const;
    expect(validateOrder(setWarehouse(continent(), N1, stock), two)).toEqual({ ok: false, reason: 'limit-reached' });
    expect(validateOrder(setWarehouse(eight, N1, stock), two)).toEqual({ ok: true });
  });

  it('FR-148 after newGame no engine code writes ownerNationId but the world builders and transferProvince', () => {
    const root = join(process.cwd(), 'src/app/engine');
    const files = (dir: string): string[] =>
      readdirSync(dir).flatMap(name => {
        const path = join(dir, name);
        return statSync(path).isDirectory() ? files(path) : path.endsWith('.ts') ? [path] : [];
      });
    const code = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    const WRITES_OWNER = /ownerNationId\s*:(?!\s*(string|NationId))|ownerNationId\s*=[^=]|delete\s+\w+\.ownerNationId/;
    const writers = files(root)
      .filter(path => WRITES_OWNER.test(code(readFileSync(path, 'utf8'))))
      .map(path => relative(root, path).replaceAll('\\', '/'))
      .sort();
    expect(writers).toEqual(['world/provinces.ts', 'world/startWorld.ts']);
  });
});
