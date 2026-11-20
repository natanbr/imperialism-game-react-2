// The Council of Governors (M10, FR-290 to FR-294; NR-011): when it meets, who is nominated, how each province's
// governor votes and who wins. Pure queries on a state: no random stream, no edit. `resolveTurn` holds the meeting
// (`councilMeeting`) on the state after the clock and ends the game when it has a winner (FR-295).
import { COUNCIL } from "@/definisions/council";
import type { CountryId, NationId, ProvinceId } from "@/types/Common";
import type { CouncilBallot, CouncilNominee, CouncilRelation, CouncilRow, CouncilVote } from "@/types/Council";
import type { GameState } from "@/types/GameState";
import type { Province } from "@/types/Province";
import type { GameOver, Score } from "@/types/Score";
import type { GameEvent } from "../turn/context";
import { militaryStrength, warBetween } from "../diplomacy/queries";
import { relationOf } from "../diplomacy/relations";
import { scoreOf } from "../score/score";
import { isGameOver, turnLimitOf } from "../turn/gameOver";
import { intentOrder } from "../turn/intents";
import { provinceOf, provincesOf } from "../world/provinces";

/** FR-296: the event of a meeting: the vote, the meeting turn and its year. */
export type CouncilMetEvent = Extract<GameEvent, { type: "council-met" }>;

/** The rows of the vote screen, in its order (rules 11 section 8.1). */
export const COUNCIL_ROWS: readonly CouncilRow[] = ["controlled", "colonies", "otherGreatPowers", "otherMinorNations"];

/** FR-290: the Council meets when turn `firstTurn + k x interval` resolves, up to the turn limit, on a world with provinces. */
export function isCouncilTurn(state: GameState, turn: number): boolean {
  if (state.provinces.length === 0 || turn < COUNCIL.firstTurn || turn > turnLimitOf(state)) return false;
  return (turn - COUNCIL.firstTurn) % COUNCIL.interval === 0;
}

/** FR-290: the next meeting turn at or after `state.turn`; undefined without provinces, after the last meeting and after game over. */
export function nextCouncilTurn(state: GameState): number | undefined {
  if (state.provinces.length === 0 || isGameOver(state)) return undefined;
  const k = Math.max(0, Math.ceil((state.turn - COUNCIL.firstTurn) / COUNCIL.interval));
  const turn = COUNCIL.firstTurn + k * COUNCIL.interval;
  return turn <= turnLimitOf(state) ? turn : undefined;
}

/** FR-501: the final scheduled meeting may be earlier than the turn limit. */
export function lastCouncilTurn(state: GameState): number | undefined {
  const limit = turnLimitOf(state);
  if (state.provinces.length === 0 || limit < COUNCIL.firstTurn) return undefined;
  return COUNCIL.firstTurn + Math.floor((limit - COUNCIL.firstTurn) / COUNCIL.interval) * COUNCIL.interval;
}

export const isLastMeeting = (state: GameState, turn: number): boolean => lastCouncilTurn(state) === turn;

/** FR-294/503: a strict majority with two powers; more than two thirds with three or more. */
export function votesNeeded(totalVotes: number, greatPowerCount: number): number {
  const share = greatPowerCount < 3 ? COUNCIL.twoPowerVoteShare : COUNCIL.standardVoteShare;
  return Math.floor(totalVotes * share.numerator / share.denominator) + 1;
}

function standingWith(state: GameState, score: Score) {
  const provinces = provincesOf(state, score.nationId).length;
  const military = militaryStrength(state, score.nationId);
  // Strength is a sum of hundredths: without the margin 10 x 36.7 could floor to 366.
  const militaryPoints = Math.floor(COUNCIL.militaryWeight * military + 1e-9);
  return { score, provinces, military, standing: score.total + COUNCIL.provinceWeight * provinces + militaryPoints };
}

/** FR-291 (Q54): score (FR-067) + 100 x the provinces held + floor(10 x military strength (FR-174)). */
export function councilStanding(state: GameState, nationId: NationId): number {
  return standingWith(state, scoreOf(state, nationId)).standing;
}

/** FR-504: use the scores recorded at game end, including those from an older save. */
export function finalStandings(state: GameState, over: GameOver) {
  const rows = over.scores.map(score => standingWith(state, score));
  // A points finish, including in a version-1 save, already records its ranking in scores.
  if (over.winnerId === undefined) return rows;
  return rows.sort((a, b) =>
    Number(b.score.nationId === over.winnerId) - Number(a.score.nationId === over.winnerId) || b.standing - a.standing
  );
}

/**
 * FR-291, FR-309: the Great Powers holding a province, by standing, highest first, at most two. Ties go in
 * `intentOrder(state, state.turn)` (FR-152), so the nominees never depend on the order of `state.nations`.
 */
export function councilNominees(state: GameState): NationId[] {
  return intentOrder(state, state.turn)
    .filter((id) => provincesOf(state, id).length > 0)
    .map((id) => ({ id, standing: councilStanding(state, id) }))
    .sort((a, b) => b.standing - a.standing)
    .slice(0, 2)
    .map((n) => n.id);
}

/** The capital provinces of the colonised minors: they vote as Colonies for the nominee holding them (FR-292). */
function colonyProvinceIds(state: GameState): Set<ProvinceId> {
  const ids = new Set<ProvinceId>();
  for (const minor of state.minorNations) {
    if (minor.colonyOf === undefined) continue;
    const province = provinceOf(state, minor.capitalTileId);
    if (province) ids.add(province.id);
  }
  return ids;
}

/** FR-293, FR-310: each nominee's relation points with the minor and whether they are at war (a recorded war, begun or not). */
const minorRelations = (state: GameState, minorId: CountryId, nominees: readonly NationId[]): CouncilRelation[] =>
  nominees.map((nationId) => ({
    nationId,
    points: relationOf(state, nationId, minorId)?.points ?? 0,
    atWar: warBetween(state, nationId, minorId) !== undefined,
  }));

/**
 * Nominee order already resolves exact ties by standing and intent order (FR-309).
 */
function minorChoice(relations: readonly CouncilRelation[], final: boolean): NationId | undefined {
  const eligible = relations.filter((r) => !r.atWar && (final || r.points >= COUNCIL.minRelationPoints));
  if (eligible.length === 0) return undefined;
  const best = Math.max(...eligible.map((r) => r.points));
  const top = eligible.filter((r) => r.points === best);
  return final || top.length === 1 ? top[0].nationId : undefined;
}

/** FR-292: the province's one vote, and the row it counts in; an abstention says why (FR-310). */
function ballotOf(state: GameState, province: Province, nominees: readonly NationId[], colonies: ReadonlySet<ProvinceId>, final: boolean): CouncilBallot {
  const provinceId = province.id;
  const ownerId = province.ownerId;
  if (nominees.includes(ownerId)) return { provinceId, forId: ownerId, row: colonies.has(provinceId) ? "colonies" : "controlled" };
  if (state.nations.some((n) => n.id === ownerId)) {
    // Imp1 Let's Play [01:W20]: the provinces of the other Great Powers went to the militarily strongest nominee
    const [first, second] = nominees.map((id) => militaryStrength(state, id));
    if (first === second) return { provinceId, abstention: { reason: "equal-strength", ownerId } };
    return { provinceId, forId: first > second ? nominees[0] : nominees[1], row: "otherGreatPowers" };
  }
  const minor = state.minorNations.find((m) => m.id === ownerId);
  if (!minor) return { provinceId };
  // A colonised minor owns no province once its capital fell (FR-224); a hand-built one that still does abstains
  if (minor.colonyOf !== undefined) return { provinceId, abstention: { reason: "colony", ownerId } };
  const relations = minorRelations(state, ownerId, nominees);
  const forId = minorChoice(relations, final);
  return forId ? { provinceId, forId, row: "otherMinorNations" } : { provinceId, abstention: { reason: "relations", nominees: relations } };
}

/**
 * FR-292 to FR-294: the vote the Council would give on this state: one ballot per province in state order, the two
 * nominees' columns, the votes needed and the winner if any; undefined when fewer than two Great Powers hold a province
 * (no meeting is held). Pure: it changes nothing and draws nothing, so the screens may ask it at any time (FR-301).
 */
export function councilVote(state: GameState, meetingTurn = state.gameOver?.turn ?? nextCouncilTurn(state)): CouncilVote | undefined {
  const ids = councilNominees(state);
  if (ids.length < 2) return undefined;
  const colonies = colonyProvinceIds(state);
  const final = meetingTurn !== undefined && isLastMeeting(state, meetingTurn);
  const ballots = state.provinces.map((p) => ballotOf(state, p, ids, colonies, final));
  const totalVotes = ballots.length;
  const needed = votesNeeded(totalVotes, state.nations.length);
  const column = (nationId: NationId): CouncilNominee => {
    const count = (row: CouncilRow) => ballots.filter((b) => b.forId === nationId && b.row === row).length;
    const [controlled, colonial, otherGreatPowers, otherMinorNations] = COUNCIL_ROWS.map(count);
    return {
      nationId,
      standing: councilStanding(state, nationId),
      controlled,
      colonies: colonial,
      otherGreatPowers,
      otherMinorNations,
      total: controlled + colonial + otherGreatPowers + otherMinorNations,
    };
  };
  const nominees: [CouncilNominee, CouncilNominee] = [column(ids[0]), column(ids[1])];
  const vote = { totalVotes, needed, nominees, ballots };
  const winner = nominees.find((n) => n.total >= needed);
  if (winner) return { ...vote, winnerId: winner.nationId, decidedBy: "threshold" };
  if (!final) return vote;
  const [first, second] = nominees;
  if (first.total === second.total) return { ...vote, winnerId: first.nationId, decidedBy: "standing" };
  return { ...vote, winnerId: first.total > second.total ? first.nationId : second.nationId, decidedBy: "more-votes" };
}

/** FR-290: the vote of the meeting held when turn `turn` resolves, counted on `state` (the state after its clock); undefined when none is held. */
export const councilMeeting = (state: GameState, turn: number): CouncilVote | undefined =>
  isCouncilTurn(state, turn) ? councilVote(state, turn) : undefined;

/** FR-298: the provinces behind one number of the vote screen (a nominee's row), in state order. */
export const councilCell = (vote: Pick<CouncilVote, "ballots">, nationId: NationId, row: CouncilRow): ProvinceId[] =>
  vote.ballots.filter((b) => b.forId === nationId && b.row === row).map((b) => b.provinceId);

/** FR-298: the provinces whose governor abstained, in state order. */
export const abstainedProvinces = (vote: Pick<CouncilVote, "ballots">): ProvinceId[] =>
  vote.ballots.filter((b) => b.forId === undefined).map((b) => b.provinceId);
