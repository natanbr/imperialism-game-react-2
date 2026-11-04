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
} as const;

/** One strong colour per nation, by the nation's place in `state.nations`; used only for territory borders. */
export const NATION_COLORS: readonly string[] = [v("color-nation-1"), v("color-nation-2")];

export const nationColor = (index: number): string => NATION_COLORS[Math.max(0, index) % NATION_COLORS.length];

/** A faint background per terrain: --terrain-<type> in tokens.css. */
export const TERRAIN_TINT: Record<TerrainType, string> = Object.fromEntries(
  Object.values(TerrainType).map((t) => [t, v(`terrain-${t}`)])
) as Record<TerrainType, string>;

/** Every CSS variable this module names, without `var()`. */
export function themeVariables(): string[] {
  const all = [...Object.values(THEME), ...NATION_COLORS, ...Object.values(TERRAIN_TINT)];
  return all.map((value) => /^var\((--[\w-]+)\)$/.exec(value)![1]);
}
