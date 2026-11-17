import React, { useMemo } from "react";
import { councilVote, nextCouncilTurn, turnLimitOf, yearOfTurn } from "@/engine";
import { useGameStore } from "@/store/rootStore";
import type { GameState } from "@/types/GameState";
import { councilProjectionText, dateText } from "../gameText";

/**
 * The id of the Council projection, the next-council line's accessible description. The line sits in the top bar and the
 * projection in the pane's Nation group (M12b, docs/specs/hud.md section 2b), two components, so the id is fixed: one
 * CouncilProjection is mounted at a time. A closed group hides it (`hidden`); a description may name a hidden element.
 */
export const COUNCIL_PROJECTION_ID = "council-projection-text";

/** The next meeting's turn and the vote the Council would give now, the player's nation first; undefined when none. */
function useCouncil(): { next: number | undefined; projection: string | undefined; game: GameState } {
  const game = useGameStore((s) => s.game);
  const playerId = useGameStore((s) => s.activeNationId);
  const projection = useMemo(() => {
    const vote = councilVote(game);
    if (!vote) return undefined;
    const nameOf = (id: string) => game.nations.find((n) => n.id === id)?.name ?? id;
    return councilProjectionText(vote, playerId, nameOf);
  }, [game, playerId]);
  // No meeting is shown after game over
  return { next: game.gameOver ? undefined : nextCouncilTurn(game), projection, game };
}

/**
 * The next Council meeting (FR-301): "Next Council: turn 20 (Winter 1819)", or "Council: this turn" on a meeting turn; the
 * top bar's turn block, line 2. Its accessible description is the Council projection (FR-314), when the Council would
 * vote. Nothing on a world without provinces (two-islands), after the last meeting and after game over.
 */
export const NextCouncil: React.FC = () => {
  const { next, projection, game } = useCouncil();
  if (next === undefined) return null;
  return (
    <div className="next-council" data-testid="next-council" aria-describedby={projection ? COUNCIL_PROJECTION_ID : undefined}>
      {next === game.turn ? "Council: this turn" : `Next Council: turn ${next} (${dateText(next, yearOfTurn(game, next))})`}
    </div>
  );
};

/**
 * The vote the Council would give now, the player's nation first (FR-313, FR-314; Imp1's Council Projection, the exact
 * count): shown in the pane's Nation group, and the next-council line's description. Shown whenever NextCouncil shows and
 * the Council would vote.
 */
export const CouncilProjection: React.FC = () => {
  const { next, projection } = useCouncil();
  if (next === undefined || !projection) return null;
  return (
    <div id={COUNCIL_PROJECTION_ID} className="council-projection" data-testid="council-projection">
      {projection}
    </div>
  );
};

/** The war and idle-civilian lines' texts (FR-412, FR-432); the pane's alerts show them (components/HUD/Alerts.tsx). */
export const atWarText = (name: string, since: number): string => `At war with ${name} (since turn ${since})`;
export const idleCiviliansText = (count: number): string => `${count} ${count === 1 ? "civilian" : "civilians"} without orders`;

/**
 * The turn of the game's length and the date, "Turn: 1 of 40 / Spring 1815" (FR-048, FR-075): the top bar's turn block,
 * line 1, the date right-aligned. At game over "Game over after turn 40 of 40" over the date. The "Turn:" prefix is
 * hidden from sight in a narrow window (FR-467), never from the text.
 */
export const TurnIndicator: React.FC = () => {
  const turn = useGameStore((s) => s.game.turn);
  const year = useGameStore((s) => s.game.year);
  const gameOver = useGameStore((s) => s.game.gameOver);
  const limit = useGameStore((s) => turnLimitOf(s.game));

  if (gameOver) {
    return (
      <div className="turn-indicator turn-indicator-over" data-testid="turn-indicator">
        <div>
          <strong>Game over</strong> after turn {gameOver.turn} of {limit}
        </div>
        <div className="turn-date">{dateText(gameOver.turn, gameOver.year)}</div>
      </div>
    );
  }

  return (
    <div className="turn-indicator" data-testid="turn-indicator">
      <div>
        <strong className="topbar-wide-only">Turn:</strong> {turn} of {limit}
      </div>
      <div className="turn-date">{dateText(turn, year)}</div>
    </div>
  );
};
