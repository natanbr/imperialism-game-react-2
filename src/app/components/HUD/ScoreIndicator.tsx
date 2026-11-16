import React, { useId, useState } from "react";
import { useGameStore } from "@/store/rootStore";
import { selectActiveScore } from "@/store/selectors";

/**
 * The active nation's score total (FR-075). Hover or focus shows its parts as visible text (FR-404), work in progress
 * included (FR-402); the `title` stays for a quick read but leaves while the parts show, so two tooltips never stack.
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
      <strong>Score:</strong> {score.total}
      {open && (
        <div id={partsId} role="tooltip" data-testid="score-parts" className="tile-note">
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
