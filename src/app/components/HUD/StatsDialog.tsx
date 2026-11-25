import React, { useId } from "react";
import { COUNCIL, DEFAULT_WORLD, lastCouncilTurn, turnLimitOf } from "@/engine";
import { useGameStore } from "@/store/rootStore";
import { selectActiveScore } from "@/store/selectors";
import { Modal } from "../Modal";
import { ScoreTable } from "./ScoreTable";
import { ScoreIndicator, ScoreRank } from "./ScoreIndicator";
import { CouncilProjection, NextCouncil } from "./TurnIndicator";
import { DIFFICULTY_LABEL, SIZE_LABEL, WORLD_LABEL, scoreParts, uncollectedScoreText } from "./hudView";

/**
 * FR-568 (owner feedback 2026-11-23): votes, score and standing left the main screen for this dialog, opened from the top
 * bar's Stats button. The same components as before, so the same numbers from the same functions: the score and its
 * parts (selectActiveScore, FR-075, FR-402, FR-404), the standing and every nation's score (selectScoreTable, FR-106,
 * FR-466), the next Council meeting and the vote it would give now (councilVote, FR-301, FR-313, FR-314). A modal dialog
 * over the whole page like About, rendered into the body.
 */
export const StatsDialog: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const game = useGameStore((s) => s.game);
  const score = useGameStore(selectActiveScore);
  const excluded = uncollectedScoreText(score);
  const titleId = useId();
  return (
    <Modal titleId={titleId} onClose={onClose} overlayClassName="about-overlay" className="about-panel stats-panel" portal>
      <div className="about-header">
        <h2 id={titleId} className="about-title">
          Stats
        </h2>
        <button className="icon-button" onClick={onClose} aria-label="Close stats">
          <span aria-hidden="true">×</span>
        </button>
      </div>
      <dl className="stats-settings" aria-label="Starting settings">
        <dt>Map</dt><dd>{WORLD_LABEL[game.worldId ?? DEFAULT_WORLD]}</dd>
        {game.worldId === "random" && <><dt>Random size</dt><dd>{SIZE_LABEL[game.randomMapSize ?? "standard"]}</dd></>}
        <dt>Seed</dt><dd>{game.seed}</dd>
        <dt>Turn limit</dt><dd>{turnLimitOf(game)}</dd>
        <dt>Council</dt><dd>{lastCouncilTurn(game) === undefined ? "No meetings" : `Every ${COUNCIL.interval} turns`}</dd>
        <dt>Difficulty</dt><dd>{DIFFICULTY_LABEL[game.difficulty ?? "normal"]}</dd>
      </dl>
      <div className="stats-score" data-testid="stats-score">
        <ScoreIndicator />
        <ScoreRank />
      </div>
      <ul className="hud-score-parts" data-testid="nation-score-parts" aria-label="Score parts">
        {scoreParts(score.points).map(([name, points]) => (
          <li key={name}>
            {name} {points}
          </li>
        ))}
        {excluded && <li>{excluded}</li>}
      </ul>
      <ScoreTable />
      <NextCouncil />
      <CouncilProjection />
    </Modal>
  );
};
