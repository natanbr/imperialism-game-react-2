import { describe, expect, it } from 'vitest';
import { getAdjacentTiles, isOcean } from '@/engine/map/mapHelpers';
import { newGame } from '@/engine/newGame';
import { tryApplyOrder } from '@/engine/orders/apply';
import type { Order } from '@/engine/orders/Order';
import { logisticsSystem } from '@/engine/systems/logisticsSystem';
import { technologyTurn } from '@/engine/technology';
import { createTurnContext } from '@/engine/turn/context';
import { resolveTurn } from '@/engine/turn/resolveTurn';
import type { GameState } from '@/types/GameState';
import { ResourceType } from '@/types/Resource';
import { TerrainType } from '@/types/Tile';
import { WorkerType } from '@/types/Workers';
import { N1, N2, setTechnologies, setTile, setTreasury, stockOf, tileAt, treasury } from './fixtures';

function accepted(state: GameState, order: Order) {
  const attempt = tryApplyOrder(state, order);
  expect(attempt.result).toEqual({ ok: true });
  return attempt.state;
}

function coalfield(state: GameState) {
  return state.map.tiles.flat().find(t => t.ownerNationId === N1 && t.resource?.type === ResourceType.Coal)!;
}

function specialist(state: GameState, type: WorkerType) {
  return state.map.tiles.flat().flatMap(t => t.workers).find(w => w.nationId === N1 && w.type === type)!.id;
}

describe('FR-580, FR-581 and FR-583 on M18e maps with M18f credit', () => {
  it.each(['standard', 'large'] as const)('ships fish from the actual %s generated coastline', randomMapSize => {
    const start = newGame({ world: 'random', seed: 42, randomMapSize });
    for (const nation of start.nations) {
      const capital = start.map.tiles.flat().find(t => t.cityId === nation.cities[0])!;
      const seaHexes = getAdjacentTiles(start.map, capital.x, capital.y).filter(isOcean).length;
      expect(seaHexes).toBeGreaterThan(0);
      const ordered = accepted(start, {
        kind: 'setTransportAllocations', nationId: nation.id, allocations: { fish: seaHexes },
      });
      const delivered = logisticsSystem(ordered, createTurnContext({ turn: ordered.turn }));
      expect(stockOf(delivered, nation.id, 'fish') - stockOf(start, nation.id, 'fish')).toBe(seaHexes);
    }
  });

  it('surveys a hidden generated seam on credit and completes a mine on it', () => {
    const start = newGame({ world: 'random', seed: 42 });
    const deposit = coalfield(start);
    expect(deposit.resource).toMatchObject({ discovered: false, level: 0 });
    const survey: Order = {
      kind: 'moveAndStartProspecting', nationId: N1, workerId: specialist(start, WorkerType.Prospector), toTileId: deposit.id,
    };
    const credit = accepted(start, { kind: 'openCredit', nationId: N1 });
    const short = setTreasury(credit, N1, -101);
    const refused = tryApplyOrder(short, survey);
    expect(refused.result).toEqual({ ok: false, reason: 'insufficient-funds', cost: 100, buyingPower: 99 });
    expect(refused.state).toBe(short);
    const paid = accepted(setTreasury(credit, N1, -100), survey);
    expect(treasury(paid, N1)).toBe(-200);
    const surveyed = resolveTurn(paid, {}).state;
    expect(tileAt(surveyed, deposit.id).resource).toEqual({ type: ResourceType.Coal, level: 0, discovered: true });
    const started = accepted(setTreasury(surveyed, N1, 0), {
      kind: 'moveAndStartDevelopment', nationId: N1, workerId: specialist(surveyed, WorkerType.Miner), toTileId: deposit.id,
    });
    expect(treasury(started, N1)).toBe(-100);
    let mined = started;
    for (let turn = 0; turn < 3; turn++) mined = resolveTurn(mined, {}).state;
    expect(tileAt(mined, deposit.id)).toMatchObject({ resource: { type: ResourceType.Coal, level: 1 } });
    expect(tileAt(mined, deposit.id).developmentJob).toBeUndefined();
  });

  it('requires owned Square-Set Timbering before credit can fund a level-two mountain mine', () => {
    const start = newGame({ world: 'random', seed: 42 });
    const deposit = coalfield(start);
    // The generator uses Barren Hills. Put a working mountain mine in the same province for FR-580.
    const mountain = setTile(start, deposit.id, {
      terrain: TerrainType.Mountains, resource: { type: ResourceType.Coal, level: 1, discovered: true },
    });
    const techId = 'squareSetTimbering';
    const eligible = { ...setTechnologies(mountain, N2, techId), turn: technologyTurn(mountain, techId) };
    const credit = accepted(eligible, { kind: 'openCredit', nationId: N1 });
    const improve: Order = {
      kind: 'moveAndStartDevelopment', nationId: N1, workerId: specialist(credit, WorkerType.Miner), toTileId: deposit.id,
    };
    const missing = { ok: false, reason: 'missing-technology', techId };
    expect(tryApplyOrder(credit, improve).result).toEqual(missing);
    const bought = accepted(setTreasury(credit, N1, 1300), { kind: 'buyTechnology', nationId: N1, techId });
    expect(treasury(bought, N1)).toBe(-200);
    expect(tryApplyOrder(bought, improve).result).toEqual(missing);
    const learned = resolveTurn(bought, {}).state;
    const short = setTreasury(learned, N1, 799);
    const refused = tryApplyOrder(short, improve);
    expect(refused.result).toEqual({ ok: false, reason: 'insufficient-funds', cost: 1000, buyingPower: 999 });
    expect(refused.state).toBe(short);
    const started = accepted(setTreasury(learned, N1, 800), improve);
    expect(treasury(started, N1)).toBe(-200);
    expect(tileAt(started, deposit.id).developmentJob?.targetLevel).toBe(2);
  });
});
