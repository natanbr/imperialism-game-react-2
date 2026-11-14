// What the Attack screen shows (FR-230; Imp1 Scouting Report, rules 11 section 5.3), derived from the engine's reads:
// our chosen regiments, the province's defenders as they stand, the FR-226 estimate and whether an attack can be ordered
// now. No React, no store: the dialog renders this view and sends its one order; validateOrder stays the judge.
import {
  attackStatus,
  attackTargets,
  battleEstimate,
  COMBAT,
  countryName,
  defendersOf,
  ESTIMATE,
  findRegiment,
  fortLevelOf,
  provinceById,
  REGIMENTS,
  validateOrder,
  type AttackStatus,
  type BattleEstimate,
  type EstimateVerdict,
  type Order,
  type Protection,
  type RegimentType,
} from "@/engine";
import type { GameState } from "@/types/GameState";
import { refusalSentence, selectedRegimentIds } from "./armyView";

/** The regiments the Attack button sends, where from and where to (the store's `attackPlan`, FR-230). */
export interface AttackPlanView {
  fromProvinceId: string;
  toProvinceId: string;
  regimentIds: string[];
}

export interface AttackRegimentView {
  id: string;
  name: string;
  type: RegimentType;
  /** "Minutemen": the type's name (the defenders' list shows it). */
  typeName: string;
  health: number;
}

export interface DefenderView extends AttackRegimentView {
  /** "entrenched", "fort level 1", or "" without protection (FR-219). */
  protection: string;
}

export interface AttackView {
  /** "Attack Arvelia": the dialog's name, after the province attacked. */
  title: string;
  provinceName: string;
  /** The province's owner: "Arvelia", "Valdoria". */
  ownerName: string;
  ours: AttackRegimentView[];
  defenders: DefenderView[];
  /** The province's fort level, 0 without one. */
  fortLevel: number;
  /** "Fort level 1: our hits do 30% less damage"; absent without a fort. */
  fortText?: string;
  /** "No one defends Arvelia: it falls without a battle." when it has no defender (FR-217). */
  noDefenders?: string;
  estimate: BattleEstimate;
  /** "Our strength 36, theirs 18.8: Likely victory" (FR-226). */
  estimateText: string;
  /** What the estimate's numbers are, with the cover that applies here (FR-278; `estimateExplanation`). */
  estimateExplanation: string;
  /** "Entrenched: takes 20% less damage." while a defender is entrenched (FR-278); absent otherwise. */
  entrenchedText?: string;
  status: AttackStatus;
  /** Why no attack can be ordered yet (no war, or one that starts next turn); absent when at war. */
  warNote?: string;
  /** "Attack": the order and, when validateOrder refuses it, why. Absent while no war is active. */
  attack?: { order: Order; refusal?: string };
}

const VERDICT_TEXT: Record<EstimateVerdict, string> = {
  "likely-victory": "Likely victory",
  uncertain: "Uncertain",
  "likely-defeat": "Likely defeat",
};

/** A strength to one decimal at most: 36, 18.8 (18.75 rounds up), 12.5. */
export const strengthText = (n: number): string => String(Math.round(n * 10) / 10);

/** "Our strength 36, theirs 18.8: Likely victory" (FR-226 words the verdict code). */
export const estimateText = (estimate: BattleEstimate): string =>
  `Our strength ${strengthText(estimate.attack)}, theirs ${strengthText(estimate.defence)}: ${VERDICT_TEXT[estimate.verdict]}`;

/** A factor to two decimals at most: 1.25, 1.43 (1 / 0.7), 2. */
const factorText = (n: number): string => String(Math.round(n * 100) / 100);

/**
 * FR-278: what `battleEstimate` computes (FR-226), in words: each side's strength is FPN x health / 100 added up, a
 * defender's divided by the share of damage it still takes under cover (1 - R, FR-219), which is the same as counting it
 * 1 / (1 - R) times as strong (FR-281's words); the verdict's thresholds from ESTIMATE. The cover part names the
 * protection the defenders here have: the fort when there is one (it covers them all), else entrenchment when one of
 * them is entrenched, else none.
 */
export function estimateExplanation(protections: readonly Protection[]): string {
  const fort = protections.find((p) => p.kind === "fort");
  const cover = fort ?? protections.find((p) => p.kind === "entrenched");
  const factor = cover ? factorText(100 / (100 - cover.percent)) : "";
  const coverText = fort
    ? `; behind the fort a defender counts ${factor} times as strong`
    : cover
      ? `; an entrenched defender counts ${factor} times as strong`
      : "";
  return (
    `Strength: each regiment's firepower times its health, added up${coverText}. ` +
    `Likely victory at ${ESTIMATE.likelyVictory} times theirs or more, uncertain at ${ESTIMATE.uncertain} or more.`
  );
}

/** The FR-219 protection as the defenders' list words it. */
const protectionText = (protection: Protection): string =>
  protection.kind === "fort" ? `fort level ${protection.level}` : protection.kind === "entrenched" ? "entrenched" : "";

const regimentView = (r: { id: string; name: string; type: RegimentType; health: number }): AttackRegimentView => ({
  id: r.id,
  name: r.name,
  type: r.type,
  typeName: REGIMENTS[r.type].name,
  health: r.health,
});

export function attackView(state: GameState, nationId: string, plan: AttackPlanView): AttackView {
  const province = provinceById(state, plan.toProvinceId);
  const provinceName = province?.name ?? plan.toProvinceId;
  const ownerName = province ? (countryName(state, province.ownerId) ?? province.ownerId) : provinceName;
  const ours = plan.regimentIds.flatMap((id) => {
    const found = findRegiment(state, id);
    return found ? [regimentView(found.regiment)] : [];
  });
  const standing = defendersOf(state, plan.toProvinceId);
  const defenders = standing.map((d): DefenderView => ({ ...regimentView(d.regiment), protection: protectionText(d.protection) }));
  const entrenched = standing.some((d) => d.protection.kind === "entrenched");
  const fortLevel = fortLevelOf(state, plan.toProvinceId);
  const estimate = battleEstimate(state, plan.regimentIds, plan.toProvinceId);
  const status = attackStatus(state, nationId, plan.toProvinceId);
  const order: Order = { kind: "moveArmy", nationId, fromProvinceId: plan.fromProvinceId, regimentIds: [...plan.regimentIds], toProvinceId: plan.toProvinceId };
  const result = validateOrder(state, order);
  const warNote =
    status === "not-at-war"
      ? `We are not at war with ${ownerName}. Declare war in Diplomacy; the war starts next turn.`
      : status === "war-starts-next-turn"
        ? "The war starts next turn."
        : undefined;
  return {
    title: `Attack ${provinceName}`,
    provinceName,
    ownerName,
    ours,
    defenders,
    fortLevel,
    ...(fortLevel >= 1
      ? { fortText: `Fort level ${fortLevel}: our hits do ${COMBAT.fortBasePercent + COMBAT.fortPercentPerLevel * fortLevel}% less damage` }
      : {}),
    ...(defenders.length === 0 ? { noDefenders: `No one defends ${provinceName}: it falls without a battle.` } : {}),
    estimate,
    estimateText: estimateText(estimate),
    estimateExplanation: estimateExplanation(standing.map((d) => d.protection)),
    ...(entrenched ? { entrenchedText: `Entrenched: takes ${COMBAT.entrenchedPercent}% less damage.` } : {}),
    status,
    ...(warNote ? { warNote } : {}),
    ...(status === "ready" ? { attack: result.ok ? { order } : { order, refusal: refusalSentence(result.reason) } } : {}),
  };
}

/**
 * A click on a tile with regiments selected (FR-230): the Attack screen's plan when the tile's province borders the
 * selection's and belongs to another country, with the selected regiments still Available there (the army's order);
 * undefined otherwise.
 */
export function attackPlanAt(
  state: GameState,
  nationId: string,
  selection: { provinceId: string; regimentIds: readonly string[] },
  toProvinceId: string
): AttackPlanView | undefined {
  if (!attackTargets(state, nationId, selection.provinceId).some((p) => p.id === toProvinceId)) return undefined;
  const regimentIds = selectedRegimentIds(state, nationId, selection);
  return regimentIds.length > 0 ? { fromProvinceId: selection.provinceId, toProvinceId, regimentIds } : undefined;
}
