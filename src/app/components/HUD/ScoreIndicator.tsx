import React, { useId, useLayoutEffect, useRef, useState } from "react";
import { ordinal } from "@/engine";
import { useGameStore } from "@/store/rootStore";
import { selectActiveScore, selectScoreTable } from "@/store/selectors";
import { leftInWindow, scoreParts, uncollectedScoreText } from "./hudView";

/**
 * The active nation's score total (FR-075). Hover or focus shows its parts as visible text (FR-404), work in progress
 * included (FR-402); the `title` stays for a quick read but leaves while the parts show, so two tooltips never stack.
 * The parts open below the score when they fit, or above it in a short window. FR-530 keeps their right edge in view.
 */
export const ScoreIndicator: React.FC = () => {
  const score = useGameStore(selectActiveScore);
  const { treasury, industry, development, workInProgress } = score.points;
  const [open, setOpen] = useState(false);
  const excluded = uncollectedScoreText(score);
  const partsId = useId();
  const host = useRef<HTMLDivElement>(null);
  const parts = useRef<HTMLDivElement>(null);
  const title = `Treasury ${treasury} + industry ${industry} + development ${development}${workInProgress > 0 ? ` + work in progress ${workInProgress}` : ""}`;

  useLayoutEffect(() => {
    const at = host.current;
    const el = parts.current;
    if (!open || !at || !el) return;
    const panel = at.closest<HTMLElement>('[role="tabpanel"]');
    const place = () => {
      const anchor = at.getBoundingClientRect();
      const clip = panel && panel.scrollHeight > panel.clientHeight ? panel.getBoundingClientRect() : null;
      el.hidden = clip !== null && (anchor.bottom <= clip.top || anchor.top >= clip.bottom);
      if (el.hidden) return;
      const { width, height } = el.getBoundingClientRect();
      const gap = 4;
      const below = anchor.bottom + gap;
      const top = below + height <= window.innerHeight ? below : Math.max(0, anchor.top - gap - height);
      el.style.left = `${leftInWindow(anchor.left, width, window.innerWidth)}px`;
      el.style.top = `${top}px`;
    };
    place();
    window.addEventListener("resize", place);
    panel?.addEventListener("scroll", place);
    return () => {
      window.removeEventListener("resize", place);
      panel?.removeEventListener("scroll", place);
    };
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
      <strong>Score:</strong> {score.total}
      {open && (
        <div ref={parts} id={partsId} role="tooltip" data-testid="score-parts" className="tile-note topbar-popover">
          {scoreParts(score.points).map(([name, points]) => (
            <div key={name}>
              {name} {points}
            </div>
          ))}
          {excluded && <div>{excluded}</div>}
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
