// M13 (FR-481): the human policies of the sim harness. Each one stands in for the person playing nation 1 (Testland) on the
// continent; the harness applies the orders it plans one by one with `tryApplyOrder`, as the store's `submitOrder` does,
// and then lets the computer plan (`computerOrders`) and resolves the turn. Not a test file.
//
// A policy reads only the state it is given and last turn's public trade orders (FR-491, FR-497): never an order the
// computer gives this turn. `setup` is a test injection before the turn's orders (it is not a player action).
import type { GameState } from '@/types/GameState';
import type { MinorNationId } from '@/types/Common';
import type { PairDiplomacy } from '@/types/Diplomacy';
import type { Order } from '@/engine/orders/Order';
import type { TradeCommodity, TradeOrders } from '@/types/Market';
import { scriptedPlayer, upkeepReserve } from '@/engine/ai/scriptedPlayer';
import { relationOf } from '@/engine/diplomacy/relations';
import { COUNCIL } from '@/definisions/council';
import { GRANT_POINTS, OVERTURE_COST } from '@/definisions/diplomacyRules';
import { validateOrder } from '@/engine/orders/validate';
import { applyOrder } from '@/engine/orders/apply';
import { treasuryOf } from '@/engine/orders/queries';
import { adjacentProvinces, provincesOf } from '@/engine/world/provinces';
import { capitalProvinceOf, raiseRegiments } from '@/engine/army/armies';
import { fallCapital, takeProvince } from '@/engine/army/conquest';
import { marketOf, priceOf } from '@/engine/market/market';
import { RECRUITABLE_REGIMENTS } from '@/definisions/regiments';
import { GoodsType, MaterialType } from '@/types/Resource';

/** The person's nation (Testland) and the computer's (Valdoria) on the continent. */
export const HUMAN_ID = 'nation-1';
export const COMPUTER_ID = 'nation-2';

/** What a policy may look at besides the state. */
export interface HumanContext {
  /** The turn being played. */
  turn: number;
  /**
   * Last turn's public trade orders by Great Power (the Trade Book of Imp1; FR-491 records the same in the state from M13 on).
   * The harness derives them from the orders the nations had registered when last turn's trade phase cleared them: an
   * empty `{ sell: {}, buy: {} }` for a nation with none, and everything empty on turn 1.
   */
  lastTrade: Readonly<Record<string, TradeOrders>>;
}

export interface HumanPolicy {
  name: string;
  /** A test setup injected before the turn's orders (a deliberate injection, not a player action). */
  setup?: (state: GameState) => GameState;
  /** The orders of this turn, planned on the state as it is; the harness applies them one by one. */
  orders: (state: GameState, context: HumanContext) => Order[];
}

const noop = (): void => {};

/** `idle`: End Turn only. */
export const idle: HumanPolicy = { name: 'idle', orders: () => [] };

/** `scripted`: the scripted player plays nation 1 too, so both Great Powers race for Arvelia. */
export const scripted: HumanPolicy = { name: 'scripted', orders: state => scriptedPlayer(state, HUMAN_ID) };

interface DiplomaticPartner {
  id: MinorNationId;
  pair: PairDiplomacy;
  frontier: boolean;
  lead: number;
}

/** Direct finite cargo toward independent island votes. Reopen established routes once the other islands are competitive. */
function diplomaticTradePolicies(partners: readonly DiplomaticPartner[]): Order[] {
  const needsTrade = partners.some(p => !p.frontier && p.lead < 5);
  const orders: Order[] = [];
  for (const p of partners) {
    if (!p.pair.consulates.includes(HUMAN_ID)) continue;
    // A lead as large as the largest grant can spare its cargo while another island leads by fewer than five.
    const boycott = p.frontier || (needsTrade && p.lead >= GRANT_POINTS[10000]);
    if (p.pair.boycotts.includes(HUMAN_ID) !== boycott) {
      orders.push({ kind: 'setTradePolicy', nationId: HUMAN_ID, targetId: p.id, subsidyPercent: 0, boycott });
    }
  }
  return orders;
}

/** FR-509: seek minor votes while retaining the scripted economy, garrison and marches on home soil. */
export const diplomat: HumanPolicy = {
  name: 'diplomat',
  orders: state => {
    let view = state;
    const orders: Order[] = [];
    const propose = (order: Order): boolean => {
      if (!validateOrder(view, order).ok) return false;
      view = applyOrder(view, order);
      orders.push(order);
      return true;
    };
    const partners = state.minorNations.flatMap(minor => {
      const pair = relationOf(state, HUMAN_ID, minor.id);
      if (!pair || pair.war || minor.colonyOf !== undefined) return [];
      // A frontier consulate can be lost to conquest. The public map gives the same tie-break to every seed.
      const frontier = provincesOf(state, minor.id).some(p => adjacentProvinces(state, p.id).some(n => n.ownerId === COMPUTER_ID));
      const lead = pair.points - (relationOf(state, COMPUTER_ID, minor.id)?.points ?? 0);
      return [{ id: minor.id, pair, frontier, lead }];
    }).sort((a, b) => Number(a.frontier) - Number(b.frontier) || a.lead - b.lead);
    const consulate = partners.find(p => !p.pair.consulates.includes(HUMAN_ID));
    if (state.turn <= 4 && consulate) {
      propose({ kind: 'proposeOverture', nationId: HUMAN_ID, targetId: consulate.id, overture: 'consulate' });
    }

    // Equal relations favour secure partners, then those where the rival has the larger lead. FR-162 requires an embassy.
    const below = partners.filter(p => p.pair.points < COUNCIL.minRelationPoints).sort((a, b) => b.pair.points - a.pair.points);
    const grant = below.find(p => p.pair.embassies.includes(HUMAN_ID));
    if (grant && treasuryOf(view, HUMAN_ID) - 1000 >= 3000) {
      propose({ kind: 'giveGrant', nationId: HUMAN_ID, targetId: grant.id, amount: 1000, locked: false });
    }
    const remainingConsulates = Math.max(0, 4 - state.turn) * OVERTURE_COST.consulate;
    for (const policy of diplomaticTradePolicies(partners)) propose(policy);
    // Fund the diplomatic office before optional domestic investment. The next consulates and army pay still come due.
    const consularPartners = below.filter(p => !p.frontier && p.pair.consulates.includes(HUMAN_ID) && !p.pair.embassies.includes(HUMAN_ID));
    const nextEmbassy = grant ? undefined : consularPartners.find(p => p.lead <= 0) ?? consularPartners[0];
    if (nextEmbassy && treasuryOf(view, HUMAN_ID) - OVERTURE_COST.embassy >= remainingConsulates + upkeepReserve(view, HUMAN_ID)) {
      propose({ kind: 'proposeOverture', nationId: HUMAN_ID, targetId: nextEmbassy.id, overture: 'embassy' });
    }
    const economy = scriptedPlayer(view, HUMAN_ID, (order, before, after) => {
      if (order.kind === 'proposeOverture') return order.overture !== 'war' && order.overture !== 'consulate' && order.overture !== 'embassy';
      if (order.kind === 'moveArmy') return view.provinces.some(p => p.id === order.toProvinceId && p.ownerId === HUMAN_ID);
      if (order.kind === 'giveGrant') return false;
      const left = treasuryOf(after, HUMAN_ID);
      if (nextEmbassy && (order.kind === 'trainWorkers' || order.kind === 'moveAndStartConstruction') && left < OVERTURE_COST.embassy + 3000) return false;
      return left >= treasuryOf(before, HUMAN_ID) || left >= remainingConsulates;
    });
    return [...orders, ...economy];
  },
};

/** The turn the aggressor's test setup runs and the turn it declares war on the computer (the audit's war human). */
export const AGGRESSOR_SETUP_TURN = 4;
export const AGGRESSOR_WAR_TURN = 5;

/**
 * Test setup of the aggressor, the audit's war human: on turn 4 nation 1 holds Arvelia (the land bridge, the only way two
 * Great Powers can meet) and 6 Cuirassiers + 4 Regulars in its capital province.
 */
function aggressorSetup(state: GameState): GameState {
  if (state.turn !== AGGRESSOR_SETUP_TURN) return state;
  const capital = capitalProvinceOf(state, HUMAN_ID);
  if (!capital) return state;
  let s = raiseRegiments(state, HUMAN_ID, capital.id, 'cuirassiers', 6);
  s = raiseRegiments(s, HUMAN_ID, capital.id, 'regulars', 4);
  const arvelia = s.minorNations.find(m => m.name === 'Arvelia');
  const province = arvelia ? capitalProvinceOf(s, arvelia.id) : undefined;
  if (arvelia && province && province.ownerId === arvelia.id) {
    s = takeProvince(s, province.id, HUMAN_ID, state.turn, noop);
    s = fallCapital(s, arvelia.id, HUMAN_ID, state.turn, noop);
  }
  return s;
}

/**
 * `aggressor`: the scripted player's turn, plus from turn 5 a declaration of war on the computer, and from turn 3 up to 2
 * more of each regiment type it can raise (the audit's `warOrders`).
 */
export const aggressor: HumanPolicy = {
  name: 'aggressor',
  setup: aggressorSetup,
  orders: state => {
    const base = scriptedPlayer(state, HUMAN_ID);
    let view = state;
    for (const order of base) view = applyOrder(view, order);
    const extra: Order[] = [];
    const propose = (order: Order): boolean => {
      if (!validateOrder(view, order).ok) return false;
      view = applyOrder(view, order);
      extra.push(order);
      return true;
    };
    if (state.turn >= AGGRESSOR_WAR_TURN) propose({ kind: 'proposeOverture', nationId: HUMAN_ID, overture: 'war', targetId: COMPUTER_ID });
    if (state.turn >= 3) {
      for (const regiment of RECRUITABLE_REGIMENTS) {
        for (let i = 0; i < 2; i++) {
          const have = view.nations.find(n => n.id === HUMAN_ID)?.recruiting?.[regiment] ?? 0;
          if (!propose({ kind: 'setRecruitment', nationId: HUMAN_ID, regiment, count: have + 1 })) break;
        }
      }
    }
    return [...base, ...extra];
  },
};

/** The commodities `trader` offers when the computer bid for them last turn, and the one it bids for when the computer offered it. */
export const TRADER_OFFERS: readonly TradeCommodity[] = [MaterialType.Steel, MaterialType.Lumber];
export const TRADER_BID: TradeCommodity = GoodsType.Clothing;

/**
 * `trader`: idle, plus each turn it offers 1 steel and 1 lumber that the computer bid for last turn and bids for 1 clothing
 * that the computer offered last turn, while it has the stock and the cash. It plans the intent only: the engine's refusal
 * (no seller, no buyer, no free hold) reaches the record as a refused order, as the Board of Trade would grey the control.
 */
export const trader: HumanPolicy = {
  name: 'trader',
  orders: (state, { lastTrade }) => {
    const theirs = lastTrade[COMPUTER_ID];
    const me = state.nations.find(n => n.id === HUMAN_ID);
    if (!theirs || !me) return [];
    const orders: Order[] = [];
    for (const commodity of TRADER_OFFERS) {
      const stock = me.warehouse[commodity] ?? 0;
      if ((theirs.buy[commodity] ?? 0) >= 1 && stock >= 1) orders.push({ kind: 'sellCommodity', nationId: HUMAN_ID, commodity, amount: 1 });
    }
    if ((theirs.sell[TRADER_BID] ?? 0) >= 1 && me.treasury >= priceOf(marketOf(state), TRADER_BID)) {
      orders.push({ kind: 'buyCommodity', nationId: HUMAN_ID, commodity: TRADER_BID, amount: 1 });
    }
    return orders;
  },
};

export const HUMANS = { idle, scripted, aggressor, trader, diplomat } as const;
export type HumanName = keyof typeof HUMANS;
