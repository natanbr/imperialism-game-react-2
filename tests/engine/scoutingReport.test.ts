// FR-650 (M18l; Imp1 Scouting Report, rules 11 section 5.3; rules 08 "We cannot scout this province without a nearby ship
// or neighboring armies"): `scoutingReport(state, viewerId, provinceId)`, a read of another country's province. Available
// when a province we own that borders it holds a regiment of ours (garrison), else when an army of ours stands in a
// bordering province (army), else when a squadron of ours lies off the province (fleet); the first that applies names the
// estimator. It counts the owner's regiments there by type, militia included, exactly as the Attack preview's defenders
// (Q32). A province of ours, an unknown one or a world without provinces has no report; an unavailable one counts nothing.
import { describe, it, expect } from 'vitest';
import { defendersOf, newGame, resolveTurn, scoutingReport, type RegimentType } from '@/engine';
import { tryApplyOrder } from '@/engine/orders/apply';
import type { Order } from '@/engine/orders/Order';
import type { GameState } from '@/types/GameState';
import { ShipType, type Fleet } from '@/types/Navy';
import { deepFreeze, N1, N2 } from './fixtures';
import { addRegiments, ARVELIA, ARVELIA_P, clearArmy, continent, idOf, NE1, NE2, NW2, SE2, SW1, SW2 } from './armyFixtures';

const SUNDMARK_P = 'province-minor-2';

/** A squadron of one frigate, lying off `provinceId` when given, else at its home berth. */
const squadron = (ownerNationId: string, provinceId?: string): Fleet => ({
  id: `${ownerNationId}-scout`, name: 'Scouting squadron', ownerNationId, location: provinceId ? '0-0' : 'berth', aggression: 'normal',
  ships: [{ id: `${ownerNationId}-frigate`, type: ShipType.Frigate, firepower: 3, range: 5, armour: 10, hull: 35, battleMove: 4, speed: 3, experience: 0 }],
  ...(provinceId ? { approach: { provinceId, seaId: '0-0' } } : {}),
});
const withFleet = (s: GameState, fleet: Fleet): GameState => ({
  ...s,
  fleets: [...s.fleets, fleet],
  nations: s.nations.map(n => (n.id === fleet.ownerNationId ? { ...n, fleets: [...n.fleets, fleet.id] } : n)),
});

/** The defenders the Attack preview lists (`defendersOf`), counted by type in first-seen order. */
function defenderCounts(s: GameState, provinceId: string): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const d of defendersOf(s, provinceId)) counts[d.regiment.type] = (counts[d.regiment.type] ?? 0) + 1;
  return counts;
}
const asRecord = (forces: readonly { type: RegimentType; count: number }[]) => Object.fromEntries(forces.map(f => [f.type, f.count]));

function ordered(s: GameState, ...orders: Order[]): GameState {
  return orders.reduce((state, order) => {
    const { state: next, result } = tryApplyOrder(state, order);
    expect(result, order.kind).toEqual({ ok: true });
    return next;
  }, s);
}

describe('FR-650 scoutingReport: who can scout a foreign province, and what they see', () => {
  it('FR-650 a bordering minor with three Minutemen: our garrison in Testland North-East sees them, militia included', () => {
    const s = continent();
    expect(scoutingReport(s, N1, ARVELIA_P)).toEqual({
      provinceId: ARVELIA_P,
      ownerId: ARVELIA,
      observer: { kind: 'garrison', provinceId: NE1 },
      forces: [{ type: 'minutemen', count: 3 }],
    });
  });

  it('FR-650 a Great Power province with mixed regiments, seen by our army in a bordering province we do not own', () => {
    // Our regulars stand in Valdoria North-West (hand-built), which borders Valdoria South-West
    const s = addRegiments(continent(), N1, NW2, ['regulars']);
    expect(scoutingReport(s, N1, SW2)).toEqual({
      provinceId: SW2,
      ownerId: N2,
      observer: { kind: 'army', provinceId: NW2 },
      // REGIMENT_TYPES order (the Imp1 table): Minutemen, then Regulars, then Artillery
      forces: [{ type: 'minutemen', count: 4 }, { type: 'regulars', count: 2 }, { type: 'artillery', count: 1 }],
    });
  });

  it('FR-650 the counts equal the Attack preview\'s defenders for the same province', () => {
    let s = addRegiments(continent(), N1, NW2, ['regulars']);
    s = addRegiments(s, N2, SW2, ['hussars', 'lightArtillery', 'hussars'], 40);
    s = addRegiments(s, N1, ARVELIA_P, ['regulars']);
    for (const provinceId of [SW2, NE2, ARVELIA_P]) {
      const report = scoutingReport(s, N1, provinceId)!;
      expect(report.observer, provinceId).toBeDefined();
      expect(asRecord(report.forces), provinceId).toEqual(defenderCounts(s, provinceId));
    }
    // Our own regiments standing in Arvelia are not Arvelia's: the report counts the owner's only, as the defenders do
    expect(scoutingReport(s, N1, ARVELIA_P)!.forces).toEqual([{ type: 'minutemen', count: 3 }]);
  });

  it('FR-650 an empty province is available and counts nothing', () => {
    const s = clearArmy(continent(), ARVELIA, ARVELIA_P);
    expect(scoutingReport(s, N1, ARVELIA_P)).toEqual({ provinceId: ARVELIA_P, ownerId: ARVELIA, observer: { kind: 'garrison', provinceId: NE1 }, forces: [] });
  });

  it('FR-650 a far province is unavailable and reveals no count', () => {
    const s = continent();
    expect(scoutingReport(s, N1, SW2)).toEqual({ provinceId: SW2, ownerId: N2, forces: [] });
    // Sundmark is an island: no province borders it, so without a squadron off it no one can scout it
    expect(scoutingReport(s, N1, SUNDMARK_P)).toEqual({ provinceId: SUNDMARK_P, ownerId: 'minor-2', forces: [] });
  });

  it('FR-650 a bordering province of ours without a regiment of ours is no garrison', () => {
    const s = clearArmy(continent(), N1, NE1);
    expect(scoutingReport(s, N1, ARVELIA_P)).toEqual({ provinceId: ARVELIA_P, ownerId: ARVELIA, forces: [] });
    // A rival's army in our province does not scout for us
    expect(scoutingReport(addRegiments(s, N2, NE1, ['regulars']), N1, ARVELIA_P)?.observer).toBeUndefined();
  });

  it('FR-650 scouting by ship: a squadron of ours off the province; one at its home berth or a rival\'s does not count', () => {
    const off = withFleet(continent(), squadron(N1, SUNDMARK_P));
    expect(scoutingReport(off, N1, SUNDMARK_P)).toEqual({
      provinceId: SUNDMARK_P,
      ownerId: 'minor-2',
      observer: { kind: 'fleet', fleetId: `${N1}-scout`, provinceId: SUNDMARK_P },
      forces: [{ type: 'minutemen', count: 3 }],
    });
    // Off Sundmark only: the same sea touches Valdoria South-East, but the squadron is not off it
    expect(scoutingReport(off, N1, SE2)?.observer).toBeUndefined();
    expect(scoutingReport(withFleet(continent(), squadron(N1)), N1, SUNDMARK_P)?.observer).toBeUndefined();
    expect(scoutingReport(withFleet(continent(), squadron(N2, SUNDMARK_P)), N1, SUNDMARK_P)?.observer).toBeUndefined();
    // A squadron with no ship left is no observer
    expect(scoutingReport(withFleet(continent(), { ...squadron(N1, SUNDMARK_P), ships: [] }), N1, SUNDMARK_P)?.observer).toBeUndefined();
  });

  it('FR-650 the estimator is the first that applies: garrison, then army, then fleet', () => {
    const both = withFleet(continent(), squadron(N1, ARVELIA_P));
    expect(scoutingReport(both, N1, ARVELIA_P)?.observer).toEqual({ kind: 'garrison', provinceId: NE1 });
    // Without the garrison, our army in Valdoria North-West (bordering Arvelia) comes before the squadron
    const armyAndFleet = addRegiments(clearArmy(both, N1, NE1), N1, NW2, ['regulars']);
    expect(scoutingReport(armyAndFleet, N1, ARVELIA_P)?.observer).toEqual({ kind: 'army', provinceId: NW2 });
    expect(scoutingReport(clearArmy(armyAndFleet, N1, NW2), N1, ARVELIA_P)?.observer).toEqual({ kind: 'fleet', fleetId: `${N1}-scout`, provinceId: ARVELIA_P });
  });

  it('FR-650 a province of ours, an unknown province and Two islands (no provinces) have no report', () => {
    expect(scoutingReport(continent(), N1, SW1)).toBeUndefined();
    expect(scoutingReport(continent(), N1, 'province-unknown')).toBeUndefined();
    const islands = newGame({ seed: 1, world: 'two-islands' });
    expect(islands.provinces).toEqual([]);
    expect(scoutingReport(islands, N1, SW2)).toBeUndefined();
  });

  it('FR-650 FR-497 a rival\'s march or recruit queued this turn does not change the report until settlement', () => {
    const watched = addRegiments(continent(), N1, NW2, ['regulars']);
    const before = { sw: scoutingReport(watched, N1, SW2), ne: scoutingReport(watched, N1, NE2) };
    const queued = ordered(
      watched,
      { kind: 'moveArmy', nationId: N2, fromProvinceId: SW2, regimentIds: [idOf(watched, N2, '1st Regulars')], toProvinceId: NE2 },
      { kind: 'setRecruitment', nationId: N2, regiment: 'regulars', count: 1 }
    );
    expect(queued.intents.length).toBeGreaterThan(watched.intents.length);
    expect({ sw: scoutingReport(queued, N1, SW2), ne: scoutingReport(queued, N1, NE2) }).toEqual(before);
    // After End Turn the march has arrived
    const settled = resolveTurn(queued, {}).state;
    const regulars = (provinceId: string) => scoutingReport(settled, N1, provinceId)!.forces.find(f => f.type === 'regulars')?.count ?? 0;
    expect(regulars(NE2)).toBe(1);
    expect(regulars(SW2) + regulars(NE2)).toBeGreaterThanOrEqual(2);
  });

  it('FR-650 NR-041 a read: it leaves a deep-frozen state unchanged and draws nothing', () => {
    const s = deepFreeze(withFleet(addRegiments(continent(), N1, NW2, ['regulars']), squadron(N1, SUNDMARK_P)));
    const snapshot = structuredClone(s);
    for (const p of s.provinces) scoutingReport(s, N1, p.id);
    expect(s).toEqual(snapshot);
  });
});
