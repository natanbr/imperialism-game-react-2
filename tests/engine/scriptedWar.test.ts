// M9 scripted war (FR-228, FR-274): at war the scripted Great Power keeps its capital's 4 arms, marches its other
// regiments toward the province that borders the strongest enemy force and attacks when the estimate (FR-226) is 1.5 or
// more; at peace, from turn 10, it picks the weakest bordering minor, recruits until its field army is twice that minor's
// defence, declares war and takes it. Valdoria (nation-2) is the scripted player throughout.
import { beforeAll, describe, it, expect } from 'vitest';
import { newGame } from '@/engine/newGame';
import { scriptedPlayer } from '@/engine/ai/scriptedPlayer';
import { campaignTarget, capitalKeep } from '@/engine/ai/scriptedWar';
import { tryApplyOrder } from '@/engine/orders/apply';
import type { Order } from '@/engine/orders/Order';
import { resolveTurn } from '@/engine/turn/resolveTurn';
import { transferProvince } from '@/engine/world/provinces';
import { SCRIPTED_WAR } from '@/definisions/combatRules';
import type { GameState } from '@/types/GameState';
import { N1, N2, nationOf, setPair, setTreasury, setWarehouse } from './fixtures';
import { addRegiments, ARVELIA, ARVELIA_P, clearArmy, continent, NE2, NW2, patchRegiment, relocate, SE2, SW2 } from './armyFixtures';

const atWar = (s: GameState, a: string, b: string, since = 1): GameState =>
  setPair(s, a, b, { war: { aggressors: [a], since }, consulates: [], embassies: [], pact: false, alliance: false });

/** The orders of FR-228 and FR-274: recruits, marches and attacks, declarations of war and peace. */
const warOrders = (orders: Order[]): Order[] =>
  orders.filter(o => o.kind === 'setRecruitment' || o.kind === 'moveArmy' || (o.kind === 'proposeOverture' && (o.overture === 'war' || o.overture === 'peace')));

const march = (fromProvinceId: string, regimentIds: string[], toProvinceId: string): Order => ({ kind: 'moveArmy', nationId: N2, fromProvinceId, regimentIds, toProvinceId });
// FR-274 tuned (M9 decision card): the campaign raises Cuirassiers (a trained worker and a horse), not Regulars
const recruitOne: Order = { kind: 'setRecruitment', nationId: N2, regiment: SCRIPTED_WAR.regiment, count: 1 };
const warOn = (targetId: string): Order => ({ kind: 'proposeOverture', nationId: N2, overture: 'war', targetId });

// Valdoria's start army in its capital province (FR-203): 1st and 2nd Regulars and 1st Artillery, 4 arms.
const KEEP = ['regiment-20', 'regiment-21', 'regiment-22'];

/** Testland holds Arvelia's province (hand-built) with these regiments there, Arvelia's militia gone, at war with Valdoria. */
function testlandInArvelia(s: GameState, ids: string[]): GameState {
  return atWar(relocate(clearArmy(transferProvince(s, ARVELIA_P, N1), ARVELIA, ARVELIA_P), ids, ARVELIA_P), N1, N2);
}

describe('FR-228 scripted defence and counter-attack', () => {
  it('FR-228 (a) the capital keeps its oldest regiments up to 4 arms: the start army', () => {
    expect([...capitalKeep(continent('world'), N2)]).toEqual(KEEP);
    const more = addRegiments(continent('world'), N2, SW2, ['regulars']);
    expect([...capitalKeep(more, N2)]).toEqual(KEEP);
  });

  it('FR-228 (a) (b) its other regiments march one province a turn toward its province that borders the strongest enemy force; the keep stays', () => {
    let s = testlandInArvelia(continent('world'), ['regiment-1', 'regiment-2', 'regiment-3']);
    s = addRegiments(addRegiments(s, N2, SE2, ['regulars', 'regulars']), N2, SW2, ['regulars']);
    expect(warOrders(scriptedPlayer(s, N2)).filter(o => o.kind === 'moveArmy')).toEqual([
      march(SW2, ['regiment-903'], NW2),
      march(SE2, ['regiment-901', 'regiment-902'], NE2),
    ]);
  });

  /** Valdoria's field: two Regulars in Valdoria North-West at `health`; Testland's 1st Regulars at 80 in Arvelia (defence 10). */
  const facing = (health: number): GameState => {
    let s = testlandInArvelia(continent('world'), ['regiment-1']);
    s = patchRegiment(addRegiments(s, N2, NW2, ['regulars', 'regulars'], health), 'regiment-1', { health: 80 });
    return s;
  };

  it('FR-228 (c) it attacks with all its regiments in the bordering province when the estimate is 1.5 or more: 1.6 attacks, 1.4 waits', () => {
    expect(warOrders(scriptedPlayer(facing(80), N2)).filter(o => o.kind === 'moveArmy')).toEqual([march(NW2, ['regiment-901', 'regiment-902'], ARVELIA_P)]);
    expect(warOrders(scriptedPlayer(facing(70), N2)).filter(o => o.kind === 'moveArmy')).toEqual([]);
  });

  it('FR-228 (c) a province it lost in this war first, then the lowest id', () => {
    // Testland also holds Valdoria North-East (taken in this war) with its 2nd Regulars at 80: estimate 1.6 on both
    let s = clearArmy(transferProvince(facing(80), NE2, N1), N2, NE2);
    s = patchRegiment(relocate(s, ['regiment-2'], NE2), 'regiment-2', { health: 80 });
    expect(warOrders(scriptedPlayer(s, N2)).filter(o => o.kind === 'moveArmy')).toEqual([march(NW2, ['regiment-901', 'regiment-902'], ARVELIA_P)]);

    const lost = setPair(s, N1, N2, { war: { aggressors: [N1], since: 1, captures: [{ provinceId: NE2, fromId: N2, toId: N1, turn: 1 }] } });
    expect(warOrders(scriptedPlayer(lost, N2)).filter(o => o.kind === 'moveArmy')).toEqual([march(NW2, ['regiment-901', 'regiment-902'], NE2)]);
  });

  it('FR-228 (a) (c) the capital\'s 4 arms never attack; a regiment beyond them does', () => {
    // Testland holds Valdoria North-West with a weak 1st Regulars (30: defence 3.75); Valdoria's capital borders it.
    let s = atWar(relocate(clearArmy(transferProvince(continent('world'), NW2, N1), N2, NW2), ['regiment-1'], NW2), N1, N2);
    s = patchRegiment(s, 'regiment-1', { health: 30 });
    expect(warOrders(scriptedPlayer(s, N2)).filter(o => o.kind === 'moveArmy')).toEqual([]);
    s = addRegiments(s, N2, SW2, ['regulars']);
    expect(warOrders(scriptedPlayer(s, N2)).filter(o => o.kind === 'moveArmy')).toEqual([march(SW2, ['regiment-901'], NW2)]);
  });

  it('FR-228 (d) FR-174 a province taken in this war makes it propose peace the next turn', () => {
    let s = transferProvince(continent('world'), ARVELIA_P, N1);
    s = atWar(relocate(clearArmy(clearArmy(s, ARVELIA, ARVELIA_P), N2, NW2), ['regiment-1'], ARVELIA_P), N1, N2);
    const { state: next, result } = tryApplyOrder(s, { kind: 'moveArmy', nationId: N1, fromProvinceId: ARVELIA_P, regimentIds: ['regiment-1'], toProvinceId: NW2 });
    expect(result).toEqual({ ok: true });
    const after = resolveTurn(next, {}, next.seed).state;
    expect(after.provinces.find(p => p.id === NW2)!.ownerId).toBe(N1);
    expect(warOrders(scriptedPlayer(after, N2))).toContainEqual({ kind: 'proposeOverture', nationId: N2, overture: 'peace', targetId: N1 });
  });
});

describe('FR-274 scripted war on minors', () => {
  /** The continent on `turn` with an armament in Valdoria's warehouse, so a recruit is possible. */
  const onTurn = (turn: number, s: GameState = continent('world')): GameState => setWarehouse({ ...s, turn }, N2, { armaments: 1 });

  it('FR-274 before turn 10 nothing: no recruit, no war', () => {
    expect(SCRIPTED_WAR.fromTurn).toBe(10);
    expect(warOrders(scriptedPlayer(onTurn(9), N2))).toEqual([]);
    expect(campaignTarget(onTurn(9), N2)).toBeUndefined();
  });

  it('FR-274 from turn 10, at war with no one, it picks the bordering minor with the lowest defence and recruits 1 regiment a turn (Cuirassiers, tuned)', () => {
    expect(SCRIPTED_WAR.regiment).toBe('cuirassiers');
    expect(campaignTarget(onTurn(10), N2)).toBe(ARVELIA);
    expect(warOrders(scriptedPlayer(onTurn(10), N2))).toEqual([recruitOne]);
  });

  it('FR-274 recruiting keeps the FR-213 limits: not below $2,500 after the order', () => {
    expect(warOrders(scriptedPlayer(setTreasury(onTurn(10), N2, 2999), N2))).toEqual([]);
    expect(warOrders(scriptedPlayer(setTreasury(onTurn(10), N2, 3000), N2))).toEqual([recruitOne]);
    // a horse is part of the cost (FR-200): none in the warehouse, no recruit
    expect(warOrders(scriptedPlayer(setWarehouse(onTurn(10), N2, { horses: 0 }), N2))).toEqual([]);
  });

  it('FR-274 with its field army at twice the minor\'s defence it declares war and marches the field army to the bordering province', () => {
    // 4 Regulars beyond the keep: 40 against twice Arvelia's 18.75
    const ready = addRegiments(onTurn(10), N2, SW2, ['regulars', 'regulars', 'regulars', 'regulars']);
    expect(warOrders(scriptedPlayer(ready, N2))).toEqual([warOn(ARVELIA), march(SW2, ['regiment-901', 'regiment-902', 'regiment-903', 'regiment-904'], NW2)]);
    // 3 Regulars (30) are not enough: one more recruit, no war
    const short = addRegiments(onTurn(10), N2, SW2, ['regulars', 'regulars', 'regulars']);
    expect(warOrders(scriptedPlayer(short, N2))).toEqual([recruitOne]);
    // 3 Cuirassiers (45) are: war
    const cavalry = addRegiments(onTurn(10), N2, SW2, ['cuirassiers', 'cuirassiers', 'cuirassiers']);
    expect(warOrders(scriptedPlayer(cavalry, N2))[0]).toEqual(warOn(ARVELIA));
  });

  it('FR-274 at war with the minor it attacks on a turn the estimate is 1.5 or more (FR-228)', () => {
    let s = atWar(onTurn(12), N2, ARVELIA);
    s = addRegiments(s, N2, NW2, ['regulars', 'regulars', 'regulars', 'regulars']);
    expect(warOrders(scriptedPlayer(s, N2)).filter(o => o.kind === 'moveArmy')).toEqual([
      march(NW2, ['regiment-901', 'regiment-902', 'regiment-903', 'regiment-904'], ARVELIA_P),
    ]);
  });

  it('FR-274 one war at a time, never on a Great Power, never on a colony', () => {
    const ready = addRegiments(onTurn(10), N2, SW2, ['regulars', 'regulars', 'regulars', 'regulars']);
    const atWarWithTestland = atWar(ready, N1, N2);
    expect(warOrders(scriptedPlayer(atWarWithTestland, N2)).filter(o => o.kind === 'proposeOverture')).toEqual([]);
    expect(campaignTarget(atWarWithTestland, N2)).toBeUndefined();
    const colony = { ...ready, minorNations: ready.minorNations.map(m => (m.id === ARVELIA ? { ...m, colonyOf: N1 } : m)) };
    expect(campaignTarget(colony, N2)).toBeUndefined();
    expect(warOrders(scriptedPlayer(colony, N2))).toEqual([]);
  });

  it('FR-274 FR-234 two-islands: no target, no army order', () => {
    const v1 = { ...newGame({ seed: 1, world: 'two-islands' }), turn: 12 };
    expect(campaignTarget(v1, N2)).toBeUndefined();
    expect(warOrders(scriptedPlayer(v1, N2))).toEqual([]);
  });

  describe('FR-274 acceptance: the continent, seeds 1 to 4, 40 turns, Testland idle', () => {
    const SEEDS = [1, 2, 3, 4];
    interface Run {
      seed: number;
      declared?: number;
      colonised?: number;
      refused: number;
      lowestTreasury: number;
      warsOnGreatPowers: number;
      /** Valdoria's regiments disbanded for want of pay (FR-202; M9 review R1: 4 and 6 on seeds 1 and 3 at turn 33 before FR-275). */
      noPay: number;
    }
    const runs: Run[] = [];
    beforeAll(() => {
      for (const seed of SEEDS) {
        let s = newGame({ seed, world: 'continent' });
        const run: Run = { seed, refused: 0, lowestTreasury: Infinity, warsOnGreatPowers: 0, noPay: 0 };
        for (let turn = 1; turn <= 40; turn++) {
          const { state, events } = resolveTurn(s, { [N2]: scriptedPlayer(s, N2) }, s.seed);
          for (const e of events) {
            if (e.type === 'order-rejected') run.refused++;
            if (e.type === 'regiments-disbanded' && e.reason === 'no-pay' && e.nationId === N2) run.noPay += e.count;
            if (e.type === 'war-declared' && e.nationId === N2) {
              if (state.nations.some(n => n.id === e.targetId)) run.warsOnGreatPowers++;
              else run.declared ??= turn;
            }
            if (e.type === 'minor-colonised' && e.nationId === N2) run.colonised ??= turn;
          }
          s = state;
          run.lowestTreasury = Math.min(run.lowestTreasury, nationOf(s, N2).treasury);
        }
        runs.push(run);
      }
      console.log(
        'FR-274 per seed (declared, colonised, lowest treasury, no-pay disbands):',
        JSON.stringify(runs.map(r => [r.seed, r.declared, r.colonised, r.lowestTreasury, r.noPay]))
      );
    }, 300_000);

    it('FR-274 no order is refused, the treasury never goes below 0 and no war is declared on a Great Power', () => {
      expect(runs.map(r => ({ seed: r.seed, refused: r.refused, broke: r.lowestTreasury < 0, warsOnGreatPowers: r.warsOnGreatPowers }))).toEqual(
        SEEDS.map(seed => ({ seed, refused: 0, broke: false, warsOnGreatPowers: 0 }))
      );
    });

    it('FR-274 FR-275 Valdoria loses no regiment for want of pay: the army that took Arvelia is paid to turn 40 (review R1)', () => {
      expect(runs.map(r => [r.seed, r.noPay])).toEqual(SEEDS.map(seed => [seed, 0]));
    });

    it('FR-274 Valdoria declares war on a minor by turn 25 and takes its capital by turn 40 in at least 3 of the 4 seeds', () => {
      const met = runs.filter(r => r.declared !== undefined && r.declared <= 25 && r.colonised !== undefined && r.colonised <= 40);
      expect(met.length, JSON.stringify(runs)).toBeGreaterThanOrEqual(3);
    });
  });
});

