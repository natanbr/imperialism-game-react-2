import React, { useMemo } from "react";
import { councilVote, lastCouncilTurn, nextCouncilTurn, turnLimitOf, yearOfTurn } from "@/engine";
import { useGameStore } from "@/store/rootStore";
import { councilEndRule, councilProjectionText, dateText } from "../gameText";

/**
 * The id of the Council projection, the next-council line's accessible description. Both sit in the Stats dialog (FR-568;
 * until M18b the line was in the top bar and the projection in the pane's Nation group), two components, so the id is
 * fixed: one CouncilProjection is mounted at a time.
 */
export const COUNCIL_PROJECTION_ID = "council-projection-text";

/** The next meeting's turn and the vote the Council would give now, the player's nation first; undefined when none. */
function useCouncil() {
  const game = useGameStore((s) => s.game);
  const playerId = useGameStore((s) => s.activeNationId);
  return useMemo(() => {
    const next = nextCouncilTurn(game);
    if (next === undefined) return undefined;
    const thisTurn = next === game.turn;
    const meeting = thisTurn ? "Council: this turn" : `Council: turn ${next} (${dateText(next, yearOfTurn(game, next))})`;
    const vote = councilVote(game);
    const last = lastCouncilTurn(game);
    if (!vote || last === undefined) return { line: thisTurn ? meeting : `Next ${meeting}` };
    const nameOf = (id: string) => game.nations.find((n) => n.id === id)?.name ?? id;
    return {
      line: councilEndRule(vote.needed, vote.totalVotes, last, meeting),
      projection: councilProjectionText(vote, playerId, nameOf),
      rule: councilEndRule(vote.needed, vote.totalVotes, last),
    };
  }, [game, playerId]);
}

/**
 * The next Council meeting (FR-301): "Next Council: turn 20 (Winter 1819)", or "Council: this turn" on a meeting turn; the
 * top bar's turn block, line 2. Its accessible description is the Council projection (FR-314), when the Council would
 * vote. Nothing on a world without provinces (two-islands), after the last meeting and after game over.
 */
export const NextCouncil: React.FC = () => {
  const council = useCouncil();
  if (!council) return null;
  // The title: in a narrow bar the line ends in an ellipsis, and the meeting's turn is shown nowhere else (M12b review A11Y-5)
  return (
    <div className="next-council" data-testid="next-council" title={council.line} aria-describedby={council.projection ? COUNCIL_PROJECTION_ID : undefined}>
      {council.line}
    </div>
  );
};

/**
 * The vote the Council would give now, the player's nation first (FR-313, FR-314; Imp1's Council Projection, the exact
 * count): shown in the pane's Nation group, and the next-council line's description. Shown whenever NextCouncil shows and
 * the Council would vote.
 */
export const CouncilProjection: React.FC = () => {
  const council = useCouncil();
  if (!council?.projection) return null;
  return (
    <>
      <div id={COUNCIL_PROJECTION_ID} className="council-projection" data-testid="council-projection">{council.projection}</div>
      <details className="council-projection">
        <summary>Council voting rules</summary>
        {council.rule}
      </details>
    </>
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
