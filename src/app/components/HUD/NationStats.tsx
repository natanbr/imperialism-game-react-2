import React from "react";
import { useGameStore } from "@/store/rootStore";
import { selectActiveNation } from "@/store/selectors";
import { money } from "../gameText";

/** The HUD's cash, "Cash: $10,000", in the money format of the Board of Trade and the Deal Book (FR-258). */
export const NationStats: React.FC = () => {
  const activeNation = useGameStore(selectActiveNation);

  return (
    <div className="nation-stats">
      <div>
        <strong>Cash:</strong> {money(activeNation?.treasury ?? 0)}
      </div>
    </div>
  );
};