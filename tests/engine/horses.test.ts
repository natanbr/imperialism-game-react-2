import { describe, expect, it } from 'vitest';
import { newGame } from '@/engine/newGame';
import { computerOrders } from '@/engine/ai/players';
import { minorOffers } from '@/engine/market/partners';
import { collectingHub } from '@/engine/systems/logisticsSystem';
import { resolveTurn } from '@/engine/turn/resolveTurn';
import { TerrainType } from '@/types/Tile';
import { ResourceType } from '@/types/Resource';
import { WorkerType } from '@/types/Workers';
import { validateOrder } from '@/engine/orders/validate';
import { put } from './fixtures';

describe('FR-517 continent Horse Ranches', () => {
  it('FR-517 even a general Developer cannot raise a ranch level, on-site or after a move', () => {
    const start = newGame({ seed: 1, world: 'continent' });
    const farmer = start.map.tiles.flatMap(row => row.flatMap(tile => tile.workers)).find(w => w.nationId === 'nation-1' && w.type === WorkerType.Farmer)!;
    const ranch = start.map.tiles.flat().find(tile => tile.ownerNationId === farmer.nationId && tile.terrain === TerrainType.HorseRanch)!;
    for (const type of [WorkerType.Rancher, WorkerType.Developer]) {
      const common = { nationId: farmer.nationId, workerId: farmer.id };
      const onRanch = put(start, farmer.id, ranch.id, { type });
      expect(validateOrder(onRanch, { ...common, kind: 'startDevelopment', tileId: ranch.id })).toEqual({ ok: false, reason: 'invalid-site' });
      const atCapital = put(start, farmer.id, farmer.assignedTileId!, { type });
      expect(validateOrder(atCapital, { ...common, kind: 'moveAndStartDevelopment', toTileId: ranch.id })).toEqual({ ok: false, reason: 'invalid-site' });
    }
  });
  it('each capital collects its own undeveloped ranch for two successive turns', () => {
    let state = newGame({ seed: 1, world: 'continent' });
    const ranches = state.map.tiles.flat().filter(tile => tile.terrain === TerrainType.HorseRanch);
    expect(ranches).toHaveLength(3);
    for (const nation of state.nations) {
      const own = ranches.filter(tile => tile.ownerNationId === nation.id);
      expect(own).toHaveLength(1);
      expect(own[0].resource).toMatchObject({ type: ResourceType.Horses, level: 0 });
      expect(collectingHub(state, nation.id, own[0].id)?.kind).toBe('capital');
    }
    for (const stock of [4, 5, 6]) {
      expect(state.nations.map(nation => nation.warehouse.horses)).toEqual([stock, stock]);
      state = resolveTurn(state, {}).state;
    }
  });

  it('Arvelia offers one horse again after End Turn', () => {
    const state = newGame({ seed: 1, world: 'continent' });
    for (const turn of [state, resolveTurn(state, {}).state]) {
      expect(minorOffers(turn, 'minor-1').horses).toBe(1);
      expect(turn.minorNations.filter(n => minorOffers(turn, n.id).horses)).toHaveLength(1);
    }
  });
});

it('FR-518 ranches are exclusive to the continent; neither AI orders civilians and the islands never order ships', () => {
  for (const world of ['continent', 'two-islands'] as const) {
    let state = newGame({ seed: 1, world });
    const ranches = state.map.tiles.flat().filter(t => t.resource?.type === ResourceType.Horses);
    expect(ranches).toHaveLength(world === 'continent' ? 3 : 0);
    while (!state.gameOver) {
      const orders = computerOrders(state);
      const kinds = Object.values(orders).flat().map(o => o.kind);
      expect(kinds).not.toContain('setUniversity');
      if (world === 'two-islands') expect(kinds).not.toContain('setShipyard');
      state = resolveTurn(state, orders).state;
    }
  }
});
