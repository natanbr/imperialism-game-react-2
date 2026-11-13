// Combat (M9, FR-218 to FR-220, FR-226, FR-230): the round model of one battle, pure and fed by the combat stream only;
// the estimate the attack screen and the scripted player read; and the view helpers of the attack screen. No state is
// changed here: the combat phase (systems/combatSystem.ts) applies what a battle did.
import type { CountryId, NationId, ProvinceId, RegimentId } from "@/types/Common";
import type { GameState } from "@/types/GameState";
import type { Province } from "@/types/Province";
import type { Regiment } from "@/types/Army";
import type { RegimentType } from "@/types/Unit";
import type { BattleResult, BattleRound, BattleShot, BattleSide } from "@/types/Battle";
import { COMBAT, ESTIMATE, FIRING_ORDER } from "@/definisions/combatRules";
import { entrenches, isMilitia, REGIMENTS } from "@/definisions/regiments";
import type { Rng } from "../rng";
import { warActive, warBetween } from "../diplomacy/queries";
import { adjacentProvinces, provinceById } from "../world/provinces";
import { armyAt, findRegiment, serialOf, strength } from "./armies";

// --- protection and damage (FR-219) ----------------------------------------------------------

/**
 * What takes damage off a regiment's hits: nothing for an attacker; for a defender a fort of level L (20 + 10 x L
 * percent, Imp1 manual p89), else entrenchment (20%) for the types that entrench (FR-199), else nothing.
 */
export type Protection =
  | { kind: "none"; percent: 0 }
  | { kind: "entrenched"; percent: number }
  | { kind: "fort"; level: number; percent: number };

export function protectionOf(type: RegimentType, side: BattleSide, fortLevel: number): Protection {
  if (side === "attacker") return { kind: "none", percent: 0 };
  if (fortLevel >= 1) return { kind: "fort", level: fortLevel, percent: COMBAT.fortBasePercent + COMBAT.fortPercentPerLevel * fortLevel };
  if (entrenches(type)) return { kind: "entrenched", percent: COMBAT.entrenchedPercent };
  return { kind: "none", percent: 0 };
}

/**
 * FR-219: a hit removes max(1, floor((FPN x 4 - DEF x 2) x (1 - R))) health, FPN the shooter's, DEF the target's normal
 * defence, R its protection. Whole numbers only (R in percent), so 22.4 is 22 and never 21.99.
 */
export function shotDamage(shooter: RegimentType, target: RegimentType, protection: Pick<Protection, "percent">): number {
  const base = REGIMENTS[shooter].stats.fpNormal * COMBAT.firepowerFactor - REGIMENTS[target].stats.defense * COMBAT.defenceFactor;
  return Math.max(1, Math.floor((base * (100 - protection.percent)) / 100));
}

/** The province's fort: the highest `fortLevel` on its tiles, 0 without one (a Great Power's capital starts at 1, FR-203). */
export function fortLevelOf(state: GameState, provinceId: ProvinceId): number {
  const province = provinceById(state, provinceId);
  if (!province) return 0;
  const tiles = new Set(province.tileIds);
  return state.map.tiles.flat().reduce((most, t) => (tiles.has(t.id) ? Math.max(most, t.fortLevel ?? 0) : most), 0);
}

// --- one battle (FR-218 to FR-220) ---------------------------------------------------------

/** A regiment as a battle sees it. */
export interface BattleUnit {
  id: RegimentId;
  ownerId: CountryId;
  type: RegimentType;
  name: string;
  health: number;
  side: BattleSide;
}

export interface BattleFight {
  rounds: BattleRound[];
  /** Every unit's health at the end. */
  health: Record<RegimentId, number>;
  /** The units that routed, in the order they routed (FR-220). */
  routed: RegimentId[];
  result: BattleResult;
}

/** Regiment ids by their number ("regiment-9" before "regiment-10"), then as text. */
export const byRegimentId = (a: { id: RegimentId }, b: { id: RegimentId }): number =>
  serialOf(a.id) - serialOf(b.id) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

const groupOf = (type: RegimentType): number => FIRING_ORDER.indexOf(REGIMENTS[type].arm);

/**
 * One battle (FR-218 to FR-220): at most 8 rounds; in each the defenders fire, then the attackers; within a side cavalry,
 * then infantry, then artillery, each group in regiment id order. Each standing regiment (health above 0, not routed)
 * fires once at the standing enemy with the lowest health (ties: lowest id); one draw per shot, a hit below 0.70. A hit
 * that leaves a non-militia regiment at 25 or less routs it. The battle ends when a side has no standing regiment, or
 * after the last round; the attackers win only when no defender is standing. No defender at all: no round and no draw.
 */
export function fightBattle(input: { units: readonly BattleUnit[]; fortLevel: number }, rng: Rng, maxRounds: number = COMBAT.maxRounds): BattleFight {
  const { units, fortLevel } = input;
  const health = new Map(units.map((u) => [u.id, u.health]));
  const routed: RegimentId[] = [];
  const protection = new Map(units.map((u) => [u.id, protectionOf(u.type, u.side, fortLevel)]));
  const standing = (u: BattleUnit) => (health.get(u.id) ?? 0) > 0 && !routed.includes(u.id);
  const sideStanding = (side: BattleSide) => units.some((u) => u.side === side && standing(u));
  const firing = (side: BattleSide) => units.filter((u) => u.side === side).sort((a, b) => groupOf(a.type) - groupOf(b.type) || byRegimentId(a, b));
  const order: Record<BattleSide, BattleUnit[]> = { defender: firing("defender"), attacker: firing("attacker") };

  const rounds: BattleRound[] = [];
  while (rounds.length < maxRounds && sideStanding("defender") && sideStanding("attacker")) {
    const shots: BattleShot[] = [];
    for (const side of ["defender", "attacker"] as const) {
      for (const shooter of order[side]) {
        if (!standing(shooter)) continue;
        const enemies = units.filter((u) => u.side !== side && standing(u));
        if (enemies.length === 0) continue;
        const target = enemies.reduce((best, u) => {
          const diff = health.get(u.id)! - health.get(best.id)!;
          return diff < 0 || (diff === 0 && byRegimentId(u, best) < 0) ? u : best;
        });
        const hit = rng.next() < COMBAT.hitChance;
        let damage = 0;
        if (hit) {
          const left = health.get(target.id)!;
          damage = Math.min(left, shotDamage(shooter.type, target.type, protection.get(target.id)!));
          const now = left - damage;
          health.set(target.id, now);
          if (now > 0 && now <= COMBAT.routHealth && !isMilitia(target.type)) routed.push(target.id);
        }
        shots.push({ shooterId: shooter.id, targetId: target.id, hit, damage });
      }
    }
    rounds.push({ shots });
  }
  return {
    rounds,
    health: Object.fromEntries(units.map((u) => [u.id, health.get(u.id)!])),
    routed,
    result: sideStanding("defender") ? "defender-held" : "attacker-won",
  };
}

// --- the estimate (FR-226) and the attack screen (FR-230) ---------------------------------------

export interface Defender {
  regiment: Regiment;
  ownerId: CountryId;
  protection: Protection;
}

/** The province's defenders as they stand now: its owner's regiments there, militia included, by id, with their protection. */
export function defendersOf(state: GameState, provinceId: ProvinceId): Defender[] {
  const province = provinceById(state, provinceId);
  if (!province) return [];
  const fortLevel = fortLevelOf(state, provinceId);
  return [...(armyAt(state, province.ownerId, provinceId)?.regiments ?? [])]
    .sort(byRegimentId)
    .map((regiment) => ({ regiment, ownerId: province.ownerId, protection: protectionOf(regiment.type, "defender", fortLevel) }));
}

/** FR-226: the sum over the province's defenders of FPN x health / 100 / (1 - R); 18.75 for Arvelia's 3 entrenched Minutemen. */
export const defenceOf = (state: GameState, provinceId: ProvinceId): number =>
  defendersOf(state, provinceId).reduce(
    (sum, d) => sum + (REGIMENTS[d.regiment.type].stats.fpNormal * d.regiment.health) / (100 - d.protection.percent),
    0
  );

export type EstimateVerdict = "likely-victory" | "uncertain" | "likely-defeat";

export interface BattleEstimate {
  /** `strength` of the listed regiments (FR-204). */
  attack: number;
  defence: number;
  /** attack / defence; Infinity against no defender (0 with no attacker either). */
  ratio: number;
  /** 1.5 or more "likely-victory", 0.75 or more "uncertain", else "likely-defeat"; the screen words it. */
  verdict: EstimateVerdict;
}

/** FR-226: the start army (36) against Arvelia's 3 entrenched Minutemen (18.75): 1.92, likely victory. */
export function battleEstimate(state: GameState, regimentIds: readonly RegimentId[], provinceId: ProvinceId): BattleEstimate {
  const regiments = regimentIds.flatMap((id) => {
    const found = findRegiment(state, id);
    return found ? [found.regiment] : [];
  });
  const attack = strength(regiments);
  const defence = defenceOf(state, provinceId);
  const ratio = defence === 0 ? (attack > 0 ? Infinity : 0) : attack / defence;
  const verdict: EstimateVerdict = ratio >= ESTIMATE.likelyVictory ? "likely-victory" : ratio >= ESTIMATE.uncertain ? "uncertain" : "likely-defeat";
  return { attack, defence, ratio, verdict };
}

/** The provinces bordering `provinceId` that another country holds: where its army could attack (FR-211 "Attack Arvelia", FR-230). */
export const attackTargets = (state: GameState, nationId: NationId, provinceId: ProvinceId): Province[] =>
  adjacentProvinces(state, provinceId).filter((p) => p.ownerId !== nationId);

/**
 * May the nation attack the province this turn (FR-230): "ready" with a war active (FR-167), "war-starts-next-turn"
 * with a war declared (this turn's order or a recorded war that begins later), "not-at-war" without one, "own-province"
 * for its own land. An unknown province reads "not-at-war".
 */
export type AttackStatus = "ready" | "war-starts-next-turn" | "not-at-war" | "own-province";

export function attackStatus(state: GameState, nationId: NationId, provinceId: ProvinceId): AttackStatus {
  const province = provinceById(state, provinceId);
  if (!province) return "not-at-war";
  const ownerId = province.ownerId;
  if (ownerId === nationId) return "own-province";
  if (warActive(state, nationId, ownerId)) return "ready";
  const declared = state.intents.some((i) => i.kind === "war" && i.nationId === nationId && i.targetId === ownerId);
  return declared || warBetween(state, nationId, ownerId) ? "war-starts-next-turn" : "not-at-war";
}
