import React, { useId } from "react";
import { useGameStore } from "@/store/rootStore";
import { THEME } from "@/styles/theme";
import { nationMark, type FlagPattern } from "./nationMark";

// The art pack's flag shape (its map-ui flag, listed in art/inkArt.ts): the pole and the swallow-tailed cloth, drawn
// here so the cloth takes the nation's colour and pattern. tests/ui/nationFlag.test.tsx checks the paths still match the file.
export const FLAG_POLE_PATH = "M4.5 17.5Q4.2 10.25 4.6 2.8";
export const FLAG_CLOTH_PATH = "M4.75 4Q9.25 2.9 14.4 4.1L12 7.05 14.4 10.3Q10.55 9 4.7 10.45Z";

/** The light shapes of each pattern, in the pack file's 18 x 20 frame, clipped to the cloth. */
const PATTERN_SHAPES: Record<FlagPattern, React.ReactNode> = {
  solid: null,
  cross: (
    <>
      <rect x="7" y="0" width="1.4" height="20" />
      <rect x="0" y="6.3" width="18" height="1.4" />
    </>
  ),
  canton: <rect x="0" y="0" width="9.2" height="7" />,
  stripes: (
    <>
      <rect x="0" y="5.1" width="18" height="1.2" />
      <rect x="0" y="7.7" width="18" height="1.2" />
    </>
  ),
  diagonal: <path d="M3 10.6L16 1.5V3.3L3 12.4Z" />,
  triangle: <path d="M4 3L10 7.1 4 11.2Z" />,
};

/**
 * A nation's flag mark (FR-564): the pack's flag in the nation's one colour with its pattern, beside the nation's name.
 * Decorative: the name next to it says which nation it is, so it is hidden from assistive technology. `size="large"`
 * where a list has room (Diplomacy, Council, Stats, the dashboard); the Board of Trade, the news and the map size it down.
 */
export const NationFlag: React.FC<{ nationId: string; size?: "large" }> = ({ nationId, size }) => {
  const nations = useGameStore((s) => s.game.nations);
  const minorNations = useGameStore((s) => s.game.minorNations);
  const { colour, pattern } = nationMark({ nations, minorNations }, nationId);
  const clipId = `flag-${useId().replace(/[^\w-]/g, "")}`;
  return (
    <span className={size === "large" ? "nation-flag nation-flag-large" : "nation-flag"} data-testid="nation-flag" data-nation-id={nationId} data-pattern={pattern} aria-hidden="true" style={{ color: colour }}>
      <svg viewBox="3 2 12.5 16.5" focusable="false">
        <defs>
          <clipPath id={clipId}>
            <path d={FLAG_CLOTH_PATH} />
          </clipPath>
        </defs>
        <path d={FLAG_POLE_PATH} fill="none" stroke={THEME.ink} strokeWidth={1.35} strokeLinecap="round" />
        <path d={FLAG_CLOTH_PATH} fill="currentColor" data-part="cloth" />
        {PATTERN_SHAPES[pattern] && (
          <g clipPath={`url(#${clipId})`} fill={THEME.flagPattern}>
            {PATTERN_SHAPES[pattern]}
          </g>
        )}
        <path d={FLAG_CLOTH_PATH} fill="none" stroke={THEME.ink} strokeWidth={0.7} strokeLinejoin="round" />
      </svg>
    </span>
  );
};
