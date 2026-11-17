import React, { useId, useLayoutEffect, useRef, useState } from "react";
import { ordinal } from "@/engine";
import { useGameStore } from "@/store/rootStore";
import { selectActiveScore, selectScoreTable } from "@/store/selectors";
import { leftInWindow, scoreParts } from "./hudView";

/**
 * The active nation's score total (FR-075). Hover or focus shows its parts as visible text (FR-404), work in progress
 * included (FR-402); the `title` stays for a quick read but leaves while the parts show, so two tooltips never stack.
 * In the top bar the parts hang below it (`topbar-popover`), so the bar keeps its height. Their left edge is the score's
 * unless the window's right edge pushes them left (FR-530: in a 390 px window the score sits at x 302 and the list,
 * 290 px wide, ran to x 592).
 */
export const ScoreIndicator: React.FC = () => {
  const score = useGameStore(selectActiveScore);
  const { treasury, industry, development, workInProgress } = score.points;
  const [open, setOpen] = useState(false);
  const partsId = useId();
  const host = useRef<HTMLDivElement>(null);
  const parts = useRef<HTMLDivElement>(null);
  const title = `Treasury ${treasury} + industry ${industry} + development ${development}${workInProgress > 0 ? ` + work in progress ${workInProgress}` : ""}`;

  useLayoutEffect(() => {
    const at = host.current;
    const el = parts.current;
    if (!open || !at || !el) return;
    // Placed in the score's own box (position: absolute), so the offset is the window position less the score's left
    const left = at.getBoundingClientRect().left;
    el.style.left = `${leftInWindow(left, el.getBoundingClientRect().width, window.innerWidth) - left}px`;
  }, [open]);

  return (
    <div
      ref={host}
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
        <div ref={parts} id={partsId} role="tooltip" data-testid="score-parts" className="tile-note topbar-popover">
          {scoreParts(score.points).map(([name, points]) => (
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
