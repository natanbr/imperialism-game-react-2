import React from "react";
import { useGameStore } from "@/store/rootStore";
import { selectActiveScore } from "@/store/selectors";

/** The active nation's score total; its three parts on hover (FR-075). */
export const ScoreIndicator: React.FC = () => {
  const score = useGameStore(selectActiveScore);
  const { treasury, industry, development } = score.points;

  return (
    <div
      className="hud-score"
      data-testid="hud-score"
      title={`Treasury ${treasury} + industry ${industry} + development ${development}`}
    >
      <strong>Score:</strong> {score.total}
    </div>
  );
};
