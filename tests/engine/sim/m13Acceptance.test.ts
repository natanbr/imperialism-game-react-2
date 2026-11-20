// M13 (FR-500): the acceptance table. Every sim threshold of FR-484 to FR-490, FR-493 and FR-497 in one file, written from the
// table under FR-500 in docs/specs/m13-m16.md BEFORE the AI rows were built and never loosened afterwards (an
// implementation that cannot reach one parks the row as blocked with its measured numbers; FLOW "Running alone").
//
// The games are played once, when the file is collected, with `runGame` of the harness (T-02), so each test name carries its
// measured number ("measured 7 of 24, required 20") and an `afterAll` prints the whole table. A game that throws is recorded
// as a crash, counts as a miss in every row, and fails the FR-497 crash test; it does not stop the file.
//
//   idle      24 games, seeds 1-24   FR-485, FR-486, FR-487, FR-488, FR-489, FR-490 (replaced by FR-542), FR-542, FR-497
//   aggressor 12 games, seeds 1-12   FR-484 (i)-(iii), FR-497
//   trader    24 games, seeds 1-24   FR-493, FR-497
//   scripted  24 games, seeds 1-24   a report with no threshold (spec section 6, risk 1), played inside its test
//
// Reading rule of the harness: `atTurn(game, 40)` is the state after turn 40 resolved, the state the person sees on turn 41.
//
// Two things in this file are not rows of the table, and are labelled so in their names: the FR-489 guard (the rule is
// exercised) and the FR-497 probe (the computer's plan does not change when the human's orders of this turn are removed from
// the state it plans on). The last describe checks that the measures read a crafted record the way the rows say, so a row
// cannot turn green or stay red because of a wrong read.
import { setImmediate as yieldToRunner } from 'node:timers/promises';
import { afterAll, describe, expect, it } from 'vitest';
import { newGame } from '@/engine/newGame';
import { computerOrders } from '@/engine/ai/players';
import { tryApplyOrder } from '@/engine/orders/apply';
import { setTreasury, treasury } from '../fixtures';
import { MaterialType } from '@/types/Resource';
import type { Order } from '@/engine/orders/Order';
import type { GameState } from '@/types/GameState';
import {
  atTurn,
  computerOrdersTimes,
  firstProvinceTakenTurn,
  healthyWorkersAt,
  percentile,
  runGame,
  unitsTradedBetweenGreatPowers,
  type GameRecord,
  type TurnRecord,
} from './harness';
import { COMPUTER_ID, HUMAN_ID, HUMANS, type HumanName, type HumanPolicy } from './humans';

// ---- the thresholds, verbatim from the table under FR-500 ------------------------------------------------------------------

const SEEDS_24: readonly number[] = Array.from({ length: 24 }, (_, i) => i + 1);
const SEEDS_12: readonly number[] = SEEDS_24.slice(0, 12);

const REQUIRED = {
  /** FR-484 (i): aggressor, seeds 1-12: Valdoria recruits at least 2 regiments in turns 6-15 (before: 0 of 12). */
  recruits: { games: 12, of: 12, regiments: 2, fromTurn: 6, toTurn: 15 },
  /** FR-484 (ii): aggressor: Valdoria attacks at least once (before: 0 of 12). */
  attacks: { games: 6, of: 12, atLeast: 1 },
  /** FR-484 (iii): aggressor: Valdoria has lost at most 2 provinces at the end of turn 12 (before: 0 of 12; 3 lost by turn 10). */
  provincesKept: { games: 6, of: 12, maxLost: 2, byTurn: 12 },
  /** FR-485: idle: Valdoria has at least 7 healthy workers at turn 40 (before: 0 of 24, all 4). */
  workers: { games: 20, of: 24, atLeast: 7, atTurn: 40 },
  /** FR-486: idle: Valdoria's labour at turn 40 is at least 24 (before: 0 of 24, all 16). */
  labour: { games: 16, of: 24, atLeast: 24, atTurn: 40 },
  /** FR-487: idle: war on a minor by turn 25, and a minor's capital province held by turn 30 (before: 24 of 24). */
  minorWar: { games: 22, of: 24, byTurn: 25 },
  minorHeld: { games: 22, of: 24, byTurn: 30 },
  /** FR-488: idle: Valdoria declares war on Testland by turn 32 (before: 0 of 24). */
  greatPowerWar: { games: 18, of: 24, byTurn: 32 },
  /** FR-489: idle: Testland keeps its capital province to turn 40, loses at most 1 province, and a peace offer reaches it within 1 turn (24 of 24). */
  oneProvince: { games: 24, of: 24, maxLost: 1, peaceWithinTurns: 1, untilTurn: 40 },
  /**
   * FR-490: idle: at least 1 Other Minor Nations vote for Valdoria at the turn-30 meeting (before: 0 of 24).
   * Replaced by FR-542 (M13 close round, card Q139): 0 of 24 under every rule set tried (.gate/m13/close/grants-notes.md).
   * Kept verbatim and printed in the table as a report; FR-542's two rows below are asserted instead.
   */
  votes: { games: 18, of: 24, atLeast: 1, atMeeting: 30 },
  /**
   * FR-542 (M13 close round, card Q117 (b), written from the measured ceiling): idle: (i) Valdoria has made an embassy and a
   * pact with one free minor by turn 29, before the turn-30 meeting (measured 21 of 24; before: 0 of 24); (ii) at least 1
   * Other Minor Nations vote for Valdoria at the turn-40 meeting (measured 18 of 24; before: 0 of 24).
   */
  overtures: { games: 18, of: 24, byTurn: 29 },
  votesAt40: { games: 18, of: 24, atLeast: 1, atMeeting: 40 },
  /** FR-493: trader: at least 5 units traded between the Great Powers in 40 turns (before: 0 of 24). */
  traded: { games: 18, of: 24, atLeast: 5 },
  /** FR-497: rejected orders 0, invariant breaks 0, no-pay disbands 0 in idle games, `computerOrders` p95 at most 100 ms. */
  fair: { rejected: 0, invariantBreaks: 0, noPayDisbands: 0, p95Ms: 100 },
  /**
   * M13 review fix round, written before the fix (2026-11-17). FR-538 (ST-01; spec section 1, QA checks 6 and 7, card
   * Q114's objection): idle: the FR-495 border warning shows to Testland at peace before Valdoria's war on it is recorded,
   * in every game (a game without that war counts as met; FR-488 measures the war). Before: 0 of 24.
   * And the warning shows before the first province Testland loses, in every game. Before: 18 of 24.
   */
  warningBeforeWar: { games: 24, of: 24 },
  warningBeforeLoss: { games: 24, of: 24 },
  /**
   * M13 review fix round, written before the fix. FR-539 (ST-02; spec section 1, QA check 4, risk "useless if the Board
   * lines never appear in a real game"): idle: the Board's steel row says Valdoria bid for steel last turn on at least 9
   * of turns 3 to 20 (at peace with Testland). Before: 0 of 24 (a steel bid on 0 turns in 23 games, 1 turn in one).
   * trader: Testland sells Valdoria at least 1 steel. Before: 0 of 24 (lumber only).
   */
  steelBidShown: { games: 18, of: 24, turns: 9, fromTurn: 3, toTurn: 20 },
  steelSold: { games: 18, of: 24, atLeast: 1 },
  /**
   * M13 final round (by-eye QA, track A extra 2 and track B extra 1; card Q118 (a)), written before the fix (2026-11-17).
   * FR-541: the `follower` human plays as the QA did: each turn it offers 1 lumber when the Board says Valdoria bid for
   * lumber last turn, and nothing else. It sells at least 1 lumber, and at least half of its lumber offers, in 18 of 24
   * games. Before: 0 of 24 (0 of 145 offers sold over 24 games: Valdoria bid on turns 1, 3, 5 ... and the follower offered
   * on turns 2, 4, 6 ..., each answer one turn after the other's).
   */
  followerSells: { games: 18, of: 24, atLeast: 1, share: 0.5 },
} as const;

/**
 * Not a row of the table: FR-489's three checks are true of a game in which Valdoria never takes a province, so on their own
 * they would be green before the rule exists. This guard says the rule is exercised: Valdoria takes a province from Testland
 * in as many games as FR-488 has it declare war (18 of 24), one province each. The integration task may lower it with a
 * written reason; it is the one number of this file that is not read from the table.
 */
const FR_489_EXERCISED = { games: 18, of: 24 } as const;

// ---- playing the games -----------------------------------------------------------------------------------------------------

interface Played {
  human: string;
  seeds: readonly number[];
  games: GameRecord[];
  crashed: { seed: number; message: string }[];
  seconds: number;
}

async function play(human: HumanName | HumanPolicy, seeds: readonly number[]): Promise<Played> {
  const began = performance.now();
  const games: GameRecord[] = [];
  const crashed: Played['crashed'] = [];
  for (const seed of seeds) {
    try {
      games.push(runGame({ seed, human }));
    } catch (e) {
      crashed.push({ seed, message: e instanceof Error ? `${e.message}\n${e.stack?.split('\n').slice(1, 4).join('\n')}` : String(e) });
    }
    // Let Vitest service worker messages between games, outside every per-turn measurement.
    await yieldToRunner();
  }
  return { human: typeof human === 'string' ? human : human.name, seeds, games, crashed, seconds: (performance.now() - began) / 1000 };
}

/**
 * FR-541 (M13 final round): the person as the by-eye QA played, answering the Board of Trade: each turn it offers 1 lumber
 * when the Board says Valdoria bid for lumber last turn (FR-494, the public orders of FR-491), while it has the lumber, and
 * gives no other order. Defined here, not in humans.ts: only this row uses it.
 */
const follower: HumanPolicy = {
  name: 'follower',
  orders: (state, { lastTrade }) => {
    const me = state.nations.find(n => n.id === HUMAN_ID);
    const lumber = (me?.warehouse as Record<string, number> | undefined)?.lumber ?? 0;
    if ((lastTrade[COMPUTER_ID]?.buy.lumber ?? 0) < 1 || lumber < 1) return [];
    return [{ kind: 'sellCommodity', nationId: HUMAN_ID, commodity: 'lumber', amount: 1 } as Order];
  },
};

const idle = await play('idle', SEEDS_24);
const aggressor = await play('aggressor', SEEDS_12);
const trader = await play('trader', SEEDS_24);
const followers = await play(follower, SEEDS_24);

// ---- measuring a row -------------------------------------------------------------------------------------------------------

interface Row {
  /** The FR row and part, as the table names it. */
  id: string;
  /** What is measured, in words. */
  what: string;
  human: string;
  measured: number;
  of: number;
  required: number;
  /** The seeds that miss it (a crashed game is a miss). */
  misses: number[];
  /** The spread of the measure over the games, when it is a number (min, median, max). */
  spread?: string;
}

const ROWS: Row[] = [];

const median = (values: number[]): number => percentile(values, 50);

/** Counts the games of `played` for which `holds` is true; `value` (optional) gives the number to summarise. */
function measure(
  id: string,
  what: string,
  played: Played,
  required: number,
  holds: (game: GameRecord) => boolean,
  value?: (game: GameRecord) => number | undefined
): Row {
  const passing = played.games.filter(holds).map(g => g.seed);
  const values = value ? played.games.map(game => value(game)).filter((v): v is number => v !== undefined) : [];
  const row: Row = {
    id,
    what,
    human: played.human,
    measured: passing.length,
    of: played.seeds.length,
    required,
    misses: played.seeds.filter(seed => !passing.includes(seed)),
    spread: values.length > 0 ? `min ${Math.min(...values)}, median ${median(values)}, max ${Math.max(...values)}` : undefined,
  };
  ROWS.push(row);
  return row;
}

const named = (row: Row): string =>
  `${row.id} ${row.human}: ${row.what}: measured ${row.measured} of ${row.of}, required ${row.required} of ${row.of}` +
  (row.spread ? ` (${row.spread})` : '');

const missNote = (row: Row, played: Played): string =>
  `${row.id}: seeds that miss: ${row.misses.join(', ') || 'none'}` +
  (played.crashed.length > 0 ? `; crashed: ${played.crashed.map(c => c.seed).join(', ')}` : '');

const turnsIn = (game: GameRecord, from: number, to: number): TurnRecord[] => game.turns.filter(t => t.turn >= from && t.turn <= to);

// ---- FR-484: the aggressor game ----------------------------------------------------------------------------------------------

const recruitedBetween = (game: GameRecord, from: number, to: number): number =>
  turnsIn(game, from, to)
    .flatMap(t => t.regimentsRecruited)
    .filter(r => r.nationId === COMPUTER_ID)
    .reduce((sum, r) => sum + r.count, 0);

/** Battles Valdoria fought as the attacker against Testland (the war the aggressor starts); the battles against anyone are counted in the output only. */
const attacksOnTestland = (game: GameRecord): number =>
  game.turns.flatMap(t => t.battles).filter(b => b.attackerId === COMPUTER_ID && b.defenderId === HUMAN_ID).length;
const attacksOnAnyone = (game: GameRecord): number => game.turns.flatMap(t => t.battles).filter(b => b.attackerId === COMPUTER_ID).length;

/**
 * Provinces Valdoria started with that it does not hold after `byTurn`: each `province-taken` from Valdoria removes one, each
 * one Valdoria takes adds one (a retaken province is not lost). A fallen nation (its capital province taken) has lost its provinces.
 */
function provincesLostBy(game: GameRecord, byTurn: number): number {
  const start = newGame({ seed: game.seed, world: 'continent' });
  const originals = start.provinces.filter(p => p.ownerId === COMPUTER_ID).map(p => p.id);
  const owned = new Set(originals);
  for (const turn of turnsIn(game, 1, byTurn)) {
    for (const taken of turn.provincesTaken) {
      if (taken.fromId === COMPUTER_ID) owned.delete(taken.provinceId);
      if (taken.byId === COMPUTER_ID) owned.add(taken.provinceId);
    }
  }
  return originals.filter(id => !owned.has(id)).length;
}

/** The same count from the province counts alone (the harness test's "before" number: 3 by turn 12). */
const provincesLostNet = (game: GameRecord, byTurn: number): number | undefined => {
  const record = [...turnsIn(game, 1, byTurn)].pop();
  return record ? game.startProvinces[COMPUTER_ID] - record.provincesHeld[COMPUTER_ID] : undefined;
};

const recruitsRow = measure(
  'FR-484 (i)',
  `Valdoria recruits at least ${REQUIRED.recruits.regiments} regiments in turns ${REQUIRED.recruits.fromTurn}-${REQUIRED.recruits.toTurn}`,
  aggressor,
  REQUIRED.recruits.games,
  g => recruitedBetween(g, REQUIRED.recruits.fromTurn, REQUIRED.recruits.toTurn) >= REQUIRED.recruits.regiments,
  g => recruitedBetween(g, REQUIRED.recruits.fromTurn, REQUIRED.recruits.toTurn)
);
const attacksRow = measure(
  'FR-484 (ii)',
  `Valdoria attacks Testland at least ${REQUIRED.attacks.atLeast} time (as the attacker, in any turn of the game)`,
  aggressor,
  REQUIRED.attacks.games,
  g => attacksOnTestland(g) >= REQUIRED.attacks.atLeast,
  attacksOnTestland
);
const keptRow = measure(
  'FR-484 (iii)',
  `Valdoria has lost at most ${REQUIRED.provincesKept.maxLost} of its provinces at the end of turn ${REQUIRED.provincesKept.byTurn}`,
  aggressor,
  REQUIRED.provincesKept.games,
  g => provincesLostBy(g, REQUIRED.provincesKept.byTurn) <= REQUIRED.provincesKept.maxLost,
  g => provincesLostBy(g, REQUIRED.provincesKept.byTurn)
);

// ---- FR-485 to FR-490: the idle game -----------------------------------------------------------------------------------------

const workersRow = measure(
  'FR-485',
  `Valdoria has at least ${REQUIRED.workers.atLeast} healthy workers at turn ${REQUIRED.workers.atTurn}`,
  idle,
  REQUIRED.workers.games,
  g => (healthyWorkersAt(g, REQUIRED.workers.atTurn, COMPUTER_ID) ?? 0) >= REQUIRED.workers.atLeast,
  g => healthyWorkersAt(g, REQUIRED.workers.atTurn, COMPUTER_ID)
);
const labourRow = measure(
  'FR-486',
  `Valdoria's labour at turn ${REQUIRED.labour.atTurn} is at least ${REQUIRED.labour.atLeast}`,
  idle,
  REQUIRED.labour.games,
  g => (atTurn(g, REQUIRED.labour.atTurn)?.labour[COMPUTER_ID] ?? 0) >= REQUIRED.labour.atLeast,
  g => atTurn(g, REQUIRED.labour.atTurn)?.labour[COMPUTER_ID]
);

/** The turn of Valdoria's first war on a country that is not Testland (a minor nation), if any. */
const minorWarTurn = (game: GameRecord): number | undefined =>
  game.turns.flatMap(t => t.warsDeclared).find(w => w.byId === COMPUTER_ID && w.onId !== HUMAN_ID)?.turn;
/** The turn Valdoria took the capital province of a minor nation (the minor's colonisation), if it did. */
const minorHeldTurn = (game: GameRecord): number | undefined =>
  game.turns.find(t => t.minorsColonised.some(c => c.nationId === COMPUTER_ID))?.turn;

const minorWarRow = measure(
  'FR-487 (war)',
  `Valdoria declares war on a minor by turn ${REQUIRED.minorWar.byTurn}`,
  idle,
  REQUIRED.minorWar.games,
  g => (minorWarTurn(g) ?? Infinity) <= REQUIRED.minorWar.byTurn,
  minorWarTurn
);
const minorHeldRow = measure(
  'FR-487 (capital)',
  `Valdoria holds a minor's capital province by turn ${REQUIRED.minorHeld.byTurn}`,
  idle,
  REQUIRED.minorHeld.games,
  g => (minorHeldTurn(g) ?? Infinity) <= REQUIRED.minorHeld.byTurn,
  minorHeldTurn
);

/** The turn Valdoria declares war on Testland, if it does. */
const greatPowerWarTurn = (game: GameRecord): number | undefined =>
  game.turns.flatMap(t => t.warsDeclared).find(w => w.byId === COMPUTER_ID && w.onId === HUMAN_ID)?.turn;

const greatPowerWarRow = measure(
  'FR-488',
  `Valdoria declares war on Testland by turn ${REQUIRED.greatPowerWar.byTurn}`,
  idle,
  REQUIRED.greatPowerWar.games,
  g => (greatPowerWarTurn(g) ?? Infinity) <= REQUIRED.greatPowerWar.byTurn,
  greatPowerWarTurn
);

/** Provinces Valdoria took from Testland over the game. */
const provincesTakenFromTestland = (game: GameRecord): number =>
  game.turns.flatMap(t => t.provincesTaken).filter(p => p.byId === COMPUTER_ID && p.fromId === HUMAN_ID).length;
const peaceOffersTo = (turn: TurnRecord | undefined): number =>
  (turn?.proposals ?? []).filter(p => p.toId === HUMAN_ID && p.fromId === COMPUTER_ID && p.kind === 'peace').length;
/** True when no province was taken from Testland, or a peace offer reached it in the turn of the first take or the next one. */
function peaceOfferedWithin(game: GameRecord, turns: number): boolean {
  const taken = game.turns.find(t => t.provincesTaken.some(p => p.byId === COMPUTER_ID && p.fromId === HUMAN_ID));
  if (!taken) return true;
  return turnsIn(game, taken.turn, taken.turn + turns).some(t => peaceOffersTo(t) > 0);
}
const capitalKeptToTurn = (game: GameRecord, untilTurn: number): boolean =>
  game.turns.length >= untilTurn && game.turns.every(t => t.capitalHeld[HUMAN_ID]);

const capitalRow = measure(
  'FR-489 (capital)',
  `Testland keeps its capital province to turn ${REQUIRED.oneProvince.untilTurn}`,
  idle,
  REQUIRED.oneProvince.games,
  g => capitalKeptToTurn(g, REQUIRED.oneProvince.untilTurn),
  g => g.turns.filter(t => t.capitalHeld[HUMAN_ID]).length
);
const lostRow = measure(
  'FR-489 (loses)',
  `Testland loses at most ${REQUIRED.oneProvince.maxLost} province to Valdoria`,
  idle,
  REQUIRED.oneProvince.games,
  g => provincesTakenFromTestland(g) <= REQUIRED.oneProvince.maxLost,
  provincesTakenFromTestland
);
const peaceRow = measure(
  'FR-489 (peace)',
  `where Valdoria took a province, a peace offer reaches Testland within ${REQUIRED.oneProvince.peaceWithinTurns} turn`,
  idle,
  REQUIRED.oneProvince.games,
  g => peaceOfferedWithin(g, REQUIRED.oneProvince.peaceWithinTurns),
  g => g.turns.filter(t => peaceOffersTo(t) > 0).length
);
const exercisedRow = measure(
  'FR-489 (guard, not a table row)',
  'Valdoria takes a province from Testland, so the three checks above are not true for want of a war',
  idle,
  FR_489_EXERCISED.games,
  g => provincesTakenFromTestland(g) >= 1,
  provincesTakenFromTestland
);

const otherMinorVotes = (game: GameRecord, meeting: number = REQUIRED.votes.atMeeting): number | undefined =>
  atTurn(game, meeting)?.council?.nominees.find(n => n.nationId === COMPUTER_ID)?.otherMinorNations;

// FR-501 makes the final ballot compulsory. FR-542 still requires the votes earned at 50 points under ordinary rules.
const earnedAt40 = (game: GameRecord) => atTurn(game, REQUIRED.votesAt40.atMeeting)?.council?.earnedMinorVotes[COMPUTER_ID];

// Replaced by FR-542 (card Q139): measured and printed in the table, no longer asserted (see REQUIRED.votes).
measure(
  'FR-490 (replaced by FR-542)',
  `Valdoria gets at least ${REQUIRED.votes.atLeast} Other Minor Nations vote at the turn-${REQUIRED.votes.atMeeting} meeting`,
  idle,
  REQUIRED.votes.games,
  g => (otherMinorVotes(g) ?? 0) >= REQUIRED.votes.atLeast,
  otherMinorVotes
);

/** FR-542 (i): the turn by which Valdoria had both an embassy and a pact with the same minor, if ever (the pact's turn). */
function embassyAndPactTurn(game: GameRecord): number | undefined {
  // The continent starts with every minor free. Diplomacy resolves before that turn's conquests.
  const freeMinors = new Set(game.final.minorNations.map(m => m.id));
  const embassies = new Set<string>();
  for (const turn of game.turns) {
    for (const order of turn.overtures) {
      if (order.byId !== COMPUTER_ID || !freeMinors.has(order.toId)) continue;
      if (order.overture === 'embassy') embassies.add(order.toId);
      else if (embassies.has(order.toId)) return turn.turn;
    }
    for (const colony of turn.minorsColonised) freeMinors.delete(colony.minorId);
  }
}

const overturesRow = measure(
  'FR-542 (i)',
  `Valdoria has made an embassy and a pact with one minor by turn ${REQUIRED.overtures.byTurn}, before the turn-30 meeting`,
  idle,
  REQUIRED.overtures.games,
  g => (embassyAndPactTurn(g) ?? Infinity) <= REQUIRED.overtures.byTurn,
  embassyAndPactTurn
);
const votesAt40Row = measure(
  'FR-542 (ii)',
  `Valdoria earns at least ${REQUIRED.votesAt40.atLeast} voluntary Other Minor Nations vote at the turn-${REQUIRED.votesAt40.atMeeting} meeting`,
  idle,
  REQUIRED.votesAt40.games,
  g => (earnedAt40(g) ?? 0) >= REQUIRED.votesAt40.atLeast,
  earnedAt40
);

// ---- FR-493: the trader game -------------------------------------------------------------------------------------------------

const tradedRow = measure(
  'FR-493',
  `at least ${REQUIRED.traded.atLeast} units are traded between the Great Powers in 40 turns`,
  trader,
  REQUIRED.traded.games,
  g => unitsTradedBetweenGreatPowers(g) >= REQUIRED.traded.atLeast,
  unitsTradedBetweenGreatPowers
);

// ---- M13 review fix round: FR-538 (idle) and FR-539 (idle, trader) -----------------------------------------------------------

/**
 * FR-538: true when Valdoria never declared war on Testland, or Testland saw the border warning on a turn before the war was
 * recorded (record t < the turn T it was declared: the state after t, seen on turn t + 1 <= T, is still at peace).
 */
function warnedBeforeWar(game: GameRecord): boolean {
  const war = greatPowerWarTurn(game);
  if (war === undefined) return true;
  return game.turns.some(t => t.turn < war && t.borderWarning[HUMAN_ID]);
}
/** FR-538: true when Testland lost no province to Valdoria, or saw the warning on a turn before the record of the first loss. */
function warnedBeforeLoss(game: GameRecord): boolean {
  const lost = game.turns.find(t => t.provincesTaken.some(p => p.byId === COMPUTER_ID && p.fromId === HUMAN_ID))?.turn;
  if (lost === undefined) return true;
  return game.turns.some(t => t.turn < lost && t.borderWarning[HUMAN_ID]);
}
/** The first turn Testland saw the warning (the record's turn + 1), if ever. */
const firstWarningSeen = (game: GameRecord): number | undefined => {
  const t = game.turns.find(r => r.borderWarning[HUMAN_ID]);
  return t ? t.turn + 1 : undefined;
};

const warningBeforeWarRow = measure(
  'FR-538 (war)',
  "Testland sees the border warning at peace before Valdoria's war on it is recorded (or no war)",
  idle,
  REQUIRED.warningBeforeWar.games,
  warnedBeforeWar,
  firstWarningSeen
);
const warningBeforeLossRow = measure(
  'FR-538 (loss)',
  'Testland sees the border warning before it loses its first province (or no loss)',
  idle,
  REQUIRED.warningBeforeLoss.games,
  warnedBeforeLoss,
  firstWarningSeen
);

/** FR-539: the turns from..to on which the Board's steel row says Valdoria bid for steel last turn (record t-1's public orders). */
const steelBidTurns = (game: GameRecord, from: number, to: number): number =>
  turnsIn(game, from - 1, to - 1).filter(t => (t.lastOrders[COMPUTER_ID]?.buy.steel ?? 0) > 0).length;
const lumberBidTurns = (game: GameRecord, from: number, to: number): number =>
  turnsIn(game, from - 1, to - 1).filter(t => (t.lastOrders[COMPUTER_ID]?.buy.lumber ?? 0) > 0).length;
/** FR-539: the steel units Testland sold Valdoria over the game. */
const steelSoldToValdoria = (game: GameRecord): number =>
  game.turns.flatMap(t => t.greatPowerSales).filter(s => s.sellerId === HUMAN_ID && s.buyerId === COMPUTER_ID && s.commodity === 'steel').reduce((n, s) => n + s.amount, 0);

const steelBidRow = measure(
  'FR-539 (Board)',
  `the steel row says Valdoria bid for steel last turn on at least ${REQUIRED.steelBidShown.turns} of turns ${REQUIRED.steelBidShown.fromTurn} to ${REQUIRED.steelBidShown.toTurn}`,
  idle,
  REQUIRED.steelBidShown.games,
  g => steelBidTurns(g, REQUIRED.steelBidShown.fromTurn, REQUIRED.steelBidShown.toTurn) >= REQUIRED.steelBidShown.turns,
  g => steelBidTurns(g, REQUIRED.steelBidShown.fromTurn, REQUIRED.steelBidShown.toTurn)
);
const steelSoldRow = measure(
  'FR-539 (sold)',
  `Testland sells Valdoria at least ${REQUIRED.steelSold.atLeast} steel`,
  trader,
  REQUIRED.steelSold.games,
  g => steelSoldToValdoria(g) >= REQUIRED.steelSold.atLeast,
  steelSoldToValdoria
);

// ---- M13 final round: FR-541 (follower) --------------------------------------------------------------------------------------

/** FR-541: the turns on which Testland offered lumber (its public orders of the turn, `lastOrders` on the record). */
const lumberOffers = (game: GameRecord): number => game.turns.filter(t => (t.lastOrders[HUMAN_ID]?.sell.lumber ?? 0) > 0).length;
/** FR-541: the lumber units Testland sold Valdoria over the game. */
const lumberSoldToValdoria = (game: GameRecord): number =>
  game.turns.flatMap(t => t.greatPowerSales).filter(s => s.sellerId === HUMAN_ID && s.buyerId === COMPUTER_ID && s.commodity === 'lumber').reduce((n, s) => n + s.amount, 0);
/** FR-541: at least `atLeast` lumber sold, and at least `share` of the lumber offers (1 unit each) sold. */
const followerSold = (game: GameRecord): boolean =>
  lumberSoldToValdoria(game) >= REQUIRED.followerSells.atLeast && lumberSoldToValdoria(game) >= REQUIRED.followerSells.share * lumberOffers(game);

const followerRow = measure(
  'FR-541',
  `the follower sells Valdoria at least ${REQUIRED.followerSells.atLeast} lumber and at least half of its lumber offers`,
  followers,
  REQUIRED.followerSells.games,
  followerSold,
  lumberSoldToValdoria
);

// ---- FR-497: every sim game --------------------------------------------------------------------------------------------------

const allSims: Played[] = [idle, aggressor, trader, followers];
const allGames = allSims.flatMap(p => p.games);
const valdoriaRejected = allGames.flatMap(g => g.turns.flatMap(t => t.ordersRejected.filter(r => r.nationId === COMPUTER_ID).map(r => ({ seed: g.seed, human: g.human, turn: t.turn, ...r }))));
const invariantBreaks = allGames.flatMap(g => g.turns.flatMap(t => t.invariantViolations.map(v => `${g.human} seed ${g.seed} turn ${t.turn}: ${v}`)));
const noPayDisbands = idle.games.flatMap(g => g.turns.flatMap(t => t.disbands.filter(d => d.reason === 'no-pay').map(d => ({ seed: g.seed, turn: t.turn, ...d }))));
const ordersP95 = percentile(computerOrdersTimes(allGames), 95);
const ordersMax = Math.max(...computerOrdersTimes(allGames));
const gamesPlayed = allGames.length;
const turnsPlayed = allGames.reduce((n, g) => n + g.turns.length, 0);

// ---- the tests -------------------------------------------------------------------------------------------------------------

describe('M13 acceptance (FR-500): the sim thresholds of the table, seeds 1 to 24', () => {
  afterAll(() => {
    const lines = ROWS.map(r => {
      const verdict = r.measured >= r.required ? 'meets' : 'MISSES';
      return `  ${verdict.padEnd(6)} ${r.id.padEnd(30)} ${r.human.padEnd(9)} ${String(r.measured).padStart(2)} of ${r.of}  (required ${r.required})  ${r.spread ?? ''}`;
    });
    console.log(
      [
        '',
        'M13 acceptance table (docs/specs/m13-m16.md, under FR-500)',
        `  games: idle ${idle.games.length}/${idle.seeds.length} in ${idle.seconds.toFixed(1)} s, aggressor ${aggressor.games.length}/${aggressor.seeds.length} in ${aggressor.seconds.toFixed(1)} s, trader ${trader.games.length}/${trader.seeds.length} in ${trader.seconds.toFixed(1)} s, follower ${followers.games.length}/${followers.seeds.length} in ${followers.seconds.toFixed(1)} s`,
        ...lines,
        `  FR-497 rejected orders of Valdoria ${valdoriaRejected.length} (required ${REQUIRED.fair.rejected}), invariant breaks ${invariantBreaks.length} (required ${REQUIRED.fair.invariantBreaks}), no-pay disbands in idle games ${noPayDisbands.length} (required ${REQUIRED.fair.noPayDisbands}), computerOrders p95 ${ordersP95.toFixed(1)} ms and max ${ordersMax.toFixed(1)} ms over ${turnsPlayed} turns of ${gamesPlayed} games (p95 required <= ${REQUIRED.fair.p95Ms})`,
        `  other numbers, no threshold: aggressor games: Valdoria attacks anyone in ${aggressor.games.filter(g => attacksOnAnyone(g) > 0).length} of ${aggressor.games.length}; lost provinces by turn ${REQUIRED.provincesKept.byTurn} by the province count: ${aggressor.games.map(g => provincesLostNet(g, REQUIRED.provincesKept.byTurn) ?? '-').join(',')}; Valdoria's last turn: ${aggressor.games.map(g => g.turns.length).join(',')}`,
        '',
      ].join('\n')
    );
  });

  describe('FR-484 an invaded computer fights back (aggressor, seeds 1 to 12)', () => {
    it(named(recruitsRow), () => {
      expect(aggressor.crashed, 'crashed games').toEqual([]);
      expect(recruitsRow.measured, missNote(recruitsRow, aggressor)).toBeGreaterThanOrEqual(recruitsRow.required);
    });
    it(named(attacksRow), () => {
      expect(attacksRow.measured, `${missNote(attacksRow, aggressor)}; attacks on anyone: ${aggressor.games.map(attacksOnAnyone).join(',')}`).toBeGreaterThanOrEqual(attacksRow.required);
    });
    it(named(keptRow), () => {
      expect(keptRow.measured, `${missNote(keptRow, aggressor)}; by the province count: ${aggressor.games.map(g => provincesLostNet(g, REQUIRED.provincesKept.byTurn) ?? '-').join(',')}`).toBeGreaterThanOrEqual(keptRow.required);
    });
  });

  describe('FR-485 and FR-486 the workforce is kept and the mills are staffed (idle, seeds 1 to 24)', () => {
    it(named(workersRow), () => {
      expect(idle.crashed, 'crashed games').toEqual([]);
      expect(workersRow.measured, missNote(workersRow, idle)).toBeGreaterThanOrEqual(workersRow.required);
    });
    it(named(labourRow), () => {
      expect(labourRow.measured, missNote(labourRow, idle)).toBeGreaterThanOrEqual(labourRow.required);
    });
  });

  describe('FR-487 the campaign on a minor stays steady (idle; green before M13, pinned over seeds)', () => {
    it(named(minorWarRow), () => {
      expect(minorWarRow.measured, missNote(minorWarRow, idle)).toBeGreaterThanOrEqual(minorWarRow.required);
    });
    it(named(minorHeldRow), () => {
      expect(minorHeldRow.measured, missNote(minorHeldRow, idle)).toBeGreaterThanOrEqual(minorHeldRow.required);
    });
  });

  describe('FR-488 war on the other Great Power (idle)', () => {
    it(named(greatPowerWarRow), () => {
      expect(greatPowerWarRow.measured, missNote(greatPowerWarRow, idle)).toBeGreaterThanOrEqual(greatPowerWarRow.required);
    });
  });

  describe('FR-489 one province, then peace (idle)', () => {
    it(named(exercisedRow), () => {
      expect(exercisedRow.measured, missNote(exercisedRow, idle)).toBeGreaterThanOrEqual(exercisedRow.required);
    });
    it(named(capitalRow), () => {
      expect(capitalRow.measured, missNote(capitalRow, idle)).toBeGreaterThanOrEqual(capitalRow.required);
    });
    it(named(lostRow), () => {
      expect(lostRow.measured, missNote(lostRow, idle)).toBeGreaterThanOrEqual(lostRow.required);
    });
    it(named(peaceRow), () => {
      expect(peaceRow.measured, missNote(peaceRow, idle)).toBeGreaterThanOrEqual(peaceRow.required);
    });
  });

  // FR-490's row (the turn-30 meeting) is replaced by FR-542 (M13 close round, card Q139): it measured 0 of 24 under every
  // rule set tried, since the $5,000 embassy is affordable from about turn 23 and the war on Testland then holds the
  // treasury at its upkeep reserve (.gate/m13/close/grants-notes.md). Its line stays in the table as a report.
  describe('FR-490 grants before a Council (idle): replaced by FR-542, the embassy and the pact, and the turn-40 meeting', () => {
    it(named(overturesRow), () => {
      expect(idle.crashed, 'crashed games').toEqual([]);
      expect(overturesRow.measured, missNote(overturesRow, idle)).toBeGreaterThanOrEqual(overturesRow.required);
    });
    it(named(votesAt40Row), () => {
      const at30 = idle.games.map(g => otherMinorVotes(g) ?? '-').join(',');
      expect(votesAt40Row.measured, `${missNote(votesAt40Row, idle)}; FR-490 (replaced) turn-30 votes per game: ${at30}`).toBeGreaterThanOrEqual(votesAt40Row.required);
    });
  });

  describe('FR-493 the computer trades with the other Great Power (trader, seeds 1 to 24)', () => {
    it(named(tradedRow), () => {
      expect(trader.crashed, 'crashed games').toEqual([]);
      expect(tradedRow.measured, missNote(tradedRow, trader)).toBeGreaterThanOrEqual(tradedRow.required);
    });
  });

  describe('FR-538 (M13 review ST-01) the army gathers in sight before the war on the player (idle)', () => {
    it(named(warningBeforeWarRow), () => {
      expect(warningBeforeWarRow.measured, missNote(warningBeforeWarRow, idle)).toBeGreaterThanOrEqual(warningBeforeWarRow.required);
    });
    it(named(warningBeforeLossRow), () => {
      expect(warningBeforeLossRow.measured, missNote(warningBeforeLossRow, idle)).toBeGreaterThanOrEqual(warningBeforeLossRow.required);
    });
  });

  describe('FR-539 (M13 review ST-02) the computer\'s steel bid toward the player shows in a real game', () => {
    it(named(steelBidRow), () => {
      const lumber = idle.games.map(g => lumberBidTurns(g, REQUIRED.steelBidShown.fromTurn, REQUIRED.steelBidShown.toTurn));
      expect(steelBidRow.measured, `${missNote(steelBidRow, idle)}; lumber bid turns per game: ${lumber.join(',')}`).toBeGreaterThanOrEqual(steelBidRow.required);
    });
    it(named(steelSoldRow), () => {
      expect(steelSoldRow.measured, missNote(steelSoldRow, trader)).toBeGreaterThanOrEqual(steelSoldRow.required);
    });
  });

  describe('FR-541 (M13 final round, QA) Valdoria keeps its lumber bid while the person answers it (follower, seeds 1 to 24)', () => {
    it(named(followerRow), () => {
      expect(followers.crashed, 'crashed games').toEqual([]);
      const detail = followers.games.map(g => `${lumberSoldToValdoria(g)}/${lumberOffers(g)}`).join(',');
      expect(followerRow.measured, `${missNote(followerRow, followers)}; sold/offered per game: ${detail}`).toBeGreaterThanOrEqual(followerRow.required);
    });
  });

  describe('FR-497 the computer plays fair, in every sim game', () => {
    it(`FR-497 no sim game crashes: ${gamesPlayed} of ${allSims.reduce((n, p) => n + p.seeds.length, 0)} games played (${turnsPlayed} turns)`, () => {
      expect(allSims.flatMap(p => p.crashed.map(c => `${p.human} seed ${c.seed}: ${c.message}`))).toEqual([]);
    });
    it(`FR-497 Valdoria has ${valdoriaRejected.length} order-rejected events in ${gamesPlayed} games, required ${REQUIRED.fair.rejected}`, () => {
      expect(valdoriaRejected.slice(0, 10)).toEqual([]);
      expect(valdoriaRejected.length).toBe(REQUIRED.fair.rejected);
    });
    it(`FR-497 ${invariantBreaks.length} invariant violations on any turn of ${gamesPlayed} games, required ${REQUIRED.fair.invariantBreaks}`, () => {
      expect(invariantBreaks.slice(0, 10)).toEqual([]);
      expect(invariantBreaks.length).toBe(REQUIRED.fair.invariantBreaks);
    });
    it(`FR-497 ${noPayDisbands.length} no-pay disbands in the ${idle.games.length} idle games, required ${REQUIRED.fair.noPayDisbands}`, () => {
      expect(noPayDisbands.slice(0, 10)).toEqual([]);
      expect(noPayDisbands.length).toBe(REQUIRED.fair.noPayDisbands);
    });
    it(`FR-497 computerOrders takes ${ordersP95.toFixed(1)} ms at the 95th percentile (max ${ordersMax.toFixed(1)} ms) over ${turnsPlayed} turns, required at most ${REQUIRED.fair.p95Ms}`, () => {
      expect(ordersP95).toBeLessThanOrEqual(REQUIRED.fair.p95Ms);
    });
  });
});

// ---- the scripted human: a report, no threshold (spec section 6, risk 1) -----------------------------------------------------

/** One line of the report for a game: what both nations, both scripted, did. */
function reportLine(g: GameRecord): string {
  const end = g.turns[g.turns.length - 1];
  const wars = g.turns.flatMap(t => t.warsDeclared).map(w => `${w.byId === COMPUTER_ID ? 'V' : 'T'}>${w.onId === HUMAN_ID ? 'T' : w.onId === COMPUTER_ID ? 'V' : w.onId}@${w.turn}`);
  const taken = g.turns.flatMap(t => t.provincesTaken.map(p => `${p.byId === COMPUTER_ID ? 'V' : 'T'}@${t.turn}`));
  const council = atTurn(g, 30)?.council;
  const councilText = council ? council.nominees.map(n => `${n.nationId === COMPUTER_ID ? 'V' : 'T'}${n.total}`).join('-') : '-';
  const recruited = (id: string) => g.turns.flatMap(t => t.regimentsRecruited).filter(r => r.nationId === id).reduce((s, r) => s + r.count, 0);
  const attacks = (id: string) => g.turns.flatMap(t => t.battles).filter(b => b.attackerId === id).length;
  const workers = (id: string) => healthyWorkersAt(g, g.turns.length, id) ?? '-';
  return [
    `seed ${String(g.seed).padStart(2)}`,
    `ended t${g.turns.length}${g.final.gameOver?.reason ? ` (${g.final.gameOver.reason}${g.final.gameOver.winnerId ? ` ${g.final.gameOver.winnerId === COMPUTER_ID ? 'V' : 'T'}` : ''})` : ''}`,
    `score T ${end?.score[HUMAN_ID]} V ${end?.score[COMPUTER_ID]}`,
    `prov T ${end?.provincesHeld[HUMAN_ID]} V ${end?.provincesHeld[COMPUTER_ID]}`,
    `workers T ${workers(HUMAN_ID)} V ${workers(COMPUTER_ID)}`,
    `labour T ${end?.labour[HUMAN_ID]} V ${end?.labour[COMPUTER_ID]}`,
    `first province ${taken[0] ?? 'none'} (t${firstProvinceTakenTurn(g) ?? '-'})`,
    `wars ${wars.join(' ') || 'none'}`,
    `peace ${g.turns.flatMap(t => t.peaceMade).length}`,
    `regs rec T ${recruited(HUMAN_ID)} V ${recruited(COMPUTER_ID)}`,
    `attacks T ${attacks(HUMAN_ID)} V ${attacks(COMPUTER_ID)}`,
    `grants V ${g.turns.flatMap(t => t.grants).filter(x => x.fromId === COMPUTER_ID).length}`,
    `council30 ${councilText}`,
    `traded ${unitsTradedBetweenGreatPowers(g)}`,
    `rejected V ${g.turns.flatMap(t => t.ordersRejected).filter(r => r.nationId === COMPUTER_ID).length}`,
    `breaks ${g.turns.flatMap(t => t.invariantViolations).length}`,
  ].join(' | ');
}

describe('FR-500 M13 report (no threshold): both Great Powers scripted, racing for Arvelia (spec section 6, risk 1)', () => {
  it('FR-500 the scripted report names its requirement in test results', ({ task }) => {
    const report = task.suite?.tasks.find(test => test.name.includes('scripted human, seeds 1 to 24'));
    expect(report?.name).toContain('FR-500');
  });

  it('FR-500 report: scripted human, seeds 1 to 24; the numbers are printed, nothing is asserted but that every game ran', async () => {
    const scripted = await play('scripted', SEEDS_24);
    const games = scripted.games;
    const range = (pick: (g: GameRecord) => number | undefined): string => {
      const values = games.map(game => pick(game)).filter((v): v is number => v !== undefined);
      return values.length === 0 ? '-' : `min ${Math.min(...values)}, median ${median(values)}, max ${Math.max(...values)}`;
    };
    const count = (pick: (g: GameRecord) => boolean): string => `${games.filter(pick).length} of ${games.length}`;
    const atEnd = (g: GameRecord, pick: (t: TurnRecord) => number): number | undefined => {
      const t = g.turns[g.turns.length - 1];
      return t ? pick(t) : undefined;
    };
    const summary = [
      '',
      `M13 report: scripted human vs scripted Valdoria, seeds 1 to 24, ${games.length} games played in ${scripted.seconds.toFixed(1)} s (no threshold; the numbers of spec section 6, risk 1). T = Testland (nation-1, the scripted human), V = Valdoria (nation-2).`,
      ...games.map(reportLine),
      `  summary over ${games.length} games:`,
      `  final score Testland: ${range(g => atEnd(g, t => t.score[HUMAN_ID]))}`,
      `  final score Valdoria: ${range(g => atEnd(g, t => t.score[COMPUTER_ID]))}`,
      `  healthy workers at the end Testland: ${range(g => healthyWorkersAt(g, g.turns.length, HUMAN_ID))}; Valdoria: ${range(g => healthyWorkersAt(g, g.turns.length, COMPUTER_ID))}`,
      `  labour at the end Testland: ${range(g => atEnd(g, t => t.labour[HUMAN_ID]))}; Valdoria: ${range(g => atEnd(g, t => t.labour[COMPUTER_ID]))}`,
      `  first province of a minor taken: by Valdoria in ${count(g => g.turns.flatMap(t => t.provincesTaken)[0]?.byId === COMPUTER_ID)}, by Testland in ${count(g => g.turns.flatMap(t => t.provincesTaken)[0]?.byId === HUMAN_ID)}; on turns ${range(firstProvinceTakenTurn)}`,
      `  war declared by Valdoria on Testland in ${count(g => greatPowerWarTurn(g) !== undefined)} (turns ${range(greatPowerWarTurn)}); by Testland on Valdoria in ${count(g => g.turns.flatMap(t => t.warsDeclared).some(w => w.byId === HUMAN_ID && w.onId === COMPUTER_ID))}`,
      `  a province of one Great Power taken by the other in ${count(g => g.turns.flatMap(t => t.provincesTaken).some(p => (p.byId === COMPUTER_ID && p.fromId === HUMAN_ID) || (p.byId === HUMAN_ID && p.fromId === COMPUTER_ID)))}; any peace made in ${count(g => g.turns.flatMap(t => t.peaceMade).length > 0)}; game ended early (conquest or Council) in ${count(g => g.turns.length < 40)}`,
      `  Council at turn 30: Valdoria's Other Minor Nations votes ${range(otherMinorVotes)}; units traded between the Great Powers ${range(unitsTradedBetweenGreatPowers)}`,
      `  rejected orders of Valdoria ${games.flatMap(g => g.turns.flatMap(t => t.ordersRejected)).filter(r => r.nationId === COMPUTER_ID).length}, refused orders of the scripted human ${games.flatMap(g => g.turns.flatMap(t => t.humanRefused)).length}, invariant violations ${games.flatMap(g => g.turns.flatMap(t => t.invariantViolations)).length}; computerOrders p95 ${percentile(computerOrdersTimes(games), 95).toFixed(1)} ms`,
      '',
    ];
    console.log(summary.join('\n'));
    expect(scripted.crashed.map(c => `seed ${c.seed}: ${c.message}`)).toEqual([]);
    expect(games).toHaveLength(SEEDS_24.length);
    for (const g of games) expect(g.turns.length).toBeGreaterThan(0);
  }, 180_000);
});

// ---- FR-497, not a table row: the computer's plan does not read the human's orders of this turn ------------------------------

type Planner = (state: GameState) => unknown;
/** Compare plans across the actual order boundary, including cash, stock and other immediate effects. */
const readsOrdersOf = (plan: Planner, before: GameState, after: GameState): boolean =>
  JSON.stringify(plan(before)) !== JSON.stringify(plan(after));

/** A policy that plays as `base` does and, on each turn, checks the computer's plan on the state after the human's orders. */
function checkedForPeeking(base: HumanPolicy, log: { turns: number; turnsWithOrders: number; peeked: string[] }): HumanPolicy {
  return {
    ...base,
    orders: (state, context) => {
      const orders = base.orders(state, context);
      let view = state;
      for (const order of orders) {
        const tried = tryApplyOrder(view, order);
        if (tried.result.ok) view = tried.state;
      }
      log.turns++;
      if (view !== state) {
        log.turnsWithOrders++;
        if (readsOrdersOf(computerOrders, state, view)) log.peeked.push(`${base.name} seed ${state.seed} turn ${context.turn}`);
      }
      return orders;
    },
  };
}

describe('FR-497 (probe, not a table row) the computer reads no order the other nation gave this turn', () => {
  it('FR-497 the probe detects a planner reading cash reserved by a real private bid', () => {
    const before = setTreasury(newGame({ seed: 1, world: 'continent' }), HUMAN_ID, 1000);
    const bid = tryApplyOrder(before, { kind: 'buyCommodity', nationId: HUMAN_ID, commodity: MaterialType.Steel, amount: 1 });
    expect(bid.result.ok).toBe(true);
    expect([treasury(before, HUMAN_ID), treasury(bid.state, HUMAN_ID)]).toEqual([1000, 700]);
    expect(readsOrdersOf(s => treasury(s, HUMAN_ID), before, bid.state)).toBe(true);
  });

  it("Valdoria plans the same with and without Testland's trade orders, intents, recruiting and transport of this turn in the state (scripted and aggressor humans, seeds 1 to 4)", async () => {
    const log = { turns: 0, turnsWithOrders: 0, peeked: [] as string[] };
    for (const human of ['scripted', 'aggressor'] as const) {
      for (const seed of SEEDS_24.slice(0, 4)) {
        runGame({ seed, human: checkedForPeeking(HUMANS[human], log), checkInvariants: false });
        await yieldToRunner();
      }
    }
    console.log(`FR-497 probe: ${log.turns} turns checked, ${log.turnsWithOrders} with orders of Testland in the state, ${log.peeked.length} turns where Valdoria's plan changed without them`);
    expect(log.turnsWithOrders).toBeGreaterThan(0);
    expect(log.peeked).toEqual([]);
  }, 180_000);

  it('the probe sees a planner that reads one of the human\'s orders (trade, intent, recruiting) and does not flag the real computer', () => {
    const base = newGame({ seed: 1, world: 'continent' });
    const withOrders: GameState = {
      ...base,
      intents: [{ id: 'intent-1-1', kind: 'war', nationId: HUMAN_ID, turn: 1, targetId: COMPUTER_ID }],
      market: { ...base.market!, orders: { ...base.market!.orders, [HUMAN_ID]: { sell: { steel: 1 }, buy: { lumber: 2 } } } },
      nations: base.nations.map(n => (n.id === HUMAN_ID ? { ...n, recruiting: { regulars: 1 } } : n)),
    };
    expect(readsOrdersOf(s => s.market?.orders[HUMAN_ID], base, withOrders)).toBe(true);
    expect(readsOrdersOf(s => s.intents.length, base, withOrders)).toBe(true);
    expect(readsOrdersOf(s => s.nations.find(n => n.id === HUMAN_ID)?.recruiting, base, withOrders)).toBe(true);
    expect(readsOrdersOf(s => s.turn, base, withOrders)).toBe(false);
    expect(readsOrdersOf(computerOrders, base, withOrders)).toBe(false);
  });
});

// ---- the measures read a crafted record the way the rows say -----------------------------------------------------------------

describe('M13 acceptance: the measures of this file read a crafted record as the rows say (a row cannot turn green or stay red from a wrong read)', () => {
  const start = newGame({ seed: 1, world: 'continent' });
  const valdoriaProvinces = start.provinces.filter(p => p.ownerId === COMPUTER_ID).map(p => p.id);
  const both = <T,>(a: T, b: T): Record<string, T> => ({ [HUMAN_ID]: a, [COMPUTER_ID]: b });
  const turn = (n: number, over: Partial<TurnRecord> = {}): TurnRecord => ({
    turn: n,
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
    provincesHeld: both(4, 4),
    capitalHeld: both(true, true),
    regiments: both(0, 0),
    workers: both({ untrained: 0, trained: 0, expert: 7 }, { untrained: 0, trained: 0, expert: 7 }),
    labour: both(28, 28),
    capacity: both(0, 0),
    treasury: both(0, 0),
    score: both(0, 0),
    holds: both({ used: 0, total: 0 }, { used: 0, total: 0 }),
    votes: {},
    council: null,
    unitsTradedBetweenGreatPowers: 0,
    greatPowerSales: [],
    lastOrders: both({ sell: {}, buy: {} }, { sell: {}, buy: {} }),
    borderWarning: both(false, false),
    ordersRejected: [],
    humanRefused: [],
    humanOrders: 0,
    invariantViolations: [],
    computerOrdersMs: 0,
    ...over,
  });
  const game = (turns: TurnRecord[]): GameRecord => ({ seed: 1, human: 'idle', turns, startProvinces: both(4, 4), final: start, seconds: 0 });
  /** `n` blank turns, with the given fields set on the turns named. */
  const upTo = (n: number, over: Record<number, Partial<TurnRecord>> = {}): TurnRecord[] => Array.from({ length: n }, (_, i) => turn(i + 1, over[i + 1]));
  const taken = (byId: string, provinceId: string, fromId: string) => ({ byId, provinceId, fromId });
  const battle = (attackerId: string, defenderId: string): TurnRecord['battles'][number] => ({
    attackerId,
    attackerIds: [attackerId],
    defenderId,
    provinceId: 'p',
    result: {} as TurnRecord['battles'][number]['result'],
    provinceTaken: false,
  });

  it("FR-484 (i) counts Valdoria's recruited regiments in turns 6 to 15 only, by the event's count, and not Testland's", () => {
    const g = game(
      upTo(20, {
        5: { regimentsRecruited: [{ nationId: COMPUTER_ID, regiment: 'regulars', count: 3 }] },
        6: { regimentsRecruited: [{ nationId: COMPUTER_ID, regiment: 'regulars', count: 1 }] },
        7: { regimentsRecruited: [{ nationId: HUMAN_ID, regiment: 'regulars', count: 5 }] },
        15: { regimentsRecruited: [{ nationId: COMPUTER_ID, regiment: 'cuirassiers', count: 1 }] },
        16: { regimentsRecruited: [{ nationId: COMPUTER_ID, regiment: 'cuirassiers', count: 4 }] },
      })
    );
    expect(recruitedBetween(g, REQUIRED.recruits.fromTurn, REQUIRED.recruits.toTurn)).toBe(2);
  });

  it("FR-484 (ii) counts Valdoria's battles as the attacker against Testland, not its defences and not its attacks on others", () => {
    const g = game(
      upTo(10, {
        3: { battles: [battle(COMPUTER_ID, HUMAN_ID)] },
        4: { battles: [battle(HUMAN_ID, COMPUTER_ID)] },
        5: { battles: [battle(COMPUTER_ID, 'minor-1')] },
      })
    );
    expect(attacksOnTestland(g)).toBe(1);
    expect(attacksOnAnyone(g)).toBe(2);
  });

  it('FR-484 (iii) counts the provinces Valdoria started with and does not hold at the end of the turn: a retaken one is not lost, a province taken elsewhere does not offset, later turns do not count', () => {
    const [a, b, c] = valdoriaProvinces;
    const g = game(
      upTo(15, {
        8: { provincesTaken: [taken(HUMAN_ID, a, COMPUTER_ID)] },
        9: { provincesTaken: [taken(HUMAN_ID, b, COMPUTER_ID), taken(COMPUTER_ID, 'province-minor-1', 'minor-1')] },
        11: { provincesTaken: [taken(HUMAN_ID, c, COMPUTER_ID)] },
        13: { provincesTaken: [taken(COMPUTER_ID, a, HUMAN_ID)] },
      })
    );
    expect(provincesLostBy(g, 5)).toBe(0);
    expect(provincesLostBy(g, 8)).toBe(1);
    expect(provincesLostBy(g, 10)).toBe(2);
    expect(provincesLostBy(g, 12)).toBe(3);
    expect(provincesLostBy(g, 13)).toBe(2);
  });

  it('FR-485 and FR-486 read the healthy workers (all grades) and the labour after turn 40', () => {
    const g = game(upTo(40, { 40: { workers: both({ untrained: 0, trained: 0, expert: 7 }, { untrained: 1, trained: 2, expert: 4 }), labour: both(28, 24) } }));
    expect(healthyWorkersAt(g, REQUIRED.workers.atTurn, COMPUTER_ID)).toBe(7);
    expect(atTurn(g, REQUIRED.labour.atTurn)?.labour[COMPUTER_ID]).toBe(24);
    expect(healthyWorkersAt(game(upTo(39)), REQUIRED.workers.atTurn, COMPUTER_ID)).toBeUndefined();
  });

  it("FR-487 and FR-488 tell a war on a minor from a war on Testland, by the turn declared, and read the turn the minor's capital province was taken", () => {
    const g = game(
      upTo(40, {
        16: { warsDeclared: [{ byId: COMPUTER_ID, onId: 'minor-1', turn: 16 }] },
        17: { minorsColonised: [{ nationId: COMPUTER_ID, minorId: 'minor-1' }] },
        28: { warsDeclared: [{ byId: COMPUTER_ID, onId: HUMAN_ID, turn: 28 }] },
        29: { warsDeclared: [{ byId: HUMAN_ID, onId: COMPUTER_ID, turn: 29 }] },
      })
    );
    expect(minorWarTurn(g)).toBe(16);
    expect(minorHeldTurn(g)).toBe(17);
    expect(greatPowerWarTurn(g)).toBe(28);
    expect(minorWarTurn(game(upTo(40, { 16: { warsDeclared: [{ byId: HUMAN_ID, onId: 'minor-1', turn: 16 }] } })))).toBeUndefined();
    expect(minorHeldTurn(game(upTo(40, { 17: { minorsColonised: [{ nationId: HUMAN_ID, minorId: 'minor-1' }] } })))).toBeUndefined();
    expect(greatPowerWarTurn(game(upTo(40)))).toBeUndefined();
    // a war on Testland first, then one on a minor: each read finds its own
    const other = game(upTo(40, { 20: { warsDeclared: [{ byId: COMPUTER_ID, onId: HUMAN_ID, turn: 20 }] }, 28: { warsDeclared: [{ byId: COMPUTER_ID, onId: 'minor-2', turn: 28 }] } }));
    expect(greatPowerWarTurn(other)).toBe(20);
    expect(minorWarTurn(other)).toBe(28);
  });

  it('FR-489 asks for a peace offer from Valdoria to Testland in the turn of the first province taken from Testland or the next, and for nothing when none was taken', () => {
    const peaceOffer = (toId: string, fromId: string, kind = 'peace'): Partial<TurnRecord> => ({ proposals: [{ toId, fromId, kind }] });
    const takenOn25: Partial<TurnRecord> = { provincesTaken: [taken(COMPUTER_ID, 'province-test', HUMAN_ID)] };
    /** Valdoria took a province from Testland on turn 25, and `offer` reaches Testland on `offerTurn` (none when undefined). */
    const withOffer = (offerTurn: number | undefined, offer: Partial<TurnRecord> = peaceOffer(HUMAN_ID, COMPUTER_ID)): GameRecord =>
      game(upTo(40, { 25: offerTurn === 25 ? { ...takenOn25, ...offer } : takenOn25, ...(offerTurn !== undefined && offerTurn !== 25 ? { [offerTurn]: offer } : {}) }));
    expect(peaceOfferedWithin(withOffer(25), 1)).toBe(true);
    expect(peaceOfferedWithin(withOffer(26), 1)).toBe(true);
    expect(peaceOfferedWithin(withOffer(27), 1)).toBe(false);
    expect(peaceOfferedWithin(withOffer(24), 1)).toBe(false);
    expect(peaceOfferedWithin(withOffer(undefined), 1)).toBe(false);
    expect(peaceOfferedWithin(withOffer(26, peaceOffer(HUMAN_ID, COMPUTER_ID, 'alliance')), 1)).toBe(false);
    expect(peaceOfferedWithin(withOffer(26, peaceOffer(COMPUTER_ID, HUMAN_ID)), 1)).toBe(false);
    expect(peaceOfferedWithin(game(upTo(40)), 1)).toBe(true);
    expect(provincesTakenFromTestland(withOffer(26))).toBe(1);
    // a province taken from a minor, or by Testland, is not a province Testland lost to Valdoria
    expect(provincesTakenFromTestland(game(upTo(40, { 25: { provincesTaken: [taken(COMPUTER_ID, 'p', 'minor-1'), taken(HUMAN_ID, 'q', COMPUTER_ID)] } })))).toBe(0);
  });

  it('FR-489 keeps the capital only when every turn of 40 holds it', () => {
    expect(capitalKeptToTurn(game(upTo(40)), 40)).toBe(true);
    expect(capitalKeptToTurn(game(upTo(40, { 31: { capitalHeld: both(false, true) } })), 40)).toBe(false);
    expect(capitalKeptToTurn(game(upTo(39)), 40)).toBe(false);
  });

  it("FR-490 reads Valdoria's Other Minor Nations votes from the meeting of turn 30", () => {
    const meeting = (valdoria: number, earned = valdoria): TurnRecord['council'] => ({
      totalVotes: 12,
      needed: 7, // FR-503: the two-power continent changed from nine to seven.
      earnedMinorVotes: both(0, earned),
      nominees: [
        { nationId: COMPUTER_ID, standing: 0, controlled: 4, colonies: 1, otherGreatPowers: 0, otherMinorNations: valdoria, total: 5 + valdoria },
        { nationId: HUMAN_ID, standing: 0, controlled: 4, colonies: 0, otherGreatPowers: 0, otherMinorNations: 7, total: 11 },
      ],
    });
    expect(otherMinorVotes(game(upTo(40, { 30: { council: meeting(2) } })))).toBe(2);
    expect(otherMinorVotes(game(upTo(40, { 29: { council: meeting(2) } })))).toBeUndefined();
    expect(otherMinorVotes(game(upTo(40, { 30: { council: meeting(0) } })))).toBe(0);
    // FR-542 (ii): two forced votes alone cannot meet the historical influence target.
    const last = (earned: number) => game(upTo(40, { 30: { council: meeting(0) }, 40: { council: meeting(2, earned) } }));
    expect(otherMinorVotes(last(0), 40)).toBe(2);
    expect(earnedAt40(last(0))).toBe(0);
    expect(earnedAt40(last(1))).toBe(1);
    expect(earnedAt40(game(upTo(39, { 30: { council: meeting(2) } })))).toBeUndefined();
  });

  it("FR-542 (i) reads the turn of Valdoria's pact with a minor it made an embassy in, at or before it; Testland's and a pact elsewhere do not count", () => {
    const made = (byId: string, toId: string, overture: 'embassy' | 'pact'): Partial<TurnRecord> => ({ overtures: [{ byId, toId, overture }] });
    expect(embassyAndPactTurn(game(upTo(40, { 23: made(COMPUTER_ID, 'minor-2', 'embassy'), 24: made(COMPUTER_ID, 'minor-2', 'pact') })))).toBe(24);
    expect(embassyAndPactTurn(game(upTo(40, { 25: made(COMPUTER_ID, 'minor-2', 'embassy'), 30: made(COMPUTER_ID, 'minor-2', 'pact') })))).toBe(30);
    expect(embassyAndPactTurn(game(upTo(40, { 23: made(COMPUTER_ID, 'minor-2', 'embassy') })))).toBeUndefined();
    expect(embassyAndPactTurn(game(upTo(40, { 23: made(HUMAN_ID, 'minor-2', 'embassy'), 24: made(HUMAN_ID, 'minor-2', 'pact') })))).toBeUndefined();
    expect(embassyAndPactTurn(game(upTo(40, { 23: made(COMPUTER_ID, 'minor-2', 'embassy'), 24: made(COMPUTER_ID, 'minor-3', 'pact') })))).toBeUndefined();
    expect(embassyAndPactTurn(game(upTo(40, { 23: made(COMPUTER_ID, HUMAN_ID, 'embassy'), 24: made(COMPUTER_ID, HUMAN_ID, 'pact') })))).toBeUndefined();
    const colonised = { minorsColonised: [{ nationId: HUMAN_ID, minorId: 'minor-2' }] };
    expect(embassyAndPactTurn(game(upTo(40, { 22: made(COMPUTER_ID, 'minor-2', 'embassy'), 23: colonised, 24: made(COMPUTER_ID, 'minor-2', 'pact') })))).toBeUndefined();
    expect(embassyAndPactTurn(game(upTo(40, { 22: made(COMPUTER_ID, 'minor-2', 'embassy'), 23: made(COMPUTER_ID, 'minor-2', 'pact'), 24: colonised })))).toBe(23);
  });

  it("FR-493 sums the units the Great Powers traded over the game, and p95 follows the audit's rule", () => {
    expect(unitsTradedBetweenGreatPowers(game(upTo(40, { 3: { unitsTradedBetweenGreatPowers: 2 }, 20: { unitsTradedBetweenGreatPowers: 3 } })))).toBe(5);
    expect(percentile(Array.from({ length: 100 }, (_, i) => i + 1), 95)).toBe(96);
  });

  it("FR-538 reads Testland's warning on a record before the war's (at peace) and before the first loss's; Valdoria's warning does not count", () => {
    const war = { warsDeclared: [{ byId: COMPUTER_ID, onId: HUMAN_ID, turn: 21 }] };
    const loss = { provincesTaken: [taken(COMPUTER_ID, 'province-nation-1-ne', HUMAN_ID)] };
    const warned = (over: Partial<TurnRecord>) => ({ borderWarning: { [HUMAN_ID]: true, [COMPUTER_ID]: false }, ...over });
    expect(warnedBeforeWar(game(upTo(30, { 20: warned({}), 21: war, 22: loss })))).toBe(true);
    // the warning first seen with the war record (record 21) is not before it; Valdoria's own warning is not Testland's
    expect(warnedBeforeWar(game(upTo(30, { 21: warned(war), 22: loss })))).toBe(false);
    expect(warnedBeforeWar(game(upTo(30, { 20: { borderWarning: { [HUMAN_ID]: false, [COMPUTER_ID]: true } }, 21: war })))).toBe(false);
    expect(warnedBeforeWar(game(upTo(30)))).toBe(true);
    expect(warnedBeforeLoss(game(upTo(30, { 21: warned(war), 22: loss })))).toBe(true);
    expect(warnedBeforeLoss(game(upTo(30, { 21: war, 22: warned(loss) })))).toBe(false);
    expect(firstWarningSeen(game(upTo(30, { 20: warned({}) })))).toBe(21);
  });

  it("FR-539 counts the turns from..to whose Board shows Valdoria's steel bid (the public orders of the turn before), and the steel Testland sold Valdoria", () => {
    const steel = (n: number) => ({ lastOrders: { [HUMAN_ID]: { sell: {}, buy: {} }, [COMPUTER_ID]: { sell: {}, buy: { steel: n } } } });
    // records 2 and 20 are seen on turns 3 and 21: only the first is in turns 3 to 20; Testland's own bid does not count
    const g = game(upTo(30, { 1: steel(1), 2: steel(2), 20: steel(1), 5: { lastOrders: { [HUMAN_ID]: { sell: {}, buy: { steel: 1 } }, [COMPUTER_ID]: { sell: {}, buy: {} } } } }));
    expect(steelBidTurns(g, 3, 20)).toBe(1);
    const sale = (sellerId: string, buyerId: string, commodity: string, amount: number) => ({ greatPowerSales: [{ sellerId, buyerId, commodity, amount }] });
    expect(steelSoldToValdoria(game(upTo(10, { 3: sale(HUMAN_ID, COMPUTER_ID, 'steel', 1), 4: sale(COMPUTER_ID, HUMAN_ID, 'steel', 2), 5: sale(HUMAN_ID, COMPUTER_ID, 'lumber', 1) })))).toBe(1);
  });

  it("FR-541 counts Testland's lumber offers by turn and the lumber it sold Valdoria; met at 1 sold and half the offers sold", () => {
    const offer = (n: number) => ({ lastOrders: { [HUMAN_ID]: { sell: { lumber: n }, buy: {} }, [COMPUTER_ID]: { sell: {}, buy: {} } } });
    const sold = (sellerId: string, commodity: string, amount: number) => ({
      ...offer(1),
      greatPowerSales: [{ sellerId, buyerId: sellerId === HUMAN_ID ? COMPUTER_ID : HUMAN_ID, commodity, amount }],
    });
    // four offers (turns 2, 4, 5, 6); two sold to Valdoria (turns 5, 6); Valdoria's sale and a steel sale do not count
    const half = game(upTo(10, { 2: offer(1), 4: offer(1), 5: sold(HUMAN_ID, 'lumber', 1), 6: sold(HUMAN_ID, 'lumber', 1), 7: { greatPowerSales: [{ sellerId: COMPUTER_ID, buyerId: HUMAN_ID, commodity: 'lumber', amount: 3 }] } }));
    expect([lumberOffers(half), lumberSoldToValdoria(half), followerSold(half)]).toEqual([4, 2, true]);
    const less = game(upTo(10, { 2: offer(1), 3: offer(1), 4: offer(1), 6: sold(HUMAN_ID, 'lumber', 1), 8: sold(HUMAN_ID, 'steel', 1) }));
    expect([lumberOffers(less), lumberSoldToValdoria(less), followerSold(less)]).toEqual([5, 1, false]);
    expect(followerSold(game(upTo(10)))).toBe(false);
  });
});
