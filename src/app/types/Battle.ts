// The battle report (FR-225, decision 7): everything a battle did, enough to replay it without the state. The combat
// phase emits it as a `battle-resolved` event; the Battle screen replays it (FR-231).
import type { CountryId, NationId, ProvinceId, RegimentId } from "./Common";
import type { RegimentType } from "./Unit";

export type BattleSide = "attacker" | "defender";

/**
 * How a regiment left the battle: still "standing", "routed" (hit to 25 health or less, FR-220), "destroyed" (0 health),
 * or "surrendered" (routed or cut off with no province of its owner to go to, FR-221, or its nation fell, FR-223).
 */
export type BattleFate = "standing" | "routed" | "destroyed" | "surrendered";

export type BattleResult = "attacker-won" | "defender-held";

export interface BattleRegiment {
  id: RegimentId;
  ownerId: CountryId;
  type: RegimentType;
  name: string;
  side: BattleSide;
  startHealth: number;
  endHealth: number;
  fate: BattleFate;
}

export interface BattleShot {
  shooterId: RegimentId;
  targetId: RegimentId;
  hit: boolean;
  /** The health the shot took: the FR-219 damage, at most the health the target had left; 0 for a miss. */
  damage: number;
}

export interface BattleRound {
  shots: BattleShot[];
}

export interface BattleReport {
  /** The attacking Great Power: the first attacker in `intentOrder` (the one that took the province, when it was taken). */
  nationId: NationId;
  provinceId: ProvinceId;
  /** Every country that attacked, in `intentOrder`. */
  attackerIds: CountryId[];
  /** The province's owner. */
  defenderId: CountryId;
  /** The province's fort (0 without one). */
  fortLevel: number;
  /** The attackers, then the defenders, each by regiment id. */
  regiments: BattleRegiment[];
  /** Empty when the province had no defender (FR-217). */
  rounds: BattleRound[];
  result: BattleResult;
  provinceTaken: boolean;
}
