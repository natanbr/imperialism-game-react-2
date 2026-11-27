import { describe, expect, it } from 'vitest';
import { ResourceDevelopmentTable } from '@/definisions/ResourceDevelopment';
import { tryApplyOrder } from '@/engine/orders/apply';
import { DEVELOPMENT_TERRAINS } from '@/engine/orders/queries';
import { validateOrder } from '@/engine/orders/validate';
import { developmentSystem } from '@/engine/systems/developmentSystem';
import { createTurnContext } from '@/engine/turn/context';
import type { GameState } from '@/types/GameState';
import { ResourceType as R } from '@/types/Resource';
import { TerrainType as Land } from '@/types/Tile';
import { WorkerType as W } from '@/types/Workers';
import { deepFreeze, game, N1, N2, put, setTechnologies, setTile, T, tileAt, workerId } from './fixtures';

const site = T.farm1;
const surveyor = workerId(N1, W.Prospector);
const survey = { kind: 'startProspecting', nationId: N1, workerId: surveyor, tileId: site } as const;

describe('FR-580 terrain workers, fixed production and development levels', () => {
  const surface = [
    [Land.DryPlains, R.Grain, null], [Land.Farm, R.Grain, W.Farmer], [Land.Orchard, R.Fruit, W.Farmer],
    [Land.Plantation, R.Cotton, W.Farmer], [Land.OpenRange, R.Livestock, W.Rancher], [Land.FertileHills, R.Wool, W.Rancher],
    [Land.HorseRanch, R.Horses, null], [Land.HardwoodForest, R.Timber, W.Forester], [Land.ScrubForest, R.Timber, null],
    [Land.BarrenHills, R.IronOre, W.Miner], [Land.Mountains, R.Gold, W.Miner], [Land.Swamp, R.Oil, W.Driller],
    [Land.Desert, R.Oil, W.Driller], [Land.Tundra, R.Oil, W.Driller],
  ] as const;
  it.each(surface)('%s produces %s and is worked by %s', (terrain, resource, worker) => {
    expect(Object.entries(DEVELOPMENT_TERRAINS).filter(([, lands]) => lands.includes(terrain)).map(([type]) => type))
      .toEqual(worker ? [worker] : []);
    if (worker) return;
    // FR-630: no generic improver is left, so each specialist is refused the fixed-output terrain
    const id = workerId(N1, W.Farmer);
    for (const type of [W.Farmer, W.Rancher, W.Forester, W.Miner, W.Driller]) {
      const state = put(setTile(game(), site, { terrain, resource: { type: resource, level: 0 } }), id, site, { type });
      expect(validateOrder(state, { kind: 'startDevelopment', nationId: N1, workerId: id, tileId: site }))
        .toEqual({ ok: false, reason: 'invalid-site' });
    }
  });

  it('covers every raw yield series from level zero', () => {
    const yields = Object.fromEntries(Object.entries(ResourceDevelopmentTable).map(([type, levels]) => [type, Object.values(levels)]));
    expect(yields).toEqual({
      grain: [1,2,3,4], fruit: [1,2,3,4], cotton: [1,2,3,4], livestock: [1,2,3,4], wool: [1,2,3,4],
      timber: [1,2,3,4], oil: [0,2,4,6], coal: [0,2,4,6], ironOre: [0,2,4,6],
      gold: [0,1,2,3], gems: [0,1,2,3], fish: [1], horses: [1],
    });
  });

  const mine = [null, 'squareSetTimbering', 'dynamite'] as const;
  const gates = [
    [Land.FertileHills, R.Wool, W.Rancher, ['feedGrasses', 'spinningJenny', 'powerLoom']],
    [Land.Swamp, R.Oil, W.Driller, ['oilDrilling', 'chemistry', 'internalCombustion']],
    ...[R.Coal, R.IronOre, R.Gold, R.Gems].map(res => [Land.Mountains, res, W.Miner, mine] as const),
  ] as const;
  it.each(gates)('%s, %s checks the acting nation at each level', (terrain, type, specialist, levels) => {
    const id = workerId(N1, specialist);
    for (const [level, techId] of levels.entries()) {
      const state = put(setTile(game(), site, { terrain, resource: { type, discovered: true, level } }), id, site);
      const order = { kind: 'startDevelopment', nationId: N1, workerId: id, tileId: site } as const;
      if (techId) {
        const rivalOwns = setTechnologies(setTechnologies(state, N1), N2, techId);
        expect(validateOrder(rivalOwns, order)).toEqual({ ok: false, reason: 'missing-technology', techId });
      }
      const owned = setTechnologies(state, N1, ...(techId ? [techId] : []));
      expect(tryApplyOrder(deepFreeze(owned), order).state.map.tiles.flat().find(t => t.id === site)?.developmentJob?.targetLevel).toBe(level + 1);
    }
  });
});

function undiscovered(terrain: Land, minorOrigin = false): GameState {
  const state = setTechnologies(put(game(), surveyor, site), N1, 'oilDrilling');
  if (minorOrigin) {
    state.minorNations = [{ id: 'minor-1', name: 'Minor', capitalTileId: site }];
    state.provinces = [{ id: 'survey-province', name: 'Former minor', ownerId: N1, startOwnerId: 'minor-1', seatTileId: site, tileIds: [site] }];
  }
  return setTile(state, site, { terrain, resource: undefined, provinceId: state.provinces[0]?.id });
}

function search(state: GameState, seed: number) {
  const started = tryApplyOrder(deepFreeze(state), survey);
  expect(started.result).toEqual({ ok: true });
  return developmentSystem(deepFreeze(started.state), createTurnContext({ turn: state.turn, seed }));
}

describe('FR-581 one-turn, terrain-specific prospecting', () => {
  it.each([
    [Land.BarrenHills, false, [undefined, R.Coal, R.IronOre]],
    [Land.Mountains, false, [undefined, R.Coal, R.IronOre, R.Gold]],
    [Land.Mountains, true, [undefined, R.Coal, R.IronOre, R.Gold, R.Gems]],
    ...[Land.Desert, Land.Swamp, Land.Tundra].map(terrain => [terrain, false, [undefined, R.Oil]] as const),
  ] as const)('%s (minor origin: %s) returns every eligible result across seeds', (terrain, minorOrigin, legal) => {
    const state = undiscovered(terrain, minorOrigin);
    const seen = new Set<R | undefined>();
    for (let seed = 0; seed < 48; seed++) {
      const found = tileAt(search(state, seed), site);
      expect(found).toEqual(tileAt(search(state, seed), site));
      expect(found.prospecting).toBeUndefined();
      expect(found.prospected).toBe(true);
      seen.add(found.resource?.type);
      if (found.resource) expect(found.resource).toMatchObject({ level: 0, discovered: true });
      else expect(validateOrder(put(setTile(state, site, found), surveyor, site), survey)).toEqual({ ok: false, reason: 'invalid-target' });
    }
    expect(seen).toEqual(new Set(legal));
  });
  it('preserves an authored or saved deposit without drawing a random number', () => {
    const state = setTile(undiscovered(Land.Mountains), site, { resource: { type: R.IronOre, level: 0, discovered: false } });
    const started = tryApplyOrder(state, survey);
    expect(started.result.ok).toBe(true);
    const next = developmentSystem(started.state, createTurnContext({ turn: state.turn, rng: { next: () => { throw Error('unexpected draw'); } } }));
    expect(tileAt(next, site).resource).toEqual({ type: R.IronOre, level: 0, discovered: true });
  });
  it('requires Oil Drilling for either survey Order, even on hills-free oil land with no deposit assigned', () => {
    const state = setTechnologies(setTechnologies(undiscovered(Land.Desert), N1), N2, 'oilDrilling');
    const missing = { ok: false, reason: 'missing-technology', techId: 'oilDrilling' };
    expect(validateOrder(state, survey)).toEqual(missing);
    const move = { kind: 'moveAndStartProspecting', nationId: N1, workerId: surveyor, toTileId: site } as const;
    expect(validateOrder(put(state, surveyor, T.capital1), move)).toEqual(missing);
    expect(validateOrder(setTechnologies(state, N1, 'oilDrilling'), survey)).toEqual({ ok: true });
  });
});
