import React, { useMemo } from "react";
import { useGameStore } from "@/store/rootStore";
import { selectFoodForecast, selectUpkeepForecast } from "@/store/selectors";
import { foodWarningText, upkeepWarningText } from "../gameText";
import { FoodWarning } from "./FoodWarning";
import { UpkeepWarning } from "./UpkeepWarning";
import { NOT_SAVED_TEXT } from "./NationStats";
import { atWarText, idleCiviliansText } from "./TurnIndicator";
import { idleCivilianCount, playerWars } from "./hudView";

/**
 * What the player must not miss, always in sight under Tile Info and above the news, never inside a group (FR-471): the
 * game is not being saved (FR-363), the meal and the army upkeep at End Turn fall short (FR-049, FR-261), each war
 * (FR-412) and the civilians without orders (FR-432, card Q95). Texts and roles as before; with none of them, nothing.
 * After game over only the save line can show: no turn follows, so there is no meal, upkeep, war or order to give.
 */
export const Alerts: React.FC = () => {
  const game = useGameStore((s) => s.game);
  const playerId = useGameStore((s) => s.activeNationId);
  const saveFailed = useGameStore((s) => s.saveFailed);
  const food = useGameStore(selectFoodForecast);
  const upkeep = useGameStore(selectUpkeepForecast);
  const isOver = game.gameOver !== undefined;
  const wars = useMemo(() => (isOver ? [] : playerWars(game, playerId)), [game, playerId, isOver]);
  const idle = useMemo(() => (isOver ? 0 : idleCivilianCount(game, playerId)), [game, playerId, isOver]);
  const shortFood = !isOver && foodWarningText(food) !== null;
  const shortUpkeep = !isOver && upkeepWarningText(upkeep) !== null;
  if (!saveFailed && !shortFood && !shortUpkeep && wars.length === 0 && idle === 0) return null;

  return (
    <div className="hud-alerts" data-testid="hud-alerts">
      {saveFailed && (
        <div className="food-warning" role="status" data-testid="not-saved">
          {NOT_SAVED_TEXT}
        </div>
      )}
      <FoodWarning />
      <UpkeepWarning />
      {wars.map((war) => (
        <div key={war.id} className="hud-alert-line" data-testid="at-war">
          {atWarText(war.name, war.since)}
        </div>
      ))}
      {idle > 0 && (
        <div className="hud-alert-line" data-testid="idle-civilians">
          {idleCiviliansText(idle)}
        </div>
      )}
    </div>
  );
};
