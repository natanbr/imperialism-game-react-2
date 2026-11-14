// What the Council screen shows (FR-298), read from one `council-met` event: the screen is a report of that meeting, so
// a later change of the game changes none of its numbers. The game is asked only for names, colours and whether another
// meeting follows (its turn limit).
import { abstainedProvinces, COUNCIL, COUNCIL_ROWS, councilCell, isCouncilTurn, type CouncilMetEvent, type CouncilRow } from "@/engine";
import type { GameState } from "@/types/GameState";
import { dateText } from "../gameText";

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

/** One number of the table and the provinces behind it ("Sundmark, Lorran"; "none" for 0). */
export interface CouncilCellView {
  count: number;
  provinces: string;
}

/** A nominee's column: its head (name and colour slot) and its cells by row. */
export interface CouncilColumnView {
  nationId: string;
  name: string;
  colorSlot: number | undefined;
  cells: Record<CouncilTableRow, CouncilCellView>;
}

export interface CouncilView {
  /** "Turn 10, Summer 1817" */
  date: string;
  /** The first nominee (the higher standing) on the left, the second on the right. */
  columns: [CouncilColumnView, CouncilColumnView];
  /** "Abstained: 3 (Sundmark, Lorran, Pellis)" or "Abstained: none" */
  abstained: string;
  /** "A winner needs more than two thirds of the 12 votes: 9." */
  needed: string;
  /** The winner's name when the meeting elected one. */
  winnerName?: string;
  /** "Testland Wins!" (Imp1), or "No winner. The Council meets again on turn 20." / "... This was the last Council; the game ends on points." */
  result: string;
}

const list = (names: string[]) => (names.length > 0 ? names.join(", ") : "none");

export function councilView(event: CouncilMetEvent, game: GameState): CouncilView {
  const provinceName = (id: string) => game.provinces.find((p) => p.id === id)?.name ?? id;
  const nationOf = (id: string) => game.nations.find((n) => n.id === id);
  const column = (nationId: string): CouncilColumnView => {
    const nominee = event.nominees.find((n) => n.nationId === nationId)!;
    const cell = (row: CouncilTableRow): CouncilCellView => {
      const ids = row === "total" ? event.ballots.filter((b) => b.forId === nationId).map((b) => b.provinceId) : councilCell(event, nationId, row);
      return { count: row === "total" ? nominee.total : nominee[row], provinces: list(ids.map(provinceName)) };
    };
    return {
      nationId,
      name: nationOf(nationId)?.name ?? nationId,
      colorSlot: nationOf(nationId)?.colorSlot,
      cells: Object.fromEntries(COUNCIL_TABLE_ROWS.map((row) => [row, cell(row)])) as Record<CouncilTableRow, CouncilCellView>,
    };
  };
  const columns: [CouncilColumnView, CouncilColumnView] = [column(event.nominees[0].nationId), column(event.nominees[1].nationId)];
  const abstained = abstainedProvinces(event).map(provinceName);
  const winnerName = event.winnerId === undefined ? undefined : (nationOf(event.winnerId)?.name ?? event.winnerId);
  const next = event.turn + COUNCIL.interval;
  const last = !isCouncilTurn(game, next);
  return {
    date: `Turn ${event.turn}, ${dateText(event.turn, event.year)}`,
    columns,
    abstained: abstained.length > 0 ? `Abstained: ${abstained.length} (${abstained.join(", ")})` : "Abstained: none",
    needed: `A winner needs more than two thirds of the ${event.totalVotes} votes: ${event.needed}.`,
    winnerName,
    result: winnerName
      ? `${winnerName} Wins!`
      : last
        ? "No winner. This was the last Council; the game ends on points."
        : `No winner. The Council meets again on turn ${next}.`,
  };
}
