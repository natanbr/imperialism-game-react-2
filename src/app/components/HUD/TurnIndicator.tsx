import React from "react";
import { useGameStore } from "@/store/rootStore";

export const TurnIndicator: React.FC = () => {
  const turn = useGameStore((s) => s.turn);
  const year = useGameStore((s) => s.year);

  return (
    <div className="turn-indicator">
      <div>
        <strong>Turn:</strong> {turn}
      </div>
      <div>
        <strong>Year:</strong> {year}
      </div>
    </div>
  );
};