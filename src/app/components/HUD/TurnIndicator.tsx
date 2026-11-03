import React from "react";
import { turnLimitOf } from "@/engine";
import { useGameStore } from "@/store/rootStore";
import { dateText } from "../gameText";

/** The turn of the game's length and the date, "Turn: 1 of 40 / Spring 1815" (FR-048, FR-075). */
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
    <div className="turn-indicator" data-testid="turn-indicator">
      <div>
        <strong>Turn:</strong> {turn} of {limit}
      </div>
      <div className="turn-date">{dateText(turn, year)}</div>
    </div>
  );
};
