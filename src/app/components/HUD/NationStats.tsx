import React from "react";
import { useGameStore } from "@/store/rootStore";
import { selectActiveNation } from "@/store/selectors";
import { money } from "../gameText";

/** FR-363: shown while the browser refuses the autosave's writes (storage full or blocked), until one succeeds. */
export const NOT_SAVED_TEXT = "Not saved: the browser did not allow the game to be stored.";

/**
 * The HUD's cash, "Cash: $10,000", in the money format of the Board of Trade and the Deal Book (FR-258), and under it the
 * line that the game is not being saved (FR-363).
 */
export const NationStats: React.FC = () => {
  const activeNation = useGameStore(selectActiveNation);
  const saveFailed = useGameStore((s) => s.saveFailed);

  return (
    <div className="nation-stats">
      <div>
        <strong>Cash:</strong> {money(activeNation?.treasury ?? 0)}
      </div>
      {saveFailed && (
        <div className="food-warning" role="status" data-testid="not-saved">
          {NOT_SAVED_TEXT}
        </div>
      )}
    </div>
  );
};
