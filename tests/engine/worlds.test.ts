// M5 (decision 1): newGame builds one world of the WORLDS registry. "two-islands" is the v1 world and
// stays the engine's default, so every v1 call and fixture is unchanged; "continent" is the v2 world.
import { describe, it, expect } from 'vitest';
import { newGame } from '@/engine/newGame';
import { WORLDS } from '@/engine/world/worlds';
import { startWorld } from '@/engine/world/startWorld';
import type { WorldId } from '@/types/World';

describe('FR-144 the world option of newGame', () => {
  it('FR-144 the registry holds exactly "two-islands" and "continent"', () => {
    expect(Object.keys(WORLDS).sort()).toEqual(['continent', 'two-islands']);
  });

  it('FR-144 without a world newGame builds "two-islands" and records it', () => {
    const g = newGame({ seed: 3 });

    expect(g.worldId).toBe('two-islands');
    expect(g).toEqual(newGame({ seed: 3, world: 'two-islands' }));
  });

  it('FR-144 newGame(seed) is newGame({ seed })', () => {
    expect(newGame(3)).toEqual(newGame({ seed: 3 }));
  });

  it('FR-144 "two-islands" is the v1 start built by the same code: startWorld\'s map and nations, no minor nation, no province', () => {
    const g = newGame({ seed: 3, world: 'two-islands' });
    const v1 = startWorld();

    expect(g.map).toEqual(v1.map);
    expect(g.nations).toEqual(v1.nations);
    expect(g.minorNations).toEqual([]);
    expect(g.provinces).toEqual([]);
    expect(g.map.tiles.flat().filter(t => t.provinceId !== undefined)).toEqual([]);
  });

  it('FR-144 "continent" records its id and keeps the seed and the turn limit', () => {
    const g = newGame({ seed: 8, turnLimit: 12, world: 'continent' });

    expect(g).toMatchObject({ worldId: 'continent', seed: 8, turnLimit: 12, turn: 1, year: 1815 });
  });

  it('FR-144 an unknown world throws an error that names the known keys', () => {
    const build = () => newGame({ seed: 1, world: 'flat-earth' as WorldId });

    expect(build).toThrow(/flat-earth/);
    expect(build).toThrow(/two-islands/);
    expect(build).toThrow(/continent/);
  });

  it('FR-144 each world builds the same game for any seed (the map does not depend on the seed)', () => {
    for (const world of ['two-islands', 'continent'] as const) {
      expect(newGame({ seed: 1, world }).map).toEqual(newGame({ seed: 99, world }).map);
    }
  });
});
