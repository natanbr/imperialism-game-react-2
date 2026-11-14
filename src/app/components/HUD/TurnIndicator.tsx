import React, { useId, useMemo } from "react";
import { councilVote, nextCouncilTurn, turnLimitOf, yearOfTurn } from "@/engine";
import { useGameStore } from "@/store/rootStore";
import { councilCountText, dateText } from "../gameText";

/**
 * The next Council meeting (FR-301): "Next Council: turn 20 (Winter 1819)", or "Council: this turn" on a meeting turn; its
 * title and accessible description give the vote the Council would give now (Imp1's Council Projection, the exact count).
 * Nothing on a world without provinces (two-islands), after the last meeting and after game over.
 */
const NextCouncil: React.FC = () => {
  const game = useGameStore((s) => s.game);
  const descriptionId = useId();
  const next = nextCouncilTurn(game);
  const projection = useMemo(() => {
    const vote = councilVote(game);
    if (!vote) return undefined;
    const nameOf = (id: string) => game.nations.find((n) => n.id === id)?.name ?? id;
    return `If the Council met now: ${councilCountText(vote, nameOf)}; a winner needs ${vote.needed}.`;
  }, [game]);
  if (next === undefined) return null;
  return (
    <>
      <div className="next-council" data-testid="next-council" title={projection} aria-describedby={projection ? descriptionId : undefined}>
        {next === game.turn ? "Council: this turn" : `Next Council: turn ${next} (${dateText(next, yearOfTurn(game, next))})`}
      </div>
      {projection && (
        <div id={descriptionId} hidden>
          {projection}
        </div>
      )}
    </>
  );
};

/** The turn of the game's length and the date, "Turn: 1 of 40 / Spring 1815" (FR-048, FR-075), and the next Council (FR-301). */
export const TurnIndicator: React.FC = () => {
  const turn = useGameStore((s) => s.game.turn);
  const year = useGameStore((s) => s.game.year);
  const gameOver = useGameStore((s) => s.game.gameOver);
  const limit = useGameStore((s) => turnLimitOf(s.game));

  if (gameOver) {
    return (
      <div className="turn-indicator" data-testid="turn-indicator">
        <div>
          <strong>Game over</strong> after turn {gameOver.turn} of {limit}
        </div>
        <div className="turn-date">{dateText(gameOver.turn, gameOver.year)}</div>
      </div>
    );
  }

  return (
    <>
      <div className="turn-indicator" data-testid="turn-indicator">
        <div>
          <strong>Turn:</strong> {turn} of {limit}
        </div>
        <div className="turn-date">{dateText(turn, year)}</div>
      </div>
      <NextCouncil />
    </>
  );
};
