import React from "react";
import { useGameStore } from "@/store/rootStore";
import { selectUpkeepForecast } from "@/store/selectors";
import { upkeepWarningText } from "../gameText";

/**
 * Shown while the cash End Turn's upkeep step will find is below the army upkeep (FR-261; M8 review F2), so the
 * player's own spending does not disband regiments unseen. Like the food warning (FR-049), none after game over.
 */
export const UpkeepWarning: React.FC = () => {
  const forecast = useGameStore(selectUpkeepForecast);
  const isOver = useGameStore((s) => s.game.gameOver !== undefined);
  const warning = upkeepWarningText(forecast);
  if (!warning || isOver) return null;

  return (
    <div className="food-warning" role="status" data-testid="upkeep-warning">
      {warning}
    </div>
  );
};
