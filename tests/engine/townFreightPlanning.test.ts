import { expect, it } from 'vitest';
import { collectedAtLogistics } from '@/engine/ai/economy';
import { scriptedPlayer } from '@/engine/ai/scriptedPlayer';
import { resolveTurn } from '@/engine/turn/resolveTurn';
import { ResourceType } from '@/types/Resource';
import { deepFreeze, N1, N2, setBuilding, setTile } from './fixtures';
import { coastalFreightTown } from './townFreightFixture';

it.each(['normal', 'demo'] as const)('FR-621 FR-625 %s computer freight sees its own next bundle and ignores rival changes', difficulty => {
  const { game } = coastalFreightTown(difficulty);
  const rival = game.provinces.find(p => p.ownerId === N2)!;
  let alternative = setBuilding(game, N2, 'metalWorks', { capacity: 16, pendingCapacity: 2 });
  alternative = setTile(alternative, rival.seatTileId, { resource: { type: ResourceType.IronOre, level: 0, discovered: false } });
  alternative = { ...alternative, transportAllocationsByNation: { [N2]: { hardware: 4 } },
    townProgress: { ...alternative.townProgress, [rival.id]: { ownerId: N2, connectedSettlements: 12,
      matured: { textile: 0, wood: 0, metal: 4 }, upgradeSettlements: { textile: 0, wood: 0, metal: 0 } } } };
  const forecast = collectedAtLogistics(deepFreeze(game), N1);
  expect(forecast).toMatchObject({ lumber: 2, furniture: 1 });
  expect(collectedAtLogistics(deepFreeze(alternative), N1)).toEqual(forecast);
  const plan = scriptedPlayer(game, N1);
  expect(plan.length).toBeGreaterThan(0);
  expect(scriptedPlayer(alternative, N1)).toEqual(plan);
});

it('FR-625 a due survey can unlock steel at settlement without revealing the deposit in the computer forecast', () => {
  const { game, province } = coastalFreightTown();
  let known = setBuilding(game, N1, 'metalWorks', { capacity: 4 });
  for (const [i, id] of province.tileIds.entries()) {
    known = setTile(known, id, { resource: i < 3 ? { type: i < 2 ? ResourceType.Coal : ResourceType.IronOre, level: 0, discovered: true } : undefined });
  }
  const survey = (type: ResourceType) => setTile(known, province.tileIds[3], {
    resource: { type, level: 0, discovered: false }, prospecting: { workerId: 'surveyor', startedOnTurn: 0 },
  });
  const iron = survey(ResourceType.IronOre);
  const gold = survey(ResourceType.Gold);
  expect(collectedAtLogistics(iron, N1)).not.toHaveProperty('steel');
  expect(collectedAtLogistics(iron, N1)).toEqual(collectedAtLogistics(gold, N1));
  expect(scriptedPlayer(iron, N1)).toEqual(scriptedPlayer(gold, N1));
  const offersSteel = (position: typeof game) => resolveTurn(position, {}, position.seed).events.some(event =>
    event.type === 'town-receipt' && event.nationId === N1 && event.lines.some(line => line.commodity === 'steel'));
  expect(offersSteel(iron)).toBe(true);
  expect(offersSteel(gold)).toBe(false);
});
