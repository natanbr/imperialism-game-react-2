import { newGame } from '@/engine/newGame';
import { addPort } from '@/engine/systems/railroadSystem';
import { transportConnectivitySystem } from '@/engine/systems/transportConnectivitySystem';
import { createTurnContext } from '@/engine/turn/context';
import { ResourceType } from '@/types/Resource';
import { N1, setBuilding, setTile, tileAt } from './fixtures';

/** A coastal seat one qualifying settlement away from its first furniture. */
export function coastalFreightTown(difficulty: 'normal' | 'demo' = 'normal') {
  let game = newGame({ seed: 1, world: 'continent', difficulty });
  const seat = tileAt(game, '10-7');
  const province = game.provinces.find(p => p.id === seat.provinceId)!;
  game = { ...game, provinces: game.provinces.map(p => p === province ? { ...p, seatTileId: seat.id } : p),
    townProgress: { [province.id]: { ownerId: N1, connectedSettlements: 7,
      matured: { textile: 0, wood: 1, metal: 0 }, upgradeSettlements: { textile: 0, wood: 1, metal: 0 } } } };
  for (const id of province.tileIds.slice(0, 4)) game = setTile(game, id, { resource: { type: ResourceType.Timber, level: 1 } });
  game = setBuilding(game, N1, 'furnitureFactory', { capacity: 8 });
  game = addPort(setTile(game, seat.id, { port: true }), N1, seat);
  game = transportConnectivitySystem(game, createTurnContext({ turn: game.turn }));
  return { game, province, seat };
}
