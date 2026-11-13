// What the Battle screen shows (FR-231; Imp1 battlefield and casualty book, rules 11 sections 6 and 7): one
// `battle-resolved` report replayed round by round. Everything about the battle comes from the report alone (the
// regiments may be gone by now); the state only names the province and the countries and gives their colours.
import {
  battleFrames,
  battleOutcome,
  countryName,
  provinceById,
  REGIMENTS,
  type BattleFate,
  type BattleFrame,
  type BattleReport,
  type BattleShot,
  type RegimentType,
} from "@/engine";
import type { GameState } from "@/types/GameState";
import { BATTLE_RESULT_TEXT } from "../gameText";
import { ownerColor } from "./armyView";

/** A regiment's status word on its token and in the casualty list; none while it stands. */
export const FATE_TEXT: Record<BattleFate, string> = {
  standing: "",
  routed: "Routed",
  destroyed: "KIA",
  surrendered: "Surrendered",
};

export interface BattleTokenView {
  id: string;
  /** Its name, with its owner's in front when another regiment of the battle bears the same name. */
  name: string;
  type: RegimentType;
  side: "attacker" | "defender";
  /** The owner's colour: a Great Power's slot colour, the minors' slate. */
  color: string;
  /**
   * The battlefield's column, left to right: 1 and 2 the attackers (artillery behind, in 1), 3 the wall when there is a
   * fort, then the defenders (in front first, artillery behind).
   */
  column: number;
  /** Its row in its column, from 1. */
  row: number;
}

export interface BattleView {
  /** "Battle at Arvelia": the dialog's name. */
  title: string;
  /** "Testland", "Testland and Valdoria". */
  attackersName: string;
  defenderName: string;
  fortLevel: number;
  tokens: BattleTokenView[];
  /** The replay (FR-225): frame 0 before the first round, then one frame after each round, the last with the fates. */
  frames: BattleFrame[];
  /** Each round's shots as text, in the order they were fired. */
  rounds: string[][];
  /** The result line for the player's side, or the attacker's when the player did not fight. */
  resultText: string;
  /** Each regiment and how it left the battle: its health, or "Routed", "Surrendered", "KIA". */
  casualties: { id: string; name: string; color: string; text: string }[];
}

/** "1st Regulars hits 2nd Minutemen: 25"; "1st Regulars misses" (FR-231). */
export function shotText(shot: BattleShot, names: ReadonlyMap<string, string>): string {
  const shooter = names.get(shot.shooterId) ?? shot.shooterId;
  return shot.hit ? `${shooter} hits ${names.get(shot.targetId) ?? shot.targetId}: ${shot.damage}` : `${shooter} misses`;
}

/** Artillery and engineers stand behind the line; cavalry, infantry and militia in front. */
const behind = (type: RegimentType) => ["artillery", "engineers"].includes(REGIMENTS[type].arm);

export function battleView(report: BattleReport, state: GameState, playerId: string): BattleView {
  const nameOf = (id: string) => countryName(state, id) ?? id;
  // A name two owners share ("1st Regulars" on both sides) is told apart by the owner's name
  const shared = new Set(
    report.regiments.filter((r, _, all) => all.some((o) => o.name === r.name && o.ownerId !== r.ownerId)).map((r) => r.name)
  );
  const names = new Map(report.regiments.map((r) => [r.id, shared.has(r.name) ? `${nameOf(r.ownerId)} ${r.name}` : r.name]));
  const wall = report.fortLevel >= 1 ? 1 : 0;
  const rows = new Map<number, number>();
  const tokens = report.regiments.map((r): BattleTokenView => {
    const column = r.side === "attacker" ? (behind(r.type) ? 1 : 2) : 3 + wall + (behind(r.type) ? 1 : 0);
    const row = (rows.get(column) ?? 0) + 1;
    rows.set(column, row);
    return { id: r.id, name: names.get(r.id)!, type: r.type, side: r.side, color: ownerColor(state, r.ownerId), column, row };
  });
  const outcome = battleOutcome(report, playerId) ?? battleOutcome(report, report.nationId)!;
  return {
    title: `Battle at ${provinceById(state, report.provinceId)?.name ?? report.provinceId}`,
    attackersName: report.attackerIds.map(nameOf).join(" and "),
    defenderName: nameOf(report.defenderId),
    fortLevel: report.fortLevel,
    tokens,
    frames: battleFrames(report),
    rounds: report.rounds.map((round) => round.shots.map((shot) => shotText(shot, names))),
    resultText: BATTLE_RESULT_TEXT[outcome],
    casualties: report.regiments.map((r) => ({
      id: r.id,
      name: names.get(r.id)!,
      color: ownerColor(state, r.ownerId),
      text: r.fate === "standing" ? `${r.endHealth}%` : FATE_TEXT[r.fate],
    })),
  };
}

/**
 * The replay's steps: 0 the deployment, 1 to n the rounds, n + 1 the result. "Deployment: 4 rounds were fought",
 * "Round 2 of 4", "Result".
 */
export function stepText(step: number, rounds: number): string {
  if (step === 0) return rounds === 0 ? "Deployment: no defender, no round was fought" : `Deployment: ${rounds} round${rounds === 1 ? " was" : "s were"} fought`;
  return step > rounds ? "Result" : `Round ${step} of ${rounds}`;
}
