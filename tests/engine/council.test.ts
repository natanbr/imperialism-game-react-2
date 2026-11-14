// M10 Council of Governors (FR-290 to FR-296, FR-305): when the Council meets, who is nominated, how each province's
// governor votes, the count and the winner, the game over a winner gives and the `council-met` event. Hand-built
// continent states on the world market (no trade moves a relation); the provinces attacked here are undefended, so no
// battle draw is made. QA fix round: FR-310, an abstaining ballot says why (the free minor's points and wars with each
// nominee, equal strength, or a colony holding its province).
import { beforeAll, describe, it, expect } from 'vitest';
import { COUNCIL } from '@/definisions/council';
import { SCORE_WEIGHTS } from '@/definisions/scoreWeights';
import {
  abstainedProvinces,
  councilCell,
  councilMeeting,
  councilNominees,
  councilStanding,
  councilVote,
  COUNCIL_ROWS,
  isCouncilTurn,
  nextCouncilTurn,
  votesNeeded,
} from '@/engine/council/council';
import * as engine from '@/engine';
import { seasonOf, yearOfTurn } from '@/engine/calendar';
import { militaryStrength } from '@/engine/diplomacy/queries';
import { newGame } from '@/engine/newGame';
import type { Order } from '@/engine/orders/Order';
import { scoreOf, scoreTable } from '@/engine/score/score';
import type { GameEvent } from '@/engine/turn/context';
import { resolveTurn } from '@/engine/turn/resolveTurn';
import { transferProvince } from '@/engine/world/provinces';
import type { CouncilVote } from '@/types/Council';
import type { GameState } from '@/types/GameState';
import { ResourceType } from '@/types/Resource';
import { deepFreeze, N1, N2, nationOf, setPair, setTreasury } from './fixtures';
import { addRegiments, ARVELIA, ARVELIA_P, clearArmy, continent, NE2, NW2, relocate, SUNDMARK, SW1, SW2 } from './armyFixtures';
import { withoutCouncil, type EngineWithoutCouncil } from './withoutCouncil';

const LORRAN = 'minor-3';
const PELLIS = 'minor-4';
const N3 = 'nation-3';
const SUNDMARK_P = 'province-minor-2';
const LORRAN_P = 'province-minor-3';
const PELLIS_P = 'province-minor-4';
const R1 = 'regiment-1';

/** The continent (world market) on this turn and year. */
const onTurn = (turn: number, year: number, s: GameState = continent('world')): GameState => ({ ...s, turn, year });
const resolve = (s: GameState, orders: Record<string, Order[]> = {}) => resolveTurn(s, orders, s.seed);

/** Arvelia's province held by `ownerId`; with `colony` Arvelia is its colony. */
function arveliaTo(s: GameState, ownerId: string, colony: boolean): GameState {
  const t = transferProvince(s, ARVELIA_P, ownerId);
  return colony ? { ...t, minorNations: t.minorNations.map(m => (m.id === ARVELIA ? { ...m, colonyOf: ownerId } : m)) } : t;
}

/** FR-292's example: Testland holds its 4 provinces and Valdoria North-East and has colonised Arvelia. */
const fiveAndColony = (s: GameState = continent('world')): GameState => arveliaTo(transferProvince(s, NE2, N1), N1, true);

/** The three island minors at these points with Testland. */
const islandsWithTestland = (s: GameState, points: number): GameState =>
  [SUNDMARK, LORRAN, PELLIS].reduce((acc, minorId) => setPair(acc, minorId, N1, { points }), s);

/** FR-294's winning example: Controlled 5 + Colonies 1 + Other Minor Nations 3 = 9 of 12. */
const winning = (s: GameState = continent('world')): GameState => islandsWithTestland(fiveAndColony(s), 60);

/** Sundmark's points with Testland and with Valdoria. */
const sundmark = (s: GameState, withTestland: number, withValdoria: number): GameState =>
  setPair(setPair(s, SUNDMARK, N1, { points: withTestland }), SUNDMARK, N2, { points: withValdoria });

const atWar = (s: GameState, a: string, b: string, since = 1): GameState =>
  setPair(s, a, b, { war: { aggressors: [a], since }, consulates: [], embassies: [], pact: false, alliance: false });

/** A third Great Power ("nation-3", a copy of Valdoria without an army) holding Valdoria North-East (FR-292's Other Great Powers row). */
function threePowers(s: GameState = continent('world')): GameState {
  const valdoria = s.nations.find(n => n.id === N2)!;
  return transferProvince({ ...s, nations: [...s.nations, { ...valdoria, id: N3, name: 'Carthia' }] }, NE2, N3);
}

const vote = (s: GameState): CouncilVote => {
  const v = councilVote(s);
  if (!v) throw new Error('no meeting');
  return v;
};
/** A nominee's four rows and total: [Controlled, Colonies, Other Great Powers, Other Minor Nations, Total]. */
function rows(v: CouncilVote, nationId: string): number[] {
  const n = v.nominees.find(x => x.nationId === nationId)!;
  return [n.controlled, n.colonies, n.otherGreatPowers, n.otherMinorNations, n.total];
}
const ballotOf = (v: CouncilVote, provinceId: string) => v.ballots.find(b => b.provinceId === provinceId)!;
/**
 * FR-310 (M10 QA item 1): a free minor's abstaining ballot says why: each nominee's relation points with it and whether
 * they are at war, in nominee order.
 */
const weighed = (provinceId: string, ...nominees: [string, number, boolean?][]) => ({
  provinceId,
  abstention: { reason: 'relations', nominees: nominees.map(([nationId, points, atWar = false]) => ({ nationId, points, atWar })) },
});
const councils = (events: GameEvent[]) => events.filter((e): e is Extract<GameEvent, { type: 'council-met' }> => e.type === 'council-met');
/** The FR-294 fields of a `council-met` event. */
const voteOf = (e: Extract<GameEvent, { type: 'council-met' }>): CouncilVote => {
  const fields: Partial<typeof e> = { ...e };
  delete fields.type;
  delete fields.turn;
  delete fields.year;
  return fields as CouncilVote;
};

describe('FR-290 Council meetings', () => {
  it('FR-290 definisions/council.ts holds the numbers', () => {
    expect(COUNCIL).toEqual({ firstTurn: 10, interval: 10, minRelationPoints: 50, provinceWeight: 100, militaryWeight: 10 });
  });

  it('FR-290 the Council meets on turns 10, 20, 30 and 40 of a 40-turn continent game, on no other turn', () => {
    const s = continent('world');
    const turns = Array.from({ length: 45 }, (_, i) => i + 1).filter(t => isCouncilTurn(s, t));
    expect(turns).toEqual([10, 20, 30, 40]);
  });

  it('FR-290 the meeting turns stop at the turn limit; none on two-islands or with a turn limit below 10', () => {
    const upTo = (s: GameState) => Array.from({ length: 100 }, (_, i) => i + 1).filter(t => isCouncilTurn(s, t));
    expect(upTo({ ...continent('world'), turnLimit: 25 })).toEqual([10, 20]);
    expect(upTo({ ...continent('world'), turnLimit: 60 })).toEqual([10, 20, 30, 40, 50, 60]);
    expect(upTo({ ...continent('world'), turnLimit: 9 })).toEqual([]);
    expect(upTo(newGame({ seed: 1, world: 'two-islands' }))).toEqual([]);
  });

  it('FR-290 nextCouncilTurn: 10 on a new continent game, 20 on turn 11, 40 on turn 40; undefined after turn 40, on two-islands and after game over', () => {
    const s = continent('world');
    expect(nextCouncilTurn(s)).toBe(10);
    expect([10, 11, 20, 21, 39, 40, 41].map(turn => nextCouncilTurn({ ...s, turn }))).toEqual([10, 20, 20, 30, 40, 40, undefined]);
    expect(nextCouncilTurn(newGame({ seed: 1, world: 'two-islands' }))).toBeUndefined();
    expect(nextCouncilTurn({ ...s, turnLimit: 9 })).toBeUndefined();
    expect(nextCouncilTurn({ ...s, turn: 21, turnLimit: 25 })).toBeUndefined();
    const over = resolve({ ...s, turnLimit: 1 }).state;
    expect(over.gameOver).toBeDefined();
    expect(nextCouncilTurn({ ...over, turn: 5 })).toBeUndefined();
  });

  it('FR-290 the dates: turn 10 Summer 1817, 20 Winter 1819, 30 Summer 1822, 40 Winter 1824 (yearOfTurn from a new game, or from any turn)', () => {
    const s = continent('world');
    expect([10, 20, 30, 40].map(t => [t, seasonOf(t), yearOfTurn(s, t)])).toEqual([
      [10, 'summer', 1817],
      [20, 'winter', 1819],
      [30, 'summer', 1822],
      [40, 'winter', 1824],
    ]);
    expect(yearOfTurn({ turn: 11, year: 1817 }, 20)).toBe(1819);
    expect(yearOfTurn({ turn: 40, year: 1824 }, 40)).toBe(1824);
    expect(yearOfTurn({ turn: 41, year: 1825 }, 40)).toBe(1824);
    expect(yearOfTurn({ turn: 20, year: 1819 }, 17)).toBe(1819);
    expect(yearOfTurn({ turn: 20, year: 1819 }, 16)).toBe(1818);
  });

  it('FR-290 resolving turns 10, 20, 30 and 40 holds one meeting each, dated with the meeting turn; turns 9, 11, 19 and 39 hold none', () => {
    const met = [
      [9, 1817],
      [10, 1817],
      [11, 1817],
      [19, 1819],
      [20, 1819],
      [30, 1822],
      [39, 1824],
      [40, 1824],
    ].map(([turn, year]) => councils(resolve(onTurn(turn, year)).events).map(e => [e.turn, e.year]));
    expect(met).toEqual([[], [[10, 1817]], [], [], [[20, 1819]], [[30, 1822]], [], [[40, 1824]]]);
  });

  it('FR-290 no meeting on two-islands, nor on turn 10 of a game whose turn limit is below 10', () => {
    const v1 = { ...newGame({ seed: 1, world: 'two-islands' }), turn: 10, year: 1817 };
    expect(councils(resolve(v1).events)).toEqual([]);
    expect(councilVote(v1)).toBeUndefined();
    const short = { ...onTurn(10, 1817), turnLimit: 9 };
    const { state, events } = resolve(short);
    expect(councils(events)).toEqual([]);
    expect(state.gameOver).toEqual({ turn: 10, year: 1817, scores: scoreTable(state) });
  });

  it('FR-290 the meeting counts the state after the clock: a province taken in that turn\'s combat votes for its new owner', () => {
    // Testland holds Arvelia's province (not a colony) with its 1st Regulars, at war with Valdoria; Valdoria North-West
    // is undefended and Testland attacks it on turn 10
    let s = arveliaTo(onTurn(10, 1817), N1, false);
    s = atWar(relocate(clearArmy(clearArmy(s, ARVELIA, ARVELIA_P), N2, NW2), [R1], ARVELIA_P), N1, N2);
    expect(rows(vote(s), N1)).toEqual([5, 0, 0, 0, 5]);
    const attack: Order = { kind: 'moveArmy', nationId: N1, fromProvinceId: ARVELIA_P, regimentIds: [R1], toProvinceId: NW2 };

    const { state, events } = resolve(s, { [N1]: [attack] });

    expect(events.filter(e => e.type === 'province-taken')).toEqual([{ type: 'province-taken', nationId: N1, provinceId: NW2, fromId: N2 }]);
    const [met] = councils(events);
    expect(rows(met, N1)).toEqual([6, 0, 0, 0, 6]);
    expect(rows(met, N2)).toEqual([3, 0, 0, 0, 3]);
    expect(ballotOf(met, NW2)).toEqual({ provinceId: NW2, forId: N1, row: 'controlled' });
    expect(voteOf(met)).toEqual(councilVote(state));
  });

  it('FR-290 councilMeeting(state, turn) gives the vote on a meeting turn and nothing on another turn', () => {
    const s = onTurn(11, 1817);
    expect(councilMeeting(s, 10)).toEqual(councilVote(s));
    expect(councilMeeting(s, 11)).toBeUndefined();
    expect(councilMeeting({ ...s, turnLimit: 9 }, 10)).toBeUndefined();
    expect(councilMeeting(newGame({ seed: 1, world: 'two-islands' }), 10)).toBeUndefined();
  });
});

describe('FR-291 standing and nominees', () => {
  it('FR-291 standing = score + 100 x provinces + floor(10 x military strength); the example 650 + 500 + 360 = 1,510', () => {
    let s = transferProvince(continent('world'), NE2, N1);
    const { points } = scoreOf(s, N1);
    s = setTreasury(s, N1, (650 - points.industry - points.development) * SCORE_WEIGHTS.dollarsPerPoint);
    expect([scoreOf(s, N1).total, militaryStrength(s, N1)]).toEqual([650, 36]);
    expect(councilStanding(s, N1)).toBe(1510);
  });

  it('FR-291 the military part is rounded down: an Artillery at 33 health adds 5.28 strength, 52.8 points, 52 of them count', () => {
    const s = addRegiments(continent('world'), N1, SW1, ['artillery'], 33);
    expect(militaryStrength(s, N1)).toBeCloseTo(41.28, 10);
    expect(councilStanding(s, N1)).toBe(scoreOf(s, N1).total + 400 + 412);
  });

  it('FR-291 FR-309 a new continent game: both at 240 + 400 + 360 = 1,000; the tie goes in intentOrder of the turn, whatever the order of state.nations', () => {
    const s = continent('world');
    expect([councilStanding(s, N1), councilStanding(s, N2)]).toEqual([1000, 1000]);
    const reversed = (t: GameState): GameState => ({ ...t, nations: [...t.nations].reverse() });
    // Turn 1 (and every meeting state, turn 11, 21, ...): Testland first; turn 2: Valdoria first
    for (const [turn, expected] of [[1, [N1, N2]], [11, [N1, N2]], [2, [N2, N1]], [10, [N2, N1]]] as const) {
      expect(councilNominees({ ...s, turn }), `turn ${turn}`).toEqual(expected);
      expect(councilNominees(reversed({ ...s, turn })), `turn ${turn}, reversed`).toEqual(expected);
    }
  });

  it('FR-291 the higher standing is the first nominee; the nominees carry their standing', () => {
    const s = fiveAndColony();
    expect(councilNominees(s)).toEqual([N1, N2]);
    const richValdoria = setTreasury(s, N2, 100_000);
    expect(councilNominees(richValdoria)).toEqual([N2, N1]);
    expect(vote(richValdoria).nominees.map(n => [n.nationId, n.standing])).toEqual([
      [N2, councilStanding(richValdoria, N2)],
      [N1, councilStanding(richValdoria, N1)],
    ]);
  });

  it('FR-291 only Great Powers holding a province are nominated: the two highest of three', () => {
    const s = threePowers();
    expect(councilStanding(s, N3)).toBeLessThan(councilStanding(s, N2));
    expect(councilNominees(s)).toEqual([N1, N2]);
    const richCarthia = setTreasury(s, N3, 200_000);
    expect(councilNominees(richCarthia)[0]).toBe(N3);
  });

  it('FR-309 three Great Powers with a tie for the second place: the tie goes in intentOrder of the turn; reversing state.nations changes neither the nominees, nor the ballots, nor the winner (review R2)', () => {
    // Carthia gets its own founding slot (3, after Testland 1 and Valdoria 2) and the treasury that brings its standing to
    // Valdoria's; Testland, far richer, is the first nominee on every turn
    let s = setTreasury({ ...threePowers(), nations: threePowers().nations.map(n => (n.id === N3 ? { ...n, colorSlot: 3 } : n)) }, N1, 100_000);
    const behind = councilStanding(s, N2) - councilStanding(s, N3);
    s = setTreasury(s, N3, nationOf(s, N3).treasury + behind * SCORE_WEIGHTS.dollarsPerPoint);
    expect(councilStanding(s, N3)).toBe(councilStanding(s, N2));
    const reversed = (t: GameState): GameState => ({ ...t, nations: [...t.nations].reverse() });
    // intentOrder: turn 1 Testland, Valdoria, Carthia; turn 2 Valdoria, Carthia, Testland; turn 3 Carthia, Testland, Valdoria
    for (const [turn, expected] of [[1, [N1, N2]], [2, [N1, N2]], [3, [N1, N3]]] as const) {
      const onIt = { ...s, turn };
      expect(councilNominees(onIt), `turn ${turn}`).toEqual(expected);
      expect(councilNominees(reversed(onIt)), `turn ${turn}, reversed`).toEqual(expected);
      expect(vote(reversed(onIt)).ballots).toEqual(vote(onIt).ballots);
      expect(vote(reversed(onIt)).winnerId).toEqual(vote(onIt).winnerId);
    }
  });

  it('FR-291 with fewer than two Great Powers holding a province no meeting is held', () => {
    let s = continent('world');
    for (const p of ['province-nation-2-nw', 'province-nation-2-ne', 'province-nation-2-sw', 'province-nation-2-se']) s = transferProvince(s, p, N1);
    expect(councilNominees(s)).toEqual([N1]);
    expect(councilVote(s)).toBeUndefined();
    expect(councilMeeting({ ...s, turn: 11 }, 10)).toBeUndefined();
  });
});

describe('FR-292 one vote per province', () => {
  it('FR-292 a new game: 12 ballots in state order; each Great Power Controlled 4; the 4 minors abstain', () => {
    const s = continent('world');
    const v = vote(s);
    expect(v.totalVotes).toBe(12);
    expect(v.ballots.map(b => b.provinceId)).toEqual(s.provinces.map(p => p.id));
    expect(rows(v, N1)).toEqual([4, 0, 0, 0, 4]);
    expect(rows(v, N2)).toEqual([4, 0, 0, 0, 4]);
    expect(v.ballots.filter(b => b.forId === undefined).map(b => b.provinceId)).toEqual([ARVELIA_P, SUNDMARK_P, LORRAN_P, PELLIS_P]);
  });

  it('FR-292 the example: Testland holds its 4 provinces and Valdoria North-East and has colonised Arvelia: Controlled 5, Colonies 1', () => {
    const v = vote(fiveAndColony());
    expect(rows(v, N1)).toEqual([5, 1, 0, 0, 6]);
    expect(rows(v, N2)).toEqual([3, 0, 0, 0, 3]);
    expect(ballotOf(v, NE2)).toEqual({ provinceId: NE2, forId: N1, row: 'controlled' });
    expect(ballotOf(v, ARVELIA_P)).toEqual({ provinceId: ARVELIA_P, forId: N1, row: 'colonies' });
  });

  it('FR-292 a minor\'s province a nominee holds without a colony counts as Controlled', () => {
    expect(rows(vote(arveliaTo(continent('world'), N1, false)), N1)).toEqual([5, 0, 0, 0, 5]);
    expect(rows(vote(arveliaTo(continent('world'), N2, true)), N2)).toEqual([4, 1, 0, 0, 5]);
  });

  it('FR-292 a province of a Great Power not nominated votes as Other Great Powers for the nominee with the higher military strength', () => {
    const stronger = addRegiments(threePowers(), N1, SW1, ['regulars']);
    const v = vote(stronger);
    expect(v.nominees.map(n => n.nationId)).toEqual([N1, N2]);
    expect(ballotOf(v, NE2)).toEqual({ provinceId: NE2, forId: N1, row: 'otherGreatPowers' });
    expect(rows(v, N1)).toEqual([4, 0, 1, 0, 5]);
    const valdoriaStronger = addRegiments(threePowers(), N2, SW2, ['regulars']);
    expect(ballotOf(vote(valdoriaStronger), NE2)).toEqual({ provinceId: NE2, forId: N2, row: 'otherGreatPowers' });
  });

  it('FR-292 FR-310 on a tie of military strength that province abstains, saying so (equal strength, its owner)', () => {
    const v = vote(threePowers());
    expect([militaryStrength(threePowers(), N1), militaryStrength(threePowers(), N2)]).toEqual([36, 36]);
    expect(ballotOf(v, NE2)).toEqual({ provinceId: NE2, abstention: { reason: 'equal-strength', ownerId: N3 } });
    expect(v.totalVotes).toBe(12);
  });
});

describe('FR-293 a free minor\'s vote', () => {
  const sundmarkBallot = (s: GameState) => ballotOf(vote(s), SUNDMARK_P);

  it('FR-293 Sundmark at 52 with Testland and 30 with Valdoria votes for Testland, as Other Minor Nations', () => {
    expect(sundmarkBallot(sundmark(continent('world'), 52, 30))).toEqual({ provinceId: SUNDMARK_P, forId: N1, row: 'otherMinorNations' });
    expect(rows(vote(sundmark(continent('world'), 52, 30)), N1)).toEqual([4, 0, 0, 1, 5]);
  });

  it('FR-293 FR-310 at 30 and 30 (the start) it abstains; at 50 and 50 it abstains; at 49 and 30 it abstains; each says its points', () => {
    expect(sundmarkBallot(sundmark(continent('world'), 30, 30))).toEqual(weighed(SUNDMARK_P, [N1, 30], [N2, 30]));
    expect(sundmarkBallot(sundmark(continent('world'), 50, 50))).toEqual(weighed(SUNDMARK_P, [N1, 50], [N2, 50]));
    expect(sundmarkBallot(sundmark(continent('world'), 49, 30))).toEqual(weighed(SUNDMARK_P, [N1, 49], [N2, 30]));
  });

  it('FR-293 at exactly 50 (level 5, shown as "level 6 of 9") it votes', () => {
    expect(sundmarkBallot(sundmark(continent('world'), 30, 50))).toEqual({ provinceId: SUNDMARK_P, forId: N2, row: 'otherMinorNations' });
  });

  it('FR-293 at 60 and 55 while at war with Testland it votes for Valdoria; a war declared and not begun counts too', () => {
    const active = atWar(sundmark(continent('world'), 60, 55), N1, SUNDMARK, 1);
    expect(sundmarkBallot(active)).toEqual({ provinceId: SUNDMARK_P, forId: N2, row: 'otherMinorNations' });
    const declared = atWar(sundmark(continent('world'), 60, 55), N1, SUNDMARK, 5);
    expect(sundmarkBallot(declared)).toEqual({ provinceId: SUNDMARK_P, forId: N2, row: 'otherMinorNations' });
    const both = atWar(atWar(sundmark(continent('world'), 60, 55), N1, SUNDMARK), N2, SUNDMARK);
    expect(sundmarkBallot(both)).toEqual(weighed(SUNDMARK_P, [N1, 60, true], [N2, 55, true]));
  });

  it('FR-293 FR-310 equal points among those it may vote for: abstains, unless war leaves one', () => {
    expect(sundmarkBallot(sundmark(continent('world'), 70, 70))).toEqual(weighed(SUNDMARK_P, [N1, 70], [N2, 70]));
    expect(sundmarkBallot(atWar(sundmark(continent('world'), 70, 70), N2, SUNDMARK))).toEqual({ provinceId: SUNDMARK_P, forId: N1, row: 'otherMinorNations' });
  });

  it('FR-293 FR-310 on a new game all 4 minors abstain, each at 30 points with both nominees', () => {
    const v = vote(continent('world'));
    expect([ARVELIA_P, SUNDMARK_P, LORRAN_P, PELLIS_P].map(p => ballotOf(v, p))).toEqual(
      [ARVELIA_P, SUNDMARK_P, LORRAN_P, PELLIS_P].map(provinceId => weighed(provinceId, [N1, 30], [N2, 30]))
    );
  });

  it('FR-310 at war with one nominee and below 50 with the other: it abstains, and its ballot says both', () => {
    const s = atWar(sundmark(continent('world'), 60, 40), N1, SUNDMARK);
    expect(sundmarkBallot(s)).toEqual(weighed(SUNDMARK_P, [N1, 60, true], [N2, 40]));
  });

  it('FR-310 the nominees in the ballot follow the nominee order: Valdoria first when it is the first nominee', () => {
    const s = sundmark(transferProvince(continent('world'), 'province-nation-1-ne', N2), 20, 40);
    expect(vote(s).nominees.map(n => n.nationId)).toEqual([N2, N1]);
    expect(sundmarkBallot(s)).toEqual(weighed(SUNDMARK_P, [N2, 40], [N1, 20]));
  });

  it('FR-310 a colony still holding its own province (hand-built) abstains as a colony; a ballot that votes carries no abstention', () => {
    const colony = { ...continent('world'), minorNations: continent('world').minorNations.map(m => (m.id === ARVELIA ? { ...m, colonyOf: N1 } : m)) };
    const v = vote(colony);
    expect(ballotOf(v, ARVELIA_P)).toEqual({ provinceId: ARVELIA_P, abstention: { reason: 'colony', ownerId: ARVELIA } });
    for (const b of v.ballots.filter(x => x.forId !== undefined)) expect('abstention' in b).toBe(false);
  });
});

describe('FR-294 the count and the winner', () => {
  it('FR-294 needed = floor(2 x totalVotes / 3) + 1: 12 gives 9, 120 gives 81 (more than two thirds of all votes)', () => {
    expect([3, 6, 9, 12, 13, 120].map(votesNeeded)).toEqual([3, 5, 7, 9, 9, 81]);
    expect(vote(continent('world')).needed).toBe(9);
  });

  it('FR-294 Controlled 5 + Colonies 1 + Other Minor Nations 3 = 9 wins', () => {
    const v = vote(winning());
    expect(rows(v, N1)).toEqual([5, 1, 0, 3, 9]);
    expect(v.winnerId).toBe(N1);
  });

  it('FR-294 Controlled 4 + Colonies 1 + Other Minor Nations 3 = 8 (exactly two thirds) does not win', () => {
    const v = vote(islandsWithTestland(arveliaTo(continent('world'), N1, true), 60));
    expect(rows(v, N1)).toEqual([4, 1, 0, 3, 8]);
    expect(v.winnerId).toBeUndefined();
    expect('winnerId' in v).toBe(false);
  });

  it('FR-294 the start state: 4 and 4, no winner, 4 abstentions, which count in the total', () => {
    const v = vote(continent('world'));
    expect([v.totalVotes, v.needed, v.nominees.map(n => n.total), v.winnerId]).toEqual([12, 9, [4, 4], undefined]);
    expect(abstainedProvinces(v)).toEqual([ARVELIA_P, SUNDMARK_P, LORRAN_P, PELLIS_P]);
  });

  it('FR-294 FR-310 the result\'s shape: each total is its four rows; an abstention has no forId and no row, and says why', () => {
    const v = vote(sundmark(threePowers(), 52, 30));
    for (const n of v.nominees) expect(n.total).toBe(n.controlled + n.colonies + n.otherGreatPowers + n.otherMinorNations);
    expect(v.nominees.reduce((sum, n) => sum + n.total, 0) + abstainedProvinces(v).length).toBe(v.totalVotes);
    for (const b of v.ballots.filter(x => x.forId === undefined)) expect(Object.keys(b)).toEqual(['provinceId', 'abstention']);
    expect(Object.keys(v).sort()).toEqual(['ballots', 'needed', 'nominees', 'totalVotes']);
    expect(Object.keys(vote(winning())).sort()).toEqual(['ballots', 'needed', 'nominees', 'totalVotes', 'winnerId']);
  });

  it('FR-294 councilCell lists the provinces behind a number; COUNCIL_ROWS are the four rows in the screen\'s order', () => {
    expect(COUNCIL_ROWS).toEqual(['controlled', 'colonies', 'otherGreatPowers', 'otherMinorNations']);
    const v = vote(winning());
    expect(councilCell(v, N1, 'controlled')).toEqual(['province-nation-1-nw', 'province-nation-1-ne', 'province-nation-1-sw', 'province-nation-1-se', NE2]);
    expect(councilCell(v, N1, 'colonies')).toEqual([ARVELIA_P]);
    expect(councilCell(v, N1, 'otherMinorNations')).toEqual([SUNDMARK_P, LORRAN_P, PELLIS_P]);
    expect(councilCell(v, N2, 'otherMinorNations')).toEqual([]);
    expect(COUNCIL_ROWS.map(r => councilCell(v, N1, r).length)).toEqual(rows(v, N1).slice(0, 4));
  });

  it('FR-294 it is a pure query: a deep-frozen input is unchanged, the same result twice', () => {
    const s = deepFreeze(structuredClone(winning()));
    const snapshot = structuredClone(s);
    const first = councilVote(s);
    expect(councilVote(s)).toEqual(first);
    expect(s).toEqual(snapshot);
  });

  it('FR-294 swapping the order of state.nations gives the same ballots and winner', () => {
    for (const s of [winning(), continent('world'), sundmark(threePowers(), 52, 30)]) {
      const swapped = { ...s, nations: [...s.nations].reverse() };
      expect(vote(swapped).ballots).toEqual(vote(s).ballots);
      expect(vote(swapped).winnerId).toEqual(vote(s).winnerId);
    }
  });
});

describe('FR-295 the Council ends the game', () => {
  let off: EngineWithoutCouncil;
  beforeAll(async () => {
    off = await withoutCouncil();
  }, 60_000);

  it('FR-295 a winning meeting on turn 10: gameOver with reason council, the winner and the vote; game-over after council-met', () => {
    const s = onTurn(10, 1817, winning());
    const { state, events } = resolve(s);

    const [met] = councils(events);
    expect(met.winnerId).toBe(N1);
    expect(state.gameOver).toEqual({ turn: 10, year: 1817, scores: scoreTable(state), reason: 'council', winnerId: N1, council: voteOf(met) });
    expect(voteOf(met)).toEqual(councilVote(state));
    expect(events.slice(-3).map(e => e.type)).toEqual(['turn-ended', 'council-met', 'game-over']);
    expect(events.at(-1)).toEqual({ type: 'game-over', ...state.gameOver });
  });

  it('FR-295 FR-069 after a Council win no order and no turn changes the state', () => {
    const { state } = resolve(onTurn(10, 1817, winning()));
    const frozen = deepFreeze(state);
    const again = resolve(frozen, { [N1]: [{ kind: 'sellCommodity', nationId: N1, commodity: ResourceType.Timber, amount: 1 }] });
    expect(again.state).toBe(frozen);
    expect(again.events.map(e => (e.type === 'order-rejected' ? e.reason : e.type))).toEqual(['game-over']);
  });

  it('FR-295 a meeting without a winner: the game goes on', () => {
    const { state, events } = resolve(onTurn(10, 1817));
    expect(councils(events)).toHaveLength(1);
    expect(state.gameOver).toBeUndefined();
    expect(events.some(e => e.type === 'game-over')).toBe(false);
  });

  it('FR-295 FR-068 turn 40 without a winner ends by the turn limit exactly as before: no reason, no council', () => {
    const { state, events } = resolve(onTurn(40, 1824));
    expect(state.gameOver).toEqual({ turn: 40, year: 1824, scores: scoreTable(state) });
    expect(events.slice(-3).map(e => e.type)).toEqual(['turn-ended', 'council-met', 'game-over']);
    expect(events.at(-1)).toEqual({ type: 'game-over', turn: 40, year: 1824, scores: scoreTable(state) });
  });

  it('FR-308 (Q53) the turn-40 meeting, the last, keeps the rules: the 4 minors at their start points abstain, a minor at 49 still abstains, and no winner (review R3)', () => {
    const [last] = councils(resolve(onTurn(40, 1824)).events);
    expect([last.turn, isCouncilTurn(onTurn(41, 1825), 50)]).toEqual([40, false]);
    expect(abstainedProvinces(last)).toEqual([ARVELIA_P, SUNDMARK_P, LORRAN_P, PELLIS_P]);
    expect([last.nominees.map(n => n.total), last.winnerId]).toEqual([[4, 4], undefined]);
    // Sundmark at 49 with Testland and 30 with Valdoria: below 50 with both, so it does not have to choose
    const [close] = councils(resolve(onTurn(40, 1824, sundmark(continent('world'), 49, 30))).events);
    expect(ballotOf(close, SUNDMARK_P)).toEqual(weighed(SUNDMARK_P, [N1, 49], [N2, 30]));
    expect(abstainedProvinces(close)).toHaveLength(4);
  });

  it('FR-295 turn 40 with a winner ends by the Council', () => {
    const { state } = resolve(onTurn(40, 1824, winning()));
    expect(state.gameOver).toMatchObject({ turn: 40, year: 1824, reason: 'council', winnerId: N1 });
  });

  it('FR-295 conquest comes first: a turn-10 conquest ends with reason conquest and holds no meeting', () => {
    let s = transferProvince(onTurn(10, 1817, winning()), NW2, N1);
    s = clearArmy(clearArmy(s, N2, NW2), N2, SW2);
    s = atWar(relocate(s, [R1], NW2), N1, N2);
    const attack: Order = { kind: 'moveArmy', nationId: N1, fromProvinceId: NW2, regimentIds: [R1], toProvinceId: SW2 };

    const { state, events } = resolve(s, { [N1]: [attack] });

    expect(state.gameOver).toMatchObject({ turn: 10, reason: 'conquest', winnerId: N1 });
    expect(state.gameOver).not.toHaveProperty('council');
    expect(councils(events)).toEqual([]);
  });

  it('FR-295 the meeting writes nothing but gameOver: every other field, and every other event, is the turn\'s without the Council', () => {
    for (const s of [onTurn(10, 1817, winning()), onTurn(10, 1817), onTurn(40, 1824)]) {
      const met = resolve(s);
      const without = off.resolveTurn(s, {}, s.seed);
      const rest = (state: GameState): Partial<GameState> => {
        const fields: Partial<GameState> = { ...state };
        delete fields.gameOver;
        return fields;
      };
      expect(rest(met.state)).toEqual(rest(without.state));
      expect(councils(without.events)).toEqual([]);
      const others = (events: GameEvent[]) => events.filter(e => e.type !== 'council-met' && e.type !== 'game-over');
      expect(others(met.events)).toEqual(others(without.events));
    }
  });
});

describe('FR-296 the council-met event', () => {
  it('FR-296 one council-met per meeting with the FR-294 fields, the meeting turn and year, no nationId; after turn-ended', () => {
    const { state, events } = resolve(onTurn(20, 1819));
    const met = councils(events);
    expect(met).toHaveLength(1);
    expect(met[0]).toEqual({ type: 'council-met', turn: 20, year: 1819, ...councilVote(state) });
    expect(met[0]).not.toHaveProperty('nationId');
    expect(events.at(-1)!.type).toBe('council-met');
    expect(events.at(-2)!.type).toBe('turn-ended');
  });

  it('FR-296 a meeting turn\'s prices, development and battles are the same as without the meeting (the council draws no random number)', async () => {
    const off = await withoutCouncil();
    const s = onTurn(10, 1817);
    const met = resolve(s);
    const without = off.resolveTurn(s, {}, s.seed);
    expect(met.state.market).toEqual(without.state.market);
    expect(met.state.map).toEqual(without.state.map);
    expect(met.events.filter(e => e.type !== 'council-met')).toEqual(without.events);
  }, 60_000);
});

describe('FR-305 baselines: two-islands holds no meeting', () => {
  it('FR-305 a two-islands game resolved to its end emits no council-met and ends by the turn limit', () => {
    let s = newGame({ seed: 1, world: 'two-islands' });
    const met: GameEvent[] = [];
    while (!s.gameOver) {
      const r = resolve(s);
      met.push(...councils(r.events));
      s = r.state;
    }
    expect(met).toEqual([]);
    expect(s.gameOver).toEqual({ turn: 40, year: 1824, scores: scoreTable(s) });
  }, 60_000);
});

describe('the public API for the UI half', () => {
  it('FR-290 FR-291 FR-294 @/engine exports the Council helpers and numbers', () => {
    expect(engine.COUNCIL).toBe(COUNCIL);
    expect(engine.COUNCIL_ROWS).toBe(COUNCIL_ROWS);
    for (const fn of [engine.councilVote, engine.councilStanding, engine.councilNominees, engine.nextCouncilTurn, engine.isCouncilTurn, engine.councilCell, engine.abstainedProvinces, engine.votesNeeded, engine.yearOfTurn]) {
      expect(typeof fn).toBe('function');
    }
  });
});
