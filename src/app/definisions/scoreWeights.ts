/**
 * Score weights (FR-067): 1 point per $100 of cash, 10 per capacity point, 10 per resource level.
 * [NEEDS CLARIFICATION] gaps.md A7, decision Q11: the original formula is not documented; the
 * project plan names the three parts (treasury, industrial capacity, developed tiles).
 */
export const SCORE_WEIGHTS = { dollarsPerPoint: 100, pointsPerCapacity: 10, pointsPerLevel: 10 } as const;
