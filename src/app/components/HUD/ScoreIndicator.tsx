import React, { useId, useState } from "react";
import { ordinal } from "@/engine";
import { useGameStore } from "@/store/rootStore";
import { selectActiveScore, selectScoreTable } from "@/store/selectors";

/**
 * The active nation's score total (FR-075). Hover or focus shows its parts as visible text (FR-404), work in progress
 * included (FR-402); the `title` stays for a quick read but leaves while the parts show, so two tooltips never stack.
 * In the top bar the parts hang below it (`topbar-popover`), so the bar keeps its height.
 */
export const ScoreIndicator: React.FC = () => {
  const score = useGameStore(selectActiveScore);
  const { treasury, industry, development, workInProgress } = score.points;
  const [open, setOpen] = useState(false);
  const partsId = useId();
  const title = `Treasury ${treasury} + industry ${industry} + development ${development}${workInProgress > 0 ? ` + work in progress ${workInProgress}` : ""}`;
  const parts: [string, number][] = [
    ["Treasury", treasury],
    ["Industry", industry],
    ["Development", development],
    ["Work in progress", workInProgress],
  ];

  return (
    <div
      className="hud-score"
      data-testid="hud-score"
      tabIndex={0}
      title={open ? undefined : title}
      aria-describedby={open ? partsId : undefined}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      onKeyDown={(e) => {
        if (e.key === "Escape") setOpen(false);
      }}
    >
      <strong className="topbar-wide-only">Score:</strong> {score.total}
      {open && (
        <div id={partsId} role="tooltip" data-testid="score-parts" className="tile-note topbar-popover">
          {parts.map(([name, points]) => (
            <div key={name}>
              {name} {points}
            </div>
          ))}
          <div>Investments count at their price until they are done.</div>
        </div>
      )}
    </div>
  );
};

/** The player's place in the score table (FR-106's order), "2nd of 2" (FR-466); nothing for a nation not in it. */
export const ScoreRank: React.FC = () => {
  const table = useGameStore(selectScoreTable);
  const playerId = useGameStore((s) => s.activeNationId);
  const at = table.findIndex((row) => row.nationId === playerId);
  if (at < 0) return null;
  return (
    <div className="score-rank" data-testid="score-rank">
      {ordinal(at + 1)} of {table.length}
    </div>
  );
};
