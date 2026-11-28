// FR-646, FR-517, FR-497 (Codex task 67): `knownFreightPlan`, the forecast the transport popup and the Armoury's horse
// supply read. A turn settles diplomacy and the fleet phase before connectivity, so the forecast applies what the viewer
// itself ordered there (its accepted answer to a peace proposal, its own squadron's mission) to the public fleet
// positions, assuming the rivals stay put. Other nations' orders stay out, and so does anything a random draw decides
// (Codex task 69: a battle no draw decides is settled). Its jobs are those its own workers hold.
import { describe, expect, it } from 'vitest';
import { tryApplyOrder, type Order } from '@/engine';
import { freightAtLogistics, knownFreightPlan, ownWork } from '@/engine/systems/freightForecast';
import type { GameState } from '@/types/GameState';
import type { Tile } from '@/types/Tile';
import { WorkerType } from '@/types/Workers';
import { homeApproach, withFleets } from '@/engine/navy/fleets';
import { blockadeBy, blockadedPort, blockadedPortOfferedPeace, blockadeOfTheLine, contestedHome, deliveredAtLogistics, fleetOf, hullLeft, SOUTH_EAST } from './blockadeFixture';
import { ARVELIA_P, continent } from './armyFixtures';
import { N1, N2, put, setTile, tileAt } from './fixtures';

const queued = (game: GameState, order: Order) => {
  const { state, result } = tryApplyOrder(game, order);
  expect(result).toEqual({ ok: true });
  return state;
};
/** The forecast's shipments with 15 cars, without the commodities that ship nothing. */
const forecast = (game: GameState): Record<string, number> =>
  Object.fromEntries(Object.entries(knownFreightPlan(game, N1, 15).shipments).filter(([, n]) => n > 0));

describe('FR-646 the forecast applies our own diplomacy and fleet orders before connectivity (Codex task 67)', () => {
  it('our Frigate sailing from the contested home approach to Testland South-East leaves Valdoria\'s alone there: no Fish from the capital, as the turn ships', () => {
    const game = queued(contestedHome(), { kind: 'setFleetMission', nationId: N1, fleetId: fleetOf(N1), mission: 'sail', provinceId: SOUTH_EAST });
    const delivered = deliveredAtLogistics(game);
    expect(delivered).toEqual({ grain: 4, fruit: 3, cotton: 2, horses: 1 });
    expect(forecast(game)).toEqual(delivered);
    // The computer planner's own calculation is unchanged: it reads the positions as they stand
    expect(freightAtLogistics(game, N1).collected.fish).toBe(1);
  });

  // Codex task 68 (blocker): our Frigate sailing into the Ship-of-the-Line that blockades 10-7 fights it there before
  // connectivity: it can deal at most 3 of the 65 hull and is sent back to its berth, so the port stays closed, whatever
  // the battle's dice.
  it('our Frigate sailing from its berth into the Ship-of-the-Line blockading 10-7 does not open the port: 11 units and 1 Horse, as the turn ships', () => {
    const blockaded = blockadeOfTheLine();
    const before = forecast(blockaded);
    expect(before).toEqual({ grain: 4, fruit: 3, fish: 1, cotton: 2, horses: 1 });
    const game = queued(blockaded, { kind: 'setFleetMission', nationId: N1, fleetId: fleetOf(N1), mission: 'sail', provinceId: SOUTH_EAST });
    for (const seed of [1, 2, 3, 7, 11, 42]) expect(deliveredAtLogistics({ ...game, seed }), `seed ${seed}`).toEqual(before);
    expect(forecast(game)).toEqual(before);
    expect(knownFreightPlan(game, N1, 15).collected.horses).toBe(1);
  });

  it('our Frigate sailing from its berth to an approach no enemy holds (the capital\'s own) changes nothing: the blockade of 10-7 holds', () => {
    const blockaded = blockadeOfTheLine();
    const capital = homeApproach(blockaded, N1)!.provinceId;
    expect(capital).not.toBe(SOUTH_EAST);
    const game = queued(blockaded, { kind: 'setFleetMission', nationId: N1, fleetId: fleetOf(N1), mission: 'sail', provinceId: capital });
    const delivered = deliveredAtLogistics(game);
    expect(delivered).toEqual({ grain: 4, fruit: 3, fish: 1, cotton: 2, horses: 1 });
    expect(forecast(game)).toEqual(delivered);
    expect(forecast(game)).toEqual(forecast(blockaded));
  });

  it('a refused peace keeps the blockade of 10-7: the forecast is what the turn ships', () => {
    const game = queued(blockadedPortOfferedPeace(), { kind: 'answerProposal', nationId: N1, proposalId: 'proposal-1-1', accept: false });
    const delivered = deliveredAtLogistics(game);
    expect(delivered).toEqual({ grain: 4, fruit: 3, fish: 1, cotton: 2, horses: 1 });
    expect(forecast(game)).toEqual(delivered);
  });

  it('FR-497 another nation\'s orders are not read: Valdoria ordering its blockading Frigate home, or accepting our peace, leaves the forecast as it was', () => {
    const port = blockadedPort();
    const before = forecast(port);
    expect(before).toEqual({ grain: 4, fruit: 3, fish: 1, cotton: 2, horses: 1 });
    const home = queued(port, { kind: 'setFleetMission', nationId: N2, fleetId: fleetOf(N2), mission: 'return' });
    expect(forecast(home)).toEqual(before);
    // The settlement does reopen the port: the order is Valdoria's, unknown to us until then
    expect(deliveredAtLogistics(home).horses).toBe(2);

    // Our peace proposal of turn 1, answered by Valdoria on turn 2 (hand-built: a proposal is made only to a human player)
    const offered = blockadedPortOfferedPeace();
    const ours = { ...offered, proposals: [{ id: 'proposal-1-1', fromId: N1, toId: N2, kind: 'peace' as const, turn: 1 }] };
    const accepted = queued(ours, { kind: 'answerProposal', nationId: N2, proposalId: 'proposal-1-1', accept: true });
    expect(forecast(accepted)).toEqual(before);
    expect(deliveredAtLogistics(accepted).horses).toBe(2);
  });
});

// Codex task 69 (blocker): the forecast settles our own squadron's battle against the public positions, the rivals
// staying put, as the fleet phase does before connectivity, when no draw decides its result: a tie leaves both
// contesting the approach and a win sends the enemy to its berth, so our presence opens the port; a loss sends ours
// back. A battle whose result a draw decides leaves the approach as it stood before the turn.
describe('FR-646 FR-517 the forecast settles our sortie\'s battle when no draw decides it (Codex task 69)', () => {
  const SEEDS = [1, 2, 3, 7, 11, 42];
  const BLOCKADED = { grain: 4, fruit: 3, fish: 1, cotton: 2, horses: 1 };
  const OPEN = { grain: 4, fruit: 3, fish: 2, cotton: 2, horses: 2, timber: 2 };
  const sortie = (game: GameState) =>
    queued(game, { kind: 'setFleetMission', nationId: N1, fleetId: fleetOf(N1), mission: 'sail', provinceId: SOUTH_EAST });
  const shippedAtSeeds = (game: GameState) => SEEDS.map(seed => deliveredAtLogistics({ ...game, seed }));

  it.each([
    ['Frigate', 'Frigate', 'a tie, both contesting the approach', 'frigate', 'frigate', OPEN],
    ['Ship-of-the-Line', 'Frigate', 'a win, the Frigate sent to its berth', 'shipOfTheLine', 'frigate', OPEN],
    ['Ship-of-the-Line', 'Ship-of-the-Line', 'a tie, both contesting the approach', 'shipOfTheLine', 'shipOfTheLine', OPEN],
    ['Frigate', 'Ship-of-the-Line', 'a loss, ours sent back to its berth', 'frigate', 'shipOfTheLine', BLOCKADED],
  ] as const)('our fresh %s sailing into the fresh %s blockading 10-7, %s whatever the draws: the forecast is what the turn ships at every seed', (_ours, _theirs, _result, ours, theirs, shipped) => {
    const blockaded = blockadeBy(ours, theirs);
    expect(forecast(blockaded)).toEqual(BLOCKADED);
    const game = sortie(blockaded);
    shippedAtSeeds(game).forEach((delivered, i) => expect(delivered, `seed ${SEEDS[i]}`).toEqual(shipped));
    expect(forecast(game)).toEqual(shipped);
    expect(knownFreightPlan(game, N1, 15).collected.horses).toBe(shipped.horses);
  });

  it('a battle a draw decides leaves the blockade as it stood: our Frigate with 2 hull left against the blockading Frigate ships 15 at some seeds and 11 at others', () => {
    const game = sortie(hullLeft(blockadeBy('frigate', 'frigate'), N1, 2));
    const shipped = shippedAtSeeds(game);
    expect(shipped).toContainEqual(OPEN);
    expect(shipped).toContainEqual(BLOCKADED);
    expect(forecast(game)).toEqual(BLOCKADED);
  });

  it('every ship of our squadron counts: a fresh Frigate with a second one of 1 hull left, against the Ship-of-the-Line (6 firepower each side), ties or loses as the draws fall; the forecast keeps the blockade', () => {
    const blockaded = blockadeBy('frigate', 'shipOfTheLine');
    const twoFrigates = withFleets(blockaded, blockaded.fleets.map(f => f.ownerNationId !== N1 ? f :
      { ...f, ships: [f.ships[0], { ...f.ships[0], id: `${f.ships[0].id}-2`, hullDamage: f.ships[0].hull - 1 }] }));
    const game = sortie(twoFrigates);
    const shipped = shippedAtSeeds(game);
    expect(shipped).toContainEqual(OPEN);
    expect(shipped).toContainEqual(BLOCKADED);
    expect(forecast(game)).toEqual(BLOCKADED);
  });

  it('FR-497 the hull an enemy ship has left is not read (the naval report shows it only to the battle\'s sides): their Frigate with 2 hull left is taken at full hull, a tie, and the turn ships 15 at every seed, a tie or, where it sinks, a win', () => {
    const fresh = sortie(blockadeBy('frigate', 'frigate'));
    const damaged = sortie(hullLeft(blockadeBy('frigate', 'frigate'), N2, 2));
    shippedAtSeeds(damaged).forEach((delivered, i) => expect(delivered, `seed ${SEEDS[i]}`).toEqual(OPEN));
    expect(forecast(damaged)).toEqual(OPEN);
    expect(forecast(damaged)).toEqual(forecast(fresh));
  });
});

describe('FR-497 the forecast counts the jobs our own workers hold (Codex task 67)', () => {
  const start = continent();
  const workerOf = (nationId: string, type: WorkerType) =>
    start.map.tiles.flat().flatMap(t => t.workers).find(w => w.nationId === nationId && w.type === type)!.id;
  const developing = (workerId: string) => ({ workerId, workerType: WorkerType.Farmer, targetLevel: 2 as const, startedOnTurn: 1, durationTurns: 1 });
  const building = (workerId: string) => ({ workerId, kind: 'depot' as const, startedOnTurn: 1, durationTurns: 1 });
  const kept = (state: GameState, tileId: string): Partial<Tile> => {
    const tile = tileAt(ownWork(state, N1), tileId);
    return { developmentJob: tile.developmentJob, constructionJob: tile.constructionJob };
  };

  it('FR-634 FR-635 our improver\'s job on a Minor Nation tile we hold is ours', () => {
    const held = start.map.tiles.flat().find(t => t.provinceId === ARVELIA_P && t.resource)!;
    expect(held.ownerNationId).toBeUndefined();
    const farmer = workerOf(N1, WorkerType.Farmer);
    const game = setTile(put(start, farmer, held.id), held.id, { developmentJob: developing(farmer) });
    expect(kept(game, held.id).developmentJob).toEqual(developing(farmer));
  });

  it('a job on our land is ours only when our worker on the tile holds it: one naming a rival\'s worker, or a worker not on the tile, is dropped (edited saves)', () => {
    const farmer = workerOf(N1, WorkerType.Farmer);
    const engineer = workerOf(N1, WorkerType.Engineer);
    const rivalFarmer = workerOf(N2, WorkerType.Farmer);
    const rivalEngineer = workerOf(N2, WorkerType.Engineer);
    const farm = setTile(put(start, farmer, '3-9'), '3-9', { developmentJob: developing(farmer) });
    expect(kept(farm, '3-9').developmentJob).toEqual(developing(farmer));
    const site = setTile(put(start, engineer, '3-9'), '3-9', { constructionJob: building(engineer) });
    expect(kept(site, '3-9').constructionJob).toEqual(building(engineer));

    for (const [edited, what] of [
      [setTile(farm, '3-9', { developmentJob: developing(rivalFarmer) }), 'a rival farmer elsewhere'],
      [put(setTile(farm, '3-9', { developmentJob: developing(rivalFarmer) }), rivalFarmer, '3-9'), 'a rival farmer on the tile'],
      [setTile(site, '3-9', { constructionJob: building(rivalEngineer) }), 'a rival engineer elsewhere'],
      [put(setTile(site, '3-9', { constructionJob: building(rivalEngineer) }), rivalEngineer, '3-9'), 'a rival engineer on the tile'],
      [setTile(start, '3-9', { developmentJob: developing(farmer) }), 'our farmer, not on the tile'],
      [setTile(start, '3-9', { constructionJob: building('worker-unknown') }), 'no such worker'],
    ] as const) {
      expect(kept(edited, '3-9'), what).toEqual({ developmentJob: undefined, constructionJob: undefined });
    }
  });
});
