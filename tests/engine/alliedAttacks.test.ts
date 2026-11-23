import { describe, expect, it } from 'vitest';
import { WARSHIPS } from '@/definisions/ships';
import { armyAt, capitalProvinceOf, findRegiment } from '@/engine/army/armies';
import { tryApplyOrder } from '@/engine/orders/apply';
import type { MoveArmyOrder } from '@/engine/orders/Order';
import { combatSystem } from '@/engine/systems/combatSystem';
import { createTurnContext, type GameEvent } from '@/engine/turn/context';
import { resolveTurn } from '@/engine/turn/resolveTurn';
import type { GameState } from '@/types/GameState';
import { ARVELIA_P, ARVELIA, NW2, SUNDMARK, clearArmy, continent, patchRegiment, relocate, addRegiments } from './armyFixtures';
import { N1, N2, setPair } from './fixtures';

const island = 'province-minor-2';
function coast(target = island, owner = SUNDMARK) {
  let s = { ...continent(), turn: 2 };
  s = clearArmy(s, owner, target);
  for (const id of [N1, N2]) s = setPair(s, id, owner, { war: { since: 1, aggressors: [id] } });
  const fleets = [N1, N2].map(id => ({
    id: 'fleet-' + id, name: 'Squadron', ownerNationId: id, location: '0-0', siteSinceTurn: 1,
    approach: { seaId: '0-0', provinceId: target }, aggression: 'normal' as const,
    ships: [{ ...WARSHIPS.shipOfTheLine, id: 'ship-' + id, experience: 0 }],
  }));
  return { ...s, fleets, nations: s.nations.map(n => ({ ...n, fleets: ['fleet-' + n.id] })) };
}
function order(s: GameState, nationId: string, regimentIds: string[], toProvinceId = island): MoveArmyOrder {
  return { kind: 'moveArmy', via: 'sea', nationId, fromProvinceId: capitalProvinceOf(s, nationId)!.id, toProvinceId, regimentIds };
}
function submit(s: GameState, orders: MoveArmyOrder[]) {
  return orders.reduce((state, o) => {
    const step = tryApplyOrder(state, o);
    expect(step.result).toEqual({ ok: true });
    return step.state;
  }, s);
}
const reports = (events: GameEvent[]) => events.filter(e => e.type === 'battle-resolved');

describe('FR-560 allied attacks on one target', () => {
  it.each([false, true])('resolves the stronger of two landings first and cancels the other, reversed=%s', reverse => {
    const s = coast();
    const weak = order(s, N1, ['regiment-1']);
    const strong = order(s, N2, ['regiment-22']); // one Artillery costs two ARMS
    const run = resolveTurn(submit(s, reverse ? [strong, weak] : [weak, strong]), {});
    expect(reports(run.events).map(e => e.attackerIds)).toEqual([[N2]]);
    expect(run.events).toContainEqual({
      type: 'attack-cancelled', nationId: N1, capturedById: N2, provinceId: island, fromProvinceId: weak.fromProvinceId,
    });
    expect(findRegiment(run.state, 'regiment-1')).toMatchObject({ army: { provinceId: weak.fromProvinceId },
      regiment: findRegiment(s, 'regiment-1')!.regiment });
    expect(findRegiment(run.state, 'regiment-22')?.army.provinceId).toBe(island);
  });

  it('the second landing fights only the surviving defenders, at their remaining health', () => {
    let s: GameState = addRegiments(coast(), SUNDMARK, island, ['minutemen']);
    s = patchRegiment(s, 'regiment-22', { health: 55 });
    const events: GameEvent[] = [];
    const ctx = { ...createTurnContext({ turn: s.turn }), emit: (e: GameEvent) => events.push(e), rngFor: () => ({ next: () => 0 }) };
    const after = combatSystem(submit(s, [order(s, N1, ['regiment-1']), order(s, N2, ['regiment-22'])]), ctx);
    const battles = reports(events);
    expect(battles.map(b => [b.nationId, b.result])).toEqual([[N2, 'defender-held'], [N1, 'attacker-won']]);
    const defender = battles[0].regiments.find(r => r.side === 'defender')!;
    expect(defender.endHealth).toBeLessThan(defender.startHealth);
    expect(battles[1].regiments.filter(r => r.side === 'defender')).toMatchObject([{ id: defender.id, startHealth: defender.endHealth }]);
    expect(armyAt(after, N1, island)?.regiments.map(r => r.id)).toEqual(['regiment-1']);
  });

  it.each([1, 2])('equal ARMS use nation ID even on turn %i, for a land march and a landing', turn => {
    const base = coast(ARVELIA_P, ARVELIA);
    const s = relocate({ ...base, turn, fleets: base.fleets.map(f => ({ ...f, siteSinceTurn: 0 })) }, ['regiment-20'], NW2);
    const sea = order(s, N1, ['regiment-1'], ARVELIA_P);
    const land = { ...order(s, N2, ['regiment-20'], ARVELIA_P), fromProvinceId: NW2, via: undefined };
    const resolve = (orders: MoveArmyOrder[]) => resolveTurn(submit(s, orders), {});
    const first = resolve([land, sea]), reversed = resolve([sea, land]);
    expect(reports(first.events).map(e => e.attackerIds)).toEqual([[N1]]);
    expect(first.events).toContainEqual({ type: 'attack-cancelled', nationId: N2, capturedById: N1, provinceId: ARVELIA_P, fromProvinceId: NW2 });
    expect(first.events).toEqual(reversed.events);
    expect(first.state).toEqual(reversed.state);
  });

  it('adds one nation’s ARMS across its two origins before ranking the attacks', () => {
    const s = relocate(coast(ARVELIA_P, ARVELIA), ['regiment-20'], NW2);
    const sea = order(s, N2, ['regiment-22'], ARVELIA_P);
    const march = { ...order(s, N2, ['regiment-20'], ARVELIA_P), fromProvinceId: NW2, via: undefined };
    const ally = order(s, N1, ['regiment-3'], ARVELIA_P);
    const result = resolveTurn(submit(s, [sea, ally, march]), {});
    const battles = reports(result.events);
    expect(battles.map(b => b.attackerIds)).toEqual([[N2]]);
    expect(battles[0].regiments.map(r => r.id)).toEqual(['regiment-20', 'regiment-22']);
    expect(findRegiment(result.state, 'regiment-3')?.army.provinceId).toBe(ally.fromProvinceId);
  });
});
