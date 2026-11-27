// M13 (FR-481): the sim harness. It plays a continent game in the "partners" market for up to 40 turns as the store plays
// it: the human's orders one by one with `tryApplyOrder` (the store's `submitOrder`), then `computerOrders` and
// `resolveTurn` (the store's `advanceTurn`). It records what each turn did, so one acceptance file can quote thresholds
// (T-14, FR-500). It promotes the audit's `.gate/audit/ai-sim` tools into the suite. Not a test file.
//
// Reading a record: `turns[i].turn` is the turn that was resolved, and every state figure (provinces, workers, labour,
// capacity, treasury, score, votes) is read on the state after it, which is what the person sees on turn + 1 (the audit's
// probes read the same way). So "at turn 40" is the record of turn 40, and the Council that met "at turn 30" is
// `turns[29].council`. `holds` is read before the clearing: what the two Great Powers had registered at the trade phase.
import { newGame, type NewGameOptions } from '@/engine/newGame';
import { computerOrders } from '@/engine/ai/players';
import { applyTurnOrders, resolveTurn, type TurnResult } from '@/engine/turn/resolveTurn';
import { tryApplyOrder } from '@/engine/orders/apply';
import { scoreOf } from '@/engine/score/score';
import { councilVote } from '@/engine/council/council';
import { COUNCIL } from '@/definisions/council';
import { capitalProvinceOf, regimentsOf } from '@/engine/army/armies';
import { GRADES, healthyWorkers, labourTotal } from '@/engine/industry/labour';
import { tradeCapacityOf, tradeOrdersOf } from '@/engine/market/market';
import { isGreatPower } from '@/engine/world/countries';
import { lastTradeOrdersOf } from '@/engine/market/partners';
import { borderThreat } from '@/components/HUD/hudView';
import type { GameState } from '@/types/GameState';
import type { GameEvent } from '@/engine/turn/context';
import type { Order, RejectReason } from '@/engine/orders/Order';
import type { TradeOrders } from '@/types/Market';
import type { RegimentType } from '@/types/Unit';
import type { BattleResult } from '@/types/Battle';
import type { CouncilNominee } from '@/types/Council';
import type { WorkerGrade } from '@/types/Industry';
import { invariantViolations, worldViolations } from '../fixtures';
import type { HumanName, HumanPolicy } from './humans';
import { POLICIES } from './policies';

/** Per Great Power, keyed by nation id ("nation-1" the human's Testland, "nation-2" the computer's Valdoria). */
export type ByNation<T> = Record<string, T>;

export interface WarDeclared { byId: string; onId: string; turn: number }
export interface PeaceMade { aId: string; bId: string }
export interface BattleFought { attackerId: string; attackerIds: string[]; defenderId: string; provinceId: string; result: BattleResult; provinceTaken: boolean }
export interface Recruited { nationId: string; regiment: RegimentType; count: number }
export interface ProvinceTaken { byId: string; provinceId: string; fromId: string }
export interface ProposalReceived { toId: string; fromId: string; kind: string }
export interface GrantPaid { fromId: string; toId: string; amount: number }
/** FR-542: an embassy or a pact made this turn (`overture-done`); peace is recorded in `peaceMade`. */
export interface OvertureMade { byId: string; toId: string; overture: 'embassy' | 'pact' }
export interface Disbanded { nationId: string; reason: 'order' | 'no-pay'; count: number }
export interface RejectedOrder { nationId: string; kind: Order['kind']; reason: RejectReason }
export interface RefusedHumanOrder { kind: Order['kind']; reason: RejectReason }
export interface CouncilMeeting {
  totalVotes: number;
  needed: number;
  winnerId?: string;
  nominees: CouncilNominee[];
  /** FR-542: voluntary votes at this meeting's relations, excluding support awarded by the final compulsory ballot. */
  earnedMinorVotes: ByNation<number>;
}

export interface TurnRecord {
  /** The turn that was resolved. */
  turn: number;
  warsDeclared: WarDeclared[];
  /** One entry per pair that made peace this turn (a peace between two Great Powers gives each an event; here it is one). */
  peaceMade: PeaceMade[];
  /** A Great Power's war or alliance proposal to a human Great Power (FR-166); a peace offer to Testland shows here. */
  proposals: ProposalReceived[];
  battles: BattleFought[];
  provincesTaken: ProvinceTaken[];
  /** Great Powers that lost their capital province this turn (and with it the game, FR-223). */
  nationsFallen: { nationId: string; fallenId: string }[];
  minorsColonised: { nationId: string; minorId: string }[];
  regimentsRecruited: Recruited[];
  grants: GrantPaid[];
  /** FR-542: the embassies and pacts made this turn. */
  overtures: OvertureMade[];
  disbands: Disbanded[];
  /** Provinces held after the turn. */
  provincesHeld: ByNation<number>;
  /** Whether each Great Power still holds the province of its own capital after the turn. */
  capitalHeld: ByNation<boolean>;
  /** Regiments of every type (militia included) after the turn. */
  regiments: ByNation<number>;
  /** Healthy workers by grade (not sick, not in training) after the turn. */
  workers: ByNation<Record<WorkerGrade, number>>;
  /** Labour of the healthy workers (1, 2, 4 a worker) after the turn. */
  labour: ByNation<number>;
  /** Capacity of the capped buildings (the score's `capacity`) after the turn. */
  capacity: ByNation<number>;
  treasury: ByNation<number>;
  score: ByNation<number>;
  /** Cargo holds used (units offered plus bid) and held by each Great Power, as registered when the trade phase ran. */
  holds: ByNation<{ used: number; total: number }>;
  /** The vote the Council would count on the state after the turn (the HUD's projection), by nominee; empty without provinces. */
  votes: ByNation<number>;
  /** The Council meeting that was held when this turn resolved (turns 10, 20, 30, 40), else null. */
  council: CouncilMeeting | null;
  /** Units sold by one Great Power to the other this turn (the same units as the other one bought). */
  unitsTradedBetweenGreatPowers: number;
  /** M13 review fix round (FR-539): those sales one by one, by seller, buyer and commodity. */
  greatPowerSales: { sellerId: string; buyerId: string; commodity: string; amount: number }[];
  /** FR-491, FR-539: each Great Power's public bids and offers of the turn (`market.lastOrders`), what the Board shows on turn + 1. */
  lastOrders: ByNation<TradeOrders>;
  /** FR-495, FR-538: the HUD's border warning (`borderThreat`) shows to that Great Power on the state after the turn. */
  borderWarning: ByNation<boolean>;
  /** `order-rejected` events of the turn: orders the computer gave that the engine refused (FR-497: none). */
  ordersRejected: RejectedOrder[];
  /** Orders the human policy planned that the engine refused when applied one by one (the store would show the refusal). */
  humanRefused: RefusedHumanOrder[];
  /** Orders of the human policy that were accepted. */
  humanOrders: number;
  /** `invariantViolations` and `worldViolations` of the state after the turn, empty when the game is sound (FR-497). */
  invariantViolations: string[];
  /** Wall time of `computerOrders(state)` in milliseconds. */
  computerOrdersMs: number;
}

export interface GameRecord {
  seed: number;
  human: string;
  /** One record per turn played: fewer than asked when the game ended first (conquest, Council winner, the turn limit). */
  turns: TurnRecord[];
  /** Provinces held at the start, by Great Power. */
  startProvinces: ByNation<number>;
  /** The state after the last turn played. */
  final: GameState;
  /** Wall time of the whole game in seconds. */
  seconds: number;
}

export interface RunOptions {
  /** FR-559: observe registered Orders and their resolved effects without changing a frozen policy. */
  observe?: (registered: GameState, result: TurnResult, beforeOrders: GameState) => void;
  /** Compare the real plan with the world before the human submitted private Orders (FR-597). */
  observePlan?: (beforeHuman: GameState, afterHuman: GameState, plan: ReturnType<typeof computerOrders>) => void;
  seed: number;
  world?: NewGameOptions['world'];
  randomMapSize?: NewGameOptions['randomMapSize'];
  /** A policy of `humans.ts` by name (the diplomat frozen by `policies.ts`, FR-638), or one's own. */
  human: HumanName | HumanPolicy;
  /** Turns to play at most (default 40, the game's limit). */
  turns?: number;
  /** Compute `invariantViolations` each turn (default true); false skips them for a faster game (the field is then empty). */
  checkInvariants?: boolean;
}

const mapNations = <T>(state: GameState, f: (id: string) => T): ByNation<T> => Object.fromEntries(state.nations.map(n => [n.id, f(n.id)]));
const holdsProvince = (state: GameState, id: string): boolean => {
  const province = capitalProvinceOf(state, id);
  return province !== undefined && province.ownerId === id;
};

/** Plays the requested world (Continent by default) with `human` as nation 1. Only the timings vary. */
export function runGame({ seed, world = 'continent', randomMapSize, human, turns = 40, checkInvariants = true, observe, observePlan }: RunOptions): GameRecord {
  const policy = typeof human === 'string' ? POLICIES[human] : human;
  const began = performance.now();
  const start = newGame({ seed, world, randomMapSize });
  let state = start;
  let lastTrade: Record<string, TradeOrders> = {};
  const records: TurnRecord[] = [];

  for (let played = 0; played < turns && !state.gameOver; played++) {
    const turn = state.turn;
    if (policy.setup) state = policy.setup(state);

    const beforeOrders = state;

    // The human's orders, one by one, as the store's submitOrder applies them.
    let accepted = 0;
    const humanRefused: RefusedHumanOrder[] = [];
    for (const order of policy.orders(state, { turn, lastTrade })) {
      const tried = tryApplyOrder(state, order);
      if (tried.result.ok) {
        state = tried.state;
        accepted++;
      } else humanRefused.push({ kind: order.kind, reason: tried.result.reason });
    }

    // The computer plans on that state, as the store's advanceTurn does.
    const planningStarted = performance.now();
    const computer = computerOrders(state);
    const computerOrdersMs = performance.now() - planningStarted;
    observePlan?.(beforeOrders, state, computer);

    // The orders as registered when the trade phase clears them: the holds used, and next turn's public orders.
    const registered = applyTurnOrders(state, computer, () => {}).state;
    const holds = mapNations(state, id => {
      const { holds: total, used } = tradeCapacityOf(registered, id);
      return { used, total };
    });
    const traded = mapNations(state, id => tradeOrdersOf(registered, id));

    const result = resolveTurn(state, computer, state.seed);
    const { state: next, events } = result;
    observe?.(registered, result, beforeOrders);
    lastTrade = traded;
    records.push(recordTurn({ turn, start, next, events, holds, humanRefused, humanOrders: accepted, computerOrdersMs, checkInvariants }));
    state = next;
  }

  return {
    seed,
    human: policy.name,
    turns: records,
    startProvinces: mapNations(start, id => start.provinces.filter(p => p.ownerId === id).length),
    final: state,
    seconds: (performance.now() - began) / 1000,
  };
}

function recordTurn(input: {
  turn: number;
  start: GameState;
  next: GameState;
  events: GameEvent[];
  holds: TurnRecord['holds'];
  humanRefused: RefusedHumanOrder[];
  humanOrders: number;
  computerOrdersMs: number;
  checkInvariants: boolean;
}): TurnRecord {
  const { turn, start, next, events } = input;
  const record: TurnRecord = {
    turn,
    warsDeclared: [],
    peaceMade: [],
    proposals: [],
    battles: [],
    provincesTaken: [],
    nationsFallen: [],
    minorsColonised: [],
    regimentsRecruited: [],
    grants: [],
    overtures: [],
    disbands: [],
    provincesHeld: mapNations(next, id => next.provinces.filter(p => p.ownerId === id).length),
    capitalHeld: mapNations(next, id => holdsProvince(next, id)),
    regiments: mapNations(next, id => regimentsOf(next, id).length),
    workers: mapNations(next, id => {
      const industry = next.nations.find(n => n.id === id)!.industry;
      return Object.fromEntries(GRADES.map(grade => [grade, healthyWorkers(industry, grade)])) as Record<WorkerGrade, number>;
    }),
    labour: mapNations(next, id => labourTotal(next.nations.find(n => n.id === id)!.industry)),
    capacity: mapNations(next, id => scoreOf(next, id).capacity),
    treasury: mapNations(next, id => next.nations.find(n => n.id === id)!.treasury),
    score: mapNations(next, id => scoreOf(next, id).total),
    holds: input.holds,
    votes: Object.fromEntries((councilVote(next)?.nominees ?? []).map(n => [n.nationId, n.total])),
    council: null,
    unitsTradedBetweenGreatPowers: 0,
    greatPowerSales: [],
    lastOrders: mapNations(next, id => lastTradeOrdersOf(next, id)),
    borderWarning: mapNations(next, id => borderThreat(next, id) !== undefined),
    ordersRejected: [],
    humanRefused: input.humanRefused,
    humanOrders: input.humanOrders,
    invariantViolations: input.checkInvariants ? [...invariantViolations(next, events), ...worldViolations(next, start)] : [],
    computerOrdersMs: input.computerOrdersMs,
  };
  const peacePairs = new Set<string>();
  for (const e of events) {
    switch (e.type) {
      case 'war-declared':
        record.warsDeclared.push({ byId: e.nationId, onId: e.targetId, turn });
        break;
      case 'overture-done': {
        if (e.overture === 'embassy' || e.overture === 'pact') record.overtures.push({ byId: e.nationId, toId: e.targetId, overture: e.overture });
        if (e.overture !== 'peace') break;
        const pair = [e.nationId, e.targetId].sort();
        if (peacePairs.has(pair.join('|'))) break;
        peacePairs.add(pair.join('|'));
        record.peaceMade.push({ aId: pair[0], bId: pair[1] });
        break;
      }
      case 'proposal-received':
        record.proposals.push({ toId: e.nationId, fromId: e.fromId, kind: e.kind });
        break;
      case 'battle-resolved':
        record.battles.push({ attackerId: e.nationId, attackerIds: [...e.attackerIds], defenderId: e.defenderId, provinceId: e.provinceId, result: e.result, provinceTaken: e.provinceTaken });
        break;
      case 'province-taken':
        record.provincesTaken.push({ byId: e.nationId, provinceId: e.provinceId, fromId: e.fromId });
        break;
      case 'nation-fallen':
        record.nationsFallen.push({ nationId: e.nationId, fallenId: e.fallenId });
        break;
      case 'minor-colonised':
        record.minorsColonised.push({ nationId: e.nationId, minorId: e.minorId });
        break;
      case 'regiments-recruited':
        record.regimentsRecruited.push({ nationId: e.nationId, regiment: e.regiment, count: e.count });
        break;
      case 'grant-paid':
        record.grants.push({ fromId: e.nationId, toId: e.targetId, amount: e.amount });
        break;
      case 'regiments-disbanded':
        record.disbands.push({ nationId: e.nationId, reason: e.reason, count: e.count });
        break;
      case 'council-met': {
        const ordinary = councilVote(next, COUNCIL.firstTurn);
        record.council = {
          totalVotes: e.totalVotes, needed: e.needed, winnerId: e.winnerId, nominees: e.nominees,
          earnedMinorVotes: Object.fromEntries((ordinary?.nominees ?? []).map(n => [n.nationId, n.otherMinorNations])),
        };
        break;
      }
      case 'goods-sold':
        if (e.counterpartyId !== undefined && isGreatPower(next, e.counterpartyId)) {
          record.unitsTradedBetweenGreatPowers += e.amount;
          record.greatPowerSales.push({ sellerId: e.nationId, buyerId: e.counterpartyId, commodity: e.commodity, amount: e.amount });
        }
        break;
      case 'order-rejected':
        record.ordersRejected.push({ nationId: e.nationId, kind: e.order.kind, reason: e.reason });
        break;
    }
  }
  return record;
}

// ---- reads the acceptance file shares -----------------------------------------------------------------------------------

/** The record of a turn (1-based), if the game reached it. */
export const atTurn = (game: GameRecord, turn: number): TurnRecord | undefined => game.turns.find(t => t.turn === turn);

/** The first turn whose record satisfies `pick`, if any. */
export const firstTurn = (game: GameRecord, pick: (record: TurnRecord) => boolean): number | undefined => game.turns.find(pick)?.turn;

/** The turn the first province of a minor nation was taken (the audit's "colonised": Arvelia, the land bridge). */
export const firstProvinceTakenTurn = (game: GameRecord): number | undefined => firstTurn(game, t => t.provincesTaken.length > 0);

/** Units traded between the two Great Powers over the whole game. */
export const unitsTradedBetweenGreatPowers = (game: GameRecord): number => game.turns.reduce((sum, t) => sum + t.unitsTradedBetweenGreatPowers, 0);

/** Healthy workers of a Great Power after a turn, all grades. */
export const healthyWorkersAt = (game: GameRecord, turn: number, nationId: string): number | undefined => {
  const workers = atTurn(game, turn)?.workers[nationId];
  return workers && GRADES.reduce((sum, grade) => sum + workers[grade], 0);
};

/** The p-th percentile (0 to 100) of a list, by the audit's rule: the sorted value at floor(p / 100 x length), at most the last. */
export function percentile(values: readonly number[], p: number): number {
  if (values.length === 0) return NaN;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];
}

/** Every `computerOrders` time of the games, in milliseconds (FR-497: the 95th percentile is at most 100). */
export const computerOrdersTimes = (games: readonly GameRecord[]): number[] => games.flatMap(g => g.turns.map(t => t.computerOrdersMs));

export type { HumanName, HumanPolicy };
