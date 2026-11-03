import React from "react";
import { useGameStore } from "@/store/rootStore";
import { selectFoodForecast } from "@/store/selectors";
import { foodWarningText } from "../gameText";

/** Shown while the meal at the end of this turn would leave workers sick or starving (FR-049). */
export const FoodWarning: React.FC = () => {
  const forecast = useGameStore(selectFoodForecast);
  const warning = foodWarningText(forecast);
  if (!warning) return null;

  return (
    <div className="food-warning" role="status" data-testid="food-warning">
      {warning}
    </div>
  );
};
