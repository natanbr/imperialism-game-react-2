// The scripted war (M9; rules remake, decision card Q35). FR-228, at war: (a) the capital province keeps its 4 arms
// (FR-213), (b) the other regiments march one province a turn toward the nation's province that borders the strongest
// enemy force, (c) they attack a bordering enemy province when the estimate (FR-226) is 1.5 or more, a province lost in
// this war first, then the lowest id; (d) peace: FR-174's answers, FR-408's offers (diplomacy.ts). FR-274, at peace:
// from turn 10 it picks the bordering minor with the lowest defence, recruits until its field army is twice that
// defence, declares war (one war at a time) and marches. M13: from turn 20, with no minor left to take, the other Great
// Power (FR-488, card Q114 (b)), for one province and never its capital (FR-489, card Q115 (a)); its army gathers at the
// front first, in sight, and declares at more than twice the defence (FR-538). On a world without provinces it orders nothing.
import type { CountryId, NationId, ProvinceId, RegimentId } from "@/types/Common";
import type { GameState } from "@/types/GameState";
import type { Nation } from "@/types/Nation";
import type { Province } from "@/types/Province";
import type { Regiment } from "@/types/Army";
import type { RegimentType } from "@/types/Unit";
import { isMilitia, REGIMENTS, SCRIPTED_GARRISON } from "@/definisions/regiments";
import { SCRIPTED_WAR } from "@/definisions/combatRules";
import { armiesOf, armyAt, capitalProvinceOf, holds, strength, strengthIn, upkeepOf } from "../army/armies";
import { battleEstimate, defenceOf } from "../army/combat";
import { warActive, warBetween } from "../diplomacy/queries";
import { pairKey } from "../diplomacy/relations";
import { warAimHeld, warOfChoice } from "../diplomacy/scriptedAnswers";
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
const isGreatPower = (state: GameState, id: CountryId): boolean => state.nations.some((n) => n.id === id);

/**
 * The country's provinces that border one of the nation's: what its campaign measures and attacks. A Great Power's
 * capital province is left out (FR-489: the war on it is for one province, never the capital, whose fall ends its game).
 */
function borderProvinces(state: GameState, nationId: NationId, countryId: CountryId): Province[] {
  const capital = isGreatPower(state, countryId) ? capitalProvinceOf(state, countryId)?.id : undefined;
  return provincesOf(state, countryId).filter((p) => p.id !== capital && adjacentProvinces(state, p.id).some((q) => q.ownerId === nationId));
}

/** The defence (FR-226) of the weakest of the country's provinces that border the nation; Infinity with none. */
const targetDefence = (state: GameState, nationId: NationId, countryId: CountryId): number =>
  Math.min(...borderProvinces(state, nationId, countryId).map((p) => defenceOf(state, p.id)));

/** The bordering country with the lowest defence (ties: lowest id), among the candidates. */
function weakest(state: GameState, nationId: NationId, candidates: readonly CountryId[]): CountryId | undefined {
  return candidates
    .filter((id) => borderProvinces(state, nationId, id).length > 0)
    .map((id) => ({ id, defence: targetDefence(state, nationId, id) }))
    .sort((a, b) => a.defence - b.defence || compareIds(a.id, b.id))[0]?.id;
}

/**
 * FR-488 (card Q114 (b)): a Great Power the nation may start a campaign on: from `SCRIPTED_WAR.greatPowerFromTurn`, with
 * no alliance or pact between the two and no peace between them in the last `greatPowerPeaceTurns` turns.
 */
function greatPowerCandidate(state: GameState, nationId: NationId, otherId: NationId): boolean {
  if (otherId === nationId || state.turn < SCRIPTED_WAR.greatPowerFromTurn) return false;
  const pair = state.diplomacy[pairKey(nationId, otherId)];
  if (!pair || pair.alliance || pair.pact) return false;
  return pair.peaceTurn === undefined || state.turn - pair.peaceTurn >= SCRIPTED_WAR.greatPowerPeaceTurns;
}

/**
 * FR-274, FR-488: the country the nation's campaign is against. At war: the minor (not a colony) it is at war with, while
 * it is at war with minors only; or the Great Power it declared war on, alone, until it holds a province it took from it
 * (FR-489). At war with no one, from turn 10: the bordering minor (not a colony, no pact with it, FR-542) with the lowest defence (FR-226; ties:
 * lowest id); with none, from turn 20, the bordering Great Power it may go to war with (`greatPowerCandidate`) with the
 * lowest defence, its capital province left out. Undefined on a world without provinces, before turn 10 at peace, in any
 * other war, or with no such country.
 */
export function campaignTarget(state: GameState, nationId: NationId): CountryId | undefined {
  if (state.provinces.length === 0 || !nationById(state, nationId)) return undefined;
  const enemies = enemiesOf(state, nationId);
  if (enemies.length > 0) {
    if (enemies.every((id) => state.minorNations.some((m) => m.id === id))) return enemies.filter((id) => isMinorTarget(state, id)).sort(compareIds)[0];
    const [only] = enemies;
    return enemies.length === 1 && warOfChoice(state, nationId, only) && !warAimHeld(state, nationId, only) ? only : undefined;
  }
  if (state.turn < SCRIPTED_WAR.fromTurn) return undefined;
  // FR-542: not a minor it holds a pact with (scriptedInfluence.ts courts none on its border, but borders move)
  const minor = weakest(state, nationId, state.minorNations.filter((m) => m.colonyOf === undefined && !state.diplomacy[pairKey(nationId, m.id)]?.pact).map((m) => m.id));
  if (minor !== undefined) return minor;
  return weakest(state, nationId, state.nations.filter((n) => greatPowerCandidate(state, nationId, n.id)).map((n) => n.id));
}

/** FR-274: the field army twice the target's defence. */
const campaignNeed = (state: GameState, nationId: NationId, targetId: CountryId): number => SCRIPTED_WAR.strengthFactor * targetDefence(state, nationId, targetId);

/**
 * FR-274: the campaign has a target and its field strength is below twice the target's defence. FR-538: against a Great
 * Power, at most twice: its war waits for more than twice (`planWarDeclaration`), so the recruits go on until then.
 */
function campaignShort(state: GameState, nationId: NationId): boolean {
  const target = campaignTarget(state, nationId);
  if (target === undefined) return false;
  const field = fieldStrength(state, nationId);
  const need = campaignNeed(state, nationId, target);
  return isGreatPower(state, target) ? field <= need : field < need;
}

/**
 * FR-538 (M13 review ST-01): with a Great Power the campaign's target and the campaign no longer short, the nation's
 * province that borders the target's weakest province (`targetDefence`; ties: lowest id), lowest id first. The field
 * army gathers there at peace, in sight of the other nation: what the Defense Minister's warning (FR-495, more than twice
 * the defence) reads. Undefined with a minor or no target, and while short: an army that stood at the border while it
 * recruited raised the defence the other nation had to beat, so two scripted nations never declared and kept recruiting
 * until one could not pay its regiments (FR-247's seed 2). Not exported: `planWarMoves` and `planWarDeclaration` use it.
 */
function campaignFront(state: GameState, nationId: NationId): ProvinceId | undefined {
  const target = campaignTarget(state, nationId);
  if (target === undefined || !isGreatPower(state, target) || campaignShort(state, nationId)) return undefined;
  const [weakestProvince] = borderProvinces(state, nationId, target)
    .map((p) => ({ id: p.id, defence: defenceOf(state, p.id) }))
    .sort((a, b) => a.defence - b.defence || compareIds(a.id, b.id));
  if (!weakestProvince) return undefined;
  return adjacentProvinces(state, weakestProvince.id)
    .filter((p) => p.ownerId === nationId)
    .map((p) => p.id)
    .sort(compareIds)[0];
}

/**
 * FR-458: the workers of `grade` training keeps for the campaign's recruits while it is short (`campaignShort`): one for
 * each regiment the horses in stock can raise, when the campaign list's first regiment (Cuirassiers, FR-482) draws a
 * worker of that grade (a trained one). Without it, cash beyond the reserve trained the last trained workers to experts
 * and no Cuirassiers could be raised (measured on the continent once depots gathered more: no war by turn 25 on seeds 1 to 4).
 */
export function workersKeptForCampaign(state: GameState, nationId: NationId, grade: "untrained" | "trained"): number {
  const def = REGIMENTS[SCRIPTED_WAR.campaignRegiments[0]];
  if (def.worker !== grade || !campaignShort(state, nationId)) return 0;
  const horses = (nationById(state, nationId)?.warehouse as Record<string, number> | undefined)?.[ResourceType.Horses] ?? 0;
  return def.horses > 0 ? Math.floor(horses / def.horses) : Infinity;
}

/** FR-482: the nation has what one regiment of the type takes besides cash and armaments: a healthy worker of its grade and its horses. */
export function hasRecruitFor(nation: Nation, regiment: RegimentType): boolean {
  const def = REGIMENTS[regiment];
  const horses = (nation.warehouse as Record<string, number>)[ResourceType.Horses] ?? 0;
  return def.worker !== undefined && healthyWorkers(nation.industry, def.worker) > 0 && horses >= def.horses;
}

/**
 * FR-274, FR-482: the campaign wants one more regiment this turn: its field strength is below twice the target's
 * defence, and the nation has what one regiment of its list takes besides cash and armaments (`hasRecruitFor`), so its
 * run never makes armaments for a recruit it cannot raise. The recruit itself, its limits (FR-213) and its armaments are
 * the garrison's (scriptedArmy.ts, economy.ts).
 */
export function campaignRecruit(state: GameState, nationId: NationId): boolean {
  if (!campaignShort(state, nationId)) return false;
  const nation = nationById(state, nationId)!;
  return SCRIPTED_WAR.campaignRegiments.some((regiment) => hasRecruitFor(nation, regiment));
}

/**
 * FR-274: at war with no one, the declaration of war on the campaign's target once at least one regiment beyond the
 * keep makes a field strength of twice its defence. Planned first, so the economy and the trade of this turn see it.
 * FR-538 (M13 review ST-01): on a Great Power, only once the field regiments in the front province (`campaignFront`)
 * are more than twice that defence: the state it plans from is the one the other nation sees, so its Defense Minister
 * has warned (FR-495) before the war is recorded.
 */
export function planWarDeclaration(view: () => GameState, nationId: NationId, propose: Propose): void {
  const state = view();
  if (enemiesOf(state, nationId).length > 0 || declaredOn(state, nationId).length > 0) return;
  const target = campaignTarget(state, nationId);
  if (target === undefined) return;
  const field = fieldRegiments(state, nationId);
  if (field.length === 0 || strength(field.map((f) => f.regiment)) < campaignNeed(state, nationId, target)) return;
  if (isGreatPower(state, target)) {
    const front = campaignFront(state, nationId);
    const atFront = field.filter((f) => f.provinceId === front).map((f) => f.regiment);
    if (front === undefined || strength(atFront) <= campaignNeed(state, nationId, target)) return;
  }
  // M13 T-15 (FR-497, FR-247): a war on a minor waits for SCRIPTED_WAR.minorWarUpkeepTurns of upkeep in the treasury. A
  // war on a Great Power keeps its own reserve instead (`upkeepReserve`, FR-488).
  const cash = nationById(state, nationId)?.treasury ?? 0;
  if (!isGreatPower(state, target) && cash < SCRIPTED_WAR.minorWarUpkeepTurns * upkeepOf(state, nationId)) return;
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

/** FR-228 (b), FR-538: the field regiments not `used`, in each of the nation's provinces but `to`, march one province toward `to`. */
function marchToward(state: GameState, nationId: NationId, field: readonly FieldRegiment[], used: ReadonlySet<RegimentId>, to: ProvinceId, propose: Propose): void {
  for (const province of provincesOf(state, nationId)) {
    if (province.id === to) continue;
    const ids = field.filter((f) => f.provinceId === province.id && !used.has(f.regiment.id)).map((f) => f.regiment.id);
    const next = ids.length > 0 ? nextStep(state, nationId, province.id, to) : undefined;
    if (next) propose({ kind: "moveArmy", nationId, fromProvinceId: province.id, regimentIds: ids, toProvinceId: next });
  }
}

/**
 * FR-228 (c) and (b), and FR-274's march: at war, or declaring war this turn, the attacks the estimate allows, then the
 * marches of the regiments left toward the staging province. Planned after the economy and the civilians. FR-489: in
 * its war of choice on a Great Power it attacks only that country's provinces bordering its own other than the capital
 * province (`borderProvinces`), and none once it holds one it took (`warAimHeld`); its own provinces lost in that war
 * it still retakes. FR-538: at peace with a Great Power the campaign's target, the field regiments march toward the front
 * (`campaignFront`); with a minor the target they wait for the war, as FR-274 had it.
 */
export function planWarMoves(view: () => GameState, nationId: NationId, propose: Propose): void {
  const state = view();
  if (state.provinces.length === 0) return;
  const enemies = [...new Set([...enemiesOf(state, nationId), ...declaredOn(state, nationId)])];
  const field = fieldRegiments(state, nationId);
  const used = new Set<RegimentId>();
  if (enemies.length === 0) {
    const front = campaignFront(state, nationId);
    if (front !== undefined) marchToward(state, nationId, field, used, front, propose);
    return;
  }

  // (c) a province lost in this war first, then the lowest id
  const lost = (p: Province) =>
    (warBetween(state, nationId, p.ownerId)?.captures ?? []).some((c) => c.provinceId === p.id && c.fromId === nationId && c.toId === p.ownerId);
  // FR-489: the provinces its war of choice on a Great Power may attack; every other enemy's are all open (FR-228)
  const aims = new Map<CountryId, Set<ProvinceId>>();
  for (const id of enemies.filter((e) => warOfChoice(state, nationId, e))) {
    aims.set(id, new Set(warAimHeld(state, nationId, id) ? [] : borderProvinces(state, nationId, id).map((p) => p.id)));
  }
  const allowed = (p: Province) => lost(p) || (aims.get(p.ownerId)?.has(p.id) ?? true);
  const targets = state.provinces
    .filter((p) => enemies.includes(p.ownerId) && warActive(state, nationId, p.ownerId))
    .filter((p) => adjacentProvinces(state, p.id).some((q) => q.ownerId === nationId))
    .filter(allowed)
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
  if (staging) marchToward(state, nationId, field, used, staging, propose);
}
