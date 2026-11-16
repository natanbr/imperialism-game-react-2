/**
 * Score weights (FR-067): 1 point per $100 of cash, 10 per capacity point; a resource level is worth its price (FR-403,
 * card Q91): `levelPoints[level - 1]` points for reaching that level, 10 for level 1 ($100), 10 more for level 2
 * ($1,000) and 50 more for level 3 ($5,000), so a level-3 tile is worth 70. Jobs not yet finished count at their price
 * (FR-402: floor(price / dollarsPerPoint) each).
 * `pointsPerLevel` is not the score's: it is the scripted player's FR-131 rule (a development pays when 10 points are at
 * least its price in points, so it starts levels 1 and 2 only) and keeps its decisions as before M12.
 * [NEEDS CLARIFICATION] gaps.md A7, decision Q11: the original formula is not documented; the
 * project plan names the three parts (treasury, industrial capacity, developed tiles).
 */
export const SCORE_WEIGHTS = { dollarsPerPoint: 100, pointsPerCapacity: 10, pointsPerLevel: 10, levelPoints: [10, 10, 50] } as const;
