// M5 (decision 3): minor nations live in `state.minorNations`, apart from the Great Powers in
// `state.nations`, so every system and view that iterates the nations keeps seeing 2 Great Powers.
// FR-146 the minors, FR-149 their land is closed, FR-156 the score and game over list Great Powers only.
import { describe, it, expect } from 'vitest';
import { newGame } from '@/engine/newGame';
import { resolveTurn } from '@/engine/turn/resolveTurn';
import { validateOrder } from '@/engine/orders/validate';
import { computerOrders } from '@/engine/ai/players';
import { scoreTable } from '@/engine/score/score';
import { countryName, countryOfTile, isGreatPower, minorNationAt } from '@/engine/world/countries';
import { getProspectorActions } from '@/workers/ProspectorWorker';
import { getEngineerActions } from '@/workers/EngineerWorker';
import { getFarmerActions } from '@/workers/FarmerWorker';
import { getRancherActions } from '@/workers/RancherWorker';
import { getForesterActions } from '@/workers/ForesterWorker';
import { getMinerActions } from '@/workers/MinerWorker';
import { getDrillerActions } from '@/workers/DrillerWorker';
import type { GameState } from '@/types/GameState';
import { TerrainType, type Tile } from '@/types/Tile';
import { WorkerType, type Worker } from '@/types/Workers';
import { N1, N2 } from './fixtures';

const continent = (seed = 1): GameState => newGame({ seed, world: 'continent' });
const MINORS = [
  { id: 'minor-1', name: 'Arvelia', capitalTileId: '11-4' },
  { id: 'minor-2', name: 'Sundmark', capitalTileId: '12-9' },
  { id: 'minor-3', name: 'Lorran', capitalTileId: '11-1' },
  { id: 'minor-4', name: 'Pellis', capitalTileId: '12-13' },
];
const minorTiles = (s: GameState): Tile[] => s.map.tiles.flat().filter(t => t.provinceId?.startsWith('province-minor-'));

describe('FR-146 minor nations are not Nation entries', () => {
  it('FR-146 the continent holds the four minors Arvelia, Sundmark, Lorran and Pellis, each with only an id, a name and a capital tile', () => {
    expect(continent().minorNations).toEqual(MINORS);
    for (const minor of continent().minorNations) expect(Object.keys(minor).sort()).toEqual(['capitalTileId', 'id', 'name']);
  });

  it('FR-146 two-islands has no minor nation', () => {
    expect(newGame({ seed: 1, world: 'two-islands' }).minorNations).toEqual([]);
  });

  it('FR-146 state.nations is still the 2 Great Powers, and so are the rail networks and the computer players', () => {
    const s = continent();
    expect(s.nations.map(n => n.id)).toEqual([N1, N2]);
    expect(Object.keys(s.transportNetwork.railroadNetworks!)).toEqual([N1, N2]);
    expect(Object.keys(computerOrders(s))).toEqual([N2]);
  });

  it('FR-146 a minor capital is a Capital tile with no owner and no city; no minor tile has an owner or a civilian', () => {
    const s = continent();
    for (const { capitalTileId } of MINORS) {
      const tile = s.map.tiles.flat().find(t => t.id === capitalTileId)!;
      expect({ terrain: tile.terrain, owner: tile.ownerNationId, city: tile.cityId }).toEqual({ terrain: TerrainType.Capital, owner: undefined, city: undefined });
    }
    expect(minorTiles(s)).toHaveLength(26);
    expect(minorTiles(s).filter(t => t.ownerNationId !== undefined || t.workers.length > 0)).toEqual([]);
  });

  it('FR-146 countryName and isGreatPower answer for Great Powers and minors', () => {
    const s = continent();
    expect(['nation-1', 'nation-2', 'minor-1', 'minor-2', 'minor-3', 'minor-4', 'minor-9'].map(id => [countryName(s, id), isGreatPower(s, id)])).toEqual([
      ['Testland', true],
      ['Valdoria', true],
      ['Arvelia', false],
      ['Sundmark', false],
      ['Lorran', false],
      ['Pellis', false],
      [undefined, false],
    ]);
  });

  it('FR-146 countryOfTile and minorNationAt name the country of a tile: the Great Power owner, else the minor whose province holds it', () => {
    const s = continent();
    const tile = (id: string) => s.map.tiles.flat().find(t => t.id === id)!;
    expect(['3-9', '15-9', '10-3', '12-9', '11-1', '12-14', '0-0'].map(id => countryOfTile(s, tile(id)))).toEqual([
      'nation-1', 'nation-2', 'minor-1', 'minor-2', 'minor-3', 'minor-4', undefined,
    ]);
    expect(minorNationAt(s, tile('10-3'))?.name).toBe('Arvelia');
    expect(minorNationAt(s, tile('3-9'))).toBeUndefined();
  });

  it('FR-146 a minor gives no orders: an order in its name is refused as from an unknown nation', () => {
    const s = continent();
    expect(validateOrder(s, { kind: 'setProduction', nationId: 'minor-1', building: 'lumberMill', amount: 1 })).toEqual({ ok: false, reason: 'unknown-nation' });
  });

  it('FR-146 a resolved turn touches the Great Powers only: every event that names a nation names one of the 2', () => {
    const s = continent();
    const { state, events } = resolveTurn(s, computerOrders(s), s.seed);
    const named = [...new Set(events.flatMap(e => ('nationId' in e && e.nationId ? [e.nationId] : [])))].sort();
    expect(named.every(id => id === N1 || id === N2)).toBe(true);
    expect(state.minorNations).toEqual(s.minorNations);
    expect(minorTiles(state)).toEqual(minorTiles(s));
  });
});

describe('FR-156 Great Powers only in the score and the game over', () => {
  it('FR-156 the score table of a new continent game has the 2 Great Powers', () => {
    expect(scoreTable(continent()).map(r => r.nationId).sort()).toEqual([N1, N2]);
  });

  it('FR-156 the game-over record of a continent game holds 2 scores', () => {
    const { state } = resolveTurn({ ...continent(), turnLimit: 1 }, {}, 1);
    expect(state.gameOver?.scores.map(r => r.nationId).sort()).toEqual([N1, N2]);
  });
});

describe('FR-149 minor land is closed to Great Power civilians', () => {
  const PLAYERS: [WorkerType, (tile: Tile, map: GameState['map'], worker: Worker) => unknown][] = [
    [WorkerType.Prospector, getProspectorActions],
    [WorkerType.Engineer, getEngineerActions],
    [WorkerType.Farmer, getFarmerActions],
    [WorkerType.Rancher, getRancherActions],
    [WorkerType.Forester, getForesterActions],
    [WorkerType.Miner, getMinerActions],
    [WorkerType.Driller, getDrillerActions],
  ];

  it('FR-149 the map\'s job cursor offers nothing on any minor tile to any civilian of Testland', () => {
    const s = continent();
    const civilians = s.map.tiles.flat().flatMap(t => t.workers).filter(w => w.nationId === N1);
    const offers = PLAYERS.flatMap(([type, actions]) => {
      const worker = civilians.find(w => w.type === type)!;
      return minorTiles(s).flatMap(tile => {
        const action = actions(tile, s.map, worker);
        return action ? [`${type} on ${tile.id}: ${JSON.stringify(action)}`] : [];
      });
    });
    expect(offers).toEqual([]);
  });
});
