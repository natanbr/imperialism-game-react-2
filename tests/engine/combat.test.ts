// M9 combat (FR-216 to FR-221, FR-225 to FR-227): a move into a province of a country at war with the mover is an attack;
// the combat phase gives each attacked province one battle (provinces in id order) after the own-province marches; the
// round model, the damage formula, routs, the aftermath, the battle report, the estimate and the purity rules. Battles
// run with a scripted random stream where the numbers matter (a stub `rngFor("combat")`: 0 = every shot hits, 0.99 =
// every shot misses); the turn-level rows use the real seeded stream.
import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import { newGame } from '@/engine/newGame';
import { applyOrder, tryApplyOrder } from '@/engine/orders/apply';
import { validateOrder } from '@/engine/orders/validate';
import type { Order } from '@/engine/orders/Order';
import { resolveTurn } from '@/engine/turn/resolveTurn';
import type { GameEvent, TurnContext } from '@/engine/turn/context';
import type { Rng } from '@/engine/rng';
import { combatSystem } from '@/engine/systems/combatSystem';
import { pendingArmyOrders, regimentStatus } from '@/engine/army/armies';
import {
  attackStatus,
  attackTargets,
  battleEstimate,
  defendersOf,
  fightBattle,
  fortLevelOf,
  protectionOf,
  shotDamage,
  type BattleUnit,
} from '@/engine/army/combat';
import { battleFrames, battleOutcome, battlesFoughtBy } from '@/engine/army/battleReport';
import { COMBAT } from '@/definisions/combatRules';
import { transferProvince } from '@/engine/world/provinces';
import type { BattleReport } from '@/types/Battle';
import type { GameState } from '@/types/GameState';
import type { AttackIntent } from '@/types/Intent';
import type { RegimentType } from '@/types/Unit';
import { deepFreeze, N1, N2, setPair, setTile } from './fixtures';
import {
  addRegiments,
  ARVELIA,
  ARVELIA_P,
  armyIn,
  clearArmy,
  continent,
  NE1,
  NE2,
  NW1,
  NW2,
  patchRegiment,
  relocate,
  SE1,
  SW1,
} from './armyFixtures';

// The start forces' ids (FR-203): Testland's field army, Valdoria's, Arvelia's three Minutemen.
const R1 = 'regiment-1';
const R2 = 'regiment-2';
const A1 = 'regiment-3';
const V_R1 = 'regiment-20';
const ARVELIA_MILITIA = ['regiment-39', 'regiment-40', 'regiment-41'];
const NE1_MILITIA = ['regiment-8', 'regiment-9', 'regiment-10', 'regiment-11'];

const atWar = (s: GameState, a: string, b: string, since = 1): GameState =>
  setPair(s, a, b, { war: { aggressors: [a], since }, consulates: [], embassies: [], pact: false, alliance: false });

const attackOrder = (nationId: string, regimentIds: string[], fromProvinceId: string, toProvinceId: string): Order => ({
  kind: 'moveArmy',
  nationId,
  fromProvinceId,
  regimentIds,
  toProvinceId,
});

function ordered(s: GameState, ...orders: Order[]): GameState {
  return orders.reduce((state, order) => {
    const { state: next, result } = tryApplyOrder(state, order);
    if (!result.ok) throw new Error(`${order.kind} refused: ${result.reason}`);
    return next;
  }, s);
}

/** A combat-phase context whose combat stream gives `draws` (one number, or a list then 0.99); the shared stream throws. */
function stubContext(turn: number, draws: number | number[]) {
  const events: GameEvent[] = [];
  const streams: string[] = [];
  let count = 0;
  const stream: Rng = {
    next: () => {
      const v = Array.isArray(draws) ? (draws[count] ?? 0.99) : draws;
      count++;
      return v;
    },
  };
  const ctx: TurnContext = {
    turn,
    nextTurn: turn + 1,
    rng: { next: () => { throw new Error('combat read the shared turn stream'); } },
    rngFor: name => {
      streams.push(name);
      return stream;
    },
    orders: [],
    emit: e => {
      events.push(e);
    },
  };
  return { ctx, events, streams, draws: () => count };
}

const reportsIn = (events: GameEvent[]): BattleReport[] =>
  events.filter((e): e is Extract<GameEvent, { type: 'battle-resolved' }> => e.type === 'battle-resolved');

/** Testland at war with Arvelia (war active on turn 1) and its field army on the border, in Testland North-East. */
const borderWar = (): GameState => atWar(relocate(continent('world'), [R1, R2, A1], NE1), N1, ARVELIA);
/** borderWar with the whole field army ordered into Arvelia. */
const startArmyAttack = (): GameState => ordered(borderWar(), attackOrder(N1, [R1, R2, A1], NE1, ARVELIA_P));

const unit = (id: string, type: RegimentType, side: 'attacker' | 'defender', health = 100, ownerId = side === 'attacker' ? N1 : ARVELIA): BattleUnit => ({
  id,
  ownerId,
  type,
  name: id,
  health,
  side,
});

const seq = (values: number[]): Rng => {
  let i = 0;
  return { next: () => values[i++] ?? 0.99 };
};
const always = (v: number): Rng => ({ next: () => v });

describe('FR-216 attacks: a move into a province of a country at war is an attack', () => {
  it('FR-216 moveArmy into a province of a country at war (active) is accepted and stores an attack intent naming the owner', () => {
    const s = borderWar();
    const order = attackOrder(N1, [R1, R2], NE1, ARVELIA_P);
    expect(validateOrder(s, order)).toEqual({ ok: true });

    const after = applyOrder(s, order);
    const intents = after.intents.map(i => ({ ...i, id: undefined, turn: undefined }));
    expect(intents).toEqual([{ id: undefined, turn: undefined, kind: 'attack', nationId: N1, targetId: ARVELIA, fromProvinceId: NE1, toProvinceId: ARVELIA_P, regimentIds: [R1, R2] }]);
  });

  it('FR-216 FR-205 a later march replaces the attack, cancelArmyMove takes it back; the status and the pending orders show it', () => {
    let s = applyOrder(borderWar(), attackOrder(N1, [R1, R2], NE1, ARVELIA_P));
    expect(regimentStatus(s, R1)).toEqual({ kind: 'attacking', toProvinceId: ARVELIA_P, targetId: ARVELIA });
    expect(pendingArmyOrders(s, N1)).toEqual({ marches: [], attacks: [{ fromProvinceId: NE1, toProvinceId: ARVELIA_P, count: 2 }], disbands: {} });

    s = applyOrder(s, attackOrder(N1, [R2], NE1, SE1));
    expect(s.intents.map(i => [i.kind, (i as AttackIntent).regimentIds])).toEqual([['attack', [R1]], ['army-move', [R2]]]);

    s = applyOrder(s, { kind: 'cancelArmyMove', nationId: N1, regimentIds: [R1] });
    expect(s.intents.map(i => i.kind)).toEqual(['army-move']);
    expect(regimentStatus(s, R1)).toEqual({ kind: 'available' });
  });

  it('FR-216 one battle per attacked province: the attackers are the regiments ordered into it, the defenders its owner\'s regiments and militia', () => {
    const { ctx, events } = stubContext(1, 0.99);
    combatSystem(startArmyAttack(), ctx);

    const [report] = reportsIn(events);
    expect(reportsIn(events)).toHaveLength(1);
    expect({ nationId: report.nationId, provinceId: report.provinceId, attackerIds: report.attackerIds, defenderId: report.defenderId }).toEqual({
      nationId: N1,
      provinceId: ARVELIA_P,
      attackerIds: [N1],
      defenderId: ARVELIA,
    });
    expect(report.regiments.map(r => [r.id, r.side])).toEqual([
      [R1, 'attacker'],
      [R2, 'attacker'],
      [A1, 'attacker'],
      ...ARVELIA_MILITIA.map(id => [id, 'defender']),
    ]);
  });

  it('FR-216 attackers from two bordering provinces fight as one side; a defender ordered to attack out is not a defender; provinces in id order', () => {
    // Valdoria holds Testland North-West (hand-built) with 2 Minutemen and 1 Regulars; the Regulars attack Testland North-East.
    let s = atWar(clearArmy(transferProvince(continent('world'), NW1, N2), N1, NW1), N1, N2);
    s = addRegiments(s, N2, NW1, ['minutemen', 'minutemen', 'regulars']);
    s = relocate(s, [R1], NE1);
    s = ordered(s, attackOrder(N1, [R1], NE1, NW1), attackOrder(N1, [R2, A1], SW1, NW1), attackOrder(N2, ['regiment-903'], NW1, NE1));
    const { ctx, events } = stubContext(1, 0.99);
    const after = combatSystem(s, ctx);

    const reports = reportsIn(events);
    expect(reports.map(r => r.provinceId)).toEqual([NE1, NW1]);
    expect(reports[0].regiments.map(r => [r.id, r.side])).toEqual([['regiment-903', 'attacker'], ...NE1_MILITIA.map(id => [id, 'defender'])]);
    expect(reports[1].regiments.map(r => [r.id, r.side])).toEqual([
      [R1, 'attacker'],
      [R2, 'attacker'],
      [A1, 'attacker'],
      ['regiment-901', 'defender'],
      ['regiment-902', 'defender'],
    ]);
    // Every shot missed: both defences held and every attacker went back to the province it came from (FR-221)
    expect(reports.map(r => r.result)).toEqual(['defender-held', 'defender-held']);
    expect(armyIn(after, N1, NE1)!.regiments.map(r => r.id)).toEqual([R1, ...NE1_MILITIA]);
    expect(armyIn(after, N1, SW1)!.regiments.map(r => r.id).slice(0, 2)).toEqual([R2, A1]);
    expect(armyIn(after, N2, NW1)!.regiments.map(r => r.id)).toEqual(['regiment-901', 'regiment-902', 'regiment-903']);
  });

  it('FR-216 two countries at war with the province\'s owner attack it as one side, in intentOrder', () => {
    let s = atWar(atWar(relocate(relocate(continent('world'), [R1], NE1), [V_R1], NW2), N1, ARVELIA), N2, ARVELIA);
    s = ordered(s, attackOrder(N1, [R1], NE1, ARVELIA_P), attackOrder(N2, [V_R1], NW2, ARVELIA_P));
    const { ctx, events } = stubContext(1, 0.99);
    combatSystem(s, ctx);

    const [report] = reportsIn(events);
    expect(report.attackerIds).toEqual([N1, N2]);
    expect(report.nationId).toBe(N1);
    expect(report.regiments.filter(r => r.side === 'attacker').map(r => [r.id, r.ownerId])).toEqual([[R1, N1], [V_R1, N2]]);
  });

  it('FR-216 a regiment that is no longer where it was ordered from, or whose war ended, does not attack', () => {
    // Peace in this turn's diplomacy phase drops the attack intents (FR-169); here the war is gone when combat runs.
    const s = setPair(startArmyAttack(), N1, ARVELIA, { war: undefined });
    const { ctx, events } = stubContext(1, 0);
    const after = combatSystem(s, ctx);
    expect(reportsIn(events)).toEqual([]);
    expect(armyIn(after, N1, NE1)!.regiments.map(r => r.id)).toEqual(expect.arrayContaining([R1, R2, A1]));
  });
});

describe('FR-217 an undefended province is taken without rounds', () => {
  it('FR-217 no defender: the province passes, the report has no round, and no random number is drawn', () => {
    const s = ordered(atWar(relocate(clearArmy(continent('world'), ARVELIA, ARVELIA_P), [R1], NE1), N1, ARVELIA), attackOrder(N1, [R1], NE1, ARVELIA_P));
    const { ctx, events, draws } = stubContext(1, 0);
    const after = combatSystem(s, ctx);

    const [report] = reportsIn(events);
    expect({ rounds: report.rounds, result: report.result, provinceTaken: report.provinceTaken }).toEqual({ rounds: [], result: 'attacker-won', provinceTaken: true });
    expect(after.provinces.find(p => p.id === ARVELIA_P)!.ownerId).toBe(N1);
    expect(armyIn(after, N1, ARVELIA_P)!.regiments.map(r => r.id)).toEqual([R1]);
    expect(draws()).toBe(0);
  });
});

describe('FR-218 rounds: defenders first; cavalry, infantry, artillery; the weakest enemy is the target', () => {
  it('FR-218 FR-219 FR-220 every shot hits: the exact shots of a 3-round battle', () => {
    const units = [
      unit('regiment-1', 'regulars', 'attacker'),
      unit('regiment-2', 'hussars', 'attacker'),
      unit('regiment-3', 'artillery', 'attacker'),
      unit('regiment-10', 'minutemen', 'defender'),
      unit('regiment-11', 'minutemen', 'defender'),
    ];
    const fight = fightBattle({ units, fortLevel: 0 }, always(0));
    const shot = (shooterId: string, targetId: string, damage: number) => ({ shooterId, targetId, hit: true, damage });

    expect(fight.rounds).toEqual([
      {
        shots: [
          shot('regiment-10', 'regiment-1', 10),
          shot('regiment-11', 'regiment-1', 10),
          shot('regiment-2', 'regiment-10', 16),
          shot('regiment-1', 'regiment-10', 25),
          shot('regiment-3', 'regiment-10', 44),
        ],
      },
      {
        shots: [
          shot('regiment-10', 'regiment-1', 10),
          shot('regiment-11', 'regiment-1', 10),
          shot('regiment-2', 'regiment-10', 15),
          shot('regiment-1', 'regiment-11', 25),
          shot('regiment-3', 'regiment-11', 44),
        ],
      },
      // regiment-10 is destroyed; regiment-11 fires; the Artillery has no standing enemy left and does not fire
      { shots: [shot('regiment-11', 'regiment-1', 10), shot('regiment-2', 'regiment-11', 16), shot('regiment-1', 'regiment-11', 15)] },
    ]);
    expect(fight.result).toBe('attacker-won');
    expect(fight.health).toEqual({ 'regiment-1': 50, 'regiment-2': 100, 'regiment-3': 100, 'regiment-10': 0, 'regiment-11': 0 });
  });

  it('FR-218 a battle runs at most 8 rounds; with every shot missed the defenders hold', () => {
    const units = [unit('regiment-1', 'regulars', 'attacker'), unit('regiment-10', 'minutemen', 'defender')];
    const fight = fightBattle({ units, fortLevel: 0 }, always(0.99));
    expect(fight.rounds).toHaveLength(COMBAT.maxRounds);
    expect(COMBAT.maxRounds).toBe(8);
    expect(fight.rounds.every(r => r.shots.every(s => !s.hit && s.damage === 0))).toBe(true);
    expect(fight.result).toBe('defender-held');
  });

  it('FR-218 within a group regiments fire in id order and ties on health go to the lowest id (ids compared by number, not text)', () => {
    const units = [unit('regiment-1', 'regulars', 'attacker'), unit('regiment-10', 'minutemen', 'defender'), unit('regiment-9', 'minutemen', 'defender')];
    const fight = fightBattle({ units, fortLevel: 0 }, seq([0.99, 0.99, 0]));
    expect(fight.rounds[0].shots).toEqual([
      { shooterId: 'regiment-9', targetId: 'regiment-1', hit: false, damage: 0 },
      { shooterId: 'regiment-10', targetId: 'regiment-1', hit: false, damage: 0 },
      { shooterId: 'regiment-1', targetId: 'regiment-9', hit: true, damage: 25 },
    ]);
  });
});

describe('FR-219 hit and damage', () => {
  it.each([
    ['Regulars on entrenched Minutemen: 25', 'regulars', 'minutemen', 'defender', 0, 25],
    ['Artillery on entrenched Minutemen: 44', 'artillery', 'minutemen', 'defender', 0, 44],
    ['Minutemen on attacking Regulars: 10', 'minutemen', 'regulars', 'attacker', 0, 10],
    ['Regulars on Minutemen behind a level-1 fort: 22', 'regulars', 'minutemen', 'defender', 1, 22],
    ['Artillery on defending Cuirassiers (no entrenching): 54', 'artillery', 'cuirassiers', 'defender', 0, 54],
    ['Artillery on defending Artillery behind a level-3 fort (50%): 30', 'artillery', 'artillery', 'defender', 3, 30],
    ['Sappers (FPN 0) on anything: at least 1', 'sappers', 'regulars', 'attacker', 0, 1],
  ] as const)('FR-219 %s', (_name, shooter, target, side, fortLevel, damage) => {
    expect(shotDamage(shooter, target, protectionOf(target, side, fortLevel))).toBe(damage);
  });

  it('FR-219 protection: attackers none; defenders 20% entrenched (only types that entrench), 20 + 10 x L behind a fort of level L', () => {
    expect(protectionOf('regulars', 'attacker', 3)).toEqual({ kind: 'none', percent: 0 });
    expect(protectionOf('regulars', 'defender', 0)).toEqual({ kind: 'entrenched', percent: 20 });
    expect(protectionOf('artillery', 'defender', 0)).toEqual({ kind: 'none', percent: 0 });
    expect(protectionOf('hussars', 'defender', 0)).toEqual({ kind: 'none', percent: 0 });
    expect(protectionOf('artillery', 'defender', 1)).toEqual({ kind: 'fort', level: 1, percent: 30 });
    expect(protectionOf('minutemen', 'defender', 2)).toEqual({ kind: 'fort', level: 2, percent: 40 });
  });

  it('FR-219 a shot hits when its draw is below 0.70: one draw per shot, in shot order', () => {
    const units = [unit('regiment-1', 'regulars', 'attacker'), unit('regiment-10', 'minutemen', 'defender')];
    const fight = fightBattle({ units, fortLevel: 0 }, seq([0.7, 0.6999]));
    expect(fight.rounds[0].shots).toEqual([
      { shooterId: 'regiment-10', targetId: 'regiment-1', hit: false, damage: 0 },
      { shooterId: 'regiment-1', targetId: 'regiment-10', hit: true, damage: 25 },
    ]);
  });

  it('FR-219 the fort level of a province is the highest on its tiles; Testland\'s capital province has its level-1 fort', () => {
    const s = continent('world');
    expect(fortLevelOf(s, SW1)).toBe(1);
    expect(fortLevelOf(s, ARVELIA_P)).toBe(0);
    expect(fortLevelOf(setTile(s, '10-3', { fortLevel: 2 }), ARVELIA_P)).toBe(2);
  });
});

describe('FR-220 rout and result', () => {
  it('FR-220 a hit that leaves a non-militia regiment at 25 or less routs it: it stops firing and is no longer a target', () => {
    const units = [unit('regiment-1', 'regulars', 'attacker', 30), unit('regiment-2', 'regulars', 'attacker'), unit('regiment-10', 'minutemen', 'defender')];
    const fight = fightBattle({ units, fortLevel: 0 }, seq([0, 0.99, 0.99, 0.99, 0.99]));
    // regiment-1 is hit to 20 and routs; regiment-2 fires; next round the Minutemen aim at regiment-2
    expect(fight.rounds[0].shots.map(s => [s.shooterId, s.targetId])).toEqual([['regiment-10', 'regiment-1'], ['regiment-2', 'regiment-10']]);
    expect(fight.rounds[1].shots.map(s => [s.shooterId, s.targetId])).toEqual([['regiment-10', 'regiment-2'], ['regiment-2', 'regiment-10']]);
    expect(fight.routed).toEqual(['regiment-1']);
  });

  it('FR-220 militia never rout; a side with no standing regiment ends the battle; the attackers win only with no defender standing', () => {
    const militia = fightBattle({ units: [unit('regiment-1', 'regulars', 'attacker'), unit('regiment-10', 'minutemen', 'defender', 30)], fortLevel: 0 }, seq([0.99, 0]));
    expect(militia.routed).toEqual([]);
    expect(militia.health['regiment-10']).toBe(5);

    const routedAll = fightBattle({ units: [unit('regiment-1', 'regulars', 'attacker', 30), unit('regiment-10', 'minutemen', 'defender')], fortLevel: 0 }, always(0));
    expect(routedAll.rounds).toHaveLength(1);
    expect(routedAll.result).toBe('defender-held');
  });
});

describe('FR-221 after the battle', () => {
  it('FR-221 the start army takes Arvelia (every shot hits): the survivors, routed or not, stay as the winner\'s army', () => {
    const { ctx, events } = stubContext(1, 0);
    const after = combatSystem(startArmyAttack(), ctx);

    const [report] = reportsIn(events);
    expect(report.rounds).toHaveLength(5);
    expect(report.result).toBe('attacker-won');
    expect(report.regiments.map(r => [r.id, r.startHealth, r.endHealth, r.fate])).toEqual([
      [R1, 100, 20, 'routed'],
      [R2, 100, 80, 'standing'],
      [A1, 100, 100, 'standing'],
      ...ARVELIA_MILITIA.map(id => [id, 100, 0, 'destroyed']),
    ]);
    expect(armyIn(after, N1, ARVELIA_P)!.regiments.map(r => [r.id, r.health, r.movedOnTurn, r.foughtOnTurn])).toEqual([
      [R1, 20, 1, 1],
      [R2, 80, 1, 1],
      [A1, 100, 1, 1],
    ]);
    expect(armyIn(after, ARVELIA, ARVELIA_P)).toBeUndefined();
    expect(armyIn(after, N1, NE1)!.regiments.map(r => r.id)).toEqual(NE1_MILITIA);
  });

  it('FR-221 a routed defender retreats to the lowest-id bordering province of its owner', () => {
    // Testland holds Arvelia's province (hand-built) and attacks Valdoria North-West, held by one Regulars.
    let s = atWar(relocate(transferProvince(continent('world'), ARVELIA_P, N1), [R1, R2, A1], ARVELIA_P), N1, N2);
    s = addRegiments(clearArmy(clearArmy(s, N2, NW2), ARVELIA, ARVELIA_P), N2, NW2, ['regulars']);
    s = ordered(s, attackOrder(N1, [R1, R2, A1], ARVELIA_P, NW2));
    const { ctx, events } = stubContext(1, 0);
    const after = combatSystem(s, ctx);

    const [report] = reportsIn(events);
    expect(report.rounds.map(r => r.shots.length)).toEqual([4]);
    expect(report.regiments.find(r => r.id === 'regiment-901')).toMatchObject({ endHealth: 9, fate: 'routed' });
    expect(armyIn(after, N2, NE2)!.regiments.map(r => [r.id, r.health])).toEqual([...['regiment-27', 'regiment-28', 'regiment-29', 'regiment-30'].map(id => [id, 100]), ['regiment-901', 9]]);
    expect(after.provinces.find(p => p.id === NW2)!.ownerId).toBe(N1);
  });

  it('FR-221 a routed defender with no bordering province of its owner surrenders', () => {
    let s = addRegiments(clearArmy(borderWar(), ARVELIA, ARVELIA_P), ARVELIA, ARVELIA_P, ['regulars']);
    s = ordered(s, attackOrder(N1, [R1, R2, A1], NE1, ARVELIA_P));
    const { ctx, events } = stubContext(1, 0);
    const after = combatSystem(s, ctx);

    expect(reportsIn(events)[0].regiments.find(r => r.id === 'regiment-901')).toMatchObject({ endHealth: 9, fate: 'surrendered' });
    expect(after.armies.flatMap(a => a.regiments).some(r => r.id === 'regiment-901')).toBe(false);
  });

  it('FR-221 FR-208 when the defenders hold, the attackers go back where they came from; whoever fought does not heal this turn', () => {
    let s = patchRegiment(patchRegiment(startArmyAttack(), R2, { health: 50 }), ARVELIA_MILITIA[0], { health: 50 });
    s = addRegiments(s, N1, SE1, ['regulars'], 50);
    const { ctx } = stubContext(1, 0.99);
    const after = combatSystem(s, ctx);

    expect(armyIn(after, N1, NE1)!.regiments.slice(0, 3).map(r => [r.id, r.health, r.foughtOnTurn])).toEqual([
      [R1, 100, 1],
      [R2, 50, 1],
      [A1, 100, 1],
    ]);
    expect(armyIn(after, ARVELIA, ARVELIA_P)!.regiments.map(r => r.health)).toEqual([50, 100, 100]);
    expect(armyIn(after, N1, SE1)!.regiments.find(r => r.id === 'regiment-901')!.health).toBe(60);
  });

  it('FR-221 FR-222 with several attacking countries the province goes to the first in intentOrder with a standing regiment; the others go home', () => {
    const both = (turn: number) => {
      let s = { ...clearArmy(continent('world'), ARVELIA, ARVELIA_P), turn };
      s = atWar(atWar(relocate(relocate(s, [R1], NE1), [V_R1], NW2), N1, ARVELIA), N2, ARVELIA);
      s = ordered(s, attackOrder(N1, [R1], NE1, ARVELIA_P), attackOrder(N2, [V_R1], NW2, ARVELIA_P));
      return combatSystem(s, stubContext(turn, 0).ctx);
    };
    // turn 1: intentOrder is Testland, Valdoria; turn 2 the other way round
    const t1 = both(1);
    expect(t1.provinces.find(p => p.id === ARVELIA_P)!.ownerId).toBe(N1);
    expect(armyIn(t1, N2, NW2)!.regiments.some(r => r.id === V_R1)).toBe(true);
    const t2 = both(2);
    expect(t2.provinces.find(p => p.id === ARVELIA_P)!.ownerId).toBe(N2);
    expect(armyIn(t2, N1, NE1)!.regiments.some(r => r.id === R1)).toBe(true);
  });
});

describe('FR-225 the battle report', () => {
  it('FR-225 battle-resolved carries the whole battle; replaying the shots on the start healths gives the end healths', () => {
    const s = startArmyAttack();
    const { events } = resolveTurn(s, {}, s.seed);
    const [report] = reportsIn(events);
    expect(Object.keys(report).sort()).toEqual(
      ['type', 'nationId', 'provinceId', 'attackerIds', 'defenderId', 'fortLevel', 'regiments', 'rounds', 'result', 'provinceTaken'].sort()
    );
    expect(Object.keys(report.regiments[0]).sort()).toEqual(['id', 'ownerId', 'type', 'name', 'side', 'startHealth', 'endHealth', 'fate'].sort());

    const health = new Map(report.regiments.map(r => [r.id, r.startHealth]));
    for (const round of report.rounds) for (const shot of round.shots) health.set(shot.targetId, health.get(shot.targetId)! - shot.damage);
    expect(report.regiments.map(r => health.get(r.id))).toEqual(report.regiments.map(r => r.endHealth));
    expect(report.provinceTaken).toBe(report.result === 'attacker-won');
  });

  it('FR-225 battleFrames replays the report round by round from the report alone; the last frame has the fates', () => {
    const { ctx, events } = stubContext(1, 0);
    combatSystem(startArmyAttack(), ctx);
    const [report] = reportsIn(events);
    const frames = battleFrames(report);

    expect(frames).toHaveLength(report.rounds.length + 1);
    expect(frames[0].regiments.map(r => [r.id, r.health, r.status])).toEqual(report.regiments.map(r => [r.id, 100, 'standing']));
    // after round 3 the 1st Regulars is routed (20) and two Minutemen are destroyed
    expect(frames[3].regiments.find(r => r.id === R1)).toEqual({ id: R1, health: 20, status: 'routed' });
    expect(frames[3].regiments.filter(r => r.status === 'destroyed').map(r => r.id)).toEqual(ARVELIA_MILITIA.slice(0, 2));
    expect(frames[5].regiments.map(r => [r.id, r.health, r.status])).toEqual(report.regiments.map(r => [r.id, r.endHealth, r.fate]));
  });

  it('FR-225 battleOutcome names the result for each side; battlesFoughtBy finds the battles a country fought', () => {
    const { ctx, events } = stubContext(1, 0);
    combatSystem(startArmyAttack(), ctx);
    const [won] = reportsIn(events);
    expect([battleOutcome(won, N1), battleOutcome(won, ARVELIA), battleOutcome(won, N2)]).toEqual(['province-taken', 'province-lost', undefined]);

    const held = stubContext(1, 0.99);
    combatSystem(startArmyAttack(), held.ctx);
    const [lost] = reportsIn(held.events);
    expect([battleOutcome(lost, N1), battleOutcome(lost, ARVELIA)]).toEqual(['attack-failed', 'enemy-beaten-back']);

    expect(battlesFoughtBy(events, N1)).toEqual([won]);
    expect(battlesFoughtBy(events, ARVELIA)).toEqual([won]);
    expect(battlesFoughtBy(events, N2)).toEqual([]);
  });
});

describe('FR-226 battle estimate', () => {
  it('FR-226 the start army against Arvelia\'s three entrenched Minutemen: 36 against 18.75, 1.92, likely victory', () => {
    const e = battleEstimate(borderWar(), [R1, R2, A1], ARVELIA_P);
    expect({ attack: e.attack, defence: e.defence, verdict: e.verdict }).toEqual({ attack: 36, defence: 18.75, verdict: 'likely-victory' });
    expect(e.ratio).toBeCloseTo(1.92, 2);
  });

  it('FR-226 the verdict thresholds: 1.5 or more likely victory, 0.75 or more uncertain, else likely defeat', () => {
    // one Regulars (10) against Arvelia's militia at chosen healths: defence = 5 x health / 100 / 0.8 each
    const at = (healths: number[]) => {
      let s = clearArmy(borderWar(), ARVELIA, ARVELIA_P);
      s = addRegiments(s, ARVELIA, ARVELIA_P, healths.map(() => 'minutemen'));
      healths.forEach((h, i) => (s = patchRegiment(s, `regiment-${901 + i}`, { health: h })));
      return battleEstimate(s, [R1], ARVELIA_P);
    };
    expect(at([80, 80])).toMatchObject({ defence: 10, ratio: 1, verdict: 'uncertain' });
    expect(at([96, 64])).toMatchObject({ defence: 10, verdict: 'uncertain' });
    expect(at([48, 48, 32])).toMatchObject({ defence: 8, ratio: 1.25, verdict: 'uncertain' });
    expect(at([64])).toMatchObject({ defence: 4, ratio: 2.5, verdict: 'likely-victory' });
    expect(at([96])).toMatchObject({ defence: 6, verdict: 'likely-victory' });
    expect(at([100, 100, 100, 100, 80, 80])).toMatchObject({ defence: 35, verdict: 'likely-defeat' });
    expect(at([100, 100, 100, 100, 100, 100, 32]).ratio).toBeCloseTo(10 / 39.5, 6);
  });

  it('FR-226 at exactly 1.5 the verdict is likely victory, at exactly 0.75 uncertain', () => {
    // Artillery does not entrench: defence = FPN x health / 100
    const artilleryAt = (health: number) =>
      patchRegiment(addRegiments(clearArmy(borderWar(), ARVELIA, ARVELIA_P), ARVELIA, ARVELIA_P, ['artillery']), 'regiment-901', { health });
    expect(battleEstimate(artilleryAt(50), [R1, R2], ARVELIA_P)).toMatchObject({ attack: 20, defence: 8, ratio: 2.5, verdict: 'likely-victory' });
    const r1Only = (health: number) => battleEstimate(patchRegiment(artilleryAt(health), R1, { health: 60 }), [R1], ARVELIA_P);
    // 6 / 4 = 1.5 and 6 / 8 = 0.75
    expect(r1Only(25)).toMatchObject({ attack: 6, defence: 4, ratio: 1.5, verdict: 'likely-victory' });
    expect(r1Only(50)).toMatchObject({ attack: 6, defence: 8, ratio: 0.75, verdict: 'uncertain' });
    expect(r1Only(51).verdict).toBe('likely-defeat');
  });

  it('FR-226 behind a fort the defence grows by 1 / (1 - R); an undefended province gives an infinite ratio', () => {
    const fort = setTile(borderWar(), '10-3', { fortLevel: 1 });
    expect(battleEstimate(fort, [R1], ARVELIA_P).defence).toBeCloseTo((3 * 5) / 0.7, 9);
    const empty = clearArmy(borderWar(), ARVELIA, ARVELIA_P);
    expect(battleEstimate(empty, [R1], ARVELIA_P)).toMatchObject({ attack: 10, defence: 0, ratio: Infinity, verdict: 'likely-victory' });
  });

  it('FR-226 FR-230 the defenders the attack screen lists: the owner\'s regiments with their protection', () => {
    const s = setTile(borderWar(), '10-3', { fortLevel: 1 });
    expect(defendersOf(s, ARVELIA_P).map(d => [d.regiment.id, d.ownerId, d.protection])).toEqual(
      ARVELIA_MILITIA.map(id => [id, ARVELIA, { kind: 'fort', level: 1, percent: 30 }])
    );
    expect(defendersOf(borderWar(), ARVELIA_P).map(d => d.protection.kind)).toEqual(['entrenched', 'entrenched', 'entrenched']);
  });

  it('FR-230 attackStatus: ready with an active war, war-starts-next-turn when declared, not-at-war without one; attackTargets lists the bordering foreign provinces', () => {
    const peace = relocate(continent('world'), [R1], NE1);
    expect(attackTargets(peace, N1, NE1).map(p => p.id)).toEqual([ARVELIA_P]);
    expect(attackTargets(peace, N1, SW1)).toEqual([]);
    expect(attackStatus(peace, N1, ARVELIA_P)).toBe('not-at-war');
    const declared = ordered(peace, { kind: 'proposeOverture', nationId: N1, overture: 'war', targetId: ARVELIA });
    expect(attackStatus(declared, N1, ARVELIA_P)).toBe('war-starts-next-turn');
    expect(attackStatus(atWar(peace, N1, ARVELIA, 2), N1, ARVELIA_P)).toBe('war-starts-next-turn');
    expect(attackStatus(atWar(peace, N1, ARVELIA, 1), N1, ARVELIA_P)).toBe('ready');
    expect(attackStatus(peace, N1, NE1)).toBe('own-province');
  });
});

describe('FR-227 combat is pure and fair', () => {
  it('FR-227 the combat phase draws only from rngFor("combat"), never the shared stream, and leaves a frozen input unchanged', () => {
    const s = deepFreeze(startArmyAttack());
    const snapshot = structuredClone(s);
    const { ctx, streams } = stubContext(1, 0.5);
    combatSystem(s, ctx);
    expect(new Set(streams)).toEqual(new Set(['combat']));
    expect(s).toEqual(snapshot);
  });

  it('FR-227 a turn with a battle gives the same prices and development results as the same turn without it', () => {
    const withBattle = resolveTurn(startArmyAttack(), {}, 1).state;
    const without = resolveTurn(borderWar(), {}, 1).state;
    expect(withBattle.market!.prices).toEqual(without.market!.prices);
    const resources = (s: GameState) => s.map.tiles.flat().map(t => t.resource);
    expect(resources(withBattle)).toEqual(resources(without));
  });

  it('FR-227 the same seed gives the same report; swapping the order of state.nations gives the same battles', () => {
    const s = startArmyAttack();
    const first = reportsIn(resolveTurn(s, {}, s.seed).events);
    const again = reportsIn(resolveTurn(s, {}, s.seed).events);
    const swapped = reportsIn(resolveTurn({ ...s, nations: [...s.nations].reverse() }, {}, s.seed).events);
    expect(first).toHaveLength(1);
    expect(again).toEqual(first);
    expect(swapped).toEqual(first);
    const other = reportsIn(resolveTurn({ ...s, seed: 2 }, {}, 2).events);
    expect(other).toHaveLength(1);
  });

  it('FR-227 the combat code imports no React, store or DOM and reads no shared turn stream', () => {
    const files = ['engine/army/combat.ts', 'engine/army/battleReport.ts', 'engine/army/conquest.ts', 'engine/systems/combatSystem.ts', 'engine/ai/scriptedWar.ts'];
    for (const file of files) {
      const code = readFileSync(`src/app/${file}`, 'utf8');
      const imports = [...code.matchAll(/from\s+["']([^"']+)["']/g)].map(m => m[1]);
      expect(imports.filter(i => /react|zustand|store|components|^next/.test(i)), file).toEqual([]);
      expect(/\b(window|document)\./.test(code), file).toBe(false);
      expect(/ctx\.rng\b(?!For)/.test(code), file).toBe(false);
    }
  });
});

describe('FR-234 two-islands has no attack, no battle and no combat draw', () => {
  it('FR-234 the combat phase on a world without provinces draws nothing and changes nothing', () => {
    const s = deepFreeze(resolveTurn(newGame({ seed: 1, world: 'two-islands' }), {}, 1).state);
    const { ctx, streams, events } = stubContext(s.turn, 0);
    expect(combatSystem(s, ctx)).toBe(s);
    expect(streams).toEqual([]);
    expect(events).toEqual([]);
  });
});
