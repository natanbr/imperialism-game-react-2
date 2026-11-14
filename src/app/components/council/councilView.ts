// What the Council screen shows (FR-298), read from one `council-met` event: the screen is a report of that meeting, so
// a later change of the game changes none of its numbers nor its reasons (FR-311). The game is asked only for names,
// colours, whether another meeting follows (its turn limit) and whether the world has a third Great Power (FR-312).
import {
  abstainedProvinces,
  COUNCIL,
  COUNCIL_ROWS,
  councilCell,
  isCouncilTurn,
  type CouncilAbstention,
  type CouncilMetEvent,
  type CouncilRow,
} from "@/engine";
import type { GameState } from "@/types/GameState";
import { dateText, playerFirst } from "../gameText";

/** The table's rows in the vote screen's order (rules 11 section 8.1), then the total. */
export type CouncilTableRow = CouncilRow | "total";

export const COUNCIL_ROW_TEXT: Record<CouncilTableRow, string> = {
  controlled: "Controlled",
  colonies: "Colonies",
  otherGreatPowers: "Other Great Powers",
  otherMinorNations: "Other Minor Nations",
  total: "Total",
};

export const COUNCIL_TABLE_ROWS: readonly CouncilTableRow[] = [...COUNCIL_ROWS, "total"];

/** FR-312: the note of the Other Great Powers row in a world without a third Great Power. */
export const ONLY_TWO_POWERS_NOTE = "(only two Great Powers in this world)";

/** One number of the table, the provinces behind it ("Sundmark, Lorran"; "none" for 0) and what the cell shows. */
export interface CouncilCellView {
  count: number;
  provinces: string;
  /** The count, or "—" in a row no province can fill in this world (FR-312) */
  shown: string;
}

/** A nominee's column: its head (name, colour slot and rank mark) and its cells by row. */
export interface CouncilColumnView {
  nationId: string;
  name: string;
  colorSlot: number | undefined;
  /** "1st nominee" or "2nd nominee": the standing (FR-313), as the columns follow the player */
  rank: string;
  cells: Record<CouncilTableRow, CouncilCellView>;
}

export interface CouncilView {
  /** "Met at the end of turn 10 (Summer 1817)" (FR-316) */
  date: string;
  /** The player's nominee on the left, the other on the right; a player that is not a nominee sees the standing order (FR-313). */
  columns: [CouncilColumnView, CouncilColumnView];
  /** FR-312: set when the world has no third Great Power: the Other Great Powers row is greyed and says so */
  unusedRowNote?: string;
  /** "Abstained: 4" or "Abstained: none" (FR-311) */
  abstained: string;
  /** One line per abstaining province, in state order: "Arvelia: relation 30 of the 50 needed" (FR-311) */
  abstentions: string[];
  /** FR-311: how a minor and a colony vote */
  rule: string;
  /** "A winner needs more than two thirds of the 12 votes: 9." */
  needed: string;
  /** The winner's name when the meeting elected one. */
  winnerName?: string;
  /** "Testland Wins!" (Imp1), or "No winner. The Council meets again on turn 20." / "... This was the last Council; the game ends on points." */
  result: string;
}

const list = (names: string[]) => (names.length > 0 ? names.join(", ") : "none");
const RANK_TEXT = ["1st nominee", "2nd nominee"];

/**
 * FR-311: why a governor abstained, the nominees named in the screen's column order: "relation 30 of the 50 needed" (the
 * same points with both), "relation 45 with Testland and 30 with Valdoria, of the 50 needed", "at war with Testland;
 * relation 30 with Valdoria, of the 50 needed", "at war with Testland and Valdoria", "relation 60 with both, a tie".
 */
export function abstentionReason(abstention: CouncilAbstention, order: readonly string[], nameOf: (id: string) => string): string {
  if (abstention.reason === "equal-strength") return `${order.map(nameOf).join(" and ")} are equally strong`;
  if (abstention.reason === "colony") return "a colony that still holds its province";
  const needed = COUNCIL.minRelationPoints;
  const nominees = [...abstention.nominees].sort((a, b) => order.indexOf(a.nationId) - order.indexOf(b.nationId));
  const atWar = nominees.filter((n) => n.atWar);
  const atPeace = nominees.filter((n) => !n.atWar);
  const war = atWar.length > 0 ? `at war with ${atWar.map((n) => nameOf(n.nationId)).join(" and ")}` : undefined;
  if (atPeace.length === 0) return war ?? "";
  const samePoints = atPeace.length > 1 && atPeace.every((n) => n.points === atPeace[0].points);
  // Two at peace with the same points of at least 50: neither is preferred
  if (samePoints && atPeace[0].points >= needed) return `relation ${atPeace[0].points} with both, a tie`;
  const points = samePoints
    ? `relation ${atPeace[0].points} of the ${needed} needed`
    : `relation ${atPeace.map((n) => `${n.points} with ${nameOf(n.nationId)}`).join(" and ")}, of the ${needed} needed`;
  return war ? `${war}; ${points}` : points;
}

export function councilView(event: CouncilMetEvent, game: GameState, playerId: string): CouncilView {
  const provinceName = (id: string) => game.provinces.find((p) => p.id === id)?.name ?? id;
  const countryName = (id: string) => game.nations.find((n) => n.id === id)?.name ?? game.minorNations.find((m) => m.id === id)?.name ?? id;
  const nationOf = (id: string) => game.nations.find((n) => n.id === id);
  const unusedRowNote = game.nations.length < 3 ? ONLY_TWO_POWERS_NOTE : undefined;
  const column = (nationId: string): CouncilColumnView => {
    const index = event.nominees.findIndex((n) => n.nationId === nationId);
    const nominee = event.nominees[index];
    const cell = (row: CouncilTableRow): CouncilCellView => {
      const ids = row === "total" ? event.ballots.filter((b) => b.forId === nationId).map((b) => b.provinceId) : councilCell(event, nationId, row);
      const count = row === "total" ? nominee.total : nominee[row];
      const shown = row === "otherGreatPowers" && unusedRowNote && count === 0 ? "—" : String(count);
      return { count, provinces: list(ids.map(provinceName)), shown };
    };
    return {
      nationId,
      name: countryName(nationId),
      colorSlot: nationOf(nationId)?.colorSlot,
      rank: RANK_TEXT[index],
      cells: Object.fromEntries(COUNCIL_TABLE_ROWS.map((row) => [row, cell(row)])) as Record<CouncilTableRow, CouncilCellView>,
    };
  };
  const [left, right] = playerFirst(event.nominees, playerId);
  const columns: [CouncilColumnView, CouncilColumnView] = [column(left.nationId), column(right.nationId)];
  const order = columns.map((c) => c.nationId);

  const abstained = abstainedProvinces(event);
  const abstentions = event.ballots
    .filter((b) => b.forId === undefined)
    .map((b) => {
      const why = b.abstention ? abstentionReason(b.abstention, order, countryName) : undefined;
      const owner = b.abstention?.reason === "equal-strength" ? ` (${countryName(b.abstention.ownerId)})` : "";
      return why ? `${provinceName(b.provinceId)}${owner}: ${why}` : provinceName(b.provinceId);
    });
  const winnerName = event.winnerId === undefined ? undefined : countryName(event.winnerId);
  const next = event.turn + COUNCIL.interval;
  const last = !isCouncilTurn(game, next);
  return {
    date: `Met at the end of turn ${event.turn} (${dateText(event.turn, event.year)})`,
    columns,
    ...(unusedRowNote ? { unusedRowNote } : {}),
    abstained: abstained.length > 0 ? `Abstained: ${abstained.length}` : "Abstained: none",
    abstentions,
    rule: `A free minor nation votes for the Great Power it has at least ${COUNCIL.minRelationPoints} relation points with and is not at war with; a colony votes with its owner.`,
    needed: `A winner needs more than two thirds of the ${event.totalVotes} votes: ${event.needed}.`,
    winnerName,
    result: winnerName
      ? `${winnerName} Wins!`
      : last
        ? "No winner. This was the last Council; the game ends on points."
        : `No winner. The Council meets again on turn ${next}.`,
  };
}
