// The scripted war (M9; rules remake, decision card Q35). FR-228, at war: (a) the capital province keeps its 4 arms
// (FR-213), (b) the other regiments march one province a turn toward the nation's province that borders the strongest
// enemy force, (c) they attack a bordering enemy province when the estimate (FR-226) is 1.5 or more, a province lost in
// this war first, then the lowest id; (d) peace is FR-174's (diplomacy.ts). FR-274, at peace: from turn 10 it picks the
// bordering minor with the lowest defence, recruits until its field army is twice that defence, declares war (one war
// at a time, never on a Great Power) and marches. On a world without provinces it orders nothing.
import type { CountryId, MinorNationId, NationId, ProvinceId, RegimentId } from "@/types/Common";
import type { GameState } from "@/types/GameState";
import type { Province } from "@/types/Province";
import type { Regiment } from "@/types/Army";
import { isMilitia, REGIMENTS, SCRIPTED_GARRISON } from "@/definisions/regiments";
import { SCRIPTED_WAR } from "@/definisions/combatRules";
import { armiesOf, armyAt, capitalProvinceOf, holds, strength, strengthIn } from "../army/armies";
import { battleEstimate, defenceOf } from "../army/combat";
import { warActive, warBetween } from "../diplomacy/queries";
import { nationById } from "../orders/queries";
import { healthyWorkers } from "../industry/labour";
import { ResourceType } from "@/types/Resource";
import type { Order } from "../orders/Order";
import { adjacentProvinces, provincesOf } from "../world/provinces";

type Propose = (order: Order) => boolean;

const compareIds = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

/**
 * FR-228 (a), FR-213: the regiments that stay in the capital province: its non-militia regiments, oldest first, until
 * their ARMS reach 4 (the start army: 1st and 2nd Regulars and 1st Artillery). Empty without the capital province.
 */
export function capitalKeep(state: GameState, nationId: NationId): Set<RegimentId> {
  const keep = new Set<RegimentId>();
  const capital = capitalProvinceOf(state, nationId);
  if (!capital || capital.ownerId !== nationId) return keep;
  let arms = 0;
  for (const r of armyAt(state, nationId, capital.id)?.regiments ?? []) {
    if (arms >= SCRIPTED_GARRISON.capitalArms) break;
    if (isMilitia(r.type)) continue;
    keep.add(r.id);
    arms += REGIMENTS[r.type].stats.armamentsCost;
  }
  return keep;
}

interface FieldRegiment {
  regiment: Regiment;
  provinceId: ProvinceId;
}

/** The regiments beyond the capital keep in the nation's own provinces, provinces in state order, regiments by id. */
function fieldRegiments(state: GameState, nationId: NationId): FieldRegiment[] {
  const keep = capitalKeep(state, nationId);
  return armiesOf(state, nationId)
    .filter((a) => holds(state, nationId, a.provinceId))
    .flatMap((a) => a.regiments.filter((r) => !isMilitia(r.type) && !keep.has(r.id)).map((regiment) => ({ regiment, provinceId: a.provinceId })));
}

/** FR-274: the strength (FR-204) of the regiments beyond the capital keep. */
export const fieldStrength = (state: GameState, nationId: NationId): number => strength(fieldRegiments(state, nationId).map((f) => f.regiment));

/** FR-275: the nation has regiments beyond its capital keep in its own provinces (a field army). */
export const hasFieldArmy = (state: GameState, nationId: NationId): boolean => fieldRegiments(state, nationId).length > 0;

const countriesOf = (state: GameState): CountryId[] => [...state.nations.map((n) => n.id), ...state.minorNations.map((m) => m.id)];

/** The countries at war with the nation (a war recorded, active or not yet). */
const enemiesOf = (state: GameState, nationId: NationId): CountryId[] =>
  countriesOf(state).filter((id) => id !== nationId && warBetween(state, nationId, id) !== undefined);

/** The countries the nation declares war on this turn (its own orders, before End Turn records them). */
const declaredOn = (state: GameState, nationId: NationId): CountryId[] =>
  state.intents.filter((i) => i.kind === "war" && i.nationId === nationId && i.targetId !== undefined).map((i) => i.targetId!);

const isMinorTarget = (state: GameState, id: CountryId): boolean => state.minorNations.some((m) => m.id === id && m.colonyOf === undefined);

/** The minor's provinces that border one of the nation's. */
const borderProvinces = (state: GameState, nationId: NationId, countryId: CountryId): Province[] =>
  provincesOf(state, countryId).filter((p) => adjacentProvinces(state, p.id).some((q) => q.ownerId === nationId));

/** The defence (FR-226) of the weakest of the minor's provinces that border the nation; Infinity with none. */
const targetDefence = (state: GameState, nationId: NationId, minorId: MinorNationId): number =>
  Math.min(...borderProvinces(state, nationId, minorId).map((p) => defenceOf(state, p.id)));

/**
 * FR-274: the minor the nation's campaign is against: the minor (not a colony) it is at war with, while it is at war
 * with minors only; else, from turn 10 and at war with no one, the minor with a province bordering one of its own and
 * the lowest defence (FR-226; ties: lowest id). Undefined on a world without provinces, before turn 10 at peace, at war
 * with a Great Power, or with no such minor.
 */
export function campaignTarget(state: GameState, nationId: NationId): MinorNationId | undefined {
  if (state.provinces.length === 0 || !nationById(state, nationId)) return undefined;
  const enemies = enemiesOf(state, nationId);
  if (enemies.length > 0) {
    if (!enemies.every((id) => state.minorNations.some((m) => m.id === id))) return undefined;
    return enemies.filter((id) => isMinorTarget(state, id)).sort(compareIds)[0];
  }
  if (state.turn < SCRIPTED_WAR.fromTurn) return undefined;
  const candidates = state.minorNations
    .filter((m) => m.colonyOf === undefined && borderProvinces(state, nationId, m.id).length > 0)
    .map((m) => ({ id: m.id, defence: targetDefence(state, nationId, m.id) }))
    .sort((a, b) => a.defence - b.defence || compareIds(a.id, b.id));
  return candidates[0]?.id;
}

/** FR-274: the field army twice the target's defence. */
const campaignNeed = (state: GameState, nationId: NationId, minorId: MinorNationId): number => SCRIPTED_WAR.strengthFactor * targetDefence(state, nationId, minorId);

/**
 * FR-274: the campaign wants one more regiment (SCRIPTED_WAR.regiment) this turn: its field strength is below twice the
 * target's defence, and the nation has what the regiment takes besides cash and armaments (a horse, a healthy worker of
 * its grade), so its run never makes armaments for a recruit it cannot raise. The recruit itself, its limits (FR-213)
 * and its armaments are the garrison's (scriptedArmy.ts, economy.ts).
 */
export function campaignRecruit(state: GameState, nationId: NationId): boolean {
  const target = campaignTarget(state, nationId);
  if (target === undefined || fieldStrength(state, nationId) >= campaignNeed(state, nationId, target)) return false;
  const nation = nationById(state, nationId)!;
  const def = REGIMENTS[SCRIPTED_WAR.regiment];
  const horses = (nation.warehouse as Record<string, number>)[ResourceType.Horses] ?? 0;
  return horses >= def.horses && def.worker !== undefined && healthyWorkers(nation.industry, def.worker) > 0;
}

/**
 * FR-274: at war with no one, the declaration of war on the campaign's target once at least one regiment beyond the
 * keep makes a field strength of twice its defence. Planned first, so the economy and the trade of this turn see it.
 */
export function planWarDeclaration(view: () => GameState, nationId: NationId, propose: Propose): void {
  const state = view();
  if (enemiesOf(state, nationId).length > 0 || declaredOn(state, nationId).length > 0) return;
  const target = campaignTarget(state, nationId);
  if (target === undefined) return;
  const field = fieldRegiments(state, nationId);
  if (field.length === 0 || strength(field.map((f) => f.regiment)) < campaignNeed(state, nationId, target)) return;
  propose({ kind: "proposeOverture", nationId, overture: "war", targetId: target });
}

/** The province one step from `from` toward `to` through the nation's own provinces (lowest id on ties); undefined when cut off. */
function nextStep(state: GameState, nationId: NationId, from: ProvinceId, to: ProvinceId): ProvinceId | undefined {
  const own = (p: Province) => p.ownerId === nationId;
  const distance = new Map<ProvinceId, number>([[to, 0]]);
  const queue = [to];
  while (queue.length > 0) {
    const at = queue.shift()!;
    for (const next of adjacentProvinces(state, at).filter(own)) {
      if (distance.has(next.id)) continue;
      distance.set(next.id, distance.get(at)! + 1);
      queue.push(next.id);
    }
  }
  const here = distance.get(from);
  if (here === undefined || here === 0) return undefined;
  return adjacentProvinces(state, from)
    .filter((p) => own(p) && distance.get(p.id) === here - 1)
    .map((p) => p.id)
    .sort(compareIds)[0];
}

/**
 * FR-228 (b): the nation's province that borders the strongest enemy force: the highest strength (FR-204) of an enemy
 * in a bordering province (ties: lowest id); undefined when none of its provinces borders an enemy's.
 */
function stagingProvince(state: GameState, nationId: NationId, enemies: readonly CountryId[]): ProvinceId | undefined {
  const scored = provincesOf(state, nationId).flatMap((own) => {
    const facing = adjacentProvinces(state, own.id).filter((p) => enemies.includes(p.ownerId));
    if (facing.length === 0) return [];
    return [{ id: own.id, force: Math.max(...facing.map((p) => strengthIn(state, p.ownerId, p.id))) }];
  });
  scored.sort((a, b) => b.force - a.force || compareIds(a.id, b.id));
  return scored[0]?.id;
}

/**
 * FR-228 (c) and (b), and FR-274's march: at war, or declaring war this turn, the attacks the estimate allows, then the
 * marches of the regiments left toward the staging province. Planned after the economy and the civilians.
 */
export function planWarMoves(view: () => GameState, nationId: NationId, propose: Propose): void {
  const state = view();
  if (state.provinces.length === 0) return;
  const enemies = [...new Set([...enemiesOf(state, nationId), ...declaredOn(state, nationId)])];
  if (enemies.length === 0) return;
  const field = fieldRegiments(state, nationId);
  const used = new Set<RegimentId>();

  // (c) a province lost in this war first, then the lowest id
  const lost = (p: Province) =>
    (warBetween(state, nationId, p.ownerId)?.captures ?? []).some((c) => c.provinceId === p.id && c.fromId === nationId && c.toId === p.ownerId);
  const targets = state.provinces
    .filter((p) => enemies.includes(p.ownerId) && warActive(state, nationId, p.ownerId))
    .filter((p) => adjacentProvinces(state, p.id).some((q) => q.ownerId === nationId))
    .sort((a, b) => Number(lost(b)) - Number(lost(a)) || compareIds(a.id, b.id));
  for (const target of targets) {
    const sources = adjacentProvinces(state, target.id).filter((p) => p.ownerId === nationId).map((p) => p.id);
    const force = field.filter((f) => !used.has(f.regiment.id) && sources.includes(f.provinceId));
    if (force.length === 0) continue;
    if (battleEstimate(view(), force.map((f) => f.regiment.id), target.id).ratio < SCRIPTED_WAR.attackRatio) continue;
    for (const from of sources) {
      const ids = force.filter((f) => f.provinceId === from).map((f) => f.regiment.id);
      if (ids.length > 0 && propose({ kind: "moveArmy", nationId, fromProvinceId: from, regimentIds: ids, toProvinceId: target.id })) {
        ids.forEach((id) => used.add(id));
      }
    }
  }

  // (b) the others march one province toward the staging province
  const staging = stagingProvince(state, nationId, enemies);
  if (!staging) return;
  for (const province of provincesOf(state, nationId)) {
    if (province.id === staging) continue;
    const ids = field.filter((f) => f.provinceId === province.id && !used.has(f.regiment.id)).map((f) => f.regiment.id);
    const next = ids.length > 0 ? nextStep(state, nationId, province.id, staging) : undefined;
    if (next) propose({ kind: "moveArmy", nationId, fromProvinceId: province.id, regimentIds: ids, toProvinceId: next });
  }
}
