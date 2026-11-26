import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { expect, it } from 'vitest';
import { createGameStore } from '@/store/rootStore';
import { readSave, saveOf, type SavedGame } from '@/store/persistence';
import { replaySession } from '@/store/sessionReplay';
import { GoodsType, MaterialType } from '@/types/Resource';
import type { Order } from '@/engine/orders/Order';
import { isMilitia, REGIMENTS } from '@/definisions/regiments';
import { armyAt, capitalProvinceOf } from '@/engine/army/armies';
import { deepFreeze } from '../engine/fixtures';

function load(raw: string) {
  const slot = readSave({getItem: () => raw});
  if (slot.kind !== 'usable') throw new Error('Save was unusable');
  return slot.save;
}

it('FR-558 FR-587 FR-616 continues and replays an independently captured pre-M17 continent with an edited production order', () => {
  const raw = gunzipSync(readFileSync(join(__dirname,'fixtures/pre-m17-continent.json.gz'))).toString('utf8');
  const save = load(raw);
  const original: SavedGame = JSON.parse(raw);
  // FR-616: fishing changes the first settlement. Replay start 1 -> 2, with the one production order already applied.
  expect(save.replayBoundary).toEqual({ turn: 2, appliedOrders: 1, checkpoint: save.game });
  expect(save.game.map).toEqual(original.game.map);
  expect(save.ordersThisTurn).toEqual(original.ordersThisTurn);
  expect(save.game.worldId).toBe('continent');
  expect(replaySession(save)).toEqual(save.game);
  const missingFleetFields = JSON.stringify(JSON.parse(raw), (key,value) => key === 'fleets' ? undefined : value);
  expect(load(missingFleetFields).game).toEqual(save.game);
  const store = createGameStore({seed:99});
  store.getState().restoreGame(save);
  const nationId = save.activeNationId;
  const submit = (order: Order) => expect(store.getState().submitOrder(order)).toEqual({ok:true});
  submit({kind:'setProduction',nationId,building:'lumberMill',output:MaterialType.Paper,amount:0});
  submit({kind:'setProduction',nationId,building:'textileMill',output:MaterialType.Fabric,amount:1});
  submit({kind:'setProduction',nationId,building:'metalWorks',output:GoodsType.Armaments,amount:1});
  store.getState().advanceTurn();
  store.getState().advanceTurn();
  submit({kind:'setShipyard',nationId,ship:'frigate',count:1});
  store.getState().advanceTurn();
  submit({kind:'setFleetMission',nationId,fleetId:store.getState().game.fleets[0].id,mission:'sail',provinceId:'province-minor-2'});
  const continued = load(JSON.stringify(saveOf(store.getState())));
  expect(continued.replayBoundary).toEqual(save.replayBoundary);
  expect(replaySession(continued)).toEqual(continued.game);
});

it('FR-558 restores a paid build, edited sail, arrival, stationed site, reserved landing and return through Continue and replay', () => {
  const fresh = () => createGameStore({world:'continent',market:'world',seed:1});
  const store = fresh();
  const nationId = store.getState().activeNationId;
  const history: (Order | 'advance')[] = [];
  const submit = (order:Order) => {
    expect(store.getState().submitOrder(order)).toEqual({ok:true});
    history.push(order);
  };
  const advance = () => {
    store.getState().advanceTurn();
    history.push('advance');
  };
  const check = () => {
    const original = saveOf(store.getState(),new Date(0));
    const loaded = load(JSON.stringify(original));
    expect(replaySession(deepFreeze(loaded))).toEqual(original.game);
    expect(replaySession(deepFreeze(structuredClone(loaded)))).toEqual(original.game);
    const restored = createGameStore({seed:77});
    restored.getState().restoreGame(loaded);
    expect(saveOf(restored.getState(),new Date(0))).toEqual(original);
    restored.getState().advanceTurn();
    const control = fresh();
    for (const action of history) {
      if (action === 'advance') control.getState().advanceTurn();
      else expect(control.getState().submitOrder(action)).toEqual({ok:true});
    }
    control.getState().advanceTurn();
    expect(saveOf(restored.getState(),new Date(0))).toEqual(saveOf(control.getState(),new Date(0)));
  };
  submit({kind:'buyCommodity',nationId,commodity:GoodsType.Armaments,amount:2});
  submit({kind:'buyCommodity',nationId,commodity:MaterialType.Fabric,amount:2});
  advance();
  submit({kind:'setShipyard',nationId,ship:'frigate',count:1});
  check();
  advance();
  const fleetId = store.getState().game.fleets[0].id;
  submit({kind:'setFleetMission',nationId,fleetId,mission:'sail',provinceId:'province-minor-2'});
  submit({kind:'setFleetMission',nationId,fleetId,mission:'sail',provinceId:'province-nation-1-nw'});
  check();
  advance();
  check();
  submit({kind:'setFleetMission',nationId,fleetId,mission:'station'});
  advance();
  expect(store.getState().game.fleets[0].siteSinceTurn).toBe(store.getState().game.turn-1);
  check();
  const game = store.getState().game;
  const fromProvinceId = capitalProvinceOf(game,nationId)!.id;
  const regiment = armyAt(game,nationId,fromProvinceId)!.regiments.find(r => !isMilitia(r.type) && REGIMENTS[r.type].stats.armamentsCost <= 2)!;
  submit({kind:'moveArmy',via:'sea',nationId,fromProvinceId,toProvinceId:'province-nation-1-nw',regimentIds:[regiment.id]});
  check();
  submit({kind:'cancelArmyMove',nationId,regimentIds:[regiment.id]});
  submit({kind:'setFleetMission',nationId,fleetId,mission:'return'});
  check();
});
