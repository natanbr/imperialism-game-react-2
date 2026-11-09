/**
 * Game configuration constants
 * Single source of truth for all game values. The map grid (tile size) and the icons are UI
 * matters: `styles/theme.ts` and `components/icons.ts` (FR-084, FR-088).
 */

/**
 * Time configuration: a random world starts in Spring 1815, one turn per season (FR-027). A v1
 * game lasts TURN_LIMIT turns, to Winter 1824 (FR-068; decision Q12, the original runs to 1915).
 */
export const TIME_CONFIG = {
  TURNS_PER_YEAR: 4,
  STARTING_YEAR: 1815,
  STARTING_TURN: 1,
  TURN_LIMIT: 40,
  /** The longest game `newGame` accepts (FR-105); the original runs about 400 turns, 1815 to 1915. */
  MAX_TURN_LIMIT: 400,
} as const;
