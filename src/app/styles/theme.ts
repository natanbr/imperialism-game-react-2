// The palette and the map grid for TypeScript (FR-086, FR-088). The colour values live only in
// styles/tokens.css; this module names the variables, so inline styles and SVG attributes use the
// same colours as the CSS. tests/ui/palette.test.ts checks that every name here is defined there.

/** Tile size in px: equal to --tile-width in tokens.css. Odd rows are shifted half a tile. */
export const TILE_PX = 42;
/** --hud-width in tokens.css: the HUD lies over the map's right edge. */
export const HUD_PX = 250;
/**
 * --topbar-height in tokens.css (FR-465): the top bar is one 40 px row from TOPBAR_BREAKPOINT px of window width, two rows
 * (80 px) below it. Trap: the CSS query is `max-width: 1023.98px`; it and topBarPx must agree, or the camera centres the
 * map on the wrong area (tests/ui/palette.test.ts checks both). At 1280x720 the 672 px map needs 40 + 672 <= 720, so the
 * one-row height may never exceed 48 px.
 */
export const TOPBAR_PX = 40;
export const TOPBAR_NARROW_PX = 80;
export const TOPBAR_BREAKPOINT = 1024;
export const topBarPx = (innerWidth: number): number => (innerWidth < TOPBAR_BREAKPOINT ? TOPBAR_NARROW_PX : TOPBAR_PX);

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
  /** The map's ground (FR-321, FR-329): the art pack's deep water, shallows, sand rim and grass, and its desert and tundra patches. */
  groundWater: v("color-ground-water"),
  groundShallows: v("color-ground-shallows"),
  groundSand: v("color-ground-sand"),
  groundGrass: v("color-ground-grass"),
  groundDesert: v("color-ground-desert"),
  groundTundra: v("color-ground-tundra"),
  /** The pale halo under every border line (FR-327, FR-329): the pack's territory line's halo colour. */
  mapHalo: v("color-map-halo"),
  /** The field behind every goods picture in a list (FR-353). */
  artBacking: v("color-art-backing"),
  /** The light pattern on a nation's flag mark (FR-564). */
  flagPattern: v("color-flag-pattern"),
} as const;

/** One strong colour per palette slot (`Nation.colorSlot`, 1 first); used only for territory borders (FR-097). */
export const NATION_COLORS: readonly string[] = [v("color-nation-1"), v("color-nation-2")];

/** The colour of a palette slot; a slot past the last colour wraps round, a missing or bad one is slot 1. */
export const nationColor = (slot: number | undefined): string => {
  const index = typeof slot === "number" && Number.isInteger(slot) && slot >= 1 ? slot - 1 : 0;
  return NATION_COLORS[index % NATION_COLORS.length];
};

/** One colour per minor nation, by its place in `state.minorNations` (founding order, FR-564); past the last it wraps round. */
export const MINOR_COLORS: readonly string[] = [1, 2, 3, 4].map((n) => v(`color-minor-${n}`));

/** The nine relation swatches, level 0 (dark brown) to 8 (dark green): --color-relation-<level> (FR-179). */
export const RELATION_COLORS: readonly string[] = Array.from({ length: 9 }, (_, level) => v(`color-relation-${level}`));

/** The swatch of a relation level, clamped to 0..8. */
export const relationColor = (level: number): string => RELATION_COLORS[Math.min(8, Math.max(0, Math.floor(level)))];

/** The Information map's five Military words, Poor (0) to Awesome (4): --color-military-<step> (FR-651). */
export const MILITARY_COLORS: readonly string[] = Array.from({ length: 5 }, (_, step) => v(`color-military-${step}`));

/** Every CSS variable this module names, without `var()`. */
export function themeVariables(): string[] {
  const all = [...Object.values(THEME), ...NATION_COLORS, ...MINOR_COLORS, ...RELATION_COLORS, ...MILITARY_COLORS];
  return all.map((value) => /^var\((--[\w-]+)\)$/.exec(value)![1]);
}
