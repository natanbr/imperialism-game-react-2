// FR-202: army upkeep, $25 per arms point a turn (Imp1 ledgers), a step right after the trade phase; a treasury that
// cannot pay disbands the newest regiments (Q36). The Deal Book's bottom line reads it (the M7 seam, FR-244).
import { describe, it, expect } from 'vitest';
import { newGame } from '@/engine/newGame';
import { tryApplyOrder } from '@/engine/orders/apply';
import { resolveTurn } from '@/engine/turn/resolveTurn';
import type { GameEvent } from '@/engine/turn/context';
import type { Order } from '@/engine/orders/Order';
import { dealBook } from '@/engine/market/dealBook';
import { TURN_PHASES } from '@/engine/turn/phases';
import { tradeSystem } from '@/engine/systems/tradeSystem';
import { productionSystem } from '@/engine/systems/productionSystem';
import { disbandSystem, upkeepSystem } from '@/engine/systems/armySystem';
import { upkeepOf } from '@/engine/army/armies';
import { upkeepForecast } from '@/engine/army/upkeepForecast';
import type { GameState } from '@/types/GameState';
import type { SubsidyPercent } from '@/types/Diplomacy';
import { ResourceType } from '@/types/Resource';
import { N1, N2, nationOf, setPair, setTreasury, setWarehouse } from './fixtures';
import { ARVELIA, continent, idOf, namesIn, SW1 } from './armyFixtures';

const endTurn = (s: GameState, orders: Record<string, Order[]> = {}) => resolveTurn(s, orders, s.seed);
const ofType = <K extends GameEvent['type']>(events: GameEvent[], type: K) => events.filter((e): e is Extract<GameEvent, { type: K }> => e.type === type);
function ordered(s: GameState, ...orders: Order[]): GameState {
  return orders.reduce((state, order) => {
    const { state: next, result } = tryApplyOrder(state, order);
    expect(result, order.kind).toEqual({ ok: true });
    return next;
  }, s);
}

describe('FR-202 army upkeep', () => {
  it('FR-202 the example: the FR-203 start army (4 arms) costs each Great Power $100 a turn, as on the Imp1 1815 ledger', () => {
    const s = continent();
    expect([upkeepOf(s, N1), upkeepOf(s, N2)]).toEqual([100, 100]);

    const { state, events } = endTurn(s);

    expect(ofType(events, 'army-upkeep')).toEqual([
      { type: 'army-upkeep', nationId: N1, amount: 100 },
      { type: 'army-upkeep', nationId: N2, amount: 100 },
    ]);
    expect([nationOf(state, N1).treasury, nationOf(state, N2).treasury]).toEqual([9900, 9900]);
  });

  it('FR-202 FR-215 two-islands: no army, no upkeep, no event; the treasury is unchanged', () => {
    const s = newGame({ seed: 1, world: 'two-islands' });

    const { state, events } = endTurn(s);

    expect(ofType(events, 'army-upkeep')).toEqual([]);
    expect(nationOf(state, N1).treasury).toBe(10000);
  });

  it('FR-202 militia cost nothing and minors pay nothing: the only upkeep events are the Great Powers\'', () => {
    const { events } = endTurn(continent());

    expect(ofType(events, 'army-upkeep').map(e => e.nationId)).toEqual([N1, N2]);
    expect(upkeepOf(continent(), ARVELIA)).toBe(0);
  });

  it('FR-202 the step runs right after the trade phase: the cash of this turn\'s sale pays it', () => {
    expect(TURN_PHASES.indexOf(upkeepSystem)).toBe(TURN_PHASES.indexOf(tradeSystem) + 2);
    expect(TURN_PHASES.indexOf(disbandSystem)).toBe(TURN_PHASES.indexOf(tradeSystem) + 1);
    expect(TURN_PHASES.indexOf(upkeepSystem)).toBeLessThan(TURN_PHASES.indexOf(productionSystem));
    // $0 in the treasury, 1 coal sold on the world market at $100: the upkeep is paid, nothing disbanded
    const s = setWarehouse(setTreasury(continent('world'), N1, 0), N1, { coal: 1 });
    const { state, events } = endTurn(ordered(s, { kind: 'sellCommodity', nationId: N1, commodity: ResourceType.Coal, amount: 1 }));

    expect(ofType(events, 'regiments-disbanded')).toEqual([]);
    expect(ofType(events, 'army-upkeep').filter(e => e.nationId === N1)).toEqual([{ type: 'army-upkeep', nationId: N1, amount: 100 }]);
    expect(nationOf(state, N1).treasury).toBe(0);
  });

  it('FR-202 a treasury that cannot pay: the newest regiment goes first, one at a time, until it can; then it pays', () => {
    const s = setTreasury(continent(), N1, 60);

    const { state, events } = endTurn(s);

    // the 1st Artillery (2 arms) is the newest non-militia regiment; the 2 Regulars then cost $50
    expect(namesIn(state, N1, SW1).slice(0, 3)).toEqual(['1st Regulars', '2nd Regulars', '9th Minutemen']);
    const n1 = events.filter(e => (e.type === 'regiments-disbanded' || e.type === 'army-upkeep') && e.nationId === N1);
    expect(n1).toEqual([
      { type: 'regiments-disbanded', nationId: N1, reason: 'no-pay', count: 1 },
      { type: 'army-upkeep', nationId: N1, amount: 50 },
    ]);
    expect(nationOf(state, N1).treasury).toBe(10);
  });

  it('FR-202 when nothing can be paid every non-militia regiment goes and no upkeep event follows; the militia stay', () => {
    const s = setTreasury(continent(), N1, 20);

    const { state, events } = endTurn(s);

    expect(namesIn(state, N1, SW1)).toEqual(['9th Minutemen', '10th Minutemen', '11th Minutemen', '12th Minutemen']);
    expect(events.filter(e => (e.type === 'regiments-disbanded' || e.type === 'army-upkeep') && e.nationId === N1)).toEqual([
      { type: 'regiments-disbanded', nationId: N1, reason: 'no-pay', count: 3 },
    ]);
    expect(nationOf(state, N1).treasury).toBe(20);
  });

  it('FR-202 FR-207 the amount counts the regiments left after this turn\'s disbands', () => {
    const s = continent();

    const { events } = endTurn(ordered(s, { kind: 'disbandRegiments', nationId: N1, provinceId: SW1, regimentIds: [idOf(s, N1, '1st Artillery')] }));

    expect(ofType(events, 'army-upkeep').filter(e => e.nationId === N1)).toEqual([{ type: 'army-upkeep', nationId: N1, amount: 50 }]);
  });

  it('FR-201 FR-202 a regiment recruited this turn joins after the step: it pays from next turn', () => {
    const s = setWarehouse(continent(), N1, { armaments: 1 });

    const first = endTurn(ordered(s, { kind: 'setRecruitment', nationId: N1, regiment: 'regulars', count: 1 }));
    const second = endTurn(first.state);

    expect(ofType(first.events, 'army-upkeep').find(e => e.nationId === N1)?.amount).toBe(100);
    expect(ofType(second.events, 'army-upkeep').find(e => e.nationId === N1)?.amount).toBe(125);
  });

  it('FR-202 FR-244 the Deal Book\'s bottom line reads the upkeep: militaryUpkeep and the trade net', () => {
    const { state, events } = endTurn(continent());

    const book = dealBook(events, N1, { start: 10000, end: nationOf(state, N1).treasury });

    expect(book.bottomLine).toEqual({ sold: 0, bought: 0, militaryUpkeep: 100, net: -100 });
    expect(book.treasury).toEqual({ start: 10000, end: 9900, change: -100, other: 0 });
  });
});

describe('FR-261 the upkeep forecast (M8 review F2): what End Turn\'s upkeep step will charge and the cash it will find', () => {
  /** Testland pays a standing locked grant of `amount` to Arvelia (an embassy there), from an earlier turn. */
  const lockedGrant = (s: GameState, amount: 1000 | 3000) => setPair(s, N1, ARVELIA, { consulates: [N1], embassies: [N1], lockedGrants: { [N1]: amount } });
  const disbandArtillery = (s: GameState): Order => ({ kind: 'disbandRegiments', nationId: N1, provinceId: SW1, regimentIds: [idOf(s, N1, '1st Artillery')] });

  it('FR-261 a new game: $100 due, the whole treasury to pay it; two-islands: nothing due', () => {
    expect(upkeepForecast(continent(), N1)).toEqual({ due: 100, cash: 10000, short: false, shortBy: 0, regimentsLost: [] });
    expect(upkeepForecast(newGame({ seed: 1, world: 'two-islands' }), N1)).toEqual({ due: 0, cash: 10000, short: false, shortBy: 0, regimentsLost: [] });
  });

  it('FR-261 FR-207 a disband ordered this turn takes its regiments out of what is due', () => {
    const s = continent();

    expect(upkeepForecast(ordered(s, disbandArtillery(s)), N1).due).toBe(50);
  });

  it('FR-261 short when the treasury is below what is due, and End Turn then disbands as forecast', () => {
    const s = setTreasury(continent(), N1, 60);

    expect(upkeepForecast(s, N1)).toMatchObject({ due: 100, cash: 60, short: true });
    expect(ofType(endTurn(s).events, 'regiments-disbanded').filter(e => e.nationId === N1)).toEqual([{ type: 'regiments-disbanded', nationId: N1, reason: 'no-pay', count: 1 }]);
  });

  it('FR-261 FR-170 a standing locked grant is paid in the diplomacy phase before the upkeep: $3,050 with a $3,000 grant leaves $50, short, and End Turn disbands', () => {
    const s = setTreasury(lockedGrant(continent(), 3000), N1, 3050);

    expect(upkeepForecast(s, N1)).toMatchObject({ due: 100, cash: 50, short: true, shortBy: 50 });
    const { events } = endTurn(s);
    expect(ofType(events, 'grant-paid').filter(e => e.nationId === N1).map(e => e.amount)).toEqual([3000]);
    expect(ofType(events, 'regiments-disbanded').filter(e => e.nationId === N1).map(e => e.reason)).toEqual(['no-pay']);
  });

  it('FR-261 FR-170 a grant the treasury cannot hold is not paid (it stops), and one replaced or stopped this turn is not counted again', () => {
    // $2,000 cannot hold the $3,000 grant: it stops, the treasury pays the upkeep
    const notShort = { shortBy: 0, regimentsLost: [] };
    expect(upkeepForecast(setTreasury(lockedGrant(continent(), 3000), N1, 2000), N1)).toEqual({ due: 100, cash: 2000, short: false, ...notShort });
    // a new locked grant ordered this turn is paid when ordered and replaces the standing one
    const replaced = ordered(setTreasury(lockedGrant(continent(), 3000), N1, 4000), { kind: 'giveGrant', nationId: N1, targetId: ARVELIA, amount: 1000, locked: true });
    expect(upkeepForecast(replaced, N1)).toEqual({ due: 100, cash: 3000, short: false, ...notShort });
    // withdrawn this turn
    const stopped = ordered(setTreasury(lockedGrant(continent(), 3000), N1, 3050), { kind: 'withdrawOverture', nationId: N1, overture: 'grant', targetId: ARVELIA });
    expect(upkeepForecast(stopped, N1)).toEqual({ due: 100, cash: 3050, short: false, ...notShort });
  });
});

describe('FR-392 the forecast counts what this turn\'s bids cost above their reserve at the deal price (audit AISIM-06)', () => {
  const SUNDMARK = 'minor-2';
  const buyTimber: Order = { kind: 'buyCommodity', nationId: N1, commodity: ResourceType.Timber, amount: 1 };
  /** A consulate in Sundmark (it offers 1 timber) with our subsidy toward it, timber at $101, $251 before the bid. */
  function subsidised(percent: SubsidyPercent | 0): GameState {
    const s = setPair(continent(), N1, SUNDMARK, { consulates: [N1], subsidies: percent ? { [N1]: percent } : {} });
    const market = { ...s.market!, prices: { ...s.market!.prices, [ResourceType.Timber]: 101 } };
    return ordered(setTreasury({ ...s, market }, N1, 251), buyTimber);
  }

  it('FR-392 the AISIM-06 example: $150 after the bid, a 100% subsidy toward Sundmark: the deal costs $202, so cash 49, short', () => {
    const s = subsidised(100);
    expect(nationOf(s, N1).treasury).toBe(150);

    const forecast = upkeepForecast(s, N1);

    expect(forecast).toMatchObject({ due: 100, cash: 49, short: true, shortBy: 51 });
    expect(forecast.regimentsLost.map(r => r.name)).toEqual(['1st Artillery', '2nd Regulars']);
    // End Turn does what the forecast said: the trade phase takes the extra $101 before the upkeep step
    const { events } = endTurn(s);
    expect(ofType(events, 'goods-bought').filter(e => e.nationId === N1)).toEqual([
      expect.objectContaining({ commodity: ResourceType.Timber, amount: 1, price: 202, cost: 202, counterpartyId: SUNDMARK }),
    ]);
    expect(ofType(events, 'regiments-disbanded').filter(e => e.nationId === N1)).toEqual([{ type: 'regiments-disbanded', nationId: N1, reason: 'no-pay', count: 2 }]);
  });

  it('FR-392 a 10% subsidy: the deal price floor(101 x 1.1) = 111 costs $10 above the reserve', () => {
    expect(upkeepForecast(subsidised(10), N1)).toMatchObject({ cash: 140, short: false });
  });

  it('FR-392 FR-497 a competing private bid cannot reveal who will pay the subsidy in the upkeep forecast', () => {
    const before = setPair(subsidised(100), N2, SUNDMARK, { points: 89, consulates: [N2] });
    const after = ordered(before, { ...buyTimber, nationId: N2 });
    expect(upkeepForecast(before, N1).cash).toBe(49);
    expect(upkeepForecast(after, N1).cash).toBe(49);
    const bought = ofType(endTurn(after).events, 'goods-bought').filter(e => e.counterpartyId === SUNDMARK && e.commodity === ResourceType.Timber);
    expect(bought.map(e => e.nationId)).toEqual([N2]);
  });

  it('FR-392 no subsidy: the bid costs its reserve, nothing more', () => {
    expect(upkeepForecast(subsidised(0), N1)).toMatchObject({ cash: 150, short: false });
  });

  it('FR-392 a bid nobody may fill (no consulate anywhere) adds nothing', () => {
    const s = setPair(continent(), N1, SUNDMARK, { subsidies: { [N1]: 100 } });
    // the bid is refused without a seller open to us, so the forecast is the treasury's
    expect(upkeepForecast(s, N1)).toMatchObject({ cash: 10000 });
  });
});

describe('FR-393 the forecast says by how much and which regiments go (card Q99: the FR-202 rule is unchanged)', () => {
  const lostNames = (s: GameState, extra?: number) => upkeepForecast(s, N1, extra).regimentsLost.map(r => r.name);

  it('FR-393 $60 for $100 due: $40 short, the newest regiment (1st Artillery) goes, as End Turn then does', () => {
    const s = setTreasury(continent(), N1, 60);

    expect(upkeepForecast(s, N1)).toMatchObject({ due: 100, cash: 60, short: true, shortBy: 40 });
    expect(lostNames(s)).toEqual(['1st Artillery']);
    expect(namesIn(endTurn(s).state, N1, SW1)).not.toContain('1st Artillery');
    expect(namesIn(endTurn(s).state, N1, SW1)).toContain('2nd Regulars');
  });

  it('FR-393 $20 for $100 due: every non-militia regiment goes, newest first, as End Turn does', () => {
    const s = setTreasury(continent(), N1, 20);

    expect(upkeepForecast(s, N1)).toMatchObject({ due: 100, cash: 20, short: true, shortBy: 80 });
    expect(lostNames(s)).toEqual(['1st Artillery', '2nd Regulars', '1st Regulars']);
    expect(namesIn(endTurn(s).state, N1, SW1)).toEqual(['9th Minutemen', '10th Minutemen', '11th Minutemen', '12th Minutemen']);
  });

  it('FR-393 a regiment ordered to disband is not lost to the upkeep: it leaves before the step', () => {
    const s = setTreasury(continent(), N1, 20);
    const disbanding = ordered(s, { kind: 'disbandRegiments', nationId: N1, provinceId: SW1, regimentIds: [idOf(s, N1, '1st Artillery')] });

    expect(upkeepForecast(disbanding, N1)).toMatchObject({ due: 50, shortBy: 30 });
    expect(lostNames(disbanding)).toEqual(['2nd Regulars', '1st Regulars']);
  });

  it('FR-393 FR-422 an extra spend (a grant about to be given) comes off the cash first', () => {
    const s = continent();

    expect(upkeepForecast(s, N1, 9950)).toMatchObject({ due: 100, cash: 50, short: true, shortBy: 50 });
    expect(lostNames(s, 9950)).toEqual(['1st Artillery']);
    expect(upkeepForecast(s, N1, 0)).toEqual(upkeepForecast(s, N1));
    // M12 review (L1-ENG-1): a negative extra spend is money given back, not dropped
    expect(upkeepForecast(setTreasury(s, N1, 50), N1, -50)).toMatchObject({ due: 100, cash: 100, short: false, shortBy: 0 });
  });

  it('FR-393 not short: shortBy 0 and nobody lost', () => {
    expect(upkeepForecast(setTreasury(continent(), N1, 100), N1)).toMatchObject({ short: false, shortBy: 0, regimentsLost: [] });
  });
});
