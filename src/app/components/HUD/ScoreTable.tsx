import React from "react";
import { useGameStore } from "@/store/rootStore";
import { selectScoreTable } from "@/store/selectors";
import { NationSwatch } from "../NationSwatch";

/** Every nation ranked by score, highest first (FR-106): rank, swatch and name, total. */
export const ScoreTable: React.FC = () => {
  const scores = useGameStore(selectScoreTable);
  const nations = useGameStore((s) => s.game.nations);
  const activeNationId = useGameStore((s) => s.activeNationId);

  return (
    <table className="score-table" aria-label="Scores" data-testid="score-table">
      <thead>
        <tr>
          <th scope="col">#</th>
          <th scope="col">Nation</th>
          <th scope="col" className="score-number">Score</th>
        </tr>
      </thead>
      <tbody>
        {scores.map((score, i) => {
          const nation = nations.find((n) => n.id === score.nationId);
          const you = score.nationId === activeNationId;
          return (
            <tr key={score.nationId} data-testid={`score-row-${score.nationId}`} className={you ? "score-you" : undefined}>
              <td data-testid="rank">{i + 1}</td>
              <td data-testid="nation">
                <NationSwatch slot={nation?.colorSlot} />
                {nation?.name ?? score.nationId}
                {you ? " (you)" : ""}
              </td>
              <td data-testid="total" className="score-number">
                {score.total}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};
