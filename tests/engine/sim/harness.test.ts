// M13 (FR-481): the sim harness records a continent game turn by turn, and the first block pins what the computer does on
// 2026-11-16, before M13's AI rows. The second describe is a "before" table: each pin is moved on purpose by an M13 row, and
// its re-record (old -> new, the row) belongs to the integration task (FR-499's rule); the first describe never moves.
import { describe, it, expect } from 'vitest';
import { createGameStore } from '@/store/rootStore';
import { newGame } from '@/engine/newGame';
import { unitsOf } from '@/engine/market/market';
import type { GameState } from '@/types/GameState';
import type { Order } from '@/engine/orders/Order';
import { GoodsType, MaterialType, ResourceType } from '@/types/Resource';
import {
  atTurn,
  computerOrdersTimes,
  firstProvinceTakenTurn,
  healthyWorkersAt,
  percentile,
  runGame,
  unitsTradedBetweenGreatPowers,
  type GameRecord,
} from './harness';
import { aggressor, COMPUTER_ID, HUMAN_ID, HUMANS, trader, type HumanContext, type HumanPolicy } from './humans';

/** A record without its wall times, which are the only part of a game that differs between two runs. */
const { Steel: STEEL, Lumber: LUMBER } = MaterialType;
const CLOTHING = GoodsType.Clothing;

const withoutTimes = (game: GameRecord) => game.turns.map(t => ({ ...t, computerOrdersMs: 0 }));

describe('FR-481 the sim harness plays a continent game and records every turn', () => {
  const idle = runGame({ seed: 1, human: 'idle' });

  it('FR-481 an idle game of 40 turns has one record per turn, each with every field the row lists', () => {
    expect(idle.turns.map(t => t.turn)).toEqual(Array.from({ length: 40 }, (_, i) => i + 1));
    expect(idle.final.gameOver?.turn).toBe(40);
    for (const t of idle.turns) {
      for (const id of [HUMAN_ID, COMPUTER_ID]) {
        expect(Number.isInteger(t.provincesHeld[id])).toBe(true);
        expect(Object.keys(t.workers[id])).toEqual(['untrained', 'trained', 'expert']);
        expect(Number.isInteger(t.labour[id])).toBe(true);
        expect(Number.isInteger(t.capacity[id])).toBe(true);
        expect(Number.isInteger(t.treasury[id])).toBe(true);
        expect(t.holds[id].used).toBeGreaterThanOrEqual(0);
        expect(t.holds[id].used).toBeLessThanOrEqual(t.holds[id].total);
      }
      for (const list of [t.warsDeclared, t.peaceMade, t.battles, t.regimentsRecruited, t.ordersRejected, t.invariantViolations, t.humanRefused]) {
        expect(Array.isArray(list)).toBe(true);
      }
      expect(typeof t.unitsTradedBetweenGreatPowers).toBe('number');
    }
  });

  it('FR-481 the Council that met when a turn resolved is recorded on turns 10, 20, 30 and 40 only, and the projection on every turn', () => {
    expect(idle.turns.filter(t => t.council).map(t => t.turn)).toEqual([10, 20, 30, 40]);
    for (const t of idle.turns) expect(Object.keys(t.votes).sort()).toEqual([HUMAN_ID, COMPUTER_ID]);
    const meeting = atTurn(idle, 30)!.council!;
    expect(meeting.totalVotes).toBe(12);
    // FR-503: 9 -> 7 with two Great Powers. After turn 30 the HUD projects the compulsory last meeting (FR-501).
    expect(meeting.needed).toBe(7);
    // FR-518: the fleet delays the capture of Testland North-East until after this meeting.
    // One fewer controlled province changes the compulsory projection from 7–5 to 6–6.
    expect(atTurn(idle, 30)!.votes).toEqual({ [COMPUTER_ID]: 6, [HUMAN_ID]: 6 });
  });

  it('FR-497 the idle game has 0 rejected orders, 0 invariant violations on every turn and 0 no-pay disbands, and the audit\'s checks catch a fault', () => {
    expect(idle.turns.flatMap(t => t.ordersRejected)).toEqual([]);
    expect(idle.turns.flatMap(t => t.invariantViolations)).toEqual([]);
    expect(idle.turns.flatMap(t => t.disbands).filter(d => d.reason === 'no-pay')).toEqual([]);
    // the field is not always empty: a negative treasury injected on turn 2 is reported on that turn and not before
    const broken: HumanPolicy = {
      name: 'broken',
      setup: s => (s.turn === 2 ? { ...s, nations: s.nations.map(n => (n.id === HUMAN_ID ? { ...n, treasury: -50 } : n)) } : s),
      orders: () => [],
    };
    const game = runGame({ seed: 1, human: broken, turns: 3 });
    expect(game.turns[0].invariantViolations).toEqual([]);
    expect(game.turns[1].invariantViolations.join(' ')).toMatch(/treasury -?\d+/);
    // and turning the check off leaves the field empty
    expect(runGame({ seed: 1, human: broken, turns: 3, checkInvariants: false }).turns.flatMap(t => t.invariantViolations)).toEqual([]);
  });

  it('FR-481 it plays as the store does: orders one by one with submitOrder, then End Turn (computerOrders and resolveTurn)', () => {
    const turns = 12;
    const game = runGame({ seed: 3, human: 'scripted', turns });
    const store = createGameStore({ game: newGame({ seed: 3, world: 'continent' }) });
    for (let i = 0; i < turns; i++) {
      for (const order of HUMANS.scripted.orders(store.getState().game, { turn: store.getState().game.turn, lastTrade: {} })) {
        expect(store.getState().submitOrder(order)).toEqual({ ok: true });
      }
      store.getState().advanceTurn();
    }
    expect(store.getState().game).toEqual(game.final);
    expect(game.final.turn).toBe(turns + 1);
  });

  it('FR-481 a game is deterministic: the same seed and human give the same record but for the wall times', () => {
    const again = runGame({ seed: 1, human: 'idle' });
    expect(withoutTimes(again)).toEqual(withoutTimes(idle));
    expect(again.final).toEqual(idle.final);
    expect(withoutTimes(runGame({ seed: 2, human: 'idle' }))).not.toEqual(withoutTimes(idle));
  });

  it('FR-481 records one computerOrders sample per turn and calculates the percentile for FR-497', () => {
    const times = computerOrdersTimes([idle]);
    expect(times).toHaveLength(40);
    expect(percentile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 95)).toBe(10);
    expect(percentile([], 95)).toBeNaN();
  });
});

describe('FR-481 the human policies', () => {
  it('FR-481 idle gives no orders in 40 turns, and its start is the continent\'s: 4 provinces each, Arvelia\'s land the bridge', () => {
    const game = runGame({ seed: 1, human: 'idle' });
    expect(game.human).toBe('idle');
    expect(game.turns.reduce((n, t) => n + t.humanOrders + t.humanRefused.length, 0)).toBe(0);
    expect(game.startProvinces).toEqual({ [HUMAN_ID]: 4, [COMPUTER_ID]: 4 });
    expect(game.final.worldId).toBe('continent');
    expect(game.final.market?.mode).toBe('partners');
  });

  it('FR-481 scripted plays nation 1 with the scripted player: orders every turn, none refused, and both race for Arvelia', () => {
    const game = runGame({ seed: 1, human: 'scripted' });
    expect(game.turns).toHaveLength(40);
    expect(game.turns.filter(t => t.humanOrders === 0)).toEqual([]);
    expect(game.turns.flatMap(t => t.humanRefused)).toEqual([]);
    // Re-recorded by M13 T-15 (FR-499; moved by FR-485 and FR-486): was "taken by turn 17"; the migrants take goods and
    // cash the campaign used before, both declare on turn 18 and Testland takes Arvelia on turn 19 (measured: 19; lane A's
    // attribution: without `planMigrants` the campaign takes Arvelia on turn 16)
    // M13 review fix round (review ST-04): "by turn 17" -> "by turn 19" loosened a bound, which FR-499 forbids; it is now
    // the exact measured turn, so it cannot drift again unseen (FR-538 does not move it: the race is on a minor)
    // Re-recorded by the M13 close round (FR-539, FR-499): 19 -> 18. Valdoria's standing steel bid toward the person (from
    // turn 7) takes a hold its timber purchase from the minors used and is refunded unanswered, so Valdoria keeps that cash,
    // declares on Arvelia on turn 17 (was 18) and takes it on turn 18, before Testland (measured with `standing` forced
    // empty: 19, as before; .gate/m13/close/attrib-off.txt and attrib-on.txt)
    // FR-516 Q140: without advance hull preparation Testland makes paper and clothing on turn 4.
    // Valdoria recruits its third Cuirassiers on turn 14, declares on Arvelia on 15 and takes it on 16.
    // Replaying this seed with the previous preparation rule gives the turn-18 capture above.
    expect(firstProvinceTakenTurn(game)).toBe(16);
    expect(game.turns[15].provincesTaken).toContainEqual({
      byId: COMPUTER_ID, provinceId: 'province-minor-1', fromId: 'minor-1',
    });
    expect(game.turns.flatMap(t => t.invariantViolations)).toEqual([]);
  });

  it('FR-481 aggressor: on turn 4 the setup gives it Arvelia and 10 regiments, on turn 5 it declares war on Valdoria, and it recruits from turn 3', () => {
    const game = runGame({ seed: 1, human: 'aggressor', turns: 8 });
    const idle = runGame({ seed: 1, human: 'idle', turns: 8 });
    // after turn 3 nothing is injected yet; after turn 4 Testland holds Arvelia's province and the 6 Cuirassiers + 4 Regulars
    expect(atTurn(game, 3)!.provincesHeld[HUMAN_ID]).toBe(4);
    expect(atTurn(game, 4)!.provincesHeld[HUMAN_ID]).toBe(5);
    expect(atTurn(game, 4)!.regiments[HUMAN_ID]).toBeGreaterThanOrEqual(atTurn(idle, 4)!.regiments[HUMAN_ID] + 10);
    // the setup is an injection, not a turn's resolution, so it emits no event: Arvelia is Testland's colony in the state
    expect(atTurn(game, 4)!.minorsColonised).toEqual([]);
    expect(game.final.minorNations.find(m => m.name === 'Arvelia')?.colonyOf).toBe(HUMAN_ID);
    // the war: declared on turn 5, by Testland on Valdoria, and on no other turn
    expect(game.turns.flatMap(t => t.warsDeclared)).toEqual([{ byId: HUMAN_ID, onId: COMPUTER_ID, turn: 5 }]);
    // it plays the scripted player's turns, and what it plans the engine accepts
    expect(game.turns.every(t => t.humanOrders > 0)).toBe(true);
    expect(game.turns.flatMap(t => t.humanRefused)).toEqual([]);
    expect(game.turns.flatMap(t => t.invariantViolations)).toEqual([]);
  });

  const withStock = (state: GameState): GameState => ({
    ...state,
    nations: state.nations.map(n =>
      n.id === HUMAN_ID ? { ...n, treasury: 5_000, warehouse: { ...n.warehouse, [STEEL]: 3, [LUMBER]: 3 } } : n
    ),
  });
  const context = (lastTrade: HumanContext['lastTrade']): HumanContext => ({ turn: 5, lastTrade });
  const start = withStock(newGame({ seed: 1, world: 'continent' }));

  it('FR-481 aggressor, with arms, horses and cash, recruits up to 2 of each regiment it can and declares war from turn 5; before turn 3 and 5 it does neither', () => {
    const armed = (turn: number): GameState => ({
      ...start,
      turn,
      nations: start.nations.map(n =>
        n.id === HUMAN_ID
          ? {
              ...n,
              treasury: 40_000,
              warehouse: { ...n.warehouse, [GoodsType.Armaments]: 60, [ResourceType.Horses]: 20 },
              industry: { ...n.industry, workers: { untrained: 30, trained: 30, expert: 30 } },
            }
          : n
      ),
    });
    const kinds = (orders: Order[], kind: Order['kind']) => orders.filter(o => o.kind === kind);
    const late = aggressor.orders(armed(6), context({}));
    expect(kinds(late, 'proposeOverture')).toEqual([{ kind: 'proposeOverture', nationId: HUMAN_ID, overture: 'war', targetId: COMPUTER_ID }]);
    const recruits = kinds(late, 'setRecruitment') as Extract<Order, { kind: 'setRecruitment' }>[];
    expect(recruits.length).toBeGreaterThan(0);
    for (const regiment of new Set(recruits.map(o => o.regiment))) {
      expect(recruits.filter(o => o.regiment === regiment).map(o => o.count)).toEqual([1, 2].slice(0, recruits.filter(o => o.regiment === regiment).length));
    }
    expect(aggressor.orders(armed(4), context({})).filter(o => o.kind === 'proposeOverture')).toEqual([]);
    expect(kinds(aggressor.orders(armed(2), context({})), 'setRecruitment')).toEqual([]);
  });

  it('FR-481 trader offers 1 steel and 1 lumber that Valdoria bid for last turn and bids for 1 clothing it offered, with the stock and the cash', () => {
    const last = { [COMPUTER_ID]: { sell: { [CLOTHING]: 2 }, buy: { [STEEL]: 2, [LUMBER]: 1 } } };
    expect(trader.orders(start, context(last))).toEqual<Order[]>([
      { kind: 'sellCommodity', nationId: HUMAN_ID, commodity: STEEL, amount: 1 },
      { kind: 'sellCommodity', nationId: HUMAN_ID, commodity: LUMBER, amount: 1 },
      { kind: 'buyCommodity', nationId: HUMAN_ID, commodity: CLOTHING, amount: 1 },
    ]);
    // only what Valdoria bid for or offered: its bid for steel alone gives the steel offer alone
    expect(trader.orders(start, context({ [COMPUTER_ID]: { sell: {}, buy: { [STEEL]: 1 } } }))).toEqual<Order[]>([
      { kind: 'sellCommodity', nationId: HUMAN_ID, commodity: STEEL, amount: 1 },
    ]);
    // nothing last turn (turn 1, or Valdoria did not trade): idle
    expect(trader.orders(start, context({}))).toEqual([]);
    expect(trader.orders(start, context({ [COMPUTER_ID]: { sell: {}, buy: {} } }))).toEqual([]);
  });

  it('FR-481 trader needs the stock and the cash: no steel in the warehouse, no offer; no cash, no bid', () => {
    const last = { [COMPUTER_ID]: { sell: { [CLOTHING]: 2 }, buy: { [STEEL]: 2, [LUMBER]: 1 } } };
    const noSteel: GameState = { ...start, nations: start.nations.map(n => (n.id === HUMAN_ID ? { ...n, warehouse: { ...n.warehouse, [STEEL]: 0 } } : n)) };
    expect(trader.orders(noSteel, context(last)).map(o => (o.kind === 'sellCommodity' ? o.commodity : o.kind))).toEqual([LUMBER, 'buyCommodity']);
    const noCash: GameState = { ...start, nations: start.nations.map(n => (n.id === HUMAN_ID ? { ...n, treasury: 0 } : n)) };
    expect(trader.orders(noCash, context(last)).map(o => o.kind)).toEqual(['sellCommodity', 'sellCommodity']);
  });

  it('FR-481 the harness hands a policy last turn\'s public trade orders: the orders Valdoria had registered when the trade phase ran', () => {
    const seen: HumanContext[] = [];
    const spy: HumanPolicy = { name: 'spy', orders: (_state, c) => (seen.push(c), []) };
    const game = runGame({ seed: 1, human: spy, turns: 12 });
    expect(seen[0].lastTrade).toEqual({});
    let compared = 0;
    for (let i = 1; i < seen.length; i++) {
      const last = seen[i].lastTrade[COMPUTER_ID];
      expect(last).toBeDefined();
      // the holds Valdoria used on turn i are the units it offered and bid for, which is what it made public
      expect(unitsOf(last.sell) + unitsOf(last.buy)).toBe(game.turns[i - 1].holds[COMPUTER_ID].used);
      if (game.turns[i - 1].holds[COMPUTER_ID].used > 0) compared++;
    }
    expect(compared).toBeGreaterThan(0);
  });

  it('FR-481 units one Great Power sells the other are counted on the turn they are dealt, and the next turn the policy sees both sets of orders', () => {
    // Today's order validation refuses a Great Power's bid for steel (no seller) and its offer (no buyer), so the deal is
    // injected into the market on turn 3, as FR-492 will let the players order it; the settlement is the engine's.
    const inject = (s: GameState): GameState =>
      s.turn !== 3
        ? s
        : {
            ...s,
            nations: s.nations.map(n => (n.id === HUMAN_ID ? { ...n, warehouse: { ...n.warehouse, [STEEL]: n.warehouse[STEEL] - 2 } } : n)),
            market: {
              ...s.market!,
              orders: { ...s.market!.orders, [HUMAN_ID]: { sell: { [STEEL]: 2 }, buy: {} }, [COMPUTER_ID]: { sell: {}, buy: { [STEEL]: 2 } } },
            },
          };
    const seen: HumanContext[] = [];
    const dealer: HumanPolicy = { name: 'dealer', setup: inject, orders: (_state, c) => (seen.push(c), []) };
    const game = runGame({ seed: 1, human: dealer, turns: 6 });
    expect(game.turns.map(t => t.unitsTradedBetweenGreatPowers)).toEqual([0, 0, 2, 0, 0, 0]);
    expect(unitsTradedBetweenGreatPowers(game)).toBe(2);
    expect(game.turns[2].holds[HUMAN_ID]).toEqual({ used: 2, total: 4 });
    expect(game.turns.flatMap(t => t.invariantViolations)).toEqual([]);
    expect(seen[3].lastTrade[HUMAN_ID]).toEqual({ sell: { [STEEL]: 2 }, buy: {} });
    expect(seen[3].lastTrade[COMPUTER_ID].buy[STEEL]).toBe(2);
  });
});

describe('FR-481 the idle game on seed 1, before M13 (2026-11-16, docs/specs/m13-m16.md section 0) and after it (re-recorded by M13 T-15)', () => {
  // Each number was moved by an M13 row and is re-recorded here with the old number and the row (FR-499's rule):
  // - Arvelia taken on turn 17 (war turn 16) -> turn 19 (war turn 18): FR-485 and FR-486 (the migrants' goods and cash;
  //   lane A measured turn 16 without `planMigrants`); kept by FR-487 (the campaign on a
  //   minor stays steady). Then FR-488 war on Testland (turn 21) and FR-489 one province, Testland North-East (turn 23).
  // - the vote 5 to 4 at turn 30 -> 6 to 3: the province taken by FR-488 and FR-489. FR-490's grants give no vote (0 other
  //   minor nations at turn 30: FR-490's turn-30 row is replaced by FR-542, see docs/requirements.md).
  // - 0 units traded: stays 0 for an idle human, which never bids or offers; FR-493 moves the `trader` human's total only.
  // - 4 healthy workers at turn 40 (4 experts, labour 16) -> 7 (1 trained, 6 experts, labour 26): FR-485's migrants.
  // - the trader's 0 units (bids refused "no-seller") -> 6 units, bids refused "sellers-barred" only while at war (FR-492,
  //   FR-493).
  // Re-recorded by FR-538 (M13 review ST-01: the army gathers in Arvelia first and declares at more than twice the
  // defence, so the Defense Minister's warning shows before the war): the war on Testland turn 21 -> 23 and Testland
  // North-East taken on turn 23 -> 24; at turn 40 1 trained and 6 experts, labour 26 -> 2 trained and 5 experts, labour
  // 24 (the sixth regiment it raises takes a trained worker, the war comes 2 turns later); the trader's refused bids
  // 7 -> 6 (the same war, 2 turns later, bars Valdoria's steel 1 turn less).
  // Re-recorded by the M13 close round (FR-539, FR-499; measured with `standing` forced empty and on,
  // .gate/m13/close/attrib-off.txt and attrib-on.txt): from turn 7 Valdoria's standing steel bid toward Testland takes the
  // hold of a timber purchase from the minors and is refunded unanswered, so Valdoria keeps that cash: the war on Arvelia
  // turn 18 -> 17 and Arvelia taken turn 19 -> 18 (the war on Testland, its province and the turn-30 vote do not move); at
  // turn 40 2 trained and 5 experts, labour 24 -> 1 untrained and 6 experts, labour 25 (still 7 healthy workers).
  const idle = runGame({ seed: 1, human: 'idle' });

  // FR-518: Valdoria now buys a hull and supplies its mills. Its two declarations and captures
  // move from 17/18 and 23/24 to 25/26 and 32/33; it still takes both provinces.
  it('FR-481 FR-487 FR-488 FR-489 FR-538 FR-539 FR-518 Arvelia falls on turn 26, then Testland North-East on turn 33', () => {
    expect(firstProvinceTakenTurn(idle)).toBe(26);
    expect(idle.turns.flatMap(t => t.warsDeclared)).toEqual([
      { byId: COMPUTER_ID, onId: 'minor-1', turn: 25 },
      { byId: COMPUTER_ID, onId: HUMAN_ID, turn: 32 },
    ]);
    expect(atTurn(idle, 26)!.minorsColonised).toEqual([{ nationId: COMPUTER_ID, minorId: 'minor-1' }]);
    expect(atTurn(idle, 26)!.provincesTaken).toEqual([{ byId: COMPUTER_ID, provinceId: 'province-minor-1', fromId: 'minor-1' }]);
    expect(atTurn(idle, 26)!.provincesHeld).toEqual({ [HUMAN_ID]: 4, [COMPUTER_ID]: 5 });
    expect(atTurn(idle, 33)!.provincesTaken).toEqual([{ byId: COMPUTER_ID, provinceId: 'province-nation-1-ne', fromId: HUMAN_ID }]);
    expect(atTurn(idle, 40)!.provincesHeld).toEqual({ [HUMAN_ID]: 3, [COMPUTER_ID]: 6 });
  });

  it('FR-481 FR-489 FR-503 FR-518 the Council of turn 30 counts Valdoria 5 votes to Testland 4 of 12, 7 needed, and no winner', () => {
    const meeting = atTurn(idle, 30)!.council!;
    expect(meeting.nominees.map(n => [n.nationId, n.total])).toEqual([[COMPUTER_ID, 5], [HUMAN_ID, 4]]);
    expect(meeting.nominees.map(n => n.otherMinorNations)).toEqual([0, 0]);
    expect(meeting.winnerId).toBeUndefined();
    expect(meeting.needed).toBe(7);
  });

  it('FR-481 no unit is traded between the Great Powers in 40 turns', () => {
    expect(unitsTradedBetweenGreatPowers(idle)).toBe(0);
  });

  // Re-recorded by the M13 close round (FR-542, card Q117 (b); FR-499): at turn 40 1 untrained and 6 experts, labour 25 ->
  // 1 trained and 6 experts, labour 26 (still 7 healthy workers). Valdoria now buys an embassy in Sundmark on turn 23
  // ($5,000; its training keeps that price while the embassy is wanted), makes a pact on turn 24 and gives grants on turns
  // 36 and 37 ($1,000 each); the wars, provinces and the turn-30 vote above do not move, and at the turn-40 meeting Sundmark
  // votes for Valdoria (the scriptedInfluence.test.ts real game of seed 1).
  // FR-518: at turn 40 one fewer worker has finished expert training; the workforce remains seven.
  it('FR-481 FR-485 FR-538 FR-539 FR-542 FR-518 Valdoria has 7 healthy workers and 24 labour at turn 40', () => {
    expect(healthyWorkersAt(idle, 1, COMPUTER_ID)).toBeLessThanOrEqual(7);
    expect(healthyWorkersAt(idle, 40, COMPUTER_ID)).toBe(7);
    expect(atTurn(idle, 40)!.workers[COMPUTER_ID]).toEqual({ untrained: 0, trained: 2, expert: 5 });
    expect(atTurn(idle, 40)!.labour[COMPUTER_ID]).toBe(24);
  });

  // Re-recorded by the M13 final round (FR-541, FR-499): units 6 -> 9 and refused bids 6 -> 8. Valdoria now keeps its lumber
  // bid on the turn after it answered the trader's offer, so the trader sells 1 lumber on each of turns 4 to 12 (was 6 units).
  // The cash Valdoria spends on that lumber moves its war on Arvelia from turn 18 to 20 and on Testland from 23 to 26 (province
  // taken 24 -> 27, no peace: the trader never answers), so the trader's clothing bids meet the war on turns 28 and 34 to 40
  // (was 25, 35 and 37 to 40), still all "sellers-barred". Measured with the FR-541 clause switched off and on:
  // .gate/m13/final/trader2-before.txt and trader2-after.txt.
  // Re-recorded by the M13 close round (FR-539, FR-499): units 9 -> 19. From turn 7 Valdoria's standing steel bid is on the
  // Board while they are at peace, so the trader also sells it steel; Valdoria keeps the cash of the timber the bid's hold
  // replaces, so its war on Arvelia moves 20 -> 18 (taken 21 -> 19) and on Testland 26 -> 24 (Testland North-East taken
  // 27 -> 25), and the 8 refused clothing bids (still all "sellers-barred") fall on turns 25, 32 to 34 and 36 to 39 (were
  // 28 and 34 to 40). Measured with `standing` forced empty: 9 units and the old turns
  // (.gate/m13/close/attrib-off.txt and attrib-on.txt).
  // FR-518: reserving materials for the fleet changes Valdoria's public bids and offers.
  // The trader fills 14 units (was 19); it submits two blocked clothing bids (was eight).
  it('FR-481 FR-492 FR-493 FR-538 FR-539 FR-541 FR-518 the trader human trades 14 units with Valdoria; its only two refusals are blocked wartime bids', () => {
    const game = runGame({ seed: 1, human: 'trader' });
    expect(unitsTradedBetweenGreatPowers(game)).toBe(14);
    const blocked = game.turns.filter(t => t.humanRefused.length);
    expect(blocked.flatMap(t => t.humanRefused)).toEqual([
      { kind: 'buyCommodity', reason: 'sellers-barred' },
      { kind: 'buyCommodity', reason: 'sellers-barred' },
    ]);
    expect(blocked.every(t => t.turn > 26)).toBe(true);
  });
});
