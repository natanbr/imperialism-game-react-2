import React from "react";
import { useGameStore } from "@/store/rootStore";
import { selectActiveNation } from "@/store/selectors";

export const NationStats: React.FC = () => {
  const activeNation = useGameStore(selectActiveNation);

  return (
    <div className="nation-stats">
      <div>
        <strong>Cash:</strong> {activeNation?.treasury ?? 0}
      </div>
    </div>
  );
};