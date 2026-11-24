// A nation's one colour and flag pattern (FR-564), looked up by id: every screen that names a nation, and the map, ask
// here, so a nation looks the same everywhere. The colours are the design tokens (styles/tokens.css via styles/theme.ts).
import type { MinorNation } from "@/types/MinorNation";
import type { Nation } from "@/types/Nation";
import { MINOR_COLORS, NATION_COLORS, THEME } from "@/styles/theme";

/** The light shapes on a flag's cloth, so two close colours are still told apart (colour-blind eyes too). */
export const FLAG_PATTERNS = ["solid", "cross", "canton", "stripes", "diagonal", "triangle"] as const;
export type FlagPattern = (typeof FLAG_PATTERNS)[number];

export interface NationMark {
  /** `var(--color-…)`: the cloth, the border, the army marker. */
  colour: string;
  pattern: FlagPattern;
}

/** Great Powers by colour slot, then minors by founding order; each list wraps round past its last entry. */
const GREAT_POWER_PATTERNS: readonly FlagPattern[] = ["solid", "cross"];
const MINOR_PATTERNS: readonly FlagPattern[] = ["canton", "stripes", "diagonal", "triangle"];

/** What a lookup needs of the game: `GameState` fits. */
export interface NationLists {
  nations: readonly Pick<Nation, "id" | "colorSlot">[];
  minorNations: readonly Pick<MinorNation, "id">[];
}

/**
 * The mark of a nation id: a Great Power's by its colour slot (FR-097, so reordering `nations` keeps it), a minor's by its
 * place in `minorNations`; an unknown id gets the one minor colour, plain.
 */
export function nationMark({ nations, minorNations }: NationLists, id: string): NationMark {
  const nation = nations.find((n) => n.id === id);
  if (nation) {
    const slot = Number.isInteger(nation.colorSlot) && nation.colorSlot >= 1 ? nation.colorSlot - 1 : 0;
    return { colour: NATION_COLORS[slot % NATION_COLORS.length], pattern: GREAT_POWER_PATTERNS[slot % GREAT_POWER_PATTERNS.length] };
  }
  const minor = minorNations.findIndex((m) => m.id === id);
  if (minor >= 0) return { colour: MINOR_COLORS[minor % MINOR_COLORS.length], pattern: MINOR_PATTERNS[minor % MINOR_PATTERNS.length] };
  return { colour: THEME.minor, pattern: "solid" };
}
