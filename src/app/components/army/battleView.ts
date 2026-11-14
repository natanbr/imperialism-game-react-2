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

/** A regiment's status word on its token and in the casualty list; none while it stands. "Destroyed", not "KIA" (FR-278). */
export const FATE_TEXT: Record<BattleFate, string> = {
  standing: "",
  routed: "Routed",
  destroyed: "Destroyed",
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
  /**
   * The deployment's two forces, counted by type, which tell nothing of the outcome (FR-277): "Testland attacks: 1
   * Regulars, 1 Artillery", "Arvelia defends: 2 Minutemen" (or "defends behind a level 2 fort", "defends: no regiment").
   */
  forces: [string, string];
  /** The replay (FR-225): frame 0 before the first round, then one frame after each round, the last with the fates. */
  frames: BattleFrame[];
  /** Each round's shots as text, in the order they were fired. */
  rounds: string[][];
  /** The result line for the player's side, or the attacker's when the player did not fight. */
  resultText: string;
  /** Each regiment and how it left the battle: its health, or "Routed", "Surrendered", "Destroyed". */
  casualties: { id: string; name: string; color: string; text: string }[];
}

/** "1st Regulars hits 2nd Minutemen: 25 damage" (FR-278: the number says what it is); "1st Regulars misses" (FR-231). */
export function shotText(shot: BattleShot, names: ReadonlyMap<string, string>): string {
  const shooter = names.get(shot.shooterId) ?? shot.shooterId;
  return shot.hit ? `${shooter} hits ${names.get(shot.targetId) ?? shot.targetId}: ${shot.damage} damage` : `${shooter} misses`;
}

/** "1 Regulars, 1 Artillery": a side's regiments counted by type, in the report's order; "no regiment" for none. */
function countByType(regiments: readonly { type: RegimentType }[]): string {
  const counts = new Map<RegimentType, number>();
  for (const r of regiments) counts.set(r.type, (counts.get(r.type) ?? 0) + 1);
  return counts.size === 0 ? "no regiment" : [...counts].map(([type, n]) => `${n} ${REGIMENTS[type].name}`).join(", ");
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
  const attackersName = report.attackerIds.map(nameOf).join(" and ");
  const defenderName = nameOf(report.defenderId);
  const sideOf = (side: "attacker" | "defender") => countByType(report.regiments.filter((r) => r.side === side));
  return {
    title: `Battle at ${provinceById(state, report.provinceId)?.name ?? report.provinceId}`,
    attackersName,
    defenderName,
    fortLevel: report.fortLevel,
    tokens,
    forces: [
      `${attackersName} ${report.attackerIds.length > 1 ? "attack" : "attacks"}: ${sideOf("attacker")}`,
      `${defenderName} defends${report.fortLevel >= 1 ? ` behind a level ${report.fortLevel} fort` : ""}: ${sideOf("defender")}`,
    ],
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
 * The replay's steps: 0 the deployment, 1 to n the rounds, n + 1 the result. The number of rounds tells how the battle
 * went, so only the result shows it (FR-277): "Deployment", "Round 2", "Result: 4 rounds were fought".
 */
export function stepText(step: number, rounds: number): string {
  if (step === 0) return "Deployment";
  if (step <= rounds) return `Round ${step}`;
  return `Result: ${rounds === 0 ? "no round was" : rounds === 1 ? "1 round was" : `${rounds} rounds were`} fought`;
}
