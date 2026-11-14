// Reading a battle report (FR-225, for the Battle screen FR-231 and the news FR-232): the replay round by round, the
// result as each side sees it, and the battles a country fought in a turn's events. Pure functions of the report alone.
import type { CountryId, RegimentId } from "@/types/Common";
import type { BattleFate, BattleReport } from "@/types/Battle";
import { COMBAT } from "@/definisions/combatRules";
import { isMilitia } from "@/definisions/regiments";
import type { GameEvent } from "../turn/context";

export type BattleResolvedEvent = Extract<GameEvent, { type: "battle-resolved" }>;

export interface BattleFrameRegiment {
  id: RegimentId;
  health: number;
  /** "standing", "routed" or "destroyed" while the battle runs; the last frame has the report's fates ("surrendered"). */
  status: BattleFate;
}

export interface BattleFrame {
  /** 0 before the first round, then the round just played. */
  round: number;
  /** In the report's order: the attackers, then the defenders. */
  regiments: BattleFrameRegiment[];
}

/**
 * The battle replayed from the report alone (FR-225, FR-231): the start, then the state after each round, the shots
 * applied to the start healths and the FR-220 rout rule (a non-militia regiment hit to 25 or less). The last frame
 * shows the report's end healths and fates.
 */
export function battleFrames(report: BattleReport): BattleFrame[] {
  const health = new Map(report.regiments.map((r) => [r.id, r.startHealth]));
  const routed = new Set<RegimentId>();
  const type = new Map(report.regiments.map((r) => [r.id, r.type]));
  const frame = (round: number): BattleFrame => ({
    round,
    regiments: report.regiments.map((r) => {
      const h = health.get(r.id)!;
      return { id: r.id, health: h, status: h === 0 ? "destroyed" : routed.has(r.id) ? "routed" : "standing" };
    }),
  });
  const frames = [frame(0)];
  report.rounds.forEach((round, i) => {
    for (const shot of round.shots) {
      if (!shot.hit) continue;
      const now = health.get(shot.targetId)! - shot.damage;
      health.set(shot.targetId, now);
      if (now > 0 && now <= COMBAT.routHealth && !isMilitia(type.get(shot.targetId)!)) routed.add(shot.targetId);
    }
    frames.push(frame(i + 1));
  });
  const last = frames[frames.length - 1];
  frames[frames.length - 1] = {
    ...last,
    regiments: report.regiments.map((r) => ({ id: r.id, health: r.endHealth, status: r.fate })),
  };
  return frames;
}

/** The result of a battle as one side sees it (the Imp1 result lines, FR-231): the screen words it. */
export type BattleOutcome = "province-taken" | "attack-failed" | "province-lost" | "enemy-beaten-back";

/** The outcome for the country; undefined when it did not fight in this battle. */
export function battleOutcome(report: BattleReport, countryId: CountryId): BattleOutcome | undefined {
  if (report.attackerIds.includes(countryId)) {
    return report.provinceTaken && report.nationId === countryId ? "province-taken" : "attack-failed";
  }
  if (report.defenderId === countryId) return report.provinceTaken ? "province-lost" : "enemy-beaten-back";
  return undefined;
}

/** The `battle-resolved` events of these events in which the country attacked or defended, in event order (FR-232). */
export const battlesFoughtBy = (events: readonly GameEvent[], countryId: CountryId): BattleResolvedEvent[] =>
  events.filter((e): e is BattleResolvedEvent => e.type === "battle-resolved" && battleOutcome(e, countryId) !== undefined);
