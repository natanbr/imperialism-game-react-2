import React from "react";
import { useGameStore } from "@/store/rootStore";
import { dateText } from "../gameText";

/** The turn number and the date, "Spring 1815" (FR-048). */
export const TurnIndicator: React.FC = () => {
  const turn = useGameStore((s) => s.game.turn);
  const year = useGameStore((s) => s.game.year);

  return (
    <div className="turn-indicator" data-testid="turn-indicator">
      <div>
        <strong>Turn:</strong> {turn}
      </div>
      <div className="turn-date">{dateText(turn, year)}</div>
    </div>
  );
};
