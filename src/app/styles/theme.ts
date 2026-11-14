// The palette and the map grid for TypeScript (FR-086, FR-088). The colour values live only in
// styles/tokens.css; this module names the variables, so inline styles and SVG attributes use the
// same colours as the CSS. tests/ui/palette.test.ts checks that every name here is defined there.
import { TerrainType } from "@/types/Tile";

/** Tile size in px: equal to --tile-width in tokens.css. Odd rows are shifted half a tile. */
export const TILE_PX = 42;
/** --hud-width in tokens.css: the HUD lies over the map's right edge. */
export const HUD_PX = 250;

const v = (name: string) => `var(--${name})`;

export const THEME = {
  land: v("color-land"),
  sea: v("color-sea"),
  ink: v("color-ink"),
  inkMuted: v("color-ink-muted"),
  line: v("color-line"),
  surface: v("color-surface"),
  surfaceSunken: v("color-surface-sunken"),
  accent: v("color-accent"),
  accentStrong: v("color-accent-strong"),
  onAccent: v("color-on-accent"),
  good: v("color-good"),
  bad: v("color-bad"),
  warn: v("color-warn"),
  highlight: v("color-highlight"),
  rail: v("color-rail"),
  /** Minor nations' borders and name tags (FR-153, FR-154). */
  minor: v("color-minor"),
  /** The dotted line between two provinces of one owner (FR-153, FR-154). */
  provinceBorder: v("color-province-border"),
  /** Army orders on the map (FR-273): the art pack's red attack and green movement colours, each with its ink outline. */
  armyAttack: v("color-army-attack"),
  armyAttackInk: v("color-army-attack-ink"),
  armyMove: v("color-army-move"),
  armyMoveInk: v("color-army-move-ink"),
} as const;

/** One strong colour per palette slot (`Nation.colorSlot`, 1 first); used only for territory borders (FR-097). */
export const NATION_COLORS: readonly string[] = [v("color-nation-1"), v("color-nation-2")];

/** The colour of a palette slot; a slot past the last colour wraps round, a missing or bad one is slot 1. */
export const nationColor = (slot: number | undefined): string => {
  const index = typeof slot === "number" && Number.isInteger(slot) && slot >= 1 ? slot - 1 : 0;
  return NATION_COLORS[index % NATION_COLORS.length];
};

/** The nine relation swatches, level 0 (dark brown) to 8 (dark green): --color-relation-<level> (FR-179). */
export const RELATION_COLORS: readonly string[] = Array.from({ length: 9 }, (_, level) => v(`color-relation-${level}`));

/** The swatch of a relation level, clamped to 0..8. */
export const relationColor = (level: number): string => RELATION_COLORS[Math.min(8, Math.max(0, Math.floor(level)))];

/** A faint background per terrain: --terrain-<type> in tokens.css. */
export const TERRAIN_TINT: Record<TerrainType, string> = Object.fromEntries(
  Object.values(TerrainType).map((t) => [t, v(`terrain-${t}`)])
) as Record<TerrainType, string>;

/** Every CSS variable this module names, without `var()`. */
export function themeVariables(): string[] {
  const all = [...Object.values(THEME), ...NATION_COLORS, ...RELATION_COLORS, ...Object.values(TERRAIN_TINT)];
  return all.map((value) => /^var\((--[\w-]+)\)$/.exec(value)![1]);
}
